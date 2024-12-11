import { Agent, AppBskyActorDefs } from '@atproto/api'
import { BrowserOAuthClient, OAuthSession } from '@atproto/oauth-client-browser'
import { FollowerAnalyzerService } from './follower-analyzer'
import { whitelistService } from './whitelist'
import { accessControlService } from './access-control'
import type { FollowerAnalysis, AnalysisProgress } from '@/types/bsky'

interface BlockResult {
  success: boolean
  error?: string
}

export class BlueSkyService {
  private agent: Agent | null = null
  private oauthClient: BrowserOAuthClient
  private currentSession: OAuthSession | null = null
  private analyzer: FollowerAnalyzerService | null = null

  constructor() {
    this.oauthClient = new BrowserOAuthClient({
      handleResolver: 'https://bsky.social',
      responseMode: 'fragment',
      clientMetadata: {
        client_id: "https://bskyhealth.plover.net/client-metadata.json",
        client_name: "BSky Health Manager",
        redirect_uris: ["https://bskyhealth.plover.net/"],
        scope: "transition:generic atproto transition:chat.bsky",
        grant_types: ["authorization_code", "refresh_token"],
        application_type: "web",
        token_endpoint_auth_method: "none",
        dpop_bound_access_tokens: true
      }
    })
  }

  private checkAuthorization() {
    if (!accessControlService.isAuthorized()) {
      throw new Error('Unauthorized access')
    }
  }

  async init() {
    try {
      const result = await this.oauthClient.init()
      if (result?.session) {
        // Re-verify authorization using stored handle
        const storedHandle = accessControlService.getAuthorizedHandle()
        if (storedHandle) {
          // Auto-verify stored authorization
          const accessResult = await accessControlService.checkAccess(storedHandle)
          if (!accessResult.allowed) {
            await this.signOut()
            return null
          }
        } else {
          // If no stored handle, try to get it from the session
          const handle = await this.resolveHandleFromDid(result.session.did)
          if (handle) {
            const accessResult = await accessControlService.checkAccess(handle)
            if (!accessResult.allowed) {
              await this.signOut()
              return null
            }
          }
        }
  
        this.currentSession = result.session
        this.agent = new Agent(result.session)
        this.analyzer = new FollowerAnalyzerService(this.agent)
        await whitelistService.init()
        return result
      }
      return null
    } catch (error) {
      console.error('Failed to initialize OAuth client:', error)
      return null
    }
  }

  private async resolveHandleFromDid(did: string): Promise<string | null> {
    if (!this.agent) return null
    try {
      const profile = await this.agent.getProfile({ actor: did })
      return profile.data.handle
    } catch (error) {
      console.error('Error resolving handle:', error)
      return null
    }
  }

  async signIn(handle: string, opts?: { state?: string }) {
    try {
      // Check access before attempting OAuth flow
      const accessResult = await accessControlService.checkAccess(handle)
      if (!accessResult.allowed) {
        return {
          success: false,
          error: accessResult.message || 'Access denied'
        }
      }

      await this.oauthClient.signIn(handle, {
        ...opts,
        scope: 'atproto transition:generic',
      })
      return { success: true }
    } catch (error) {
      if (error instanceof Error && error.message.includes('back-forward')) {
        window.location.reload()
        return { success: false, error: 'Please try again' }
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sign in'
      }
    }
  }

  async refreshSession(): Promise<boolean> {
    this.checkAuthorization()
    try {
      const did = this.getDid()
      if (!did) return false
      
      const session = await this.oauthClient.restore(did)
      if (session) {
        // Verify authorization is still valid
        const handle = await this.resolveHandleFromDid(did)
        if (handle) {
          const accessResult = await accessControlService.checkAccess(handle)
          if (!accessResult.allowed) {
            await this.signOut()
            return false
          }
        }

        this.currentSession = session
        this.agent = new Agent(session)
        this.analyzer = new FollowerAnalyzerService(this.agent)
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to refresh session:', error)
      return false
    }
  }

  async getProfile(did: string): Promise<AppBskyActorDefs.ProfileViewDetailed> {
    this.checkAuthorization()
    if (!this.agent) throw new Error('Agent not initialized')
    
    try {
      const response = await this.agent.getProfile({ actor: did })
      return response.data
    } catch (error) {
      if (error instanceof Error && 
         (error.message.includes('InvalidToken') || 
          error.message.includes('ExpiredToken'))) {
        const refreshed = await this.refreshSession()
        if (!refreshed) {
          throw new Error('Session expired - please log in again')
        }
        return this.getProfile(did)
      }
      console.error('Error fetching profile:', error)
      throw error
    }
  }

  async getFollowersWithAnalysis(
    userDid: string,
    onProgress?: (progress: AnalysisProgress) => void
  ): Promise<FollowerAnalysis[]> {
    this.checkAuthorization()
    try {
      if (!this.agent || !this.analyzer) throw new Error('Service not initialized')
      return this.analyzer.analyzeFollowers(userDid, onProgress)
    } catch (error) {
      if (error instanceof Error && 
         (error.message.includes('InvalidToken') || 
          error.message.includes('ExpiredToken'))) {
        const refreshed = await this.refreshSession()
        if (!refreshed) {
          throw new Error('Session expired - please log in again')
        }
        // Retry the operation after refresh
        if (this.analyzer) {
          return this.analyzer.analyzeFollowers(userDid, onProgress)
        }
      }
      throw error
    }
  }

  async blockAccount(did: string): Promise<BlockResult> {
    this.checkAuthorization()
    try {
      if (!this.agent) throw new Error('Agent not initialized')
      
      const isWhitelisted = await whitelistService.isWhitelisted(did)
      if (isWhitelisted) {
        return {
          success: false,
          error: 'Cannot block whitelisted account'
        }
      }

      await this.agent.app.bsky.graph.block.create(
        { repo: this.getDid() || '' },
        {
          subject: did,
          createdAt: new Date().toISOString()
        }
      )
      return { success: true }
    } catch (error) {
      if (error instanceof Error && 
         (error.message.includes('InvalidToken') || 
          error.message.includes('ExpiredToken'))) {
        const refreshed = await this.refreshSession()
        if (!refreshed) {
          return {
            success: false,
            error: 'Session expired - please log in again'
          }
        }
        // Retry the operation
        return this.blockAccount(did)
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to block account'
      }
    }
  }

  async blockAccounts(dids: string[]): Promise<Array<BlockResult & { did: string }>> {
    this.checkAuthorization()
    const results = []
    for (const did of dids) {
      const result = await this.blockAccount(did)
      results.push({ did, ...result })
    }
    return results
  }

  async toggleWhitelist(did: string, handle: string): Promise<void> {
    this.checkAuthorization()
    const isWhitelisted = await whitelistService.isWhitelisted(did)
    if (isWhitelisted) {
      await whitelistService.removeFromWhitelist(did)
    } else {
      await whitelistService.addToWhitelist(did, handle, 'manual')
    }
  }

  getDid(): string | undefined {
    return this.currentSession?.did
  }

  isLoggedIn(): boolean {
    return this.agent !== null && this.currentSession !== null && accessControlService.isAuthorized()
  }

  async signOut(): Promise<void> {
    try {
      accessControlService.clearAuthorization()
      
      if (this.currentSession?.did) {
        try {
          await this.currentSession.signOut()
        } catch (e) {
          console.error('Error destroying oauth session:', e)
        }
      }

      this.analyzer?.clearCache()

      this.agent = null
      this.currentSession = null
      this.analyzer = null

      const req = indexedDB.deleteDatabase('oauth-client-browser')
      await new Promise<void>((resolve, reject) => {
        req.onsuccess = () => {
          console.log('Successfully cleared auth data')
          resolve()
        }
        req.onerror = () => {
          console.error('Failed to clear auth data')
          reject(new Error('Failed to clear auth data'))
        }
      })

      await whitelistService.clear()
      window.location.href = '/'
      
    } catch (error) {
      console.error('Error in signOut:', error)
      window.location.href = '/'
    }
  }
}

export const bskyService = new BlueSkyService()