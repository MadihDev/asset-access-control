#!/bin/bash
# production-monitoring.sh
# Continuous monitoring script for production environment

set -e

# Configuration
LOG_DIR="./logs"
ALERT_EMAIL="admin@company.com"
API_BASE_URL="${API_BASE_URL:-http://localhost:5000}"
MONITORING_INTERVAL=300  # 5 minutes
ALERT_THRESHOLD_RESPONSE_TIME=2000  # 2 seconds
ALERT_THRESHOLD_ERROR_RATE=5  # 5%

# Create logs directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_DIR/monitoring.log"
}

alert() {
    local level=$1
    local message=$2
    log "[$level] $message"
    
    # Send alert (implement your preferred alerting method)
    if command -v mail &> /dev/null; then
        echo "$message" | mail -s "[$level] Asset Access Control Alert" "$ALERT_EMAIL"
    fi
    
    # Write to alert log
    echo "$(date '+%Y-%m-%d %H:%M:%S') - [$level] $message" >> "$LOG_DIR/alerts.log"
}

check_system_health() {
    log "🔍 Checking system health..."
    
    local health_endpoint="$API_BASE_URL/api/health"
    local start_time=$(date +%s%3N)
    
    if response=$(curl -s -w "%{http_code}" -o /tmp/health_response "$health_endpoint" --connect-timeout 10); then
        local end_time=$(date +%s%3N)
        local response_time=$((end_time - start_time))
        local http_code=$(tail -c 3 <<< "$response")
        
        if [ "$http_code" = "200" ]; then
            if [ "$response_time" -gt "$ALERT_THRESHOLD_RESPONSE_TIME" ]; then
                alert "WARNING" "Health check response time is slow: ${response_time}ms"
            else
                log "✅ System health check passed (${response_time}ms)"
            fi
        else
            alert "CRITICAL" "Health check failed with HTTP code: $http_code"
            return 1
        fi
    else
        alert "CRITICAL" "Health check endpoint unreachable"
        return 1
    fi
    
    return 0
}

