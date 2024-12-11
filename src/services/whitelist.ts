import { openDB, DBSchema, IDBPDatabase } from 'idb'

interface ListEntry {
  did: string
  handle: string
  addedAt: string
  reason: 'mutual' | 'manual'
}

interface WhitelistDB extends DBSchema {
  whitelist: {
    key: string // DID
    value: ListEntry
  }
  greylist: {
    key: string // DID
    value: ListEntry
  }
}

export class WhitelistService {
  private db: IDBPDatabase<WhitelistDB> | null = null
  
  async init() {
    this.db = await openDB<WhitelistDB>('bsky-health-manager', 2, {
      upgrade(db) {
        // Handle existing whitelist store
        if (!db.objectStoreNames.contains('whitelist')) {
          db.createObjectStore('whitelist')
        }
        // Add new greylist store
        if (!db.objectStoreNames.contains('greylist')) {
          db.createObjectStore('greylist')
        }
      }
    })
  }

  async addToWhitelist(did: string, handle: string, reason: 'mutual' | 'manual' = 'manual') {
    if (!this.db) throw new Error('Database not initialized')
    
    // Remove from greylist if present
    await this.db.delete('greylist', did)
    
    await this.db.put('whitelist', {
      did,
      handle,
      addedAt: new Date().toISOString(),
      reason
    }, did)
  }

  async addToGreylist(did: string, handle: string, reason: 'mutual' | 'manual' = 'manual') {
    if (!this.db) throw new Error('Database not initialized')
    
    // Remove from whitelist if present
    await this.db.delete('whitelist', did)
    
    await this.db.put('greylist', {
      did,
      handle,
      addedAt: new Date().toISOString(),
      reason
    }, did)
  }

  async removeFromWhitelist(did: string) {
    if (!this.db) throw new Error('Database not initialized')
    await this.db.delete('whitelist', did)
  }

  async removeFromGreylist(did: string) {
    if (!this.db) throw new Error('Database not initialized')
    await this.db.delete('greylist', did)
  }

  async isWhitelisted(did: string): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized')
    const entry = await this.db.get('whitelist', did)
    return !!entry
  }

  async isGreylisted(did: string): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized')
    const entry = await this.db.get('greylist', did)
    return !!entry
  }

  async getWhitelist() {
    if (!this.db) throw new Error('Database not initialized')
    return this.db.getAll('whitelist')
  }

  async getGreylist() {
    if (!this.db) throw new Error('Database not initialized')
    return this.db.getAll('greylist')
  }

  async clear() {
    if (!this.db) throw new Error('Database not initialized')
    await this.db.clear('whitelist')
    await this.db.clear('greylist')
  }
}

export const whitelistService = new WhitelistService()