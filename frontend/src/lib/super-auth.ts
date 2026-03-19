export interface SuperAuthUser {
  access_token: string
  super_admin_id: string
  super_admin_name: string
}

export function getSuperAuth(): SuperAuthUser | null {
  if (typeof window === 'undefined') return null
  const token = sessionStorage.getItem('super_access_token')
  const sid = sessionStorage.getItem('super_admin_id')
  const name = sessionStorage.getItem('super_admin_name')
  if (!token || !sid) return null
  return { access_token: token, super_admin_id: sid, super_admin_name: name || '' }
}

export function setSuperAuth(data: SuperAuthUser) {
  sessionStorage.setItem('super_access_token', data.access_token)
  sessionStorage.setItem('super_admin_id', data.super_admin_id)
  sessionStorage.setItem('super_admin_name', data.super_admin_name)
}

export function clearSuperAuth() {
  sessionStorage.removeItem('super_access_token')
  sessionStorage.removeItem('super_admin_id')
  sessionStorage.removeItem('super_admin_name')
}

export function isSuperAuthenticated(): boolean {
  return !!getSuperAuth()
}
