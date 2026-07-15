import axios, { AxiosHeaders } from 'axios'

const tokenKey = 'candidatePortalAccessToken'
const client = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL, timeout: 300000 })

client.interceptors.request.use((config) => {
  const token = localStorage.getItem(tokenKey)
  if (token) {
    config.headers = AxiosHeaders.from(config.headers)
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
})
client.interceptors.response.use((response) => response.data, (error) => {
  if (error.response?.status === 401) localStorage.removeItem(tokenKey)
  return Promise.reject(error)
})

export interface PortalApplication { candidate_id: string; candidate_name: string; position_title: string; status: string; applied_at: string; conversation_id: string | null; last_message_at: string | null }
export interface PortalMessage { id: string; sender_type: 'candidate' | 'hr'; sender_name?: string | null; content: string; created_at: string }
export const candidatePortalTokenKey = tokenKey
export const sendCandidateLoginCode = (email: string) => client.post<unknown, { result: string }>('/candidate-portal/auth/code', { email })
export const verifyCandidateLoginCode = (email: string, code: string) => client.post<unknown, { access_token: string }>('/candidate-portal/auth/verify', { email, code })
export const getPortalApplications = () => client.get<unknown, { items: PortalApplication[] }>('/candidate-portal/applications')
export const getPortalMessages = (candidateId: string) => client.get<unknown, { conversation_id: string | null; items: PortalMessage[] }>(`/candidate-portal/applications/${candidateId}/messages`)
export const sendPortalMessage = (candidateId: string, content: string) => client.post<unknown, { message: PortalMessage }>(`/candidate-portal/applications/${candidateId}/messages`, { content })
