import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import * as Prisma from '@prisma/client'
import { LoginRequest, LoginResponse, JWTPayload, UserRole, User } from '../types'

const prisma = new (Prisma as any).PrismaClient()

class AuthService {
  private readonly jwtSecret: string
  private readonly jwtExpiresIn: string
  private readonly refreshExpiresIn: string

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key'
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h'
    this.refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  }

  async login(loginData: LoginRequest): Promise<LoginResponse> {
    const { email, password } = loginData

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      throw new Error('Invalid credentials')
    }

    if (!user.isActive) {
      throw new Error('Account is deactivated')
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      throw new Error('Invalid credentials')
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    })

    // Shape API user (omit password, align role type)
    const { password: _pw, ...rest } = user
    const responseUser: User = {
      id: rest.id,
      email: rest.email,
      username: rest.username,
      firstName: rest.firstName,
      lastName: rest.lastName,
      role: rest.role as unknown as UserRole,
      isActive: rest.isActive,
      createdAt: rest.createdAt,
      updatedAt: rest.updatedAt,
      lastLoginAt: rest.lastLoginAt ?? undefined
    }

    // Generate tokens
    const accessToken = this.generateAccessToken(responseUser)
    const refreshToken = this.generateRefreshToken(responseUser)

    return {
      user: responseUser,
      accessToken,
      refreshToken,
      expiresIn: this.getTokenExpirationTime()
    }
  }

  async logout(userId: string): Promise<void> {
    // In a production app, you might want to blacklist the token
    // For now, we'll just update the user's last login time
    await prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() }
    })
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const payload = jwt.verify(refreshToken, this.jwtSecret) as JWTPayload
      
      const user = await prisma.user.findUnique({
        where: { id: payload.userId }
      })

      if (!user || !user.isActive) {
        throw new Error('Invalid refresh token')
      }

      const newAccessToken = this.generateAccessToken(user)
      const newRefreshToken = this.generateRefreshToken(user)

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      }
    } catch (error) {
      throw new Error('Invalid refresh token')
    }
  }

  async validateToken(token: string): Promise<User | null> {
    try {
      const payload = jwt.verify(token, this.jwtSecret) as JWTPayload
      
      const user = await prisma.user.findUnique({
        where: { id: payload.userId }
      })

      if (!user || !user.isActive) {
        return null
      }

      const { password: _pw, ...rest } = user
      return {
        id: rest.id,
        email: rest.email,
        username: rest.username,
        firstName: rest.firstName,
        lastName: rest.lastName,
        role: rest.role as unknown as UserRole,
        isActive: rest.isActive,
        createdAt: rest.createdAt,
        updatedAt: rest.updatedAt,
        lastLoginAt: rest.lastLoginAt ?? undefined
      }
    } catch (error) {
      return null
    }
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      throw new Error('User not found')
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password)
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect')
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, parseInt(process.env.BCRYPT_ROUNDS || '12'))
    
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword }
    })
  }

  async resetPassword(email: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      // Don't reveal if email exists or not
      return
    }

    // In a real application, you would:
    // 1. Generate a secure reset token
    // 2. Store it in the database with expiration
    // 3. Send email with reset link
    
    // For now, we'll just log it
    console.log(`Password reset requested for: ${email}`)
  }

  private generateAccessToken(user: Pick<User, 'id' | 'email' | 'role'>): string {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role as unknown as UserRole
    }

    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.parseExpiresToSeconds(this.jwtExpiresIn)
    })
  }

  private generateRefreshToken(user: Pick<User, 'id' | 'email' | 'role'>): string {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role as unknown as UserRole
    }

    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.parseExpiresToSeconds(this.refreshExpiresIn)
    })
  }

  private getTokenExpirationTime(): number {
    // Convert JWT expiration to milliseconds
    const expiresIn = this.jwtExpiresIn
    if (expiresIn.endsWith('h')) {
      return parseInt(expiresIn) * 60 * 60 * 1000
    } else if (expiresIn.endsWith('d')) {
      return parseInt(expiresIn) * 24 * 60 * 60 * 1000
    } else if (expiresIn.endsWith('m')) {
      return parseInt(expiresIn) * 60 * 1000
    }
    return 24 * 60 * 60 * 1000 // Default 24 hours
  }

  private parseExpiresToSeconds(value: string): number {
    // Supports formats like '24h', '7d', '15m' or plain seconds as number string
    const num = parseInt(value)
    if (Number.isNaN(num)) return 24 * 60 * 60
    if (value.endsWith('h')) return num * 60 * 60
    if (value.endsWith('d')) return num * 24 * 60 * 60
    if (value.endsWith('m')) return num * 60
    return num
  }
}

export default new AuthService()