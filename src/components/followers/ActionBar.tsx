interface BlockingProgress {
    current: number
    total: number
  }
  
  interface ActionBarProps {
    onSelectAll: () => void
    onClearSelection: () => void
    onSelectClean: () => void // New prop
    onGreylist: () => void // New prop
    onExport: () => void
    onBlock: () => void
    selectedCount: number
    isBlocking: boolean
    blockingProgress: BlockingProgress | null
    whitelistedCount?: number
    greylistedCount?: number // New prop
    totalFollowers?: number
  }
  
  export default function ActionBar({
    onSelectAll,
    onClearSelection,
    onSelectClean,
    onGreylist,
    onExport,
    onBlock,
    selectedCount,
    isBlocking,
    blockingProgress,
    whitelistedCount = 0,
    greylistedCount = 0,
    totalFollowers = 0
  }: ActionBarProps) {
    return (
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow">
          <div className="flex items-center gap-4">
            <button
              onClick={onSelectAll}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Select All Filtered
            </button>
            <button
              onClick={onSelectClean}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
            >
              Select Without Issues
            </button>
            <button
              onClick={onClearSelection}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
            >
              Clear Selection
            </button>
            <button
              onClick={onExport}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
            >
              Export CSV
            </button>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">
              <span>{totalFollowers} total followers</span>
              {whitelistedCount > 0 && (
                <span className="ml-2 text-green-600">
                  • {whitelistedCount} whitelisted
                </span>
              )}
              {greylistedCount > 0 && (
                <span className="ml-2 text-gray-500">
                  • {greylistedCount} greylisted
                </span>
              )}
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={onGreylist}
                disabled={selectedCount === 0}
                className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Greylist Selected ({selectedCount})
              </button>
              <button
                onClick={onBlock}
                disabled={selectedCount === 0 || isBlocking}
                className="px-6 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {isBlocking ? (
                  blockingProgress 
                    ? `Blocking ${blockingProgress.current}/${blockingProgress.total}...`
                    : 'Blocking...'
                ) : `Block Selected (${selectedCount})`}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }