import { useState } from 'react'
import { useQuery } from 'react-query'
import { bskyService, FollowerAnalysis } from '@/services/bsky'
import { ArrowSmallDownIcon, ArrowSmallUpIcon } from '@heroicons/react/20/solid'

type SortField = 'handle' | 'issues' | 'lastPost'

interface FilterOptions {
  noAvatar: boolean
  noPosts: boolean
  newAccounts: boolean
  suspiciousHandle: boolean
}

export default function FollowerAnalysisComponent() {
  const [selectedFollowers, setSelectedFollowers] = useState<Set<string>>(new Set())
  const [filterIssuesOnly, setFilterIssuesOnly] = useState(false)
  const [isBlocking, setIsBlocking] = useState(false)
  const [blockingProgress, setBlockingProgress] = useState<{current: number; total: number} | null>(null)
  const [sortField, setSortField] = useState<SortField>('lastPost')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    noAvatar: false,
    noPosts: false,
    newAccounts: false,
    suspiciousHandle: false
  })

  const { data: followers, isLoading, error, refetch } = useQuery<FollowerAnalysis[], Error>(
    'followers',
    async () => {
      const userDid = bskyService.getDid()
      if (!userDid) throw new Error('Not logged in')
      return bskyService.getFollowersWithAnalysis(userDid)
    },
    {
      enabled: bskyService.isLoggedIn(),
      staleTime: 5 * 60 * 1000
    }
  )

  const displayedFollowers = followers?.filter(f => {
    if (!filterIssuesOnly) return true
    
    return (
      (filterOptions.noAvatar && !f.avatar) ||
      (filterOptions.noPosts && f.issues.includes('No posts')) ||
      (filterOptions.newAccounts && f.issues.includes('Account less than 7 days old')) ||
      (filterOptions.suspiciousHandle && f.issues.includes('Handle contains more than 2 numbers'))
    )
  }).sort((a, b) => {
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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const handleSelectAll = () => {
    if (!displayedFollowers) return
    setSelectedFollowers(new Set(displayedFollowers.map(f => f.did)))
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
    if (!displayedFollowers) return
    
    const csvContent = [
      ['Handle', 'Display Name', 'Issues', 'Last Post'].join(','),
      ...displayedFollowers.map(f => [
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

  if (!bskyService.isLoggedIn()) {
    return (
      <div className="text-center p-8">
        <p className="text-lg mb-4">Please log in to analyze your followers</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-red-500 p-4">
        Error loading followers: {error.message}
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-4 space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={handleSelectAll}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Select All
            </button>
            <button
              onClick={handleClearSelection}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Clear Selection
            </button>
            <button
              onClick={handleExportAnalysis}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Export CSV
            </button>
          </div>
          <button
            onClick={handleBlockSelected}
            disabled={selectedFollowers.size === 0 || isBlocking}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-300"
          >
            {isBlocking ? (
              blockingProgress 
                ? `Blocking ${blockingProgress.current}/${blockingProgress.total}...`
                : 'Blocking...'
            ) : `Block Selected (${selectedFollowers.size})`}
          </button>
        </div>

        <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={filterIssuesOnly}
              onChange={(e) => setFilterIssuesOnly(e.target.checked)}
              className="rounded"
            />
            Filter Issues
          </label>
          {filterIssuesOnly && (
            <>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filterOptions.noAvatar}
                  onChange={(e) => setFilterOptions(prev => ({ ...prev, noAvatar: e.target.checked }))}
                  className="rounded"
                />
                No Avatar
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filterOptions.noPosts}
                  onChange={(e) => setFilterOptions(prev => ({ ...prev, noPosts: e.target.checked }))}
                  className="rounded"
                />
                No Posts
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filterOptions.newAccounts}
                  onChange={(e) => setFilterOptions(prev => ({ ...prev, newAccounts: e.target.checked }))}
                  className="rounded"
                />
                New Accounts
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filterOptions.suspiciousHandle}
                  onChange={(e) => setFilterOptions(prev => ({ ...prev, suspiciousHandle: e.target.checked }))}
                  className="rounded"
                />
                Suspicious Handle
              </label>
            </>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-8 p-4"></th>
              <th 
                className="p-4 text-left cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('handle')}
              >
                <div className="flex items-center gap-2">
                  Account
                  {sortField === 'handle' && (
                    sortDirection === 'asc' 
                      ? <ArrowSmallUpIcon className="w-4 h-4" />
                      : <ArrowSmallDownIcon className="w-4 h-4" />
                  )}
                </div>
              </th>
              <th 
                className="p-4 text-left cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('issues')}
              >
                <div className="flex items-center gap-2">
                  Issues
                  {sortField === 'issues' && (
                    sortDirection === 'asc' 
                      ? <ArrowSmallUpIcon className="w-4 h-4" />
                      : <ArrowSmallDownIcon className="w-4 h-4" />
                  )}
                </div>
              </th>
              <th 
                className="p-4 text-left cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('lastPost')}
              >
                <div className="flex items-center gap-2">
                  Last Post
                  {sortField === 'lastPost' && (
                    sortDirection === 'asc' 
                      ? <ArrowSmallUpIcon className="w-4 h-4" />
                      : <ArrowSmallDownIcon className="w-4 h-4" />
                  )}
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {displayedFollowers?.map((follower) => (
              <tr 
                key={follower.did}
                className={`hover:bg-gray-50 ${follower.hasIssues ? 'bg-red-50' : ''}`}
              >
                <td className="p-4">
                  <input
                    type="checkbox"
                    checked={selectedFollowers.has(follower.did)}
                    onChange={() => handleToggleFollower(follower.did)}
                    className="rounded"
                  />
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    {follower.avatar ? (
                      <img 
                        src={follower.avatar} 
                        alt="" 
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-200" />
                    )}
                    <div>
                      <div className="font-medium">{follower.displayName}</div>
                      <div className="text-sm text-gray-500">@{follower.handle}</div>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <ul className="list-disc list-inside">
                    {follower.issues.map((issue, i) => (
                      <li key={i} className="text-red-500">{issue}</li>
                    ))}
                  </ul>
                </td>
                <td className="p-4">
                  {follower.indexedAt ? (
                    <time dateTime={follower.indexedAt}>
                      {new Date(follower.indexedAt).toLocaleDateString()}
                    </time>
                  ) : (
                    <span className="text-gray-400">Never</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}