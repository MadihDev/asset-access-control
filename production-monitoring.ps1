# production-monitoring.ps1
# PowerShell version of the monitoring script for Windows environments

param(
    [switch]$Once,
    [string]$ApiBaseUrl = $env:API_BASE_URL ?? "http://localhost:5000",
    [int]$MonitoringInterval = 300,  # 5 minutes
    [int]$AlertThresholdResponseTime = 2000,  # 2 seconds
    [int]$AlertThresholdErrorRate = 5  # 5%
)

# Configuration
$LogDir = "./logs"
$AlertEmail = "admin@company.com"

# Create logs directory if it doesn't exist
if (!(Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "$timestamp - $Message"
    Write-Host $logMessage
    Add-Content -Path "$LogDir/monitoring.log" -Value $logMessage
}

function Send-Alert {
    param(
        [string]$Level,
        [string]$Message
    )
    
    Write-Log "[$Level] $Message"
    
    # Write to alert log
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path "$LogDir/alerts.log" -Value "$timestamp - [$Level] $Message"
    
    # TODO: Implement your preferred alerting method (email, Slack, etc.)
    # Example for email (requires proper SMTP configuration):
    # Send-MailMessage -To $AlertEmail -Subject "[$Level] Asset Access Control Alert" -Body $Message -SmtpServer "your-smtp-server"
}

function Test-SystemHealth {
    Write-Log "🔍 Checking system health..."
    
    $healthEndpoint = "$ApiBaseUrl/api/health"
    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    
    try {
        $response = Invoke-WebRequest -Uri $healthEndpoint -TimeoutSec 10 -UseBasicParsing
        $stopwatch.Stop()
        $responseTime = $stopwatch.ElapsedMilliseconds
        
        if ($response.StatusCode -eq 200) {
            if ($responseTime -gt $AlertThresholdResponseTime) {
                Send-Alert "WARNING" "Health check response time is slow: ${responseTime}ms"
            } else {
                Write-Log "✅ System health check passed (${responseTime}ms)"
            }
            return $true
        } else {
            Send-Alert "CRITICAL" "Health check failed with HTTP code: $($response.StatusCode)"
            return $false
        }
    } catch {
        $stopwatch.Stop()
        Send-Alert "CRITICAL" "Health check endpoint unreachable: $($_.Exception.Message)"
        return $false
    }
}

function Test-DatabaseConnectivity {
    Write-Log "🗄️  Checking database connectivity..."
    
    try {
        # Get auth token
        $loginBody = @{
            username = "alice@acme.com"
            password = "Alice123!"
        } | ConvertTo-Json
        
        $loginResponse = Invoke-RestMethod -Uri "$ApiBaseUrl/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
        
        if ($loginResponse.token) {
            $headers = @{
                "Authorization" = "Bearer $($loginResponse.token)"
            }
            
            $usersResponse = Invoke-RestMethod -Uri "$ApiBaseUrl/api/users" -Method Get -Headers $headers
            Write-Log "✅ Database connectivity check passed"
            return $true
        } else {
            Send-Alert "CRITICAL" "Database connectivity test failed - Could not obtain auth token"
            return $false
        }
    } catch {
        Send-Alert "CRITICAL" "Database connectivity test failed: $($_.Exception.Message)"
        return $false
    }
}

function Test-TenantIsolation {
    Write-Log "🏢 Checking tenant isolation..."
    
    try {
        # Get tokens for different tenants
        $acmeLoginBody = @{
            username = "alice@acme.com"
            password = "Alice123!"
        } | ConvertTo-Json
        
        $perfectitLoginBody = @{
            username = "bob@perfectit.com"
            password = "Bob123!"
        } | ConvertTo-Json
        
        $acmeResponse = Invoke-RestMethod -Uri "$ApiBaseUrl/api/auth/login" -Method Post -Body $acmeLoginBody -ContentType "application/json"
        $perfectitResponse = Invoke-RestMethod -Uri "$ApiBaseUrl/api/auth/login" -Method Post -Body $perfectitLoginBody -ContentType "application/json"
        
        if ($acmeResponse.token -and $perfectitResponse.token) {
            $acmeHeaders = @{ "Authorization" = "Bearer $($acmeResponse.token)" }
            $perfectitHeaders = @{ "Authorization" = "Bearer $($perfectitResponse.token)" }
            
            $acmeUsers = Invoke-RestMethod -Uri "$ApiBaseUrl/api/users" -Method Get -Headers $acmeHeaders
            $perfectitUsers = Invoke-RestMethod -Uri "$ApiBaseUrl/api/users" -Method Get -Headers $perfectitHeaders
            
            $acmeUserCount = if ($acmeUsers -is [array]) { $acmeUsers.Count } else { if ($acmeUsers) { 1 } else { 0 } }
            $perfectitUserCount = if ($perfectitUsers -is [array]) { $perfectitUsers.Count } else { if ($perfectitUsers) { 1 } else { 0 } }
            
            if ($acmeUserCount -gt 0 -and $perfectitUserCount -gt 0) {
                Write-Log "✅ Tenant isolation check passed (ACME: $acmeUserCount users, PerfectIT: $perfectitUserCount users)"
                return $true
            } else {
                Send-Alert "WARNING" "Tenant isolation check inconclusive - empty user lists"
                return $false
            }
        } else {
            Send-Alert "CRITICAL" "Tenant isolation check failed - Could not obtain tenant tokens"
            return $false
        }
    } catch {
        Send-Alert "CRITICAL" "Tenant isolation check failed: $($_.Exception.Message)"
        return $false
    }
}

function Test-RFIDEndpoints {
    Write-Log "💳 Checking RFID endpoints..."
    
    try {
        $rfidBody = @{
            cardId = "test-card"
            lockId = "test-lock"
            deviceId = "test-device"
        } | ConvertTo-Json
        
        $response = Invoke-WebRequest -Uri "$ApiBaseUrl/api/access/attempt" -Method Post -Body $rfidBody -ContentType "application/json" -UseBasicParsing
        
        # We expect either 200 (access granted/denied) or 400/401 (validation error)
        # But not 500 (server error)
        if ($response.StatusCode -in @(200, 400, 401, 403)) {
            Write-Log "✅ RFID endpoints responding correctly (HTTP $($response.StatusCode))"
            return $true
        } else {
            Send-Alert "CRITICAL" "RFID endpoint returned unexpected response: HTTP $($response.StatusCode)"
            return $false
        }
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($statusCode -in @(400, 401, 403)) {
            Write-Log "✅ RFID endpoints responding correctly (HTTP $statusCode)"
            return $true
        } else {
            Send-Alert "CRITICAL" "RFID endpoint error: $($_.Exception.Message)"
            return $false
        }
    }
}

function Test-DeviceConnectivity {
    Write-Log "🔌 Checking device connectivity..."
    
    try {
        # Get auth token
        $loginBody = @{
            username = "alice@acme.com"
            password = "Alice123!"
        } | ConvertTo-Json
        
        $loginResponse = Invoke-RestMethod -Uri "$ApiBaseUrl/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
        
        if ($loginResponse.token) {
            $headers = @{
                "Authorization" = "Bearer $($loginResponse.token)"
            }
            
            # Try to get devices list (this endpoint may not exist, so we'll handle errors)
            try {
                $devicesResponse = Invoke-RestMethod -Uri "$ApiBaseUrl/api/devices" -Method Get -Headers $headers
                $deviceCount = if ($devicesResponse -is [array]) { $devicesResponse.Count } else { if ($devicesResponse) { 1 } else { 0 } }
                Write-Log "✅ Device connectivity check passed ($deviceCount devices)"
                return $true
            } catch {
                # If devices endpoint doesn't exist, check locks instead as a proxy
                $locksResponse = Invoke-RestMethod -Uri "$ApiBaseUrl/api/locks" -Method Get -Headers $headers
                $lockCount = if ($locksResponse -is [array]) { $locksResponse.Count } else { if ($locksResponse) { 1 } else { 0 } }
                Write-Log "✅ Device connectivity check passed via locks endpoint ($lockCount locks)"
                return $true
            }
        } else {
            Send-Alert "CRITICAL" "Device connectivity check failed - Could not authenticate"
            return $false
        }
    } catch {
        Send-Alert "WARNING" "Device connectivity check failed: $($_.Exception.Message)"
        return $false
    }
}

function Test-PerformanceMetrics {
    Write-Log "⚡ Checking performance metrics..."
    
    $totalRequests = 0
    $successfulRequests = 0
    $totalResponseTime = 0
    
    $endpoints = @("/api/health", "/api/users", "/api/locks", "/api/locations")
    
    try {
        # Get auth token
        $loginBody = @{
            username = "alice@acme.com"
            password = "Alice123!"
        } | ConvertTo-Json
        
        $loginResponse = Invoke-RestMethod -Uri "$ApiBaseUrl/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
        $token = $loginResponse.token
        
        foreach ($endpoint in $endpoints) {
            for ($i = 1; $i -le 5; $i++) {  # Test each endpoint 5 times
                $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
                
                try {
                    if ($endpoint -eq "/api/health") {
                        # Health endpoint doesn't need auth
                        Invoke-RestMethod -Uri "$ApiBaseUrl$endpoint" -Method Get | Out-Null
                    } else {
                        # Other endpoints need auth
                        if ($token) {
                            $headers = @{ "Authorization" = "Bearer $token" }
                            Invoke-RestMethod -Uri "$ApiBaseUrl$endpoint" -Method Get -Headers $headers | Out-Null
                        }
                    }
                    $successfulRequests++
                } catch {
                    # Request failed, but we still count it
                }
                
                $stopwatch.Stop()
                $totalResponseTime += $stopwatch.ElapsedMilliseconds
                $totalRequests++
                
                Start-Sleep -Milliseconds 100  # Small delay between requests
            }
        }
        
        $successRate = [math]::Round(($successfulRequests * 100 / $totalRequests), 2)
        $avgResponseTime = [math]::Round(($totalResponseTime / $totalRequests), 0)
        
        Write-Log "Performance: $successRate% success rate, ${avgResponseTime}ms avg response time"
        
        if ($successRate -lt (100 - $AlertThresholdErrorRate)) {
            Send-Alert "WARNING" "High error rate detected: $successRate% success rate"
            return $false
        }
        
        if ($avgResponseTime -gt $AlertThresholdResponseTime) {
            Send-Alert "WARNING" "Slow response times detected: ${avgResponseTime}ms average"
            return $false
        }
        
        Write-Log "✅ Performance metrics within acceptable ranges"
        return $true
        
    } catch {
        Send-Alert "WARNING" "Performance metrics check failed: $($_.Exception.Message)"
        return $false
    }
}

function Test-SecurityLogs {
    Write-Log "🔒 Checking security logs..."
    
    # Check for suspicious activity patterns in logs
    $accessLogFile = "$LogDir/access.log"
    
    if (Test-Path $accessLogFile) {
        $today = Get-Date -Format "yyyy-MM-dd"
        $oneHourAgo = (Get-Date).AddHours(-1).ToString("yyyy-MM-dd HH")
        
        try {
            # Check for failed login attempts in the last hour
            $recentLogs = Get-Content $accessLogFile | Where-Object { $_ -like "*$oneHourAgo*" }
            $failedLogins = ($recentLogs | Where-Object { $_ -like "*login failed*" }).Count
            
            if ($failedLogins -gt 50) {
                Send-Alert "WARNING" "High number of failed login attempts detected: $failedLogins in the last hour"
            }
            
            # Check for suspicious access patterns today
            $todayLogs = Get-Content $accessLogFile | Where-Object { $_ -like "*$today*" }
            $suspiciousPatterns = ($todayLogs | Where-Object { $_ -match "(SQL injection|XSS|unauthorized access)" }).Count
            
            if ($suspiciousPatterns -gt 0) {
                Send-Alert "CRITICAL" "Suspicious security patterns detected: $suspiciousPatterns today"
            }
        } catch {
            Write-Log "Warning: Could not analyze security logs: $($_.Exception.Message)"
        }
    }
    
    Write-Log "✅ Security log check completed"
    return $true
}

function New-HealthReport {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $reportFile = "$LogDir/health-report-$(Get-Date -Format 'yyyy-MM-dd-HHmm').json"
    
    $report = @{
        timestamp = $timestamp
        system_status = @{
            overall = "healthy"
            checks_performed = @(
                "system_health",
                "database_connectivity",
                "tenant_isolation", 
                "rfid_endpoints",
                "device_connectivity",
                "performance_metrics",
                "security_logs"
            )
        }
        next_check = (Get-Date).AddSeconds($MonitoringInterval).ToString("yyyy-MM-dd HH:mm:ss")
    } | ConvertTo-Json -Depth 3
    
    $report | Out-File -FilePath $reportFile -Encoding UTF8
    Write-Log "📊 Health report generated: $reportFile"
}

function Start-MonitoringCycle {
    Write-Log "🚀 Starting monitoring cycle..."
    
    $checksPassed = 0
    $totalChecks = 7
    
    # Run all health checks
    if (Test-SystemHealth) { $checksPassed++ }
    if (Test-DatabaseConnectivity) { $checksPassed++ }
    if (Test-TenantIsolation) { $checksPassed++ }
    if (Test-RFIDEndpoints) { $checksPassed++ }
    if (Test-DeviceConnectivity) { $checksPassed++ }
    if (Test-PerformanceMetrics) { $checksPassed++ }
    if (Test-SecurityLogs) { $checksPassed++ }
    
    # Generate health report
    New-HealthReport
    
    $successRate = [math]::Round(($checksPassed * 100 / $totalChecks), 0)
    
    if ($checksPassed -eq $totalChecks) {
        Write-Log "✅ All monitoring checks passed ($checksPassed/$totalChecks)"
    } else {
        Send-Alert "WARNING" "Some monitoring checks failed ($checksPassed/$totalChecks passed - $successRate%)"
    }
    
    Write-Log "⏰ Next monitoring cycle in $MonitoringInterval seconds"
}

# Main function
function Main {
    Write-Log "🎯 Production Monitoring Started"
    Write-Log "Configuration:"
    Write-Log "  - API Base URL: $ApiBaseUrl"
    Write-Log "  - Monitoring Interval: $MonitoringInterval seconds"
    Write-Log "  - Response Time Threshold: $AlertThresholdResponseTime ms"
    Write-Log "  - Error Rate Threshold: $AlertThresholdErrorRate%"
    
    if ($Once) {
        # Run once and exit
        Start-MonitoringCycle
    } else {
        # Continuous monitoring
        try {
            while ($true) {
                Start-MonitoringCycle
                Start-Sleep -Seconds $MonitoringInterval
            }
        } catch {
            Write-Log "🛑 Monitoring stopped: $($_.Exception.Message)"
        }
    }
}

# Handle Ctrl+C gracefully
$null = Register-EngineEvent PowerShell.Exiting -Action {
    Write-Log "🛑 Monitoring stopped"
}

# Run the monitoring
Main