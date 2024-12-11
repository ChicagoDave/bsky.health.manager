import { userAccessService } from "./useraccess-service"

// src/services/access-control.ts
export class AccessControlService {
    private readonly STORAGE_KEY = 'bsky_health_authorized_handle'
  
    private getStoredHandle(): string | null {
      return localStorage.getItem(this.STORAGE_KEY)
    }
  
    private setStoredHandle(handle: string) {
      localStorage.setItem(this.STORAGE_KEY, handle)
    }
  
    private clearStoredHandle() {
      localStorage.removeItem(this.STORAGE_KEY)
    }
  
    async checkAccess(handle: string): Promise<{allowed: boolean, message?: string}> {
      try {
        const result = await userAccessService.checkAccess(handle)
        if (result.allowed) {
          this.setStoredHandle(handle)
        }
        return result
      } catch (error) {
        console.error('Access check failed:', error)
        return {
          allowed: false,
          message: 'Unable to verify access permissions. Please try again later.'
        }
      }
    }
  
    isAuthorized(): boolean {
      return this.getStoredHandle() !== null
    }
  
    clearAuthorization(): void {
      this.clearStoredHandle()
    }
  
    getAuthorizedHandle(): string | null {
      return this.getStoredHandle()
    }
  }

  export const accessControlService = new AccessControlService()