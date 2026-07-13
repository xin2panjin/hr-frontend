import httpRequest from './request'

export type HRAssistantConversationStatus = 'active' | 'archived'
export type HRAssistantMessageRole = 'user' | 'assistant'

export interface HRAssistantCandidateAction {
  type: 'open_candidate_detail'
  label: string
  candidate_id: string
}

export interface HRAssistantCandidateCard {
  candidate_id: string
  name?: string | null
  position_title?: string | null
  status?: string | null
  score?: number | null
  summary?: string | null
  actions: HRAssistantCandidateAction[]
}

export interface HRAssistantArtifact {
  type: 'candidate_cards' | 'candidate_detail' | 'candidate_comparison'
  title: string
  candidates: HRAssistantCandidateCard[]
  raw?: Record<string, unknown> | null
}

/** 后端持久化的助手会话。 */
export interface HRAssistantConversation {
  id: string
  title: string
  status: HRAssistantConversationStatus
  last_message_at: string
  created_at: string
  updated_at: string
}

/** 可直接在前端回放的用户和助手消息。 */
export interface HRAssistantMessage {
  id: string
  role: HRAssistantMessageRole
  content: string
  artifacts: HRAssistantArtifact[]
  created_at: string
}

export interface HRAssistantConversationListResponse {
  items: HRAssistantConversation[]
  total: number
  page: number
  size: number
}

export interface HRAssistantMessageListResponse {
  items: HRAssistantMessage[]
}

export interface CreateHRAssistantConversationResponse {
  conversation: HRAssistantConversation
}

export interface SendHRAssistantMessageResponse {
  conversation_id: string
  message_id: string
  answer: string
  artifacts: HRAssistantArtifact[]
}

export interface UpdateHRAssistantConversationRequest {
  title?: string
  status?: HRAssistantConversationStatus
}

/** 创建一条可持久化的招聘助手会话。 */
export const createHRAssistantConversation = (title = '新对话') => {
  return httpRequest.post<CreateHRAssistantConversationResponse>('/assistant/conversations', {
    title,
  })
}

/** 获取当前用户自己的会话列表。 */
export const getHRAssistantConversations = (page = 1, size = 50) => {
  return httpRequest.get<HRAssistantConversationListResponse>('/assistant/conversations', {
    page,
    size,
  })
}

/** 获取会话的历史用户和助手消息。 */
export const getHRAssistantMessages = (conversationId: string) => {
  return httpRequest.get<HRAssistantMessageListResponse>(
    `/assistant/conversations/${conversationId}/messages`,
  )
}

/** 在指定会话中发送一条消息。 */
export const sendHRAssistantMessage = (conversationId: string, content: string) => {
  return httpRequest.post<SendHRAssistantMessageResponse>(
    `/assistant/conversations/${conversationId}/messages`,
    { content },
  )
}

/** 重命名、归档或恢复会话。 */
export const updateHRAssistantConversation = (
  conversationId: string,
  data: UpdateHRAssistantConversationRequest,
) => {
  return httpRequest.patch<HRAssistantConversation>(
    `/assistant/conversations/${conversationId}`,
    data,
  )
}

/** 软删除当前用户自己的会话。 */
export const deleteHRAssistantConversation = (conversationId: string) => {
  return httpRequest.delete<void>(`/assistant/conversations/${conversationId}`)
}
