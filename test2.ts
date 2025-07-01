/**
 * Session storage manager for handling data persistence with improved error handling and encryption.
 * Provides a singleton interface for storing, retrieving, and clearing session-related data.
 * Uses Web Crypto API for optional encryption and supports fallback to in-memory cache.
 */

import { logger } from '../logger'

/**
 * Structure of session data stored in sessionStorage.
 */
export interface SessionData {
  auth?: {
    token?: string
    user?: {
      id: string
      name: string
      orgName?: string
      orgType?: 'User' | 'Organization'
    }
  }
  workflow?: {
    config?: Record<string, unknown>
    content?: string
    filename?: string
    tempPath?: string
  }
  repository?: {
    selectedOption?: string
    selectedRepos?: string[]
    organization?: string
    currentPage?: number
    searchQuery?: string
  }
  navigation?: {
    redirectUrl?: string
    currentStep?: number
  }
}

/**
 * Simple encryption/decryption utility using Web Crypto API.
 * Used internally by SessionManager for encrypting session data.
 */
class CryptoManager {
  /** Singleton instance. */
  private static instance: CryptoManager
  /** CryptoKey for encryption/decryption. */
  private key: CryptoKey | null = null
  /** Whether the key has been initialized. */
  private isInitialized: boolean = false

  /** Private constructor for singleton. */
  private constructor() {}

  /**
   * Get the singleton instance of CryptoManager.
   */
  public static getInstance(): CryptoManager {
    if (!CryptoManager.instance) {
      CryptoManager.instance = new CryptoManager()
    }
    return CryptoManager.instance
  }

  /**
   * Initialize the crypto key
   */
  /**
   * Initialize the crypto key for encryption/decryption.
   */
  private async initializeKey(): Promise<void> {
    if (this.isInitialized)
      return

    try {
      // Check if Web Crypto API is available
      if (!window.crypto || !window.crypto.subtle) {
        logger.warn('CryptoManager', 'Web Crypto API not available, encryption disabled')
        this.isInitialized = false
        return
      }

      // Generate a deterministic key based on session identifier
      const keyMaterial = await this.getKeyMaterial()
      this.key = await window.crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: new TextEncoder().encode('session-storage-salt'),
          iterations: 100000,
          hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt'],
      )
      this.isInitialized = true
      logger.debug('CryptoManager', 'Encryption key initialized successfully')
    }
    catch (error) {
      logger.error('CryptoManager', 'Failed to initialize encryption key:', error)
      this.isInitialized = false
    }
  }

  /**
   * Get key material for encryption
   */
  /**
   * Get key material for encryption, derived from user agent and origin.
   */
  private async getKeyMaterial(): Promise<CryptoKey> {
    // Use a combination of user agent and session identifier for key derivation
    const identifier = `${navigator.userAgent}-${window.location.origin}-session-key`
    const encoder = new TextEncoder()
    return await window.crypto.subtle.importKey(
      'raw',
      encoder.encode(identifier),
      { name: 'PBKDF2' },
      false,
      ['deriveKey'],
    )
  }

  /**
   * Encrypt data
   */
  /**
   * Encrypt a string using AES-GCM and return base64-encoded result.
   * @param data - The string to encrypt.
   * @returns Encrypted string (base64) or original data if encryption fails.
   */
  public async encrypt(data: string): Promise<string> {
    try {
      if (!this.isInitialized) {
        await this.initializeKey()
      }

      if (!this.key) {
        throw new Error('Encryption key not available')
      }

      const encoder = new TextEncoder()
      const dataBuffer = encoder.encode(data)

      // Generate a random IV for each encryption
      const iv = window.crypto.getRandomValues(new Uint8Array(12))

      const encryptedBuffer = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        this.key,
        dataBuffer,
      )

      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength)
      combined.set(iv)
      combined.set(new Uint8Array(encryptedBuffer), iv.length)

      // Convert to base64 for storage
      return btoa(String.fromCharCode.apply(null, Array.from(combined)))
    }
    catch (error) {
      logger.error('CryptoManager', 'Encryption failed:', error)
      // Return original data if encryption fails to maintain functionality
      return data
    }
  }

  /**
   * Check if Web Crypto API is supported in the current environment.
   */
  public isSupported(): boolean {
    return !!(window.crypto && window.crypto.subtle)
  }
}

