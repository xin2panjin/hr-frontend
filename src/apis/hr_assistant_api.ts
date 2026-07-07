import httpRequest from './request'

export interface HRAssistantChatRequest {
  message: string
  conversation_id?: string | null
}

export interface HRAssistantChatResponse {
  conversation_id: string
  answer: string
}

export const chatWithHRAssistant = (data: HRAssistantChatRequest) => {
  return httpRequest.post<HRAssistantChatResponse>('/hr-assistant/chat', data)
}
