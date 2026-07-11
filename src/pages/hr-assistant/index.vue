<template>
  <div class="h-full flex flex-col bg-white rounded-lg shadow">
    <div class="flex items-center justify-between px-6 py-4 border-b">
      <div>
        <h2 class="text-xl font-semibold text-gray-800">HR 招聘助手</h2>
        <p class="text-sm text-gray-500 mt-1">可以帮你从人才库中语义检索候选人，支持连续追问。</p>
      </div>

      <el-button @click="startNewConversation">新会话</el-button>
    </div>

    <div ref="messageListRef" class="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
      <div
        v-for="message in messages"
        :key="message.id"
        class="flex"
        :class="message.role === 'user' ? 'justify-end' : 'justify-start'"
      >
        <div
          class="max-w-[82%] rounded-lg px-4 py-3 leading-7"
          :class="
            message.role === 'user'
              ? 'bg-blue-500 text-white'
              : 'bg-white text-gray-800 border border-gray-200'
          "
        >
          <div
            v-if="message.role === 'assistant'"
            class="markdown-body"
            v-html="renderMarkdown(message.content)"
          ></div>
          <div v-else class="whitespace-pre-wrap">{{ message.content }}</div>

          <div
            v-if="message.role === 'assistant' && message.artifacts?.length"
            class="mt-4 space-y-4"
          >
            <div
              v-for="(artifact, artifactIndex) in message.artifacts"
              :key="`${message.id}-artifact-${artifactIndex}`"
              class="rounded-lg border border-gray-100 bg-gray-50 p-3"
            >
              <div class="mb-3 flex items-center justify-between">
                <span class="font-medium text-gray-800">{{ artifact.title }}</span>
                <el-tag size="small" effect="plain">
                  {{ getArtifactTypeLabel(artifact.type) }}
                </el-tag>
              </div>

              <div
                v-if="artifact.type === 'candidate_comparison'"
                class="space-y-3"
              >
                <el-table
                  :data="getComparisonRows(artifact)"
                  row-key="candidate_id"
                  border
                  stripe
                  size="small"
                  class="comparison-table"
                >
                  <el-table-column label="候选人" min-width="130">
                    <template #default="{ row }">
                      <div class="font-medium text-gray-900">
                        {{ row.name || '未命名候选人' }}
                      </div>
                      <el-tag
                        v-if="row.status"
                        class="mt-1"
                        size="small"
                        :type="getStatusTagType(row.status)"
                      >
                        {{ row.status }}
                      </el-tag>
                    </template>
                  </el-table-column>

                  <el-table-column label="应聘职位" min-width="150">
                    <template #default="{ row }">
                      {{ row.positionTitle || '暂无职位信息' }}
                    </template>
                  </el-table-column>

                  <el-table-column label="AI 综合评分" min-width="110">
                    <template #default="{ row }">
                      <el-tag
                        v-if="row.overallScore !== null"
                        type="success"
                        effect="plain"
                      >
                        {{ row.overallScore }} / 10
                      </el-tag>
                      <span v-else class="text-gray-400">暂无</span>
                    </template>
                  </el-table-column>

                  <el-table-column label="技能" min-width="210" show-overflow-tooltip>
                    <template #default="{ row }">
                      {{ row.skills || '暂无' }}
                    </template>
                  </el-table-column>

                  <el-table-column label="AI 总结" min-width="240" show-overflow-tooltip>
                    <template #default="{ row }">
                      {{ row.summary || '暂无' }}
                    </template>
                  </el-table-column>

                  <el-table-column label="操作" width="100" fixed="right">
                    <template #default="{ row }">
                      <el-button
                        size="small"
                        type="primary"
                        link
                        :disabled="loading"
                        @click="openCandidateDetail(row.candidateId, row.name)"
                      >
                        查看详情
                      </el-button>
                    </template>
                  </el-table-column>
                </el-table>

                <div
                  v-if="getMissingCandidateIds(artifact).length"
                  class="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700"
                >
                  有 {{ getMissingCandidateIds(artifact).length }} 位候选人不存在或无查看权限，
                  未纳入本次对比。
                </div>
              </div>

              <div v-else class="grid gap-3">
                <div
                  v-for="candidate in artifact.candidates"
                  :key="`${artifact.type}-${candidate.candidate_id}`"
                  class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div class="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div class="flex flex-wrap items-center gap-2">
                        <span class="text-base font-semibold text-gray-900">
                          {{ candidate.name || '未命名候选人' }}
                        </span>
                        <el-tag
                          v-if="candidate.status"
                          size="small"
                          :type="getStatusTagType(candidate.status)"
                        >
                          {{ candidate.status }}
                        </el-tag>
                      </div>
                      <div class="mt-1 text-sm text-gray-500">
                        {{ candidate.position_title || '暂无职位信息' }}
                      </div>
                    </div>

                    <div v-if="candidate.score !== null && candidate.score !== undefined">
                      <el-tag type="success" effect="plain">
                        匹配分 {{ formatScore(candidate.score) }}
                      </el-tag>
                    </div>
                  </div>

                  <p
                    v-if="candidate.summary"
                    class="mt-3 line-clamp-3 text-sm leading-6 text-gray-600"
                  >
                    {{ candidate.summary }}
                  </p>

                  <div
                    v-if="artifact.type === 'candidate_detail'"
                    class="mt-3 space-y-3 border-t border-gray-100 pt-3"
                  >
                    <div v-if="getDetailProfile(artifact).skills" class="text-sm">
                      <span class="font-medium text-gray-700">技能：</span>
                      <span class="text-gray-600">{{ getDetailProfile(artifact).skills }}</span>
                    </div>
                    <div v-if="getDetailProfile(artifact).work_experience" class="text-sm">
                      <span class="font-medium text-gray-700">工作经历：</span>
                      <span class="text-gray-600">
                        {{ getDetailProfile(artifact).work_experience }}
                      </span>
                    </div>
                    <div v-if="getDetailProfile(artifact).project_experience" class="text-sm">
                      <span class="font-medium text-gray-700">项目经历：</span>
                      <span class="text-gray-600">
                        {{ getDetailProfile(artifact).project_experience }}
                      </span>
                    </div>
                    <div v-if="getDetailAiScore(artifact).overall_score" class="text-sm">
                      <span class="font-medium text-gray-700">AI 综合评分：</span>
                      <span class="text-gray-600">
                        {{ getDetailAiScore(artifact).overall_score }}
                      </span>
                    </div>
                  </div>

                  <div v-if="artifact.type === 'candidate_cards'" class="mt-3 flex flex-wrap gap-2">
                    <el-button
                      v-for="action in candidate.actions"
                      :key="`${action.type}-${action.candidate_id}`"
                      size="small"
                      type="primary"
                      plain
                      :disabled="loading"
                      @click="handleCandidateAction(action, candidate)"
                    >
                      {{ action.label }}
                    </el-button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="loading" class="flex justify-start">
        <div class="bg-white text-gray-500 border border-gray-200 rounded-lg px-4 py-3">
          正在思考中...
        </div>
      </div>

      <el-empty
        v-if="messages.length === 0 && !loading"
        description="试试输入：帮我找几个熟悉 Python、FastAPI，并做过大模型应用的候选人"
      />
    </div>

    <div class="p-4 border-t bg-white">
      <div class="flex gap-3">
        <el-input
          v-model="inputMessage"
          type="textarea"
          :rows="3"
          resize="none"
          placeholder="请输入你的招聘需求，例如：帮我找几个熟悉 Python 和大模型应用的候选人"
          @keydown.enter.exact.prevent="sendMessage()"
        />
        <el-button
          type="primary"
          class="self-end"
          :loading="loading"
          :disabled="!inputMessage.trim()"
          @click="sendMessage()"
        >
          发送
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { chatWithHRAssistant } from '@/apis/hr_assistant_api'
import type {
  HRAssistantArtifact,
  HRAssistantCandidateAction,
  HRAssistantCandidateCard,
} from '@/apis/hr_assistant_api'

type ChatRole = 'user' | 'assistant'

interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  artifacts?: HRAssistantArtifact[]
}

const messages = ref<ChatMessage[]>([])
const inputMessage = ref('')
const loading = ref(false)
const conversationId = ref<string | null>(localStorage.getItem('hrAssistantConversationId'))
const messageListRef = ref<HTMLElement | null>(null)

const createMessageId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`

const escapeHtml = (content: string) => {
  return content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const renderInlineMarkdown = (content: string) => {
  return escapeHtml(content)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
}

const renderMarkdown = (content: string) => {
  const lines = content.split('\n')
  const html: string[] = []
  let listType: 'ul' | 'ol' | null = null
  let inCodeBlock = false
  const codeBlockLines: string[] = []

  const closeList = () => {
    if (listType) {
      html.push(`</${listType}>`)
      listType = null
    }
  }

  const openList = (type: 'ul' | 'ol') => {
    if (listType === type) return
    closeList()
    listType = type
    html.push(`<${type}>`)
  }

  const closeCodeBlock = () => {
    html.push(`<pre><code>${escapeHtml(codeBlockLines.join('\n'))}</code></pre>`)
    codeBlockLines.length = 0
    inCodeBlock = false
  }

  for (const line of lines) {
    const trimmedLine = line.trim()

    if (trimmedLine.startsWith('```')) {
      closeList()
      if (inCodeBlock) {
        closeCodeBlock()
      } else {
        inCodeBlock = true
      }
      continue
    }

    if (inCodeBlock) {
      codeBlockLines.push(line)
      continue
    }

    if (!trimmedLine) {
      closeList()
      continue
    }

    if (trimmedLine.startsWith('### ')) {
      closeList()
      html.push(`<h3>${renderInlineMarkdown(trimmedLine.slice(4))}</h3>`)
      continue
    }

    if (trimmedLine.startsWith('## ')) {
      closeList()
      html.push(`<h2>${renderInlineMarkdown(trimmedLine.slice(3))}</h2>`)
      continue
    }

    if (trimmedLine.startsWith('# ')) {
      closeList()
      html.push(`<h1>${renderInlineMarkdown(trimmedLine.slice(2))}</h1>`)
      continue
    }

    const orderedListMatch = trimmedLine.match(/^\d+\.\s+(.+)$/)
    if (orderedListMatch) {
      openList('ol')
      html.push(`<li>${renderInlineMarkdown(orderedListMatch[1] ?? '')}</li>`)
      continue
    }

    const unorderedListMatch = trimmedLine.match(/^[-*]\s+(.+)$/)
    if (unorderedListMatch) {
      openList('ul')
      html.push(`<li>${renderInlineMarkdown(unorderedListMatch[1] ?? '')}</li>`)
      continue
    }

    closeList()
    html.push(`<p>${renderInlineMarkdown(trimmedLine)}</p>`)
  }

  closeList()
  if (inCodeBlock) {
    closeCodeBlock()
  }

  return html.join('')
}

