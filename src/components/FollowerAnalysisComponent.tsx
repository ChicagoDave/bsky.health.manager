import { useState, useMemo } from 'react'
import { useQuery } from 'react-query'
import { bskyService } from '@/services/bsky'
import { whitelistService } from '@/services/whitelist'
import { FilterStats, SortField, filterRules } from '@/types/bsky'
import type { FollowerAnalysis, AnalysisProgress } from '@/types/bsky'
import ProgressBar from './followers/ProgressBar'
import { FilterCategories } from './followers/FilterCategories'
import { FollowersTable } from './followers/FollowersTable'
import ActionBar from './followers/ActionBar'
import SignOutButton from './signoutbutton'

export default function FollowerAnalysisComponent() {
  const [startTime] = useState(Date.now())
  const [progress, setProgress] = useState<AnalysisProgress>({ total: 0, current: 0, status: '' })
  const [whitelistedFollowers, setWhitelistedFollowers] = useState<FollowerAnalysis[]>([])
  const [greylistedFollowers, setGreylistedFollowers] = useState<FollowerAnalysis[]>([])
  const [regularFollowers, setRegularFollowers] = useState<FollowerAnalysis[]>([])
  const [selectedFollowers, setSelectedFollowers] = useState<Set<string>>(new Set())
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set())
  const [sortField, setSortField] = useState<SortField>('issues')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [isBlocking, setIsBlocking] = useState(false)
  const [blockingProgress, setBlockingProgress] = useState<{ current: number; total: number } | null>(null)

  // Fetch followers data
  const { isLoading, error } = useQuery(
    ['followers', bskyService.getDid()],
    async () => {
      const userDid = bskyService.getDid()
      if (!userDid) throw new Error('Not logged in')
      return bskyService.getFollowersWithAnalysis(userDid, setProgress)
    },
    {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      onSuccess: (followers) => {
        const whitelisted = followers.filter(f => f.isWhitelisted)
        const greylisted = followers.filter(f => f.isGreylisted && !f.isWhitelisted)
        const regular = followers.filter(f => !f.isWhitelisted && !f.isGreylisted)
        setWhitelistedFollowers(whitelisted)
        setGreylistedFollowers(greylisted)
        setRegularFollowers(regular)
      }
    }
  )

  // Calculate filter statistics
  const filterStats: FilterStats[] = useMemo(() => {
    if (!regularFollowers) return []

    return filterRules.map(rule => ({
      rule,
      count: regularFollowers.filter(follower => rule.check(follower)).length,
      followers: regularFollowers.filter(follower => rule.check(follower))
    }))
  }, [regularFollowers])

  // Filter and sort followers
  const displayedFollowers = useMemo(() => {
    let filtered = [...regularFollowers]

    // Apply active filters
    if (activeFilters.size > 0) {
      filtered = filtered.filter(follower => {
        return Array.from(activeFilters).some(filterId => {
          const rule = filterRules.find(r => r.id === filterId)
          return rule ? rule.check(follower) : false
        })
      })
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'handle':
          comparison = a.handle.localeCompare(b.handle)
          break
        case 'issues':
          comparison = a.issues.length - b.issues.length
          break
        case 'lastPost':
          comparison = ((a.indexedAt || '') > (b.indexedAt || '')) ? 1 : -1
          break
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [regularFollowers, activeFilters, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const handleSelectAll = () => {
    setSelectedFollowers(new Set(displayedFollowers.map(f => f.did)))
  }

  const handleClearSelection = () => {
    setSelectedFollowers(new Set())
  }

  const handleSelectClean = () => {
    const cleanFollowers = displayedFollowers.filter(follower => 
      !follower.hasIssues && !follower.isWhitelisted && !follower.isGreylisted
    )
    setSelectedFollowers(new Set(cleanFollowers.map(f => f.did)))
  }

  const handleToggleFollower = (did: string) => {
    const newSelected = new Set(selectedFollowers)
    if (newSelected.has(did)) {
      newSelected.delete(did)
    } else {
      newSelected.add(did)
    }
    setSelectedFollowers(newSelected)
  }

  const handleExport = () => {
    const selectedData = displayedFollowers
      .filter(f => selectedFollowers.has(f.did))
      .map(f => ({
        handle: f.handle,
        displayName: f.displayName || '',
        issues: f.issues.join('; '),
        lastActivity: f.indexedAt || 'Never'
      }))

    const csv = [
      ['Handle', 'Display Name', 'Issues', 'Last Activity'],
      ...selectedData.map(row => Object.values(row))
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'follower-analysis.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleGreylist = async () => {
    const selectedDids = Array.from(selectedFollowers)
    if (!selectedDids.length) return

    const followers = [...regularFollowers]
    const newGreylisted: FollowerAnalysis[] = []
    const remainingRegular: FollowerAnalysis[] = []

    for (const follower of followers) {
      if (selectedDids.includes(follower.did)) {
        await whitelistService.addToGreylist(follower.did, follower.handle)
        newGreylisted.push({
          ...follower,
          isGreylisted: true
        })
      } else {
        remainingRegular.push(follower)
      }
    }

    setGreylistedFollowers(prev => [...prev, ...newGreylisted])
    setRegularFollowers(remainingRegular)
    setSelectedFollowers(new Set())
  }

  const handleBlock = async () => {
    const selectedDids = Array.from(selectedFollowers)
    if (!selectedDids.length) return

    setIsBlocking(true)
    let blocked = 0

    try {
      for (const did of selectedDids) {
        setBlockingProgress({ current: blocked + 1, total: selectedDids.length })
        await bskyService.blockAccount(did)
        blocked++
      }

      // Refresh data after blocking
      setSelectedFollowers(new Set())
      await bskyService.refreshSession()
    } catch (error) {
      console.error('Error blocking accounts:', error)
    } finally {
      setIsBlocking(false)
      setBlockingProgress(null)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 max-w-6xl">
        <ProgressBar
          total={progress.total}
          current={progress.current}
          status={progress.status}
          blockedCount={progress.blockedCount}
          whitelistedCount={whitelistedFollowers.length}
          startTime={startTime}
        />
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 max-w-6xl">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Error loading followers: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Follower Analysis</h1>
          <p className="text-gray-600">
            Analyze and manage your followers based on various criteria
          </p>
        </div>
        <SignOutButton />
      </div>

      <FilterCategories
        filterStats={filterStats}
        activeFilters={activeFilters}
        onFilterChange={setActiveFilters}
      />

      <ActionBar
        onSelectAll={handleSelectAll}
        onClearSelection={handleClearSelection}
        onSelectClean={handleSelectClean}
        onGreylist={handleGreylist}
        onExport={handleExport}
        onBlock={handleBlock}
        selectedCount={selectedFollowers.size}
        isBlocking={isBlocking}
        blockingProgress={blockingProgress}
        whitelistedCount={whitelistedFollowers.length}
        greylistedCount={greylistedFollowers.length}
        totalFollowers={whitelistedFollowers.length + greylistedFollowers.length + regularFollowers.length}
      />

      <FollowersTable
        followers={displayedFollowers}
        selectedFollowers={selectedFollowers}
        onToggleFollower={handleToggleFollower}
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={handleSort}
      />
    </div>
  )
}