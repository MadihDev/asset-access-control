import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import authRoutes from './routes/auth.routes'
import enhancedAuthRoutes from './routes/enhancedAuth.routes'
import securityRoutes from './routes/security.routes'
import userRoutes from './routes/user.routes'
import lockRoutes from './routes/lock.routes'
import { errorHandler } from './middleware/error.middleware'
import dashboardRoutes from './routes/dashboard.routes'
import { 
  apiLimiter, 
  authLimiter, 
  rfidAccessLimit, 
  adminRateLimit, 
  userManagementLimit,
  rateLimitInfo 
} from './middleware/rateLimit.middleware'
import { 
  securityEventMiddleware, 
  rateLimitMonitoring, 
  dosDetectionMiddleware 
} from './middleware/securityMonitoring.middleware'
import permissionRoutes from './routes/permission.routes'
import rfidRoutes from './routes/rfid.routes'
import auditRoutes from './routes/audit.routes'
import projectRoutes from './routes/project.routes'
import locationRoutes from './routes/location.routes'
import addressRoutes from './routes/address.routes'
import deviceRoutes from './routes/device.routes'
import simRoutes from './routes/sim.routes'

// Load environment variables
dotenv.config()

const app = express()

// MIDDLEWARE
app.use(helmet())
app.use(cors({ origin: true, credentials: true }))
app.use(express.json())

// Apply rate limiting info headers
app.use('/api/', rateLimitInfo)

// Apply security monitoring middleware
app.use('/api/', securityEventMiddleware)
app.use('/api/', rateLimitMonitoring)
app.use('/api/', dosDetectionMiddleware)

// Apply general API rate limiter to all API routes
app.use('/api/', apiLimiter)

// HEALTH CHECK
app.get('/api/health', (_req, res) => {
  res.json({ message: 'Server is up and running!' })
})

// API ROUTES WITH SPECIFIC RATE LIMITING
// Apply stricter limits to auth routes
app.use('/api/auth', authLimiter, authRoutes)
app.use('/api/auth', authLimiter, enhancedAuthRoutes)

// Apply user management rate limiting
app.use('/api/user', userManagementLimit, userRoutes)

// Apply RFID-specific rate limiting
app.use('/api/rfid', rfidAccessLimit, rfidRoutes)

// Apply admin rate limiting to sensitive endpoints
app.use('/api/dashboard', adminRateLimit, dashboardRoutes)
app.use('/api/permission', adminRateLimit, permissionRoutes)
app.use('/api/audit', adminRateLimit, auditRoutes)
app.use('/api/project', adminRateLimit, projectRoutes)
app.use('/api/security', adminRateLimit, securityRoutes)

// Regular rate limiting for other endpoints
app.use('/api/lock', lockRoutes)
app.use('/api/location', locationRoutes)
app.use('/api/address', addressRoutes)
app.use('/api/device', deviceRoutes)
// Dev/test-only simulation routes
if (process.env.ENABLE_SIM_ROUTES === 'true') {
  app.use('/api/sim', simRoutes)
}

// ERROR HANDLER (last)
app.use(errorHandler)

export default app
