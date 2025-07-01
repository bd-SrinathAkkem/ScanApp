/**
 * Enhanced Session Manager with proper timeout handling.
 * Handles session expiration, warning, extension, and user activity tracking.
 * Provides singleton access and callback subscription for session events.
 */

import { env } from '../../config/env'
import { logger } from '../logger'

/**
 * Information about the current session's validity and timing.
 */
export interface SessionInfo {
  /** Whether the session is currently valid. */
  isValid: boolean
  /** Timestamp (ms) when the session expires. */
  expiresAt: number
  /** Timestamp (ms) of last user activity. */
  lastActivity: number
  /** Whether a warning has been shown for this session. */
  warningShown: boolean
}

/**
 * Callback signature for session warning events.
 * @param minutesRemaining - Minutes left before session expiration.
 */
export interface SessionWarningCallback {
  (minutesRemaining: number): void
}

/**
 * Callback signature for session expiration events.
 */
export interface SessionExpiredCallback {
  (): void
}

/**
 * Singleton class for managing session timeout, warning, and expiration.
 * Tracks user activity, schedules warnings, and notifies subscribers.
 */
class SessionTimeoutManager {
  /** Singleton instance. */
  private static instance: SessionTimeoutManager
  /** Current session info, or null if not initialized. */
  private sessionInfo: SessionInfo | null = null
  /** Interval for periodic session checks. */
  private checkInterval: NodeJS.Timeout | null = null
  /** Registered callbacks for session warning events. */
  private warningCallbacks: Set<SessionWarningCallback> = new Set()
  /** Registered callbacks for session expiration events. */
  private expiredCallbacks: Set<SessionExpiredCallback> = new Set()
  /** Whether the page is currently active/visible. */
  private isActive: boolean = true
  /** Timestamp of last user activity. */
  private lastUserActivity: number = Date.now()
  /** Throttle timer for user activity events. */
  private activityThrottle: NodeJS.Timeout | null = null
  /** Whether the session manager is initialized. */
  private isInitialized: boolean = false
  /** Timeout for session warning. */
  private warningTimeout: NodeJS.Timeout | null = null
  /** Timeout for session expiration. */
  private expirationTimeout: NodeJS.Timeout | null = null

  /**
   * Private constructor. Sets up listeners for user activity, visibility, and unload events.
   */
  private constructor() {
    this.setupActivityListeners()
    this.setupVisibilityListeners()
    this.setupBeforeUnloadHandler()
  }

  /**
   * Get the singleton instance of SessionTimeoutManager.
   */
  public static getInstance(): SessionTimeoutManager {
    if (!SessionTimeoutManager.instance) {
      SessionTimeoutManager.instance = new SessionTimeoutManager()
    }
    return SessionTimeoutManager.instance
  }

  /**
   * Initialize session with timeout
   */
  /**
   * Initialize session with timeout and start periodic checks.
   * Sets up sessionInfo and schedules warning/expiration.
   */
  public initializeSession(): void {
    try {
      const now = Date.now()
      const timeoutMs = env.session.timeoutMinutes * 60 * 1000

      // Validate timeout value
      if (timeoutMs <= 0 || timeoutMs > 24 * 60 * 60 * 1000) { // Max 24 hours
        logger.warn('SessionTimeoutManager', 'Invalid timeout value, using default 30 minutes')
        const defaultTimeoutMs = 30 * 60 * 1000
        this.sessionInfo = {
          isValid: true,
          expiresAt: now + defaultTimeoutMs,
          lastActivity: now,
          warningShown: false,
        }
      }
      else {
        this.sessionInfo = {
          isValid: true,
          expiresAt: now + timeoutMs,
          lastActivity: now,
          warningShown: false,
        }
      }

      this.lastUserActivity = now
      this.isInitialized = true
      this.startPeriodicCheck()
      this.scheduleTimeouts()

      logger.info('SessionTimeoutManager', 'Session initialized', {
        timeoutMinutes: env.session.timeoutMinutes,
        expiresAt: new Date(this.sessionInfo.expiresAt).toISOString(),
      })
    }
    catch (error) {
      logger.error('SessionTimeoutManager', 'Failed to initialize session:', error)
      // Fallback initialization
      const now = Date.now()
      const fallbackTimeout = 30 * 60 * 1000 // 30 minutes
      this.sessionInfo = {
        isValid: true,
        expiresAt: now + fallbackTimeout,
        lastActivity: now,
        warningShown: false,
      }
      this.lastUserActivity = now
      this.isInitialized = true
      this.startPeriodicCheck()
      this.scheduleTimeouts()
    }
  }

