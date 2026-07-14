import { defineStore } from 'pinia'
import request from '@/apis/request'

export interface Department {
  id: string
  name: string
}

export interface User {
  id: string
  username: string
  email: string
  phone_number: string | null
  realname: string
  department: Department | null
  created_at: string
}

export interface UserState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  permissions: string[]
  roles: { code: string; name: string; department_ids: string[] }[]
}

export const useUserStore = defineStore('user', {
  state: (): UserState => {
    // 数据是存储在浏览器的localStorage中的，所以在初始化时需要从localStorage中读取数据
    const user = localStorage.getItem('user')
    const accessToken = localStorage.getItem('accessToken')
    const refreshToken = localStorage.getItem('refreshToken')
    return {
      user: user ? JSON.parse(user) : null,
      accessToken: accessToken || null,
      refreshToken: refreshToken || null,
      permissions: JSON.parse(localStorage.getItem('permissions') || '[]'),
      roles: JSON.parse(localStorage.getItem('roles') || '[]'),
    }
  },

  getters: {
    isLoggedIn(): boolean {
      return !!this.accessToken
    },
    getUserInfo(): User | null {
      return this.user
    },
    getAccessToken(): string | null {
      return this.accessToken
    },
    canUseHRAssistant(): boolean { return this.permissions.includes('assistant.use') },
  },

  actions: {
    login(user: User, accessToken: string, refreshToken?: string) {
      this.user = user
      this.accessToken = accessToken
      this.refreshToken = refreshToken || null
      // 将用户信息和访问令牌保存到localStorage中
      localStorage.setItem('user', JSON.stringify(user))
      localStorage.setItem('accessToken', accessToken)
      if (refreshToken) localStorage.setItem('refreshToken', refreshToken)
      else localStorage.removeItem('refreshToken')
    },
    updateTokens(accessToken: string, refreshToken: string) {
      this.accessToken = accessToken
      this.refreshToken = refreshToken
      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('refreshToken', refreshToken)
    },
    can(permission: string) { return this.permissions.includes(permission) },
    async refreshPrincipal() {
      const principal = await request.get<{ user: User; roles: UserState['roles']; permissions: string[] }>('/iam/me')
      this.user = principal.user
      this.roles = principal.roles
      this.permissions = principal.permissions
      localStorage.setItem('user', JSON.stringify(this.user)); localStorage.setItem('roles', JSON.stringify(this.roles)); localStorage.setItem('permissions', JSON.stringify(this.permissions))
    },

    logout() {
      this.user = null
      this.accessToken = null
      this.refreshToken = null
      this.permissions = []; this.roles = []
      // 从localStorage中清除用户信息和访问令牌
      localStorage.removeItem('user')
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken'); localStorage.removeItem('permissions'); localStorage.removeItem('roles')
    },
  },
})
