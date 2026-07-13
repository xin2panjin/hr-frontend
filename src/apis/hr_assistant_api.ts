import httpRequest from './request'
import { useUserStore } from '@/stores/user'

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

export type HRAssistantStreamEventType =
  | 'message_start'
  | 'content_delta'
  | 'tool_start'
  | 'tool_end'
  | 'message_end'
  | 'error'

export interface HRAssistantStreamEvent {
  event: HRAssistantStreamEventType
  data: Record<string, unknown>
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

/**
 * 通过 POST 消费招聘助手 SSE。
 *
 * 浏览器的 EventSource 只能发 GET 且不便于携带现有 Bearer Token，因此使用
 * fetch + ReadableStream 手动解析标准 SSE 帧。
 */
export const streamHRAssistantMessage = async (
  conversationId: string,
  content: string,
  onEvent: (event: HRAssistantStreamEvent) => void | Promise<void>,
) => {
  const userStore = useUserStore()
  const baseURL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
  const response = await fetch(
    `${baseURL}/assistant/conversations/${conversationId}/messages/stream`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...(userStore.accessToken ? { Authorization: `Bearer ${userStore.accessToken}` } : {}),
      },
      body: JSON.stringify({ content }),
    },
  )

  if (!response.ok) {
    const error = new Error('招聘助手流式请求失败') as Error & {
      response?: { status: number }
    }
    error.response = { status: response.status }
    throw error
  }
  if (!response.body) {
    throw new Error('浏览器不支持流式响应')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''

  const consumeFrame = async (frame: string) => {
    const eventName = frame.match(/^event:\s*(.+)$/m)?.[1]?.trim()
    const dataText = frame.match(/^data:\s*(.+)$/m)?.[1]
    if (!eventName || !dataText) return

    try {
      await onEvent({
        event: eventName as HRAssistantStreamEventType,
        data: JSON.parse(dataText) as Record<string, unknown>,
      })
    } catch (error) {
      // 单个异常帧不能阻塞后续可用内容，详细信息仅留在浏览器控制台。
      console.error('解析招聘助手 SSE 事件失败', error)
    }
  }

  try {
    while (true) {
      const { value, done } = await reader.read()
      buffer += decoder.decode(value, { stream: !done })

      let separatorIndex = buffer.indexOf('\n\n')
      while (separatorIndex >= 0) {
        await consumeFrame(buffer.slice(0, separatorIndex))
        buffer = buffer.slice(separatorIndex + 2)
        separatorIndex = buffer.indexOf('\n\n')
      }

      if (done) break
    }
  } finally {
    reader.releaseLock()
  }
}
