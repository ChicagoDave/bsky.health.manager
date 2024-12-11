import { useEffect, useState } from 'react'
import { bskyService } from '@/services/bsky'
import LoginComponent from './components/LoginComponent'
import FollowerAnalysisComponent from './components/FollowerAnalysisComponent'

function App() {
  const [isInitialized, setIsInitialized] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await bskyService.init()
        setIsInitialized(true)
      } catch (err) {
        console.error('Initialization error:', err)
        setError(err instanceof Error ? err.message : 'Failed to initialize application')
      }
    }
    initializeApp()
  }, [])

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-500 p-4">
          Error: {error}
        </div>
      </div>
    )
  }

  if (!isInitialized) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {!bskyService.isLoggedIn() ? (
        <LoginComponent />
      ) : (
        <FollowerAnalysisComponent />
      )}
    </div>
  )
}

export default App