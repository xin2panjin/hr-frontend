import axios, { AxiosHeaders, type AxiosError, type AxiosInstance, type AxiosRequestConfig } from 'axios'
import { useUserStore } from '@/stores/user'

interface AuthRequestConfig extends AxiosRequestConfig {
  _retriedAfterRefresh?: boolean
  skipAccessToken?: boolean
  skipAuthRefresh?: boolean
}

interface TokenPair {
  access_token: string
  refresh_token: string
}

class HttpRequest {
  private instance: AxiosInstance
  private refreshPromise: Promise<TokenPair> | null = null
  public baseURL: string

  constructor() {
    // TODO: Add your API base URL here
    const baseURL = import.meta.env.VITE_API_BASE_URL
    this.baseURL = baseURL

    this.instance = axios.create({
      baseURL,
      timeout: 300000,
    })

    this.initializeInterceptors()
  }

  private initializeInterceptors() {
    // Request interceptor
    this.instance.interceptors.request.use(
      (config) => {
        const userStore = useUserStore()
        const token = userStore.accessToken
        const authConfig = config as AuthRequestConfig
        if (token && !authConfig.skipAccessToken) {
          config.headers = AxiosHeaders.from(config.headers)
          config.headers.set('Authorization', `Bearer ${token}`)
        }
        return config
      },
      (error) => {
        return Promise.reject(error)
      },
    )

    // Response interceptor
    this.instance.interceptors.response.use(
      (response) => {
        return response.data
      },
      async (error: AxiosError) => {
        const requestConfig = error.config as AuthRequestConfig | undefined
        const status = error.response?.status
        if (
          status !== 401 ||
          !requestConfig ||
          requestConfig.skipAuthRefresh ||
          requestConfig._retriedAfterRefresh ||
          requestConfig.url === '/user/login'
        ) {
          return Promise.reject(error)
        }

        requestConfig._retriedAfterRefresh = true
        try {
          const tokens = await this.refreshSession()
          requestConfig.headers = AxiosHeaders.from(requestConfig.headers as AxiosHeaders | Record<string, string> | undefined)
          requestConfig.headers.set('Authorization', `Bearer ${tokens.access_token}`)
          const response = await this.instance.request<unknown, unknown>(requestConfig)
          // 令牌轮换后异步重新拉取主体，确保菜单和按钮尽快收敛到服务端当前授权。
          void useUserStore().refreshPrincipal().catch(() => this.clearExpiredSession())
          return response
        } catch (refreshError) {
          this.clearExpiredSession()
          return Promise.reject(refreshError)
        }
      },
    )
  }

  private refreshSession(): Promise<TokenPair> {
    if (this.refreshPromise) return this.refreshPromise

    const userStore = useUserStore()
    if (!userStore.refreshToken) return Promise.reject(new Error('登录会话已过期'))

    this.refreshPromise = this.instance.request<unknown, TokenPair>({
      url: '/user/refresh',
      method: 'POST',
      headers: { Authorization: `Bearer ${userStore.refreshToken}` },
      skipAccessToken: true,
      skipAuthRefresh: true,
    } as AuthRequestConfig).then((tokens) => {
      userStore.updateTokens(tokens.access_token, tokens.refresh_token)
      return tokens
    }).finally(() => {
      this.refreshPromise = null
    })
    return this.refreshPromise
  }

  private clearExpiredSession() {
    const userStore = useUserStore()
    userStore.logout()
    if (window.location.pathname !== '/login') {
      const redirect = `${window.location.pathname}${window.location.search}${window.location.hash}`
      window.location.assign(`/login?redirect=${encodeURIComponent(redirect)}`)
    }
  }

  public request<T = any>(config: AxiosRequestConfig): Promise<T> {
    return this.instance.request<any, T>(config)
  }

  public get<T = any>(url: string, params?: object, config?: AxiosRequestConfig): Promise<T> {
    return this.request({ ...config, url, method: 'GET', params })
  }

  public post<T = any>(url: string, data?: object, config?: AxiosRequestConfig): Promise<T> {
    return this.request({ ...config, url, method: 'POST', data })
  }

  public put<T = any>(url: string, data?: object, config?: AxiosRequestConfig): Promise<T> {
    return this.request({ ...config, url, method: 'PUT', data })
  }

  public delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request({ ...config, url, method: 'DELETE' })
  }

  public patch<T = any>(url: string, data?: object, config?: AxiosRequestConfig): Promise<T> {
    return this.request({ ...config, url, method: 'PATCH', data })
  }

  public upload<T = any>(url: string, formData: FormData, config?: AxiosRequestConfig): Promise<T> {
    return this.request({
      ...config,
      url,
      method: 'POST',
      data: formData,
      headers: {
        ...config?.headers,
        'Content-Type': 'multipart/form-data',
      },
    })
  }
}

export default new HttpRequest()
