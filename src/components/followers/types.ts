// src/components/followers/types.ts
import { FollowerAnalysis } from '@/types/bsky'

export interface FilterRule {
  id: string
  name: string
  description: string
  check: (profile: FollowerAnalysis) => boolean
}

export interface FilterStats {
  rule: FilterRule
  count: number
  followers: FollowerAnalysis[]
}

export type SortField = 'handle' | 'issues' | 'lastPost'

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