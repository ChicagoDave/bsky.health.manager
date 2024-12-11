import { Agent, AppBskyActorDefs } from '@atproto/api'
import type { FollowerAnalysis, AnalysisProgress } from '@/types/bsky'
import { whitelistService } from './whitelist'

export class FollowerAnalyzerService {
  private batchDelay = 100 // ms between API calls
  private cachedAnalysis: Map<string, FollowerAnalysis> = new Map()

  constructor(private agent: Agent) {}

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private async checkMutualStatus(did: string): Promise<boolean> {
    try {
      const profile = await this.agent.getProfile({ actor: did })
      return !!(profile.data.viewer?.following && profile.data.viewer?.followedBy)
    } catch (error) {
      console.error('Error checking mutual status:', error)
      return false
    }
  }

  async getFollowerCount(userDid: string): Promise<number> {
    let actualCount = 0
    let cursor: string | undefined = undefined

    do {
      try {
        const response = await this.agent.getFollowers({
          actor: userDid,
          limit: 100,
          cursor
        })

        actualCount += response.data.followers.filter(f => !f.viewer?.blocking).length
        cursor = response.data.cursor
        await this.delay(this.batchDelay)
      } catch (error) {
        console.error('Error getting follower count:', error)
        throw error
      }
    } while (cursor)

    return actualCount
  }

  private async analyzeFollower(
    follower: AppBskyActorDefs.ProfileView,
    skipDetailedAnalysis = false
  ): Promise<FollowerAnalysis> {
    // Check cache first
    const cached = this.cachedAnalysis.get(follower.did)
    if (cached) {
      // Update whitelist status in case it changed
      const isWhitelisted = await whitelistService.isWhitelisted(follower.did)
      return {
        ...cached,
        isWhitelisted,
      }
    }

    // Check whitelist and mutual status
    const isWhitelisted = await whitelistService.isWhitelisted(follower.did)
    const isMutual = skipDetailedAnalysis ? false : await this.checkMutualStatus(follower.did)

    // If mutual, add to whitelist automatically
    if (isMutual && !isWhitelisted) {
      await whitelistService.addToWhitelist(follower.did, follower.handle, 'mutual')
    }

    const analysis: FollowerAnalysis = {
      did: follower.did,
      handle: follower.handle,
      displayName: follower.displayName,
      avatar: follower.avatar,
      hasIssues: false,
      issues: [],
      isMutual,
      isWhitelisted: isWhitelisted || isMutual,
      indexedAt: undefined
    }

    // Skip detailed analysis for whitelisted/mutual accounts or if explicitly requested
    if (!analysis.isWhitelisted && !skipDetailedAnalysis) {
      try {
        const profile = await this.agent.getProfile({ actor: follower.did })
        analysis.profile = profile.data
        analysis.indexedAt = profile.data.indexedAt

        const feedResponse = await this.agent.getAuthorFeed({
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

        if (profile.data.followersCount && profile.data.followsCount) {
          const ratio = profile.data.followersCount / profile.data.followsCount
          if (ratio < 0.1 && profile.data.followsCount > 100) {
            analysis.issues.push('Very low follower/following ratio')
            analysis.hasIssues = true
          }
        }

        if (!follower.avatar) {
          analysis.issues.push('Default avatar')
          analysis.hasIssues = true
        }

        await this.delay(this.batchDelay)
      } catch (error) {
        console.error(`Error analyzing follower details for ${follower.handle}:`, error)
        analysis.issues.push('Error analyzing account details')
        analysis.hasIssues = true
      }
    }

    // Cache the analysis
    this.cachedAnalysis.set(follower.did, analysis)
    return analysis
  }

  async analyzeFollowers(
    userDid: string,
    onProgress?: (progress: AnalysisProgress) => void
  ): Promise<FollowerAnalysis[]> {
    const followers: FollowerAnalysis[] = []
    let cursor: string | undefined = undefined

    try {
      const estimatedUnblockedTotal = await this.getFollowerCount(userDid)
      const profile = await this.agent.getProfile({ actor: userDid })
      const totalFollowers = profile.data.followersCount || 0
      const estimatedBlockedCount = Math.max(0, totalFollowers - estimatedUnblockedTotal)
      let analyzedCount = 0

      onProgress?.({
        total: estimatedUnblockedTotal,
        current: analyzedCount,
        status: 'Starting analysis...',
        blockedCount: estimatedBlockedCount
      })

      do {
        try {
          const response = await this.agent.getFollowers({
            actor: userDid,
            limit: 100,
            cursor
          })

          for (const follower of response.data.followers) {
            if (follower.viewer?.blocking) continue

            onProgress?.({
              total: estimatedUnblockedTotal,
              current: analyzedCount,
              status: `Analyzing ${follower.handle}...`,
              blockedCount: estimatedBlockedCount
            })

            // Check if we have a cached analysis that's whitelisted
            const cached = this.cachedAnalysis.get(follower.did)
            const skipDetailedAnalysis = cached?.isWhitelisted || false

            try {
              const analysis = await this.analyzeFollower(follower, skipDetailedAnalysis)
              followers.push(analysis)
              analyzedCount++

              onProgress?.({
                total: estimatedUnblockedTotal,
                current: analyzedCount,
                status: `Analyzed ${follower.handle}`,
                blockedCount: estimatedBlockedCount
              })
            } catch (error) {
              console.error(`Error analyzing follower ${follower.handle}:`, error)
            }
          }

          cursor = response.data.cursor
        } catch (error) {
          if (error instanceof Error && 
             (error.message.includes('InvalidToken') || 
              error.message.includes('ExpiredToken'))) {
            throw error
          }
          console.error('Error fetching followers:', error)
          throw error
        }
      } while (cursor)

      onProgress?.({
        total: estimatedUnblockedTotal,
        current: analyzedCount,
        status: 'Analysis complete!',
        blockedCount: estimatedBlockedCount
      })

      return followers

    } catch (error) {
      console.error('Error analyzing followers:', error)
      throw error
    }
  }

  clearCache() {
    this.cachedAnalysis.clear()
  }
}