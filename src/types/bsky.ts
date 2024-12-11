import { AppBskyActorDefs } from '@atproto/api'

export interface FollowerAnalysis {
  did: string
  handle: string
  displayName?: string
  avatar?: string
  indexedAt?: string
  hasIssues: boolean
  issues: string[]
  profile?: AppBskyActorDefs.ProfileViewDetailed
  isMutual: boolean
  isWhitelisted?: boolean
}

export interface AnalysisProgress {
  total: number
  current: number
  status: string
  blockedCount: number
}

export interface FilterRule {
  id: string
  name: string
  description: string
  check: (profile: FollowerAnalysis) => boolean
}

export const filterRules: FilterRule[] = [
  {
    id: 'no_posts',
    name: 'No Posts',
    description: 'Account has never posted',
    check: (profile) => profile.issues.includes('No posts')
  },
  {
    id: 'numeric_handle',
    name: 'Suspicious Handle',
    description: 'Handle contains more than 2 numbers',
    check: (profile) => profile.issues.includes('Handle contains more than 2 numbers')
  },
  {
    id: 'low_ratio',
    name: 'Low Follower Ratio',
    description: 'Very low follower to following ratio',
    check: (profile) => profile.issues.includes('Very low follower/following ratio')
  },
  {
    id: 'default_avatar',
    name: 'Default Avatar',
    description: 'Using default profile picture',
    check: (profile) => profile.issues.includes('Default avatar')
  }
]