import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import authRoutes from './routes/auth.routes'
import userRoutes from './routes/user.routes'
import lockRoutes from './routes/lock.routes'
import { errorHandler } from './middleware/error.middleware'
import dashboardRoutes from './routes/dashboard.routes'
import { apiLimiter, authLimiter } from './middleware/rateLimit.middleware'
import permissionRoutes from './routes/permission.routes'
import rfidRoutes from './routes/rfid.routes'
import auditRoutes from './routes/audit.routes'
import cityRoutes from './routes/city.routes'

// Load environment variables
dotenv.config()

const app = express()

// MIDDLEWARE
app.use(helmet())
app.use(cors({ origin: true, credentials: true }))
app.use(express.json())
// Apply a general API rate limiter
app.use('/api/', apiLimiter)

// HEALTH CHECK
app.get('/api/health', (_req, res) => {
  res.json({ message: 'Server is up and running!' })
})

// API ROUTES
// Apply stricter limits to auth routes
app.use('/api/auth', authLimiter, authRoutes)
app.use('/api/user', userRoutes)
app.use('/api/lock', lockRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/permission', permissionRoutes)
app.use('/api/rfid', rfidRoutes)
app.use('/api/audit', auditRoutes)
app.use('/api/city', cityRoutes)

// ERROR HANDLER (last)
app.use(errorHandler)

export default app
