import { useState, useMemo } from 'react'
import { useQuery } from 'react-query'
import { bskyService } from '@/services/bsky'
import { ActionBar } from './followers/ActionBar'
import { FilterCategories } from './followers/FilterCategories'
import { FollowersTable } from './followers/FollowersTable'
import { ProgressBar } from './followers/ProgressBar'
import { filterRules, FilterStats, SortField } from './followers/types'
import type { FollowerAnalysis, AnalysisProgress } from '@/types/bsky'

export default function FollowerAnalysisComponent() {
  const [selectedFollowers, setSelectedFollowers] = useState<Set<string>>(new Set())
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set())
  const [isBlocking, setIsBlocking] = useState(false)
  const [blockingProgress, setBlockingProgress] = useState<{current: number; total: number} | null>(null)
  const [sortField, setSortField] = useState<SortField>('lastPost')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress | null>(null)

  const { data: followers, isLoading, error, refetch } = useQuery<FollowerAnalysis[], Error>(
    'followers',
    async () => {
      const userDid = bskyService.getDid()
      if (!userDid) throw new Error('Not logged in')
      return bskyService.getFollowersWithAnalysis(userDid, setAnalysisProgress)
    },
    {
      enabled: bskyService.isLoggedIn(),
      staleTime: 5 * 60 * 1000,
      retry: false
    }
  )

  const filterStats: FilterStats[] = useMemo(() => {
    if (!followers) return []
    
    return filterRules.map(rule => ({
      rule,
      count: followers.filter(rule.check).length,
      followers: followers.filter(rule.check)
    }))
  }, [followers])

  const filteredFollowers = useMemo(() => {
    if (!followers) return []
    
    let filtered = [...followers]
    
    if (activeFilters.size > 0) {
      filtered = filtered.filter(follower => {
        return Array.from(activeFilters).some(filterId => {
          const rule = filterRules.find(r => r.id === filterId)
          return rule ? rule.check(follower) : false
        })
      })
    }

    return filtered.sort((a, b) => {
      switch (sortField) {
        case 'handle':
          return sortDirection === 'asc' 
            ? a.handle.localeCompare(b.handle)
            : b.handle.localeCompare(a.handle)
        case 'issues':
          return sortDirection === 'asc'
            ? a.issues.length - b.issues.length
            : b.issues.length - a.issues.length
        case 'lastPost':
          return sortDirection === 'asc'
            ? (a.indexedAt || '').localeCompare(b.indexedAt || '')
            : (b.indexedAt || '').localeCompare(a.indexedAt || '')
        default:
          return 0
      }
    })
  }, [followers, activeFilters, sortField, sortDirection])

  const handleSelectAll = () => {
    if (!filteredFollowers) return
    setSelectedFollowers(new Set(filteredFollowers.map(f => f.did)))
  }

  const handleClearSelection = () => {
    setSelectedFollowers(new Set())
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

  const handleBlockSelected = async () => {
    if (selectedFollowers.size === 0) return
    
    setIsBlocking(true)
    setBlockingProgress({ current: 0, total: selectedFollowers.size })
    
    try {
      const dids = Array.from(selectedFollowers)
      const results = []
      
      for (let i = 0; i < dids.length; i++) {
        const result = await bskyService.blockAccount(dids[i])
        results.push({ did: dids[i], ...result })
        setBlockingProgress({ current: i + 1, total: dids.length })
      }
      
      const failures = results.filter(r => !r.success)
      if (failures.length > 0) {
        console.error('Some blocks failed:', failures)
      }
      
      setSelectedFollowers(new Set())
      refetch()
    } catch (error) {
      console.error('Error blocking accounts:', error)
    } finally {
      setIsBlocking(false)
      setBlockingProgress(null)
    }
  }

  const handleExportAnalysis = () => {
    if (!filteredFollowers) return
    
    const csvContent = [
      ['Handle', 'Display Name', 'Issues', 'Last Post'].join(','),
      ...filteredFollowers.map(f => [
        f.handle,
        f.displayName || '',
        f.issues.join(';'),
        f.indexedAt || ''
      ].join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'follower-analysis.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const handleSignOut = async () => {
    try {
      await bskyService.signOut()
      window.location.reload()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  if (!bskyService.isLoggedIn()) {
    return (
      <div className="text-center p-8">
        <p className="text-lg mb-4">Please log in to analyze your followers</p>
      </div>
    )
  }

  if (isLoading || (analysisProgress && analysisProgress.current < analysisProgress.total)) {
    return (
      <div className="container mx-auto p-4">
        <ProgressBar 
          total={analysisProgress?.total || 0}
          current={analysisProgress?.current || 0}
          status={analysisProgress?.status || 'Initializing...'}
        />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-red-500 p-4">
        Error loading followers: {error.message}
        <button 
          onClick={() => refetch()} 
          className="ml-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Follower Analysis</h1>
        <button
          onClick={handleSignOut}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Sign Out
        </button>
      </div>

      <div className="flex justify-between items-center">
        <ActionBar
          onSelectAll={handleSelectAll}
          onClearSelection={handleClearSelection}
          onExport={handleExportAnalysis}
          onBlock={handleBlockSelected}
          selectedCount={selectedFollowers.size}
          isBlocking={isBlocking}
          blockingProgress={blockingProgress}
        />
      </div>

      <FilterCategories
        filterStats={filterStats}
        activeFilters={activeFilters}
        onFilterChange={setActiveFilters}
      />

      <FollowersTable
        followers={filteredFollowers}
        selectedFollowers={selectedFollowers}
        onToggleFollower={handleToggleFollower}
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={handleSort}
      />
    </div>
  )
}