  /**
   * Schedule warning and expiration timeouts
   */
  /**
   * Schedule warning and expiration timeouts based on sessionInfo.
   */
  private scheduleTimeouts(): void {
    this.clearTimeouts()

    if (!this.sessionInfo)
      return

    const now = Date.now()
    const timeUntilExpiration = this.sessionInfo.expiresAt - now
    const warningTime = env.session.warningMinutes * 60 * 1000

    // Schedule warning timeout
    if (timeUntilExpiration > warningTime) {
      const timeUntilWarning = timeUntilExpiration - warningTime
      this.warningTimeout = setTimeout(() => {
        this.showSessionWarning()
      }, timeUntilWarning)
    }
    else if (timeUntilExpiration > 0) {
      // Show warning immediately if we're already in warning period
      setTimeout(() => this.showSessionWarning(), 100)
    }

    // Schedule expiration timeout
    if (timeUntilExpiration > 0) {
      this.expirationTimeout = setTimeout(() => {
        this.handleSessionExpiration()
      }, timeUntilExpiration)
    }
    else {
      // Session already expired
      setTimeout(() => this.handleSessionExpiration(), 100)
    }

    logger.debug('SessionTimeoutManager', 'Timeouts scheduled', {
      timeUntilExpiration: Math.floor(timeUntilExpiration / 1000),
      timeUntilWarning: Math.floor((timeUntilExpiration - warningTime) / 1000),
    })
  }

  /**
   * Clear scheduled timeouts
   */
  /**
   * Clear any scheduled warning and expiration timeouts.
   */
  private clearTimeouts(): void {
    if (this.warningTimeout) {
      clearTimeout(this.warningTimeout)
      this.warningTimeout = null
    }
    if (this.expirationTimeout) {
      clearTimeout(this.expirationTimeout)
      this.expirationTimeout = null
    }
  }

  /**
   * Show session warning
   */
  /**
   * Show session warning and notify all registered warning callbacks.
   */
  private showSessionWarning(): void {
    if (!this.sessionInfo || !this.sessionInfo.isValid)
      return

    const minutesRemaining = this.getMinutesRemaining()
    if (minutesRemaining > 0 && !this.sessionInfo.warningShown) {
      this.sessionInfo.warningShown = true
      this.notifyWarning(minutesRemaining)
      logger.warn('SessionTimeoutManager', 'Session warning shown', { minutesRemaining })
    }
  }

  /**
   * Handle session expiration
   */
  /**
   * Handle session expiration, notify callbacks, and redirect if needed.
   */
  private handleSessionExpiration(): void {
    if (!this.sessionInfo)
      return

    logger.warn('SessionTimeoutManager', 'Session expired due to inactivity')

    this.sessionInfo.isValid = false
    this.clearTimeouts()
    this.stopPeriodicCheck()

    // Notify all callbacks
    this.notifyExpired()

    // Force redirect to log in if no callbacks handled it
    setTimeout(() => {
      if (window.location.pathname !== '/') {
        logger.info('SessionTimeoutManager', 'Force redirecting to login due to session expiration')
        window.location.href = '/'
      }
    }, 1000)
  }

  /**
   * Extend session timeout on user activity
   */
  /**
   * Extend session timeout on user activity and reschedule timeouts.
   */
  public extendSession(): void {
    try {
      if (!this.sessionInfo || !this.isInitialized)
        return

      const now = Date.now()
      const timeoutMs = Math.min(env.session.timeoutMinutes * 60 * 1000, 24 * 60 * 60 * 1000) // Max 24 hours

      this.sessionInfo.expiresAt = now + timeoutMs
      this.sessionInfo.lastActivity = now
      this.sessionInfo.warningShown = false
      this.lastUserActivity = now

      // Reschedule timeouts with new expiration time
      this.scheduleTimeouts()

      logger.debug('SessionTimeoutManager', 'Session extended', {
        newExpiresAt: new Date(this.sessionInfo.expiresAt).toISOString(),
      })
    }
    catch (error) {
      logger.error('SessionTimeoutManager', 'Failed to extend session:', error)
    }
  }

