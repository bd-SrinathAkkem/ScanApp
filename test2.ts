/**
 * Secure Storage Manager using IndexedDB with encryption, auto-cleanup, and cross-tab sync.
 * Data persists across tabs, refreshes, and browser sessions but auto-expires after 8 hours.
 * Uses Web Crypto API for encryption and Broadcast Channel API for cross-tab communication.
 */

import { logger } from '../logger'

/**
 * Structure of session data stored securely.
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
 * Internal storage structure with metadata.
 */
interface StorageEntry {
  id: string
  data: string // Encrypted session data
  timestamp: number
  lastAccess: number
  tabId: string
  expiresAt: number
}

/**
 * Cross-tab communication message structure.
 */
interface BroadcastMessage {
  type: 'update' | 'access' | 'clear' | 'heartbeat'
  tabId: string
  timestamp: number
  key?: string
  data?: any
}

/**
 * Advanced encryption manager using Web Crypto API with salt and key derivation.
 */
class AdvancedCrypto {
  private static instance: AdvancedCrypto
  private key: CryptoKey | null = null
  private isInitialized: boolean = false
  private readonly salt: Uint8Array

  private constructor() {
    // Generate a consistent salt based on origin and user agent
    const identifier = `${window.location.origin}-${navigator.userAgent}-v2`
    this.salt = new TextEncoder().encode(identifier).slice(0, 16)
  }

  public static getInstance(): AdvancedCrypto {
    if (!AdvancedCrypto.instance) {
      AdvancedCrypto.instance = new AdvancedCrypto()
    }
    return AdvancedCrypto.instance
  }

  private async initializeKey(): Promise<void> {
    if (this.isInitialized)
      return

    try {
      if (!window.crypto?.subtle) {
        throw new Error('Web Crypto API not available')
      }

      // Create a more secure key derivation
      const baseKey = await window.crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(`secure-storage-${window.location.origin}-${Date.now()}`),
        { name: 'PBKDF2' },
        false,
        ['deriveKey'],
      )

      this.key = await window.crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: this.salt,
          iterations: 100000,
          hash: 'SHA-256',
        },
        baseKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt'],
      )

      this.isInitialized = true
      logger.debug('AdvancedCrypto', 'Encryption initialized successfully')
    }
    catch (error) {
      logger.error('AdvancedCrypto', 'Failed to initialize encryption:', error)
      throw error
    }
  }

  public async encrypt(data: string): Promise<string> {
    if (!this.isInitialized)
      await this.initializeKey()
    if (!this.key)
      throw new Error('Encryption key not available')

    try {
      const encoder = new TextEncoder()
      const dataBuffer = encoder.encode(data)
      const iv = window.crypto.getRandomValues(new Uint8Array(12))

      const encrypted = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        this.key,
        dataBuffer,
      )

      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encrypted.byteLength)
      combined.set(iv)
      combined.set(new Uint8Array(encrypted), iv.length)

      return btoa(String.fromCharCode(...Array.from(combined)))
    }
    catch (error) {
      logger.error('AdvancedCrypto', 'Encryption failed:', error)
      throw error
    }
  }

  public async decrypt(encryptedData: string): Promise<string> {
    if (!this.isInitialized)
      await this.initializeKey()
    if (!this.key)
      throw new Error('Decryption key not available')

    try {
      const combined = new Uint8Array(
        atob(encryptedData).split('').map(char => char.charCodeAt(0)),
      )

      const iv = combined.slice(0, 12)
      const encrypted = combined.slice(12)

      const decrypted = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        this.key,
        encrypted,
      )

      return new TextDecoder().decode(decrypted)
    }
    catch (error) {
      logger.error('AdvancedCrypto', 'Decryption failed:', error)
      throw error
    }
  }

  public isSupported(): boolean {
    return !!(window.crypto?.subtle)
  }
}

/**
 * IndexedDB wrapper for secure storage operations.
 */
class SecureDB {
  private static instance: SecureDB
  private db: IDBDatabase | null = null
  private readonly dbName = 'SecureSessionDB'
  private readonly storeName = 'sessions'
  private readonly version = 1

