<template>
  <div
    class="flex h-[calc(100vh-104px)] min-h-[640px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
  >
    <!-- 会话清单来自后端，刷新页面后仍可恢复历史。 -->
    <aside v-if="conversationPanelVisible" class="order-2 flex w-[286px] shrink-0 flex-col border-l border-slate-200 bg-slate-50">
      <div class="flex items-center justify-between border-b border-slate-200 px-4 py-4">
        <div>
          <div class="font-semibold text-slate-900">历史会话</div>
          <div class="mt-1 text-xs text-slate-500">{{ conversationTotal }} 个会话</div>
        </div>
        <el-tooltip content="收起历史会话" placement="left">
          <el-button :icon="Close" text @click="conversationPanelVisible = false" />
        </el-tooltip>
      </div>

      <div class="space-y-2 border-b border-slate-200 p-3">
        <el-input
          v-model="conversationFilters.keyword"
          class="w-full"
          clearable
          placeholder="搜索会话标题"
          @keyup.enter="searchConversations"
        />
        <div class="flex items-center gap-2">
          <el-select
            v-model="conversationFilters.status"
            class="min-w-0 flex-1"
            clearable
            placeholder="全部状态"
          >
            <el-option label="活跃" value="active" />
            <el-option label="已归档" value="archived" />
          </el-select>
          <el-tooltip content="查询会话" placement="top">
            <el-button type="primary" :icon="Search" @click="searchConversations" />
          </el-tooltip>
        </div>
      </div>

      <el-scrollbar v-loading="loadingConversations" class="flex-1">
        <div class="space-y-1 p-2">
          <div
            v-for="conversation in conversations"
            :key="conversation.id"
            class="group cursor-pointer rounded-lg border px-3 py-2.5 transition"
            :class="
              conversation.id === conversationId
                ? 'border-blue-200 bg-white text-blue-700 shadow-sm'
                : 'border-transparent text-slate-600 hover:border-slate-200 hover:bg-white'
            "
            @click="selectConversation(conversation.id)"
          >
            <div class="flex items-center gap-1">
              <span class="min-w-0 flex-1 truncate text-sm font-semibold">{{
                conversation.title
              }}</span>
              <el-tag v-if="conversation.status === 'archived'" size="small" type="info"
                >已归档</el-tag
              >
              <el-dropdown
                trigger="click"
                @command="handleConversationCommand(conversation.id, $event)"
              >
                <el-button link size="small" class="opacity-0 group-hover:opacity-100" @click.stop>
                  <el-icon><MoreFilled /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="rename">重命名</el-dropdown-item>
                    <el-dropdown-item
                      :command="conversation.status === 'active' ? 'archive' : 'restore'"
                    >
                      {{ conversation.status === 'active' ? '归档' : '恢复' }}
                    </el-dropdown-item>
                    <el-dropdown-item command="delete" divided>删除</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
            <div class="mt-1 text-xs text-slate-400">
              {{ formatConversationTime(conversation.last_message_at) }}
            </div>
          </div>
          <el-empty
            v-if="!loadingConversations && conversations.length === 0"
            :image-size="56"
            description="暂无会话"
          />
        </div>
      </el-scrollbar>
    </aside>

    <section class="flex min-w-0 flex-1 flex-col">
      <div class="flex items-center justify-between border-b border-slate-200 px-6 py-3">
        <div class="min-w-0 truncate text-base font-semibold text-slate-950">
          {{ currentConversation?.title || '新会话' }}
        </div>

        <div class="flex items-center gap-2">
          <el-button size="small" :loading="creatingConversation" @click="startNewConversation">
            <el-icon><Plus /></el-icon>
            新会话
          </el-button>
          <el-button size="small" plain @click="conversationPanelVisible = !conversationPanelVisible">
            <el-icon><ChatLineRound /></el-icon>
            历史会话
          </el-button>
        </div>
      </div>

      <div ref="messageListRef" class="flex-1 space-y-5 overflow-y-auto bg-[#f8fafc] p-6">
        <div
          v-for="message in messages"
          :key="message.id"
          class="flex"
          :class="message.role === 'user' ? 'justify-end' : 'justify-start'"
        >
          <div
            class="max-w-[82%] rounded-lg px-4 py-3 leading-7 shadow-sm"
            :class="
              message.role === 'user'
                ? 'bg-blue-600 text-white'
                : 'border border-slate-200 bg-white text-slate-800'
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
                class="rounded-lg border border-slate-200 bg-slate-50 p-3"
              >
                <div class="mb-3 flex items-center justify-between">
                  <span class="font-semibold text-slate-900">{{ artifact.title }}</span>
                  <el-tag size="small" effect="plain">
                    {{ getArtifactTypeLabel(artifact.type) }}
                  </el-tag>
                </div>

                <div v-if="artifact.type === 'candidate_comparison'" class="space-y-3">
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
                        <div class="font-semibold text-slate-950">
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
                        <el-tag v-if="row.overallScore !== null" type="success" effect="plain">
                          {{ row.overallScore }} / 10
                        </el-tag>
                        <span v-else class="text-slate-400">暂无</span>
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

                <div v-else-if="artifact.type === 'knowledge_sources'" class="space-y-3">
                  <div
                    v-for="source in artifact.sources || []"
                    :key="`${artifact.type}-${source.source_id}`"
                    class="rounded-lg border border-blue-100 bg-white p-4 shadow-sm"
                  >
                    <div class="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div class="font-semibold text-slate-950">
                          {{ source.title || '制度文档' }}
                        </div>
                        <div class="mt-1 text-sm text-slate-500">
                          {{ source.section_path || '未标注章节' }}
                        </div>
                      </div>
                      <el-tag type="primary" effect="plain">
                        相关性 {{ formatScore(source.score) }}
                      </el-tag>
                    </div>

                    <div class="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                      <el-tag v-if="source.version" size="small" effect="plain">
                        版本 {{ source.version }}
                      </el-tag>
                      <el-tag v-if="source.page_number" size="small" effect="plain">
                        第 {{ source.page_number }}<span v-if="source.page_end && source.page_end !== source.page_number">-{{ source.page_end }}</span> 页
                      </el-tag>
                      <span v-if="source.document_id" class="rounded bg-slate-100 px-2 py-1">
                        文档 {{ source.document_id }}
                      </span>
                    </div>

                    <details v-if="source.content" class="mt-3 rounded-md bg-slate-50 p-3">
                      <summary class="cursor-pointer text-sm font-medium text-blue-700">
                        查看证据正文
                      </summary>
                      <p class="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                        {{ source.content }}
                      </p>
                    </details>
                  </div>

                  <div
                    v-if="!artifact.sources?.length"
                    class="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700"
                  >
                    当前知识库未检索到相关制度依据，请向 HR 或制度管理员确认。
                  </div>
                </div>

                <div v-else class="grid gap-3">
                  <div
                    v-for="candidate in artifact.candidates"
                    :key="`${artifact.type}-${candidate.candidate_id}`"
                    class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div class="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div class="flex flex-wrap items-center gap-2">
                          <span class="text-base font-semibold text-slate-950">
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
                        <div class="mt-1 text-sm text-slate-500">
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
                      class="mt-3 line-clamp-3 text-sm leading-6 text-slate-600"
                    >
                      {{ candidate.summary }}
                    </p>

                    <div
                      v-if="artifact.type === 'candidate_detail'"
                      class="mt-3 space-y-3 border-t border-slate-100 pt-3"
                    >
                      <div v-if="getDetailProfile(artifact).skills" class="text-sm">
                        <span class="font-medium text-slate-700">技能：</span>
                        <span class="text-slate-600">{{ getDetailProfile(artifact).skills }}</span>
                      </div>
                      <div v-if="getDetailProfile(artifact).work_experience" class="text-sm">
                        <span class="font-medium text-slate-700">工作经历：</span>
                        <span class="text-slate-600">
                          {{ getDetailProfile(artifact).work_experience }}
                        </span>
                      </div>
                      <div v-if="getDetailProfile(artifact).project_experience" class="text-sm">
                        <span class="font-medium text-slate-700">项目经历：</span>
                        <span class="text-slate-600">
                          {{ getDetailProfile(artifact).project_experience }}
                        </span>
                      </div>
                      <div v-if="getDetailAiScore(artifact).overall_score" class="text-sm">
                        <span class="font-medium text-slate-700">AI 综合评分：</span>
                        <span class="text-slate-600">
                          {{ getDetailAiScore(artifact).overall_score }}
                        </span>
                      </div>
                    </div>

                    <div
                      v-if="artifact.type === 'candidate_cards'"
                      class="mt-3 flex flex-wrap gap-2"
                    >
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
          <div
            class="rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-500 shadow-sm"
          >
            {{ streamStatus || '正在思考中...' }}
          </div>
        </div>

        <el-empty
          v-if="messages.length === 0 && !loading"
          description="试试输入：帮我找几个熟悉 Python、FastAPI，并做过大模型应用的候选人"
        />
      </div>

      <div class="border-t border-slate-200 bg-white p-4">
        <div class="flex gap-3 rounded-lg border border-slate-200 bg-slate-50 p-2">
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
            :disabled="!inputMessage.trim() || currentConversation?.status === 'archived'"
            @click="sendMessage()"
          >
            <el-icon><Promotion /></el-icon>
            发送
          </el-button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ChatLineRound, Close, MoreFilled, Plus, Promotion, Search } from '@element-plus/icons-vue'
