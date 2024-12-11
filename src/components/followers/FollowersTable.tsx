import { ArrowSmallDownIcon, ArrowSmallUpIcon } from '@heroicons/react/20/solid'
import { FollowerAnalysis } from '@/types/bsky'
import { SortField } from './types'

interface FollowersTableProps {
  followers: FollowerAnalysis[]
  selectedFollowers: Set<string>
  onToggleFollower: (did: string) => void
  sortField: SortField
  sortDirection: 'asc' | 'desc'
  onSort: (field: SortField) => void
}

export function FollowersTable({
  followers,
  selectedFollowers,
  onToggleFollower,
  sortField,
  sortDirection,
  onSort
}: FollowersTableProps) {
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Never'
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getRowClassName = (follower: FollowerAnalysis) => {
    if (follower.isWhitelisted) return 'bg-green-50'
    if (follower.isGreylisted) return 'bg-gray-50'
    if (follower.hasIssues) return 'bg-red-50'
    return ''
  }

  const getStatusText = (follower: FollowerAnalysis) => {
    if (follower.isWhitelisted) return '(Whitelisted)'
    if (follower.isGreylisted) return '(Greylisted)'
    return ''
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="w-12 px-3 py-3">
              <span className="sr-only">Select</span>
            </th>
            <th
              scope="col"
              className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
              onClick={() => onSort('handle')}
            >
              <div className="flex items-center gap-1">
                Account
                {sortField === 'handle' && (
                  sortDirection === 'asc' 
                    ? <ArrowSmallUpIcon className="w-4 h-4" />
                    : <ArrowSmallDownIcon className="w-4 h-4" />
                )}
              </div>
            </th>
            <th
              scope="col"
              className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
              onClick={() => onSort('issues')}
            >
              <div className="flex items-center gap-1">
                Issues
                {sortField === 'issues' && (
                  sortDirection === 'asc' 
                    ? <ArrowSmallUpIcon className="w-4 h-4" />
                    : <ArrowSmallDownIcon className="w-4 h-4" />
                )}
              </div>
            </th>
            <th
              scope="col"
              className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
              onClick={() => onSort('lastPost')}
            >
              <div className="flex items-center gap-1">
                Last Activity
                {sortField === 'lastPost' && (
                  sortDirection === 'asc' 
                    ? <ArrowSmallUpIcon className="w-4 h-4" />
                    : <ArrowSmallDownIcon className="w-4 h-4" />
                )}
              </div>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {followers.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-3 py-4 text-center text-gray-500">
                No followers match the selected filters
              </td>
            </tr>
          ) : (
            followers.map((follower) => (
              <tr 
                key={follower.did}
                className={`hover:bg-gray-50 ${getRowClassName(follower)}`}
              >
                <td className="px-3 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedFollowers.has(follower.did)}
                    onChange={() => onToggleFollower(follower.did)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </td>
                <td className="px-3 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {follower.avatar ? (
                      <img
                        className="h-8 w-8 rounded-full"
                        src={follower.avatar}
                        alt=""
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-gray-200" />
                    )}
                    <div className="ml-4">
                      <div className="font-medium text-gray-900">
                        {follower.displayName || follower.handle}
                        {' '}
                        <span className="text-sm text-gray-500">
                          {getStatusText(follower)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {follower.handle}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {follower.issues.length > 0 ? (
                      <ul className="list-disc list-inside">
                        {follower.issues.map((issue, index) => (
                          <li key={index} className="text-red-600">
                            {issue}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-green-600">No issues</span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(follower.indexedAt)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}