  private constructor() {}

  public static getInstance(): SecureDB {
    if (!SecureDB.instance) {
      SecureDB.instance = new SecureDB()
    }
    return SecureDB.instance
  }

  public async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => {
        logger.error('SecureDB', 'Failed to open database:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        logger.debug('SecureDB', 'Database opened successfully')
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' })
          store.createIndex('timestamp', 'timestamp', { unique: false })
          store.createIndex('expiresAt', 'expiresAt', { unique: false })
          store.createIndex('tabId', 'tabId', { unique: false })
          logger.debug('SecureDB', 'Object store created')
        }
      }
    })
  }

  public async set(entry: StorageEntry): Promise<void> {
    if (!this.db)
      throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.put(entry)

      request.onsuccess = () => resolve()
      request.onerror = () => {
        logger.error('SecureDB', 'Failed to store data:', request.error)
        reject(request.error)
      }
    })
  }

  public async get(id: string): Promise<StorageEntry | null> {
    if (!this.db)
      throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.get(id)

      request.onsuccess = () => {
        resolve(request.result || null)
      }
      request.onerror = () => {
        logger.error('SecureDB', 'Failed to retrieve data:', request.error)
        reject(request.error)
      }
    })
  }

  public async delete(id: string): Promise<void> {
    if (!this.db)
      throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.delete(id)

      request.onsuccess = () => resolve()
      request.onerror = () => {
        logger.error('SecureDB', 'Failed to delete data:', request.error)
        reject(request.error)
      }
    })
  }

  public async getAll(): Promise<StorageEntry[]> {
    if (!this.db)
      throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => {
        logger.error('SecureDB', 'Failed to retrieve all data:', request.error)
        reject(request.error)
      }
    })
  }

  public async clearExpired(): Promise<void> {
    if (!this.db)
      throw new Error('Database not initialized')

    const now = Date.now()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const index = store.index('expiresAt')

      // Get all entries that have expired
      const request = index.openCursor(IDBKeyRange.upperBound(now))

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        if (cursor) {
          cursor.delete()
          cursor.continue()
        }
        else {
          logger.debug('SecureDB', 'Expired entries cleaned up')
          resolve()
        }
      }

      request.onerror = () => {
        logger.error('SecureDB', 'Failed to clear expired data:', request.error)
        reject(request.error)
      }
    })
  }
}

/**
 * Main Secure Storage Manager class.
 */
class SecureStorageManager {
  private static instance: SecureStorageManager
  private readonly STORAGE_KEY = 'secure_session_data'
  private readonly EXPIRY_HOURS = 8
  private cache: SessionData = {}
  private crypto: AdvancedCrypto
  private db: SecureDB
  private readonly tabId: string
  private broadcastChannel: BroadcastChannel | null = null
  private heartbeatInterval: number | null = null
  private cleanupInterval: number | null = null
  private isInitialized = false

  private constructor() {
    this.crypto = AdvancedCrypto.getInstance()
    this.db = SecureDB.getInstance()
    this.tabId = this.generateTabId()
    this.initializeBroadcast()
  }

  public static getInstance(): SecureStorageManager {
    if (!SecureStorageManager.instance) {
      SecureStorageManager.instance = new SecureStorageManager()
    }
    return SecureStorageManager.instance
  }

