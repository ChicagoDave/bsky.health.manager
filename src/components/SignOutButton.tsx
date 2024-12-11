import { ArrowRightOnRectangleIcon } from '@heroicons/react/20/solid'
import { bskyService } from '@/services/bsky'

export default function SignOutButton() {
  const handleSignOut = async () => {
    try {
      await bskyService.signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <button
      onClick={handleSignOut}
      className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
    >
      <ArrowRightOnRectangleIcon className="w-5 h-5" />
      <span>Sign Out</span>
    </button>
  )
}