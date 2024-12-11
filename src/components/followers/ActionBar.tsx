// src/components/followers/ActionBar.tsx
interface ActionBarProps {
    onSelectAll: () => void
    onClearSelection: () => void
    onExport: () => void
    onBlock: () => void
    selectedCount: number
    isBlocking: boolean
    blockingProgress: { current: number; total: number } | null
  }
  
  export function ActionBar({
    onSelectAll,
    onClearSelection,
    onExport,
    onBlock,
    selectedCount,
    isBlocking,
    blockingProgress
  }: ActionBarProps) {
    return (
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button
            onClick={onSelectAll}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Select All Filtered
          </button>
          <button
            onClick={onClearSelection}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Clear Selection
          </button>
          <button
            onClick={onExport}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Export CSV
          </button>
        </div>
        <button
          onClick={onBlock}
          disabled={selectedCount === 0 || isBlocking}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-300"
        >
          {isBlocking ? (
            blockingProgress 
              ? `Blocking ${blockingProgress.current}/${blockingProgress.total}...`
              : 'Blocking...'
          ) : `Block Selected (${selectedCount})`}
        </button>
      </div>
    )
  }