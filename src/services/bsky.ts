import { Agent, AppBskyActorDefs } from '@atproto/api'
import { BrowserOAuthClient, OAuthSession } from '@atproto/oauth-client-browser'
import { FollowerAnalyzerService } from './follower-analyzer'
import { whitelistService } from './whitelist'
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

  async init() {
    try {
      const result = await this.oauthClient.init()
      if (result?.session) {
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

  async signIn(handle: string, opts?: { state?: string }) {
    try {
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
    try {
      const did = this.getDid()
      if (!did) return false
      
      const session = await this.oauthClient.restore(did)
      if (session) {
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
    const results = []
    for (const did of dids) {
      const result = await this.blockAccount(did)
      results.push({ did, ...result })
    }
    return results
  }

  async toggleWhitelist(did: string, handle: string): Promise<void> {
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
    return this.agent !== null && this.currentSession !== null
  }

  async signOut(): Promise<void> {
    try {
      if (this.currentSession?.did) {
        try {
          await this.currentSession.signOut()
        } catch (e) {
          console.error('Error destroying oauth session:', e)
        }
      }

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