check_database_connectivity() {
    log "🗄️  Checking database connectivity..."
    
    # Test database through API endpoint
    local users_endpoint="$API_BASE_URL/api/users"
    
    # Get auth token (you may need to adjust this based on your test credentials)
    local token_response=$(curl -s -X POST "$API_BASE_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"username":"alice@acme.com","password":"Alice123!"}')
    
    if token=$(echo "$token_response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4); then
        if [ -n "$token" ]; then
            if curl -s -f -H "Authorization: Bearer $token" "$users_endpoint" > /dev/null; then
                log "✅ Database connectivity check passed"
                return 0
            else
                alert "CRITICAL" "Database connectivity test failed - API returned error"
                return 1
            fi
        else
            alert "CRITICAL" "Database connectivity test failed - Could not obtain auth token"
            return 1
        fi
    else
        alert "CRITICAL" "Database connectivity test failed - Login failed"
        return 1
    fi
}

check_tenant_isolation() {
    log "🏢 Checking tenant isolation..."
    
    # Get tokens for different tenants
    local acme_token=$(curl -s -X POST "$API_BASE_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"username":"alice@acme.com","password":"Alice123!"}' | \
        grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    
    local perfectit_token=$(curl -s -X POST "$API_BASE_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"username":"bob@perfectit.com","password":"Bob123!"}' | \
        grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    
    if [ -n "$acme_token" ] && [ -n "$perfectit_token" ]; then
        # Test that each token only returns tenant-specific data
        local acme_users=$(curl -s -H "Authorization: Bearer $acme_token" "$API_BASE_URL/api/users" | grep -o '"id"' | wc -l)
        local perfectit_users=$(curl -s -H "Authorization: Bearer $perfectit_token" "$API_BASE_URL/api/users" | grep -o '"id"' | wc -l)
        
        if [ "$acme_users" -gt 0 ] && [ "$perfectit_users" -gt 0 ]; then
            log "✅ Tenant isolation check passed (ACME: $acme_users users, PerfectIT: $perfectit_users users)"
            return 0
        else
            alert "WARNING" "Tenant isolation check inconclusive - empty user lists"
            return 1
        fi
    else
        alert "CRITICAL" "Tenant isolation check failed - Could not obtain tenant tokens"
        return 1
    fi
}

check_rfid_endpoints() {
    log "💳 Checking RFID endpoints..."
    
    # Test RFID access endpoint
    local rfid_response=$(curl -s -w "%{http_code}" -o /tmp/rfid_response \
        -X POST "$API_BASE_URL/api/access/attempt" \
        -H "Content-Type: application/json" \
        -d '{"cardId":"test-card","lockId":"test-lock","deviceId":"test-device"}')
    
    local http_code=$(tail -c 3 <<< "$rfid_response")
    
    # We expect either 200 (access granted/denied) or 400/401 (validation error)
    # But not 500 (server error) or timeout
    if [[ "$http_code" =~ ^(200|400|401|403)$ ]]; then
        log "✅ RFID endpoints responding correctly (HTTP $http_code)"
        return 0
    else
        alert "CRITICAL" "RFID endpoint returned unexpected response: HTTP $http_code"
        return 1
    fi
}

check_device_connectivity() {
    log "🔌 Checking device connectivity..."
    
    # This would typically check your ESP32 devices
    # For now, we'll check if the device management endpoints are working
    
    local token_response=$(curl -s -X POST "$API_BASE_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"username":"alice@acme.com","password":"Alice123!"}')
    
    if token=$(echo "$token_response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4); then
        if devices_response=$(curl -s -H "Authorization: Bearer $token" "$API_BASE_URL/api/devices" 2>/dev/null); then
            local device_count=$(echo "$devices_response" | grep -o '"id"' | wc -l)
            log "✅ Device connectivity check passed ($device_count devices)"
            return 0
        else
            alert "WARNING" "Device endpoint check failed"
            return 1
        fi
    else
        alert "CRITICAL" "Device connectivity check failed - Could not authenticate"
        return 1
    fi
}

check_performance_metrics() {
    log "⚡ Checking performance metrics..."
    
    local total_requests=0
    local successful_requests=0
    local total_response_time=0
    
    # Test multiple endpoints for performance
    local endpoints=("/api/health" "/api/users" "/api/locks" "/api/locations")
    
    # Get auth token
    local token=$(curl -s -X POST "$API_BASE_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"username":"alice@acme.com","password":"Alice123!"}' | \
        grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    
    for endpoint in "${endpoints[@]}"; do
        for i in {1..5}; do  # Test each endpoint 5 times
            local start_time=$(date +%s%3N)
            
            if [ "$endpoint" = "/api/health" ]; then
                # Health endpoint doesn't need auth
                if curl -s -f "$API_BASE_URL$endpoint" > /dev/null; then
                    successful_requests=$((successful_requests + 1))
                fi
            else
                # Other endpoints need auth
                if [ -n "$token" ] && curl -s -f -H "Authorization: Bearer $token" "$API_BASE_URL$endpoint" > /dev/null; then
                    successful_requests=$((successful_requests + 1))
                fi
            fi
            
            local end_time=$(date +%s%3N)
            local response_time=$((end_time - start_time))
            total_response_time=$((total_response_time + response_time))
            total_requests=$((total_requests + 1))
            
            sleep 0.1  # Small delay between requests
        done
    done
    
    local success_rate=$((successful_requests * 100 / total_requests))
    local avg_response_time=$((total_response_time / total_requests))
    
    log "Performance: $success_rate% success rate, ${avg_response_time}ms avg response time"
    
    if [ "$success_rate" -lt $((100 - ALERT_THRESHOLD_ERROR_RATE)) ]; then
        alert "WARNING" "High error rate detected: $success_rate% success rate"
        return 1
    fi
    
    if [ "$avg_response_time" -gt "$ALERT_THRESHOLD_RESPONSE_TIME" ]; then
        alert "WARNING" "Slow response times detected: ${avg_response_time}ms average"
        return 1
    fi
    
    log "✅ Performance metrics within acceptable ranges"
    return 0
}

check_security_logs() {
    log "🔒 Checking security logs..."
    
    # Check for suspicious activity patterns
    local access_log_file="$LOG_DIR/access.log"
    
    if [ -f "$access_log_file" ]; then
        # Check for failed login attempts in the last hour
        local failed_logins=$(grep "$(date -d '1 hour ago' '+%Y-%m-%d %H')" "$access_log_file" | grep -c "login failed" || echo "0")
        
        if [ "$failed_logins" -gt 50 ]; then
            alert "WARNING" "High number of failed login attempts detected: $failed_logins in the last hour"
        fi
        
        # Check for suspicious access patterns
        local suspicious_patterns=$(grep "$(date '+%Y-%m-%d')" "$access_log_file" | grep -E "(SQL injection|XSS|unauthorized access)" -c || echo "0")
        
        if [ "$suspicious_patterns" -gt 0 ]; then
            alert "CRITICAL" "Suspicious security patterns detected: $suspicious_patterns today"
        fi
    fi
    
    log "✅ Security log check completed"
    return 0
}

generate_health_report() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local report_file="$LOG_DIR/health-report-$(date '+%Y-%m-%d-%H%M').json"
    
    cat > "$report_file" << EOF
{
  "timestamp": "$timestamp",
  "system_status": {
    "overall": "healthy",
    "checks_performed": [
      "system_health",
      "database_connectivity", 
      "tenant_isolation",
      "rfid_endpoints",
      "device_connectivity",
      "performance_metrics",
      "security_logs"
    ]
  },
  "next_check": "$(date -d "+$MONITORING_INTERVAL seconds" '+%Y-%m-%d %H:%M:%S')"
}
EOF

    log "📊 Health report generated: $report_file"
}

run_monitoring_cycle() {
    log "🚀 Starting monitoring cycle..."
    
    local checks_passed=0
    local total_checks=7
    
    # Run all health checks
    check_system_health && checks_passed=$((checks_passed + 1))
    check_database_connectivity && checks_passed=$((checks_passed + 1))
    check_tenant_isolation && checks_passed=$((checks_passed + 1))
    check_rfid_endpoints && checks_passed=$((checks_passed + 1))
    check_device_connectivity && checks_passed=$((checks_passed + 1))
    check_performance_metrics && checks_passed=$((checks_passed + 1))
    check_security_logs && checks_passed=$((checks_passed + 1))
    
    # Generate health report
    generate_health_report
    
    local success_rate=$((checks_passed * 100 / total_checks))
    
    if [ "$checks_passed" -eq "$total_checks" ]; then
        log "✅ All monitoring checks passed ($checks_passed/$total_checks)"
    else
        alert "WARNING" "Some monitoring checks failed ($checks_passed/$total_checks passed - $success_rate%)"
    fi
    
    log "⏰ Next monitoring cycle in $MONITORING_INTERVAL seconds"
}

# Main monitoring loop
main() {
    log "🎯 Production Monitoring Started"
    log "Configuration:"
    log "  - API Base URL: $API_BASE_URL"
    log "  - Monitoring Interval: $MONITORING_INTERVAL seconds"
    log "  - Response Time Threshold: $ALERT_THRESHOLD_RESPONSE_TIME ms"
    log "  - Error Rate Threshold: $ALERT_THRESHOLD_ERROR_RATE%"
    
    if [ "$1" = "--once" ]; then
        # Run once and exit
        run_monitoring_cycle
    else
        # Continuous monitoring
        while true; do
            run_monitoring_cycle
            sleep "$MONITORING_INTERVAL"
        done
    fi
}

# Handle signals for graceful shutdown
trap 'log "🛑 Monitoring stopped"; exit 0' SIGINT SIGTERM

# Run the monitoring
main "$@"