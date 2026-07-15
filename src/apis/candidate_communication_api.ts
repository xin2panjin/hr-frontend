import request from './request'

export interface CommunicationListItem { candidate_id: string; conversation_id: string; candidate_name: string; candidate_email: string; position_title: string; last_message_at: string; unread_count: number }
export interface CommunicationMessage { id: string; sender_type: 'candidate' | 'hr'; sender_name?: string | null; content: string; created_at: string }
export interface Insight { created_at: string; summary: string; stage?: string | null; intent?: string | null; confirmed_facts: string[]; candidate_requests: string[]; hr_commitments: string[]; risks: string[]; next_step?: string | null; evidence: { message_id: string; content: string }[] }
export interface CommunicationDetail { conversation_id: string; candidate: { id: string; name: string; email: string; phone_number?: string | null; status: string; position_title: string; work_experience?: string | null; education_experience?: string | null; skills?: string | null; ai_summary?: string | null }; messages: CommunicationMessage[]; insight: Insight | null; analysis_status: 'pending' | 'processing' | 'completed' | 'failed' | null }
export interface FollowupTask { id: string; candidate_id: string; conversation_id: string; candidate_name?: string | null; position_title?: string | null; assignee_name?: string | null; title: string; task_type: string; priority: 'high' | 'medium' | 'low'; status: 'pending' | 'in_progress' | 'completed' | 'cancelled'; due_at?: string | null; evidence: { message_id: string; content: string }[]; created_at: string }
export interface FollowupTaskNote { id: string; content: string; author_name?: string | null; created_at: string }

export const getCommunicationConversations = (keyword?: string) => request.get<{ items: CommunicationListItem[] }>('/candidate-communications/conversations', keyword ? { keyword } : undefined)
export const getCommunicationDetail = (candidateId: string) => request.get<CommunicationDetail>(`/candidate-communications/conversations/${candidateId}`)
export const sendHRCommunicationMessage = (candidateId: string, content: string) => request.post<{ message: CommunicationMessage }>(`/candidate-communications/conversations/${candidateId}/messages`, { content })
export const markCommunicationRead = (candidateId: string) => request.post(`/candidate-communications/conversations/${candidateId}/read`)
export const getFollowupTasks = (params?: { status?: string; priority?: string; keyword?: string }) => request.get<{ items: FollowupTask[] }>('/candidate-communications/tasks', params)
export const getFollowupTaskDetail = (taskId: string) => request.get<{ task: FollowupTask; notes: FollowupTaskNote[] }>(`/candidate-communications/tasks/${taskId}`)
export const updateFollowupTask = (taskId: string, status: FollowupTask['status']) => request.patch<{ task: FollowupTask }>(`/candidate-communications/tasks/${taskId}`, { status })
export const addFollowupTaskNote = (taskId: string, content: string) => request.post<{ note: FollowupTaskNote }>(`/candidate-communications/tasks/${taskId}/notes`, { content })
