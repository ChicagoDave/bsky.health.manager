import { useState } from 'react'
import { bskyService } from '@/services/bsky'
import { accessControlService } from '@/services/access-control'

export default function LoginComponent() {
  const [handle, setHandle] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      // Check access first
      const accessResult = await accessControlService.checkAccess(handle)
      if (!accessResult.allowed) {
        setError('Your handle is not white listed. Please contact david-cornelson.bsky.social for access.')
        setIsLoading(false)
        return
      }

      // Proceed with BlueSky sign in
      const result = await bskyService.signIn(handle)
      if (!result.success) {
        setError(result.error || 'Failed to sign in')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            Sign in to BlueSky Health Manager
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="handle" className="sr-only">
              BlueSky Handle
            </label>
            <input
              id="handle"
              name="handle"
              type="text"
              required
              className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              placeholder="Your BlueSky handle (e.g. you.bsky.social)"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading || !handle}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
            >
              {isLoading ? 'Checking access...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}