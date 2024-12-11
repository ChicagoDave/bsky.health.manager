// src/services/useraccess.ts

interface AccessCheckResponse {
    allowed: boolean
    message?: string
  }
  
  export class UserAccessService {
    private readonly accessEndpoint: string
  
    constructor(endpoint: string = '/api/access-check.php') {
      this.accessEndpoint = endpoint
    }
  
    async checkAccess(handle: string): Promise<AccessCheckResponse> {
      try {
        const response = await fetch(this.accessEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ handle }),
          credentials: 'include' // Important: Include cookies for session handling
        })
  
        if (!response.ok) {
          throw new Error('Access check failed')
        }
  
        const result = await response.json()
        return {
          allowed: result.allowed,
          message: result.message
        }
      } catch (error) {
        console.error('Access check error:', error)
        return {
          allowed: false,
          message: 'Unable to verify access. Please try again later.'
        }
      }
    }
  }
  
  export const userAccessService = new UserAccessService()