const asRecord = (value: unknown): Record<string, any> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  return value as Record<string, any>
}

const getDetailProfile = (artifact: HRAssistantArtifact) => {
  return asRecord(asRecord(artifact.raw).profile)
}

const getDetailAiScore = (artifact: HRAssistantArtifact) => {
  return asRecord(asRecord(artifact.raw).ai_score)
}

interface CandidateComparisonRow {
  candidateId: string
  name: string | null
  status: string | null
  positionTitle: string | null
  overallScore: number | null
  skills: string | null
  summary: string | null
}

const getComparisonRows = (artifact: HRAssistantArtifact): CandidateComparisonRow[] => {
  const candidates = asRecord(artifact.raw).candidates
  if (!Array.isArray(candidates)) return []

  return candidates
    .map((candidate) => {
      const detail = asRecord(candidate)
      const position = asRecord(detail.position)
      const profile = asRecord(detail.profile)
      const aiScore = asRecord(detail.ai_score)
      const candidateId = typeof detail.candidate_id === 'string' ? detail.candidate_id : ''

      if (!candidateId) return null

      return {
        candidateId,
        name: typeof detail.name === 'string' ? detail.name : null,
        status: typeof detail.status === 'string' ? detail.status : null,
        positionTitle: typeof position.title === 'string' ? position.title : null,
        overallScore: typeof aiScore.overall_score === 'number' ? aiScore.overall_score : null,
        skills: typeof profile.skills === 'string' ? profile.skills : null,
        summary: typeof aiScore.summary === 'string' ? aiScore.summary : null,
      }
    })
    .filter((candidate): candidate is CandidateComparisonRow => candidate !== null)
}

const getMissingCandidateIds = (artifact: HRAssistantArtifact): string[] => {
  const missingCandidateIds = asRecord(artifact.raw).missing_candidate_ids
  if (!Array.isArray(missingCandidateIds)) return []

  return missingCandidateIds.filter((candidateId): candidateId is string => {
    return typeof candidateId === 'string'
  })
}