  /**
   * Check if session is valid
   */
  /**
   * Check if the session is currently valid.
   * @returns True if valid, false if expired or not initialized.
   */
  public isSessionValid(): boolean {
    try {
      if (!this.sessionInfo || !this.isInitialized)
        return false

      const now = Date.now()
      const isValid = this.sessionInfo.isValid && now < this.sessionInfo.expiresAt

      if (!isValid && this.sessionInfo.isValid) {
        // Session just expired
        this.handleSessionExpiration()
      }

      return isValid
    }
    catch (error) {
      logger.error('SessionTimeoutManager', 'Error checking session validity:', error)
      return false
    }
  }

  /**
   * Get session information
   */
  /**
   * Get a copy of the current session info, or null if not initialized.
   */
  public getSessionInfo(): SessionInfo | null {
    try {
      return this.sessionInfo ? { ...this.sessionInfo } : null
    }
    catch (error) {
      logger.error('SessionTimeoutManager', 'Error getting session info:', error)
      return null
    }
  }

  /**
   * Get minutes remaining until session expires
   */
  /**
   * Get the number of minutes remaining until session expiration.
   * @returns Minutes remaining, or 0 if invalid.
   */
  public getMinutesRemaining(): number {
    try {
      if (!this.sessionInfo || !this.sessionInfo.isValid)
        return 0

      const now = Date.now()
      const remaining = this.sessionInfo.expiresAt - now
      return Math.max(0, Math.floor(remaining / (60 * 1000)))
    }
    catch (error) {
      logger.error('SessionTimeoutManager', 'Error calculating minutes remaining:', error)
      return 0
    }
  }

  /**
   * Get seconds remaining until session expires
   */
  /**
   * Get the number of seconds remaining until session expiration.
   * @returns Seconds remaining, or 0 if invalid.
   */
  public getSecondsRemaining(): number {
    try {
      if (!this.sessionInfo || !this.sessionInfo.isValid)
        return 0

      const now = Date.now()
      const remaining = this.sessionInfo.expiresAt - now
      return Math.max(0, Math.floor(remaining / 1000))
    }
    catch (error) {
      logger.error('SessionTimeoutManager', 'Error calculating seconds remaining:', error)
      return 0
    }
  }

  /**
   * Invalidate session
   */
  /**
   * Invalidate the session and stop all timers/callbacks.
   */
  public invalidateSession(): void {
    try {
      if (this.sessionInfo) {
        this.sessionInfo.isValid = false
      }
      this.clearTimeouts()
      this.stopPeriodicCheck()

      logger.info('SessionTimeoutManager', 'Session invalidated')
    }
    catch (error) {
      logger.error('SessionTimeoutManager', 'Error invalidating session:', error)
    }
  }

  /**
   * Clear session completely
   */
  /**
   * Clear all session state, callbacks, and timers.
   */
  public clearSession(): void {
    try {
      this.sessionInfo = null
      this.isInitialized = false
      this.clearTimeouts()
      this.stopPeriodicCheck()
      this.warningCallbacks.clear()
      this.expiredCallbacks.clear()

      // Clear activity throttle
      if (this.activityThrottle) {
        clearTimeout(this.activityThrottle)
        this.activityThrottle = null
      }

      logger.info('SessionTimeoutManager', 'Session cleared')
    }
    catch (error) {
      logger.error('SessionTimeoutManager', 'Error clearing session:', error)
    }
  }

  /**
   * Subscribe to session warning notifications
   */
  /**
   * Subscribe to session warning notifications.
   * @param callback - Function to call when warning is triggered.
   * @returns Unsubscribe function.
   */
  public onSessionWarning(callback: SessionWarningCallback): () => void {
    this.warningCallbacks.add(callback)
    return () => this.warningCallbacks.delete(callback)
  }

  /**
   * Subscribe to session expired notifications
   */
  /**
   * Subscribe to session expired notifications.
   * @param callback - Function to call when session expires.
   * @returns Unsubscribe function.
   */
  public onSessionExpired(callback: SessionExpiredCallback): () => void {
    this.expiredCallbacks.add(callback)
    return () => this.expiredCallbacks.delete(callback)
  }

  /**
   * Setup user activity listeners
   */
  /**
   * Setup listeners for user activity to extend session on interaction.
   */
  private setupActivityListeners(): void {
    try {
      const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click', 'keydown', 'wheel']

      const handleActivity = () => {
        this.lastUserActivity = Date.now()
        if (this.sessionInfo && this.sessionInfo.isValid && this.isInitialized) {
          this.extendSession()
        }
      }

      // Throttle activity updates to avoid excessive calls
      const throttledHandler = () => {
        if (this.activityThrottle)
          return

        this.activityThrottle = setTimeout(() => {
          handleActivity()
          this.activityThrottle = null
        }, 1000) // Throttle to once per second
      }

      events.forEach((event) => {
        try {
          document.addEventListener(event, throttledHandler, { passive: true })
        }
        catch (error) {
          logger.warn('SessionTimeoutManager', `Failed to add listener for ${event}:`, error)
        }
      })

      logger.debug('SessionTimeoutManager', 'Activity listeners setup complete')
    }
    catch (error) {
      logger.error('SessionTimeoutManager', 'Failed to setup activity listeners:', error)
    }
  }

  /**
   * Setup page visibility listeners
   */
  /**
   * Setup listeners for page visibility and window focus/blur to manage session state.
   */
  private setupVisibilityListeners(): void {
    try {
      const handleVisibilityChange = () => {
        try {
          const wasActive = this.isActive
          this.isActive = !document.hidden

          if (this.isActive && !wasActive) {
            // Page became visible - check session validity
            logger.debug('SessionTimeoutManager', 'Page became visible, checking session')

            if (this.sessionInfo && this.isInitialized) {
              const now = Date.now()

              // Check if session expired while page was hidden
              if (now >= this.sessionInfo.expiresAt) {
                logger.info('SessionTimeoutManager', 'Session expired while page was hidden')
                this.handleSessionExpiration()
                return
              }

              // Check for excessive inactivity
              const timeSinceLastActivity = now - this.lastUserActivity
              const maxInactiveTime = env.session.timeoutMinutes * 60 * 1000

              if (timeSinceLastActivity > maxInactiveTime) {
                logger.info('SessionTimeoutManager', 'Session expired due to inactivity while page was hidden', {
                  timeSinceLastActivity: Math.floor(timeSinceLastActivity / 1000),
                  maxInactiveTimeSeconds: Math.floor(maxInactiveTime / 1000),
                })
                this.handleSessionExpiration()
              }
              else {
                // Extend session since user is back and session is still valid
                this.extendSession()
              }
            }
          }
          else if (!this.isActive && wasActive) {
            logger.debug('SessionTimeoutManager', 'Page became hidden')
          }
        }
        catch (error) {
          logger.error('SessionTimeoutManager', 'Error in visibility change handler:', error)
        }
      }

      document.addEventListener('visibilitychange', handleVisibilityChange)

      // Handle window focus/blur as backup
      const handleFocus = () => {
        try {
          if (!this.isActive) {
            this.isActive = true
            handleVisibilityChange()
          }
        }
        catch (error) {
          logger.error('SessionTimeoutManager', 'Error in focus handler:', error)
        }
      }

      const handleBlur = () => {
        try {
          this.isActive = false
        }
        catch (error) {
          logger.error('SessionTimeoutManager', 'Error in blur handler:', error)
        }
      }

      window.addEventListener('focus', handleFocus)
      window.addEventListener('blur', handleBlur)

      logger.debug('SessionTimeoutManager', 'Visibility listeners setup complete')
    }
    catch (error) {
      logger.error('SessionTimeoutManager', 'Failed to setup visibility listeners:', error)
    }
  }

  /**
   * Setup beforeunload handler to save session state
   */
  /**
   * Setup handler to save session state before page unload and restore on load.
   */
  private setupBeforeUnloadHandler(): void {
    try {
      window.addEventListener('beforeunload', () => {
        // Save current session state before page unload
        if (this.sessionInfo && this.isInitialized) {
          try {
            appStorage.setItem('session_state', JSON.stringify({
              expiresAt: this.sessionInfo.expiresAt,
              lastActivity: this.lastUserActivity,
              savedAt: Date.now(),
            }))
          }
          catch (error) {
            logger.warn('SessionTimeoutManager', 'Failed to save session state on unload:', error)
          }
        }
      })

      // Check for saved session state on load
      try {
        const savedState = appStorage.getItem('session_state')
        if (savedState) {
          const parsed = JSON.parse(savedState)
          const now = Date.now()

          // If session was saved recently and hasn't expired, we can restore it
          if (parsed.expiresAt > now && (now - parsed.savedAt) < 60000) { // Within 1 minute
            this.lastUserActivity = parsed.lastActivity
            logger.debug('SessionTimeoutManager', 'Restored session state from previous page load')
          }

          // Clean up saved state
          appStorage.removeItem('session_state')
        }
      }
      catch (error) {
        logger.warn('SessionTimeoutManager', 'Failed to restore session state:', error)
      }
    }
    catch (error) {
      logger.error('SessionTimeoutManager', 'Failed to setup beforeunload handler:', error)
    }
  }