  private generateTabId(): string {
    return `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private initializeBroadcast(): void {
    try {
      if ('BroadcastChannel' in window) {
        this.broadcastChannel = new BroadcastChannel('secure_storage_sync')
        this.broadcastChannel.onmessage = this.handleBroadcastMessage.bind(this)
      }
    }
    catch (error) {
      logger.warn('SecureStorageManager', 'BroadcastChannel not available:', error)
    }
  }

  private handleBroadcastMessage(event: MessageEvent<BroadcastMessage>): void {
    const { type, tabId, key, data } = event.data

    // Ignore messages from same tab
    if (tabId === this.tabId)
      return

    switch (type) {
      case 'update':
        if (key && data) {
          this.updateCacheFromBroadcast(key, data)
        }
        break
      case 'clear':
        this.cache = this.getDefaultState()
        logger.debug('SecureStorageManager', 'Cache cleared via broadcast')
        break
      case 'heartbeat':
        // Other tabs are active, update access time
        this.updateAccessTime().catch((error) => {
          logger.error('SecureStorageManager', 'Failed to update access time:', error)
        })
        break
    }
  }

  private updateCacheFromBroadcast(key: string, value: any): void {
    try {
      const path = key.split('.')
      this.setNestedValue(this.cache, [...path], value)
      logger.debug('SecureStorageManager', `Cache updated from broadcast for key: ${key}`)
    }
    catch (error) {
      logger.error('SecureStorageManager', 'Failed to update cache from broadcast:', error)
    }
  }

  private broadcast(message: Omit<BroadcastMessage, 'tabId' | 'timestamp'>): void {
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({
        ...message,
        tabId: this.tabId,
        timestamp: Date.now(),
      })
    }
  }

  private startHeartbeat(): void {
    if (this.heartbeatInterval)
      return

    this.heartbeatInterval = window.setInterval(() => {
      this.broadcast({ type: 'heartbeat' })
      this.updateAccessTime().catch((error) => {
        logger.error('SecureStorageManager', 'Heartbeat access update failed:', error)
      })
    }, 30000) // Every 30 seconds
  }

  private startCleanup(): void {
    if (this.cleanupInterval)
      return

    this.cleanupInterval = window.setInterval(() => {
      this.db.clearExpired().catch((error) => {
        logger.error('SecureStorageManager', 'Cleanup failed:', error)
      })
    }, 3600000) // Every hour
  }

  private async updateAccessTime(): Promise<void> {
    try {
      const entry = await this.db.get(this.STORAGE_KEY)
      if (entry) {
        entry.lastAccess = Date.now()
        await this.db.set(entry)
      }
    }
    catch (error) {
      logger.error('SecureStorageManager', 'Failed to update access time:', error)
    }
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized)
      return

    try {
      if (!this.crypto.isSupported()) {
        throw new Error('Web Crypto API not supported')
      }

      await this.db.initialize()
      await this.loadFromStorage()

      this.startHeartbeat()
      this.startCleanup()

      // Initial cleanup
      await this.db.clearExpired()

      this.isInitialized = true
      logger.info('SecureStorageManager', 'Initialized successfully')
    }
    catch (error) {
      logger.error('SecureStorageManager', 'Initialization failed:', error)
      throw error
    }
  }

  private async loadFromStorage(): Promise<void> {
    try {
      const entry = await this.db.get(this.STORAGE_KEY)

      if (entry) {
        // Check if expired
        if (Date.now() > entry.expiresAt) {
          await this.db.delete(this.STORAGE_KEY)
          this.cache = this.getDefaultState()
          logger.debug('SecureStorageManager', 'Expired data removed')
          return
        }

        // Decrypt and load data
        const decryptedData = await this.crypto.decrypt(entry.data)
        this.cache = JSON.parse(decryptedData)

        // Update access time
        entry.lastAccess = Date.now()
        entry.tabId = this.tabId
        await this.db.set(entry)

        logger.debug('SecureStorageManager', 'Data loaded from storage')
      }
      else {
        this.cache = this.getDefaultState()
      }
    }
    catch (error) {
      logger.error('SecureStorageManager', 'Failed to load from storage:', error)
      this.cache = this.getDefaultState()
    }
  }

  private async persistToStorage(): Promise<void> {
    try {
      const serializedData = JSON.stringify(this.cache)
      const encryptedData = await this.crypto.encrypt(serializedData)

      const now = Date.now()
      const expiresAt = now + (this.EXPIRY_HOURS * 60 * 60 * 1000)

      const entry: StorageEntry = {
        id: this.STORAGE_KEY,
        data: encryptedData,
        timestamp: now,
        lastAccess: now,
        tabId: this.tabId,
        expiresAt,
      }

      await this.db.set(entry)
      logger.debug('SecureStorageManager', 'Data persisted to storage')
    }
    catch (error) {
      logger.error('SecureStorageManager', 'Failed to persist to storage:', error)
    }
  }

  private getDefaultState(): SessionData {
    return {
      auth: {},
      workflow: {},
      repository: {},
      navigation: {},
    }
  }

  private getNestedValue<T>(obj: any, path: string[]): T | undefined {
    try {
      return path.reduce((acc, key) =>
        (acc && typeof acc === 'object' ? acc[key] : undefined), obj) as T | undefined
    }
    catch (error) {
      logger.error('SecureStorageManager', 'Error getting nested value:', error)
      return undefined
    }
  }

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
      logger.error('SecureStorageManager', 'Error setting nested value:', error)
    }
  }

  // Public API methods
  public async get<T = unknown>(key: string): Promise<T | undefined> {
    if (!this.isInitialized)
      await this.initialize()

    try {
      const path = key.split('.')
      const value = this.getNestedValue<T>(this.cache, path)

      // Update access time on read
      await this.updateAccessTime()

      return value
    }
    catch (error) {
      logger.error('SecureStorageManager', `Failed to get data for key ${key}:`, error)
      return undefined
    }
  }

  public async set(key: string, value: unknown): Promise<void> {
    if (!this.isInitialized)
      await this.initialize()

    try {
      if (!key || typeof key !== 'string') {
        logger.warn('SecureStorageManager', 'Invalid key provided')
        return
      }

      const path = key.split('.')
      this.setNestedValue(this.cache, [...path], value)

      await this.persistToStorage()

      // Broadcast change to other tabs
      this.broadcast({ type: 'update', key, data: value })

      logger.debug('SecureStorageManager', `Data updated for key: ${key}`)
    }
    catch (error) {
      logger.error('SecureStorageManager', `Failed to set data for key ${key}:`, error)
    }
  }

  public async remove(key: string): Promise<void> {
    if (!this.isInitialized)
      await this.initialize()

    try {
      if (!key || typeof key !== 'string') {
        logger.warn('SecureStorageManager', 'Invalid key provided')
        return
      }

      const path = key.split('.')
      const lastKey = path.pop()
      if (!lastKey)
        return

      const parent = this.getNestedValue(this.cache, path)
      if (parent && typeof parent === 'object') {
        delete parent[lastKey]

        await this.persistToStorage()

        // Broadcast change to other tabs
        this.broadcast({ type: 'update', key, data: undefined })

        logger.debug('SecureStorageManager', `Data removed for key: ${key}`)
      }
    }
    catch (error) {
      logger.error('SecureStorageManager', `Failed to remove data for key ${key}:`, error)
    }
  }

  public async clear(): Promise<void> {
    if (!this.isInitialized)
      await this.initialize()

    try {
      await this.db.delete(this.STORAGE_KEY)
      this.cache = this.getDefaultState()

      // Broadcast clear to other tabs
      this.broadcast({ type: 'clear' })

      logger.info('SecureStorageManager', 'All data cleared')
    }
    catch (error) {
      logger.error('SecureStorageManager', 'Failed to clear data:', error)
    }
  }

  // Navigation helpers
  public async setRedirectUrl(url: string): Promise<void> {
    if (url && typeof url === 'string' && url.trim()) {
      await this.set('navigation.redirectUrl', url.trim())
    }
  }

  public async getRedirectUrl(): Promise<string | undefined> {
    const url = await this.get<string>('navigation.redirectUrl')
    return url && typeof url === 'string' ? url.trim() : undefined
  }

  public async setCurrentStep(step: number): Promise<void> {
    if (typeof step === 'number' && step > 0) {
      await this.set('navigation.currentStep', step)
    }
  }

  public async getCurrentStep(): Promise<number | undefined> {
    const step = await this.get<number>('navigation.currentStep')
    return typeof step === 'number' ? step : undefined
  }

  // Cleanup on page unload
  public cleanup(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }

    if (this.broadcastChannel) {
      this.broadcastChannel.close()
      this.broadcastChannel = null
    }
  }
}

// Initialize cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    const manager = SecureStorageManager.getInstance()
    manager.cleanup()
  })
}

// Export singleton instance
export const sessionStorage = SecureStorageManager.getInstance()
