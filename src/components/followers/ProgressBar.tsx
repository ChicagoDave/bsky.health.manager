interface ProgressBarProps {
    total: number
    current: number
    status: string
    blockedCount?: number
  }
  
  export function ProgressBar({ total, current, status, blockedCount = 0 }: ProgressBarProps) {
    const percentage = total === 0 ? 0 : Math.round((current / total) * 100)
  
    return (
      <div className="w-full p-4 bg-white rounded-lg shadow">
        <div className="flex justify-between mb-2">
          <span className="text-sm font-medium text-blue-700">Analyzing followers...</span>
          <span className="text-sm font-medium text-blue-700">{percentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="mt-2 text-sm text-gray-600">{status}</div>
        <div className="mt-1 text-sm text-gray-500">
          {current} of ~{total} active followers analyzed
          {blockedCount > 0 && (
            <span className="ml-2 text-gray-400">
              (excluding approximately {blockedCount} blocked accounts)
            </span>
          )}
        </div>
      </div>
    )
  }