  /**
   * Start periodic session checking
   */
  /**
   * Start periodic session checking at configured interval.
   */
  private startPeriodicCheck(): void {
    try {
      this.stopPeriodicCheck() // Clear any existing interval

      const intervalMs = Math.max(env.session.checkIntervalSeconds * 1000, 5000) // Minimum 5 seconds

      this.checkInterval = setInterval(() => {
        try {
          this.performPeriodicCheck()
        }
        catch (error) {
          logger.error('SessionTimeoutManager', 'Error in periodic check:', error)
        }
      }, intervalMs)

      logger.debug('SessionTimeoutManager', 'Periodic check started', {
        intervalSeconds: env.session.checkIntervalSeconds,
      })
    }
    catch (error) {
      logger.error('SessionTimeoutManager', 'Failed to start periodic check:', error)
    }
  }

  /**
   * Stop periodic session checking
   */
  /**
   * Stop periodic session checking.
   */
  private stopPeriodicCheck(): void {
    try {
      if (this.checkInterval) {
        clearInterval(this.checkInterval)
        this.checkInterval = null
      }
    }
    catch (error) {
      logger.error('SessionTimeoutManager', 'Error stopping periodic check:', error)
    }
  }

  /**
   * Perform periodic session check
   */
  /**
   * Perform a periodic check for session validity and warning threshold.
   */
  private performPeriodicCheck(): void {
    try {
      if (!this.sessionInfo || !this.isInitialized)
        return

      // Check if session is still valid
      if (!this.isSessionValid()) {
        return // Session expired, callbacks already triggered
      }

      const minutesRemaining = this.getMinutesRemaining()
      const warningThreshold = Math.max(env.session.warningMinutes, 1) // Minimum 1 minute

      // Show warning if approaching expiration and not already shown
      if (minutesRemaining <= warningThreshold && !this.sessionInfo.warningShown) {
        this.showSessionWarning()
      }

      logger.debug('SessionTimeoutManager', 'Periodic check completed', {
        minutesRemaining,
        isValid: this.sessionInfo.isValid,
        isActive: this.isActive,
      })
    }
    catch (error) {
      logger.error('SessionTimeoutManager', 'Error in periodic check:', error)
    }
  }

  /**
   * Notify warning callbacks
   */
  /**
   * Notify all registered warning callbacks with minutes remaining.
   */
  private notifyWarning(minutesRemaining: number): void {
    this.warningCallbacks.forEach((callback) => {
      try {
        callback(minutesRemaining)
      }
      catch (error) {
        logger.error('SessionTimeoutManager', 'Error in warning callback:', error)
      }
    })
  }

  /**
   * Notify expired callbacks
   */
  /**
   * Notify all registered expired callbacks.
   */
  private notifyExpired(): void {
    this.expiredCallbacks.forEach((callback) => {
      try {
        callback()
      }
      catch (error) {
        logger.error('SessionTimeoutManager', 'Error in expired callback:', error)
      }
    })
  }

  /**
   * Force session expiration (for testing or manual logout)
   */
  /**
   * Force session expiration (for testing or manual logout).
   */
  public forceExpiration(): void {
    logger.info('SessionTimeoutManager', 'Forcing session expiration')
    this.handleSessionExpiration()
  }

  /**
   * Get detailed session status for debugging
   */
  /**
   * Get detailed session status for debugging and diagnostics.
   * @returns Object with session state details.
   */
  public getSessionStatus(): {
    isInitialized: boolean
    isValid: boolean
    minutesRemaining: number
    secondsRemaining: number
    isActive: boolean
    warningShown: boolean
    lastActivity: string
    expiresAt: string
  } {
    return {
      isInitialized: this.isInitialized,
      isValid: this.sessionInfo?.isValid ?? false,
      minutesRemaining: this.getMinutesRemaining(),
      secondsRemaining: this.getSecondsRemaining(),
      isActive: this.isActive,
      warningShown: this.sessionInfo?.warningShown ?? false,
      lastActivity: new Date(this.lastUserActivity).toISOString(),
      expiresAt: this.sessionInfo ? new Date(this.sessionInfo.expiresAt).toISOString() : 'N/A',
    }
  }
}

export const sessionTimeoutManager = SessionTimeoutManager.getInstance()
