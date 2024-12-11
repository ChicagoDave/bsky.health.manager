import { openDB, DBSchema, IDBPDatabase } from 'idb'

interface WhitelistDB extends DBSchema {
  whitelist: {
    key: string // DID
    value: {
      did: string
      handle: string
      addedAt: string
      reason: 'mutual' | 'manual'
    }
  }
}

export class WhitelistService {
  private db: IDBPDatabase<WhitelistDB> | null = null
  
  async init() {
    this.db = await openDB<WhitelistDB>('bsky-health-manager', 1, {
      upgrade(db) {
        db.createObjectStore('whitelist')
      }
    })
  }

  async addToWhitelist(did: string, handle: string, reason: 'mutual' | 'manual' = 'manual') {
    if (!this.db) throw new Error('Database not initialized')
    
    await this.db.put('whitelist', {
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

  async isWhitelisted(did: string): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized')
    const entry = await this.db.get('whitelist', did)
    return !!entry
  }

  async getWhitelist() {
    if (!this.db) throw new Error('Database not initialized')
    return this.db.getAll('whitelist')
  }

  async clear() {
    if (!this.db) throw new Error('Database not initialized')
    await this.db.clear('whitelist')
  }
}

export const whitelistService = new WhitelistService()