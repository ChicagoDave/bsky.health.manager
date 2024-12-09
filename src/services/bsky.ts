// src/services/bsky.ts
import { Agent, AppBskyActorDefs } from '@atproto/api'
import { BrowserOAuthClient } from '@atproto/oauth-client-browser'

export interface FollowerAnalysis {
  did: string
  handle: string
  displayName?: string
  avatar?: string
  indexedAt?: string
  hasIssues: boolean
  issues: string[]
  profile?: AppBskyActorDefs.ProfileViewDetailed
}

export class BlueSkyService {
  private agent: Agent | null = null
  private oauthClient: BrowserOAuthClient

  constructor() {
    // Initialize OAuth client
    this.oauthClient = new BrowserOAuthClient({
      handleResolver: 'https://bsky.social',
      responseMode: 'fragment'
    })

    // Initialize Agent with service URL
    this.agent = new Agent('https://bsky.social')
  }

  async init() {
    try {
      const result = await this.oauthClient.init()
      if (result?.session) {
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
      await this.oauthClient.signIn(handle, opts)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sign in'
      }
    }
  }

  async getProfile(did: string) {
    if (!this.agent) throw new Error('Agent not initialized')
    
    try {
      const response = await this.agent.api.app.bsky.actor.getProfile({
        actor: did
      })
      return response.data
    } catch (error) {
      console.error('Error fetching profile:', error)
      return undefined
    }
  }

  async getFollowersWithAnalysis(userDid: string): Promise<FollowerAnalysis[]> {
    if (!this.agent) throw new Error('Agent not initialized')
    
    const followers: FollowerAnalysis[] = []
    let cursor: string | undefined = undefined

    try {
      do {
        const response = await this.agent.api.app.bsky.graph.getFollowers({
          actor: userDid,
          limit: 100,
          cursor
        })

        for (const follower of response.data.followers) {
          const profile = await this.getProfile(follower.did)
          
          const analysis: FollowerAnalysis = {
            did: follower.did,
            handle: follower.handle,
            displayName: follower.displayName,
            avatar: follower.avatar,
            indexedAt: profile?.indexedAt,
            hasIssues: false,
            issues: [],
            profile
          }

          // Check for zero posts
          const feedResponse = await this.agent.api.app.bsky.feed.getAuthorFeed({
            actor: follower.did,
            limit: 1
          })
          
          if (feedResponse.data.feed.length === 0) {
            analysis.issues.push('No posts')
            analysis.hasIssues = true
          }

          const numberCount = (follower.handle.match(/\d/g) || []).length
          if (numberCount > 2) {
            analysis.issues.push('Handle contains more than 2 numbers')
            analysis.hasIssues = true
          }

          // Check account age
          const createdAt = new Date(profile?.indexedAt || Date.now())
          const accountAge = Date.now() - createdAt.getTime()
          if (accountAge < 7 * 24 * 60 * 60 * 1000) { // Less than 7 days
            analysis.issues.push('Account less than 7 days old')
            analysis.hasIssues = true
          }

          // Check follower/following ratio
          if (profile && profile.followersCount && profile.followsCount) {
            const ratio = profile.followersCount / profile.followsCount
            if (ratio < 0.1) { // Less than 10% followers to following
              analysis.issues.push('Very low follower/following ratio')
              analysis.hasIssues = true
            }
          }

          // Check for default avatar
          if (!follower.avatar) {
            analysis.issues.push('Default avatar')
            analysis.hasIssues = true
          }

          followers.push(analysis)
        }

        cursor = response.data.cursor
      } while (cursor)

      return followers
    } catch (error) {
      console.error('Error analyzing followers:', error)
      throw error
    }
  }

  async blockAccount(did: string) {
    if (!this.agent) throw new Error('Agent not initialized')
    
    try {
      await this.agent.api.app.bsky.graph.block.create(
        { repo: did },
        {
          subject: did,
          createdAt: new Date().toISOString()
        }
      )
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to block account'
      }
    }
  }

  async blockAccounts(dids: string[]) {
    const results = []
    for (const did of dids) {
      const result = await this.blockAccount(did)
      results.push({ did, ...result })
    }
    return results
  }

  getDid(): string | undefined {
    return this.agent?.did
  }

  isLoggedIn(): boolean {
    return this.agent !== null
  }

  logout() {
    this.agent = null
  }
}

export const bskyService = new BlueSkyService()