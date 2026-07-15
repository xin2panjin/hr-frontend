import httpRequest from './request'

export interface KnowledgeDocument {
  id: string; title: string; category: string | null; file_name: string; file_type: string
  version: string | null; effective_date: string | null; status: string; indexed_at: string | null
  created_at: string; updated_at: string
}
export interface KnowledgeTask {
  id: string; document_id: string | null; task_type: string; status: string
  target_chunk_version: number | null; retry_count: number; last_error: string | null
  created_at: string; completed_at: string | null
}
export interface KnowledgeTextProcessingConfig {
  cleaning: {
    normalize_whitespace: boolean
    remove_urls_and_emails: boolean
    remove_blockquote_metadata: boolean
  }
  chunking: {
    max_characters: number
    overlap_characters: number
    strategy: 'structured_builtin' | 'fixed_length' | 'custom_character' | 'langchain_recursive'
    custom_separator: string
    recursive_separators: string[]
  }
}
export interface KnowledgeRetrievalConfig {
  retrieval_mode: 'dense' | 'sparse' | 'hybrid'
  dense_recall_k: number
  sparse_recall_k: number
  hybrid_limit: number
  rrf_k: number
  rerank_enabled: boolean
  rerank_top_k: number
  minimum_evidence_score: number
  max_chunks_per_document: number
  merge_adjacent_chunks: boolean
}
export interface KnowledgePreviewChunk {
  chunk_index: number; content: string; character_count: number; token_count: number
  section_path: string | null; page_number: number | null
}
export interface KnowledgeDocumentPreview {
  raw_block_count: number; cleaned_block_count: number; chunk_count: number
  total_characters: number; preview_truncated: boolean
  processing_config: KnowledgeTextProcessingConfig; chunks: KnowledgePreviewChunk[]
}
export const listKnowledgeDocuments = () => httpRequest.get<{ items: KnowledgeDocument[]; total: number }>('/knowledge/documents', { page: 1, size: 100 })
export const listKnowledgeTasks = () => httpRequest.get<{ items: KnowledgeTask[]; total: number }>('/knowledge/index-tasks', { page: 1, size: 100 })
export const uploadKnowledgeDocument = (data: FormData) => httpRequest.post<KnowledgeDocument>('/knowledge/documents', data, { headers: { 'Content-Type': 'multipart/form-data' } })
export const previewKnowledgeDocument = (data: FormData) => httpRequest.post<KnowledgeDocumentPreview>('/knowledge/documents/preview', data, { headers: { 'Content-Type': 'multipart/form-data' } })
export const reindexKnowledgeDocument = (id: string) => httpRequest.post<KnowledgeTask>(`/knowledge/documents/${id}/reindex`)
export const archiveKnowledgeDocument = (id: string) => httpRequest.delete<KnowledgeTask>(`/knowledge/documents/${id}`)
export const getKnowledgeRetrievalConfig = () => httpRequest.get<KnowledgeRetrievalConfig>('/knowledge/retrieval-config')
export const updateKnowledgeRetrievalConfig = (data: KnowledgeRetrievalConfig) => httpRequest.put<KnowledgeRetrievalConfig>('/knowledge/retrieval-config', data)
