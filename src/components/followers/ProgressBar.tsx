import { useState, useEffect } from 'react'

interface ProgressBarProps {
  total: number
  current: number 
  status: string
  blockedCount?: number
  whitelistedCount?: number
  startTime?: number
}

export default function ProgressBar({ 
  total, 
  current, 
  status, 
  blockedCount = 0,
  whitelistedCount = 0,
  startTime = Date.now()
}: ProgressBarProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>('')
  
  useEffect(() => {
    if (current === 0 || current === total) return
    
    const elapsed = Date.now() - startTime
    const timePerItem = elapsed / current
    const remainingItems = total - current
    const remainingMs = timePerItem * remainingItems
    
    const minutes = Math.floor(remainingMs / 60000)
    const seconds = Math.round((remainingMs % 60000) / 1000)
    
    setTimeRemaining(`${minutes}m ${seconds}s remaining`)
  }, [current, total, startTime])

  const percentage = total === 0 ? 0 : Math.round((current / total) * 100)

  return (
    <div className="w-full p-4 bg-white rounded-lg shadow">
      <div className="flex justify-between mb-2">
        <span className="text-sm font-medium text-blue-700">
          Analyzing followers...
        </span>
        <span className="text-sm font-medium text-blue-700">
          {percentage}% {current > 0 && timeRemaining && `(${timeRemaining})`}
        </span>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div 
          className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      <div className="mt-2 text-sm text-gray-600">{status}</div>
      
      <div className="mt-1 text-sm">
        <span className="text-gray-700">
          {current} of ~{total} active followers analyzed
        </span>
        {whitelistedCount > 0 && (
          <span className="ml-2 text-green-600">
            • {whitelistedCount} whitelisted
          </span>
        )}
        {blockedCount > 0 && (
          <span className="ml-2 text-gray-400">
            • {blockedCount} blocked
          </span>
        )}
      </div>
    </div>
  )
}