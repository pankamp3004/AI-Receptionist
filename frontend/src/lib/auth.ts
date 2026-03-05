export interface AuthUser {
  access_token: string
  organization_id: string
  admin_name: string
}

export function getAuth(): AuthUser | null {
  if (typeof window === 'undefined') return null
  const token = sessionStorage.getItem('access_token')
  const org = sessionStorage.getItem('organization_id')
  const name = sessionStorage.getItem('admin_name')
  if (!token || !org) return null
  return { access_token: token, organization_id: org, admin_name: name || '' }
}

export function setAuth(data: AuthUser) {
  sessionStorage.setItem('access_token', data.access_token)
  sessionStorage.setItem('organization_id', data.organization_id)
  sessionStorage.setItem('admin_name', data.admin_name)
}

export function clearAuth() {
  sessionStorage.removeItem('access_token')
  sessionStorage.removeItem('organization_id')
  sessionStorage.removeItem('admin_name')
}

export function isAuthenticated(): boolean {
  return !!getAuth()
}
