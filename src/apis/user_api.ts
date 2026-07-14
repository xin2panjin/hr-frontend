import request from '@/apis/request'
import { type User } from '@/stores/user'

export interface LoginData {
  account: string
  password: string
}

export interface RegisterData {
  email: string
  invite_code: string
  username: string
  realname: string
  password: string
}

export interface LoginResponse {
  access_token: string
  refresh_token: string
  user: User
}

export interface ResponseSchema {
  result: 'success' | 'fail'
}

export function login(data: LoginData) {
  return request.post<LoginResponse>('/user/login', data)
}

export function register(data: RegisterData) {
  return request.post<ResponseSchema>('/user/register', data)
}

export const getDingtalkAuthorizeUrl = () => {
  return request.get<{ authorize_url: string }>('/user/dingtalk/authorize')
}

export const getDingtalkStatus = () => {
  return request.get<{
    dingding_user: null | {
      name: string
      union_id: string
    }
  }>('/user/dingtalk/account')
}