import DOMPurify from 'dompurify'
import MarkdownIt from 'markdown-it'
import {
  createHRAssistantConversation,
  deleteHRAssistantConversation,
  getHRAssistantConversations,
  getHRAssistantMessages,
  streamHRAssistantMessage,
  updateHRAssistantConversation,
} from '@/apis/hr_assistant_api'
import type {
  HRAssistantArtifact,
  HRAssistantCandidateAction,
  HRAssistantCandidateCard,
  HRAssistantConversation,
  HRAssistantStreamEvent,
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
const streamStatus = ref('')
const conversations = ref<HRAssistantConversation[]>([])
const conversationTotal = ref(0)
const conversationId = ref<string | null>(localStorage.getItem('hrAssistantConversationId'))
const loadingConversations = ref(false)
const creatingConversation = ref(false)
const conversationPanelVisible = ref(false)
const messageListRef = ref<HTMLElement | null>(null)
const conversationFilters = reactive<{
  keyword: string
  status: HRAssistantConversation['status'] | ''
}>({
  keyword: '',
  status: '',
})

const currentConversation = computed(() => {
  return conversations.value.find((item) => item.id === conversationId.value) || null
})

const createMessageId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`

const markdownRenderer = new MarkdownIt({
  // 助手输出不应被当作可执行 HTML；渲染结果仍须经 DOMPurify 再净化后才写入 v-html。
  html: false,
  linkify: true,
  breaks: true,
})

const renderMarkdown = (content: string) => DOMPurify.sanitize(markdownRenderer.render(content))

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
    case 'knowledge_sources':
      return '制度来源'
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

const formatConversationTime = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const today = new Date()
  const isToday = date.toDateString() === today.toDateString()
  return isToday
    ? date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
}

const getErrorMessage = (error: unknown) => {
  const status = (error as { response?: { status?: number } })?.response?.status
  if (status === 403) return '当前账号没有招聘助手权限。'
  if (status === 404) return '会话不存在或已被删除。'
  if (status === 409) return '该会话已归档，恢复后才能继续发送消息。'
  return '请求失败，请稍后重试。'
}

const loadConversations = async (selectInitialConversation = false) => {
  loadingConversations.value = true
  try {
    const response = await getHRAssistantConversations(1, 50, {
      keyword: conversationFilters.keyword.trim() || undefined,
      status: conversationFilters.status || undefined,
    })
    conversations.value = response.items || []
    conversationTotal.value = response.total || 0

    const selectedExists = conversations.value.some((item) => item.id === conversationId.value)
    if (!selectedExists) {
      conversationId.value = null
      localStorage.removeItem('hrAssistantConversationId')
      messages.value = []
    }

    if (selectInitialConversation && conversations.value.length > 0) {
      const target =
        conversations.value.find((item) => item.status === 'active') || conversations.value[0]
      if (target) {
        await selectConversation(target.id, true)
      }
    }
  } catch (error) {
    console.error(error)
    ElMessage.error(getErrorMessage(error))
  } finally {
    loadingConversations.value = false
  }
}

const searchConversations = async () => {
  await loadConversations(true)
}

const selectConversation = async (selectedConversationId: string, forceLoad = false) => {
  if (loading.value || (!forceLoad && selectedConversationId === conversationId.value)) return

  loading.value = true
  try {
    const response = await getHRAssistantMessages(selectedConversationId)
    conversationId.value = selectedConversationId
    localStorage.setItem('hrAssistantConversationId', selectedConversationId)
    messages.value = response.items.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      artifacts: message.artifacts || [],
    }))
    await scrollToBottom()
  } catch (error) {
    console.error(error)
    ElMessage.error(getErrorMessage(error))
  } finally {
    loading.value = false
  }
}

const startNewConversation = async () => {
  if (creatingConversation.value) return null

  creatingConversation.value = true
  try {
    const response = await createHRAssistantConversation()
    const conversation = response.conversation
    conversations.value.unshift(conversation)
    conversationId.value = conversation.id
    localStorage.setItem('hrAssistantConversationId', conversation.id)
    messages.value = []
    return conversation
  } catch (error) {
    console.error(error)
    ElMessage.error(getErrorMessage(error))
    return null
  } finally {
    creatingConversation.value = false
  }
}

const handleConversationCommand = async (conversationIdToUpdate: string, command: string) => {
  const conversation = conversations.value.find((item) => item.id === conversationIdToUpdate)
  if (!conversation) return

  try {
    if (command === 'rename') {
      const result = await ElMessageBox.prompt('请输入会话名称', '重命名会话', {
        confirmButtonText: '保存',
        cancelButtonText: '取消',
        inputValue: conversation.title,
        inputPattern: /\S+/,
        inputErrorMessage: '会话名称不能为空',
      })
      const title = (result as unknown as { value: string }).value.trim()
      const updated = await updateHRAssistantConversation(conversationIdToUpdate, {
        title,
      })
      Object.assign(conversation, updated)
      ElMessage.success('会话名称已更新')
      return
    }

    if (command === 'archive' || command === 'restore') {
      const updated = await updateHRAssistantConversation(conversationIdToUpdate, {
        status: command === 'archive' ? 'archived' : 'active',
      })
      Object.assign(conversation, updated)
      ElMessage.success(command === 'archive' ? '会话已归档' : '会话已恢复')
      return
    }

    if (command === 'delete') {
      await ElMessageBox.confirm('删除后无法继续在该会话中提问，确定删除吗？', '删除会话', {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning',
      })
      await deleteHRAssistantConversation(conversationIdToUpdate)
      conversations.value = conversations.value.filter((item) => item.id !== conversationIdToUpdate)
      if (conversationId.value === conversationIdToUpdate) {
        conversationId.value = null
        messages.value = []
        localStorage.removeItem('hrAssistantConversationId')
      }
      ElMessage.success('会话已删除')
    }
  } catch (error) {
    // Element Plus 的取消操作不需要额外提示。
    if (error === 'cancel' || error === 'close') return
    console.error(error)
    ElMessage.error(getErrorMessage(error))
  }
}

const sendMessage = async (specifiedContent?: string) => {
  const content = (specifiedContent ?? inputMessage.value).trim()
  if (!content || loading.value) return

  if (currentConversation.value?.status === 'archived') {
    ElMessage.warning('该会话已归档，恢复后才能继续发送消息。')
    return
  }

  if (!conversationId.value) {
    const conversation = await startNewConversation()
    if (!conversation) return
  }

  messages.value.push({
    id: createMessageId(),
    role: 'user',
    content,
  })
  if (!specifiedContent) {
    inputMessage.value = ''
  }
  loading.value = true
  streamStatus.value = '正在连接招聘助手...'
  await scrollToBottom()

  try {
    let streamedMessageId: string | null = null
    let streamFailed = false

    const getStreamedMessage = () => {
      if (!streamedMessageId) {
        streamedMessageId = createMessageId()
        messages.value.push({
          id: streamedMessageId,
          role: 'assistant',
          content: '',
          artifacts: [],
        })
      }
      return messages.value.find((message) => message.id === streamedMessageId)
    }

    await streamHRAssistantMessage(
      conversationId.value!,
      content,
      async (event: HRAssistantStreamEvent) => {
        const streamedMessage = getStreamedMessage()
        if (event.event === 'message_start') {
          streamStatus.value = '正在思考中...'
          return
        }

        if (event.event === 'content_delta') {
          const delta = typeof event.data.content === 'string' ? event.data.content : ''
          if (streamedMessage && delta) {
            streamedMessage.content += delta
            await scrollToBottom()
          }
          return
        }

        if (event.event === 'tool_start' || event.event === 'tool_end') {
          streamStatus.value =
            typeof event.data.display === 'string' ? event.data.display : '正在处理请求...'
          return
        }

        if (event.event === 'message_end') {
          if (streamedMessage) {
            streamedMessage.id =
              typeof event.data.message_id === 'string' ? event.data.message_id : streamedMessage.id
            streamedMessage.content =
              typeof event.data.answer === 'string'
                ? event.data.answer || streamedMessage.content
                : streamedMessage.content
            streamedMessage.artifacts = Array.isArray(event.data.artifacts)
              ? (event.data.artifacts as HRAssistantArtifact[])
              : []
          }
          streamStatus.value = ''
          return
        }

        if (event.event === 'error') {
          streamFailed = true
          streamStatus.value = ''
          if (streamedMessageId) {
            messages.value = messages.value.filter((message) => message.id !== streamedMessageId)
          }
          ElMessage.error(
            typeof event.data.message === 'string'
              ? event.data.message
              : '招聘助手暂时无法完成本次请求，请稍后重试。',
          )
        }
      },
    )

    if (!streamFailed) {
      await loadConversations()
    }
  } catch (error) {
    console.error(error)
    ElMessage.error(getErrorMessage(error))
  } finally {
    loading.value = false
    streamStatus.value = ''
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

onMounted(() => {
  void loadConversations(true)
})
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

.markdown-body :deep(hr) {
  margin: 0.85rem 0;
  border: 0;
  border-top: 1px solid #e2e8f0;
}

.markdown-body :deep(table) {
  display: block;
  width: 100%;
  margin: 0.75rem 0;
  overflow-x: auto;
  border-collapse: collapse;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
}

.markdown-body :deep(th),
.markdown-body :deep(td) {
  min-width: 9rem;
  border: 1px solid #e2e8f0;
  padding: 0.6rem 0.75rem;
  text-align: left;
  vertical-align: top;
}

.markdown-body :deep(th) {
  background: #f8fafc;
  color: #334155;
  font-weight: 600;
}

.markdown-body :deep(tbody tr:nth-child(even)) {
  background: #f8fafc;
}

.comparison-table {
  width: 100%;
}
</style>
