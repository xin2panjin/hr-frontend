import httpRequest from './request'

export interface HRAssistantChatRequest {
  message: string
  conversation_id?: string | null
}

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

export interface HRAssistantChatResponse {
  conversation_id: string
  answer: string
  artifacts: HRAssistantArtifact[]
}

export const chatWithHRAssistant = (data: HRAssistantChatRequest) => {
  return httpRequest.post<HRAssistantChatResponse>('/hr-assistant/chat', data)
}