/**
 * Singleton session manager for handling session data with optional encryption and error handling.
 * Provides get/set/remove/clear methods and navigation helpers.
 */
class SessionManager {
  /** Singleton instance. */
  private static instance: SessionManager
  /** Key used for sessionStorage. */
  private readonly STORAGE_KEY = 'app_session'
  /** Maximum allowed storage size (bytes). */
  private readonly MAX_STORAGE_SIZE = 8 * 1024 * 1024
  /** In-memory cache of session data. */
  private cache: SessionData = {}
  /** Whether sessionStorage is available. */
  private isStorageAvailable: boolean = false
  /** CryptoManager instance for encryption. */
  private cryptoManager: CryptoManager
  /** Whether encryption is enabled. */
  private encryptionEnabled: boolean = false

  /**
   * Private constructor. Initializes crypto manager and checks storage/encryption support.
   */
  private constructor() {
    this.cryptoManager = CryptoManager.getInstance()
    this.checkStorageAvailability()
    this.checkEncryptionSupport()
  }

  /**
   * Get the singleton instance of SessionManager.
   */
  public static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager()
    }
    return SessionManager.instance
  }

  /**
   * Check if sessionStorage is available and set isStorageAvailable flag.
   */
  private checkStorageAvailability(): void {
    try {
      const testKey = '__storage_test__'
      const testValue = 'test'

      // Test appStorage availability
      window.sessionStorage.setItem(testKey, testValue)
      const retrieved = window.sessionStorage.getItem(testKey)
      window.sessionStorage.removeItem(testKey)

      if (retrieved !== testValue) {
        throw new Error('appStorage test failed')
      }

      this.isStorageAvailable = true
      logger.debug('SessionManager', 'Session storage is available')
    }
    catch (error) {
      this.isStorageAvailable = false
      logger.warn('SessionManager', 'Session storage is not available, using memory cache:', error)
    }
  }

  /**
   * Check if encryption is supported and set encryptionEnabled flag.
   */
  private checkEncryptionSupport(): void {
    this.encryptionEnabled = this.cryptoManager.isSupported()
    if (this.encryptionEnabled) {
      logger.debug('SessionManager', 'Encryption is enabled')
    }
    else {
      logger.warn('SessionManager', 'Web Crypto API not supported, data will be stored unencrypted')
    }
  }

  /**
   * Get the default (empty) session state structure.
   */
  private getDefaultState(): SessionData {
    return {
      auth: {},
      workflow: {},
      repository: {},
      navigation: {},
    }
  }

  /**
   * Remove session data from sessionStorage.
   */
  private clearStorage(): void {
    try {
      if (this.isStorageAvailable) {
        window.sessionStorage.removeItem(this.STORAGE_KEY)
        logger.debug('SessionManager', 'Storage cleared successfully')
      }
    }
    catch (error) {
      logger.error('SessionManager', 'Failed to clear storage:', error)
    }
  }

  /**
   * Persist the in-memory cache to sessionStorage, encrypting if enabled.
   * Handles quota errors and cache reduction if needed.
   */
  private async persistCache(): Promise<void> {
    if (!this.isStorageAvailable) {
      logger.debug('SessionManager', 'Session storage not available, using memory cache only')
      return
    }

    try {
      // Validate cache before persisting
      if (!this.validateCache()) {
        logger.warn('SessionManager', 'Cache validation failed, not persisting')
        return
      }

      const serializedData = JSON.stringify(this.cache)

      // Check size before encryption
      if (serializedData.length > this.MAX_STORAGE_SIZE) {
        logger.warn('SessionManager', 'Data too large to store, truncating cache')
        // Try to reduce cache size by removing non-essential data
        const reducedCache = this.reduceCache()
        const reducedSerialized = JSON.stringify(reducedCache)

        if (reducedSerialized.length > this.MAX_STORAGE_SIZE) {
          logger.error('SessionManager', 'Even reduced cache is too large, not persisting')
          return
        }

        this.cache = reducedCache
        return this.persistCache() // Retry with reduced cache
      }

      let dataToStore = serializedData

      // Encrypt data if encryption is enabled
      if (this.encryptionEnabled) {
        try {
          dataToStore = await this.cryptoManager.encrypt(serializedData)

          // Check encrypted size
          if (dataToStore.length > this.MAX_STORAGE_SIZE) {
            logger.warn('SessionManager', 'Encrypted data too large, storing unencrypted')
            dataToStore = serializedData
          }
        }
        catch (encryptError) {
          logger.warn('SessionManager', 'Failed to encrypt data, storing unencrypted:', encryptError)
          // Continue with unencrypted data to maintain functionality
        }
      }

      window.sessionStorage.setItem(this.STORAGE_KEY, dataToStore)
      logger.debug('SessionManager', 'Cache persisted successfully', {
        size: dataToStore.length,
        encrypted: this.encryptionEnabled && dataToStore !== serializedData,
      })
    }
    catch (error) {
      if (error instanceof Error) {
        if (error.name === 'QuotaExceededError' || error.message.includes('quota')) {
          logger.error('SessionManager', 'Storage quota exceeded, clearing old data')
          // Try to free up space by clearing and retrying with reduced cache
          this.clearStorage()

          try {
            const reducedCache = this.reduceCache()
            const reducedSerialized = JSON.stringify(reducedCache)

            if (reducedSerialized.length <= this.MAX_STORAGE_SIZE) {
              this.cache = reducedCache
              window.sessionStorage.setItem(this.STORAGE_KEY, reducedSerialized)
              logger.info('SessionManager', 'Successfully stored reduced cache after quota error')
            }
            else {
              logger.error('SessionManager', 'Cannot reduce cache enough to fit in storage')
            }
          }
          catch (retryError) {
            logger.error('SessionManager', 'Failed to persist data after clearing storage:', retryError)
          }
        }
        else {
          logger.error('SessionManager', 'Failed to persist session data:', error)
        }
      }
    }
  }

  /**
   * Reduce cache size by removing non-essential data
   */
  /**
   * Reduce cache size by removing non-essential or large data before persisting.
   */
  private reduceCache(): SessionData {
    const reduced: SessionData = {
      auth: this.cache.auth || {},
      workflow: {
        config: this.cache.workflow?.config,
        filename: this.cache.workflow?.filename,
        // Remove large content
      },
      repository: {
        selectedOption: this.cache.repository?.selectedOption,
        organization: this.cache.repository?.organization,
        currentPage: this.cache.repository?.currentPage,
        // Remove large selectedRepos array if too big
        selectedRepos: this.cache.repository?.selectedRepos?.length > 100
          ? this.cache.repository.selectedRepos.slice(0, 100)
          : this.cache.repository?.selectedRepos,
      },
      navigation: this.cache.navigation || {},
    }

    logger.debug('SessionManager', 'Cache reduced for storage')
    return reduced
  }

  /**
   * Get a nested value from an object using a path array.
   */
  private getNestedValue<T>(obj: any, path: string[]): T | undefined {
    try {
      return path.reduce((acc, key) => (acc && typeof acc === 'object' ? acc[key] : undefined), obj) as T | undefined
    }
    catch (error) {
      logger.error('SessionManager', 'Error getting nested value:', error)
      return undefined
    }
  }

  /**
   * Set a nested value in an object using a path array.
   */
  private setNestedValue(obj: any, path: string[], value: any): void {
    try {
      const lastKey = path.pop()
      if (!lastKey)
        return

      const target = path.reduce((acc, key) => {
        if (!(key in acc))
          acc[key] = {}
        return acc[key]
      }, obj)

      target[lastKey] = value
    }
    catch (error) {
      logger.error('SessionManager', 'Error setting nested value:', error)
    }
  }

  // Synchronous methods that work with cached data (primary interface)
  /**
   * Get a value from the session cache by key (dot notation supported).
   * @param key - Key string (e.g. 'auth.token').
   * @returns Value or undefined if not found.
   */
  public get<T = unknown>(key: string): T | undefined {
    try {
      const path = key.split('.')
      return this.getNestedValue<T>(this.cache, path)
    }
    catch (error) {
      logger.error('SessionManager', `Failed to get data for key ${key}:`, error)
      return undefined
    }
  }

  /**
   * Set a value in the session cache by key (dot notation supported).
   * @param key - Key string (e.g. 'auth.token').
   * @param value - Value to set.
   */
  public set(key: string, value: unknown): void {
    try {
      // Validate input
      if (!key || typeof key !== 'string') {
        logger.warn('SessionManager', 'Invalid key provided to set method')
        return
      }

      const path = key.split('.')
      this.setNestedValue(this.cache, [...path], value)

      // Persist asynchronously without blocking
      this.persistCache().catch((error) => {
        logger.error('SessionManager', 'Failed to persist data asynchronously:', error)
      })

      logger.debug('SessionManager', `Session data updated for key ${key}`)
    }
    catch (error) {
      logger.error('SessionManager', `Failed to set data for key ${key}:`, error)
    }
  }

  /**
   * Remove a value from the session cache by key (dot notation supported).
   * @param key - Key string (e.g. 'auth.token').
   */
  public remove(key: string): void {
    try {
      if (!key || typeof key !== 'string') {
        logger.warn('SessionManager', 'Invalid key provided to remove method')
        return
      }

      const path = key.split('.')
      const lastKey = path.pop()
      if (!lastKey)
        return

      const parent = this.getNestedValue(this.cache, path)
      if (parent && typeof parent === 'object') {
        delete parent[lastKey]

        // Persist asynchronously without blocking
        this.persistCache().catch((error) => {
          logger.error('SessionManager', 'Failed to persist data asynchronously:', error)
        })

        logger.debug('SessionManager', `Session data removed for key ${key}`)
      }
    }
    catch (error) {
      logger.error('SessionManager', `Failed to remove data for key ${key}:`, error)
    }
  }

  /**
   * Clear all session data from storage and in-memory cache.
   * Also removes related keys from localStorage.
   */
  public clear(): void {
    try {
      this.clearStorage()
      this.cache = this.getDefaultState()

      // Also clear appStorage to prevent any cached data issues
      const appStorage = window.localStorage
      try {
        // Only clear our specific keys, not all appStorage
        const keysToRemove: string[] = []
        for (let i = 0; i < appStorage.length; i++) {
          const key = appStorage.key(i)
          if (key && (key.startsWith('app_') || key.startsWith('session_') || key === this.STORAGE_KEY)) {
            keysToRemove.push(key)
          }
        }

        keysToRemove.forEach((key) => {
          try {
            appStorage.removeItem(key)
          }
          catch (e) {
            logger.warn('SessionManager', `Failed to remove appStorage key ${key}:`, e)
          }
        })
      }
      catch (appStorageError) {
        logger.warn('SessionManager', 'Failed to clear appStorage:', appStorageError)
      }

      logger.info('SessionManager', 'Session storage cleared')
    }
    catch (error) {
      logger.error('SessionManager', 'Failed to clear session storage:', error)
    }
  }

  // Navigation-specific methods
  /**
   * Set the redirect URL in session navigation state.
   * @param url - URL to set for redirection.
   */
  public setRedirectUrl(url: string): void {
    if (url && typeof url === 'string' && url.trim()) {
      this.set('navigation.redirectUrl', url.trim())
    }
  }

  /**
   * Get the redirect URL from session navigation state.
   * @returns Redirect URL or undefined.
   */
  public getRedirectUrl(): string | undefined {
    const url = this.get<string>('navigation.redirectUrl')
    return url && typeof url === 'string' ? url.trim() : undefined
  }

  /**
   * Set the current step in session navigation state.
   * @param step - Step number to set.
   */
  public setCurrentStep(step: number): void {
    if (typeof step === 'number' && step > 0) {
      this.set('navigation.currentStep', step)
    }
  }

  /**
   * Get the current step from session navigation state.
   * @returns Step number or undefined.
   */
  public getCurrentStep(): number | undefined {
    const step = this.get<number>('navigation.currentStep')
    return typeof step === 'number' ? step : undefined
  }

  /**
   * Validate that the cache contains all required top-level keys.
   * @returns True if valid, false otherwise.
   */
  public validateCache(): boolean {
    try {
      const requiredKeys = ['auth', 'workflow', 'repository', 'navigation']
      return requiredKeys.every(key => key in this.cache)
    }
    catch (error) {
      logger.error('SessionManager', 'Cache validation failed:', error)
      return false
    }
  }
}

export const sessionStorage = SessionManager.getInstance()
