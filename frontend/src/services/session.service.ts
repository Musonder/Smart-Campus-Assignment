/**
 * Session Management Service
 * 
 * Handles session expiration, refresh, and role-based timeout management
 */

import { jwtDecode } from 'jwt-decode'
import apiClient from '@/lib/api-client'

export interface TokenPayload {
  sub: string
  email: string
  roles: string[]
  exp: number
  iat: number
  type: string
}

export interface SessionConfig {
  accessTokenExpiry: number // minutes
  refreshTokenExpiry: number // days
  warningThreshold: number // minutes before expiry to show warning
}

// Role-based session configurations
const ROLE_SESSION_CONFIGS: Record<string, SessionConfig> = {
  student: {
    accessTokenExpiry: 60, // 1 hour
    refreshTokenExpiry: 7, // 7 days
    warningThreshold: 5, // Warn 5 minutes before expiry
  },
  lecturer: {
    accessTokenExpiry: 120, // 2 hours
    refreshTokenExpiry: 14, // 14 days
    warningThreshold: 10, // Warn 10 minutes before expiry
  },
  staff: {
    accessTokenExpiry: 90, // 1.5 hours
    refreshTokenExpiry: 7, // 7 days
    warningThreshold: 5, // Warn 5 minutes before expiry
  },
  admin: {
    accessTokenExpiry: 30, // 30 minutes (shorter for security)
    refreshTokenExpiry: 1, // 1 day
    warningThreshold: 3, // Warn 3 minutes before expiry
  },
}

const DEFAULT_CONFIG: SessionConfig = {
  accessTokenExpiry: 60,
  refreshTokenExpiry: 7,
  warningThreshold: 5,
}

class SessionService {
  private refreshTimer: NodeJS.Timeout | null = null
  private warningTimer: NodeJS.Timeout | null = null
  private onExpiryWarning?: (minutesLeft: number) => void
  private onSessionExpired?: () => void

  /**
   * Get session configuration for a role
   */
  getSessionConfig(userType?: string): SessionConfig {
    if (!userType) return DEFAULT_CONFIG
    return ROLE_SESSION_CONFIGS[userType.toLowerCase()] || DEFAULT_CONFIG
  }

  /**
   * Decode and validate token
   */
  decodeToken(token: string): TokenPayload | null {
    try {
      return jwtDecode<TokenPayload>(token)
    } catch (error) {
      console.error('Failed to decode token:', error)
      return null
    }
  }

  /**
   * Get token expiration time
   */
  getTokenExpiry(token: string): Date | null {
    const payload = this.decodeToken(token)
    if (!payload || !payload.exp) return null
    return new Date(payload.exp * 1000)
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(token: string): boolean {
    const expiry = this.getTokenExpiry(token)
    if (!expiry) return true
    return expiry < new Date()
  }

  /**
   * Get minutes until token expires
   */
  getMinutesUntilExpiry(token: string): number | null {
    const expiry = this.getTokenExpiry(token)
    if (!expiry) return null
    const now = new Date()
    const diff = expiry.getTime() - now.getTime()
    return Math.max(0, Math.floor(diff / 60000))
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(): Promise<boolean> {
    const refreshToken = localStorage.getItem('refresh_token')
    if (!refreshToken) {
      this.handleSessionExpired()
      return false
    }

    // Check if refresh token is expired
    if (this.isTokenExpired(refreshToken)) {
      this.handleSessionExpired()
      return false
    }

    try {
      const response = await apiClient.post<{
        access_token: string
        refresh_token: string
        expires_in: number
      }>('/api/v1/auth/refresh', {
        refresh_token: refreshToken,
      })

      // Update tokens
      localStorage.setItem('access_token', response.data.access_token)
      if (response.data.refresh_token) {
        localStorage.setItem('refresh_token', response.data.refresh_token)
      }

      // Restart session monitoring - get user type from token
      const payload = this.decodeToken(response.data.access_token)
      if (payload && payload.type) {
        this.startSessionMonitoring(payload.type, this.onExpiryWarning, this.onSessionExpired)
      }
      return true
    } catch (error) {
      console.error('Token refresh failed:', error)
      this.handleSessionExpired()
      return false
    }
  }

  /**
   * Start monitoring session expiration
   */
  startSessionMonitoring(
    userType: string,
    onExpiryWarning?: (minutesLeft: number) => void,
    onSessionExpired?: () => void
  ): void {
    this.stopSessionMonitoring()

    this.onExpiryWarning = onExpiryWarning
    this.onSessionExpired = onSessionExpired

    const accessToken = localStorage.getItem('access_token')
    if (!accessToken) {
      this.handleSessionExpired()
      return
    }

    const config = this.getSessionConfig(userType)

    // Check token expiry every minute
    this.refreshTimer = setInterval(() => {
      const token = localStorage.getItem('access_token')
      if (!token) {
        this.handleSessionExpired()
        return
      }

      if (this.isTokenExpired(token)) {
        // Try to refresh
        this.refreshAccessToken()
      } else {
        const minutesLeft = this.getMinutesUntilExpiry(token)
        if (minutesLeft !== null && minutesLeft <= config.warningThreshold) {
          // Show warning
          if (this.onExpiryWarning) {
            this.onExpiryWarning(minutesLeft)
          }
        }
      }
    }, 60000) // Check every minute

    // Set up warning timer
    const minutesUntilWarning = this.getMinutesUntilExpiry(accessToken)
    if (minutesUntilWarning !== null && minutesUntilWarning > config.warningThreshold) {
      const warningDelay = (minutesUntilWarning - config.warningThreshold) * 60000
      this.warningTimer = setTimeout(() => {
        const currentToken = localStorage.getItem('access_token')
        if (currentToken) {
          const minutesLeft = this.getMinutesUntilExpiry(currentToken)
          if (minutesLeft !== null && this.onExpiryWarning) {
            this.onExpiryWarning(minutesLeft)
          }
        }
      }, warningDelay)
    }
  }

  /**
   * Stop monitoring session
   */
  stopSessionMonitoring(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
      this.refreshTimer = null
    }
    if (this.warningTimer) {
      clearTimeout(this.warningTimer)
      this.warningTimer = null
    }
  }

  /**
   * Handle session expired
   */
  private handleSessionExpired(): void {
    this.stopSessionMonitoring()
    if (this.onSessionExpired) {
      this.onSessionExpired()
    }
  }

  /**
   * Get current session status
   */
  getSessionStatus(userType: string): {
    isValid: boolean
    minutesLeft: number | null
    isExpiringSoon: boolean
    config: SessionConfig
  } {
    const token = localStorage.getItem('access_token')
    const config = this.getSessionConfig(userType)

    if (!token) {
      return {
        isValid: false,
        minutesLeft: null,
        isExpiringSoon: false,
        config,
      }
    }

    const isExpired = this.isTokenExpired(token)
    const minutesLeft = this.getMinutesUntilExpiry(token)

    return {
      isValid: !isExpired,
      minutesLeft,
      isExpiringSoon: minutesLeft !== null && minutesLeft <= config.warningThreshold,
      config,
    }
  }
}

export const sessionService = new SessionService()