const getArtifactTypeLabel = (type: HRAssistantArtifact['type']) => {
  switch (type) {
    case 'candidate_detail':
      return '详情'
    case 'candidate_comparison':
      return '候选人对比'
    default:
      return '搜索结果'
  }
}

const formatScore = (score: number) => {
  if (score > 0 && score <= 1) {
    return `${Math.round(score * 100)}%`
  }

  return score.toFixed(2)
}

const getStatusTagType = (status: string | null | undefined) => {
  switch (status) {
    case 'AI筛选通过':
    case 'AI筛选成功':
    case '面试通过':
    case '已入职':
      return 'success'
    case 'AI筛选未通过':
    case 'AI筛选失败':
    case '面试未通过':
    case '已拒绝':
      return 'danger'
    case '待面试':
      return 'warning'
    case '已投递':
    case '拒绝面试':
      return 'info'
    default:
      return ''
  }
}

const scrollToBottom = async () => {
  await nextTick()
  if (messageListRef.value) {
    messageListRef.value.scrollTop = messageListRef.value.scrollHeight
  }
}

const sendMessage = async (specifiedContent?: string) => {
  const content = (specifiedContent ?? inputMessage.value).trim()
  if (!content || loading.value) return

  messages.value.push({
    id: createMessageId(),
    role: 'user',
    content,
  })
  if (!specifiedContent) {
    inputMessage.value = ''
  }
  loading.value = true
  await scrollToBottom()

  try {
    const response = await chatWithHRAssistant({
      message: content,
      conversation_id: conversationId.value,
    })

    conversationId.value = response.conversation_id
    localStorage.setItem('hrAssistantConversationId', response.conversation_id)

    messages.value.push({
      id: createMessageId(),
      role: 'assistant',
      content: response.answer || '助手没有返回内容。',
      artifacts: response.artifacts || [],
    })
  } catch (error) {
    console.error(error)
    ElMessage.error('HR 助手请求失败，请稍后重试')
    messages.value.push({
      id: createMessageId(),
      role: 'assistant',
      content: '请求失败了。请确认后端服务、登录状态和 Milvus 数据是否正常。',
    })
  } finally {
    loading.value = false
    await scrollToBottom()
  }
}

const handleCandidateAction = async (
  action: HRAssistantCandidateAction,
  candidate: HRAssistantCandidateCard,
) => {
  if (action.type !== 'open_candidate_detail') return

  await openCandidateDetail(action.candidate_id, candidate.name)
}

const openCandidateDetail = async (candidateId: string, candidateName?: string | null) => {
  const candidateNameText = candidateName ? `「${candidateName}」` : ''
  await sendMessage(`请详细介绍候选人${candidateNameText}，候选人ID：${candidateId}`)
}

const startNewConversation = () => {
  conversationId.value = null
  localStorage.removeItem('hrAssistantConversationId')
  messages.value = []
  ElMessage.success('已开始新会话')
}
</script>

<style scoped>
.markdown-body {
  white-space: normal;
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3) {
  margin: 0.85rem 0 0.45rem;
  color: #111827;
  font-weight: 700;
  line-height: 1.35;
}

.markdown-body :deep(h1) {
  font-size: 1.25rem;
}

.markdown-body :deep(h2) {
  font-size: 1.15rem;
}

.markdown-body :deep(h3) {
  font-size: 1.05rem;
}

.markdown-body :deep(p) {
  margin: 0.45rem 0;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  margin: 0.5rem 0 0.5rem 1.4rem;
  padding-left: 0.4rem;
}

.markdown-body :deep(ul) {
  list-style: disc;
}

.markdown-body :deep(ol) {
  list-style: decimal;
}

.markdown-body :deep(li) {
  margin: 0.25rem 0;
}

.markdown-body :deep(strong) {
  font-weight: 700;
  color: #111827;
}

.markdown-body :deep(code) {
  border-radius: 0.25rem;
  background: #f3f4f6;
  padding: 0.1rem 0.25rem;
  color: #be123c;
  font-size: 0.92em;
}

.markdown-body :deep(pre) {
  margin: 0.75rem 0;
  overflow-x: auto;
  border-radius: 0.5rem;
  background: #111827;
  padding: 0.75rem;
}

.markdown-body :deep(pre code) {
  background: transparent;
  padding: 0;
  color: #e5e7eb;
}

.comparison-table {
  width: 100%;
}
</style>
