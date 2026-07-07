<template>
  <div class="h-full flex flex-col bg-white rounded-lg shadow">
    <div class="flex items-center justify-between px-6 py-4 border-b">
      <div>
        <h2 class="text-xl font-semibold text-gray-800">HR 招聘助手</h2>
        <p class="text-sm text-gray-500 mt-1">
          可以帮你从人才库中语义检索候选人，支持连续追问。
        </p>
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
          class="max-w-[72%] rounded-lg px-4 py-3 leading-7 whitespace-pre-wrap"
          :class="
            message.role === 'user'
              ? 'bg-blue-500 text-white'
              : 'bg-white text-gray-800 border border-gray-200'
          "
        >
          {{ message.content }}
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
          @keydown.enter.exact.prevent="sendMessage"
        />
        <el-button
          type="primary"
          class="self-end"
          :loading="loading"
          :disabled="!inputMessage.trim()"
          @click="sendMessage"
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

type ChatRole = 'user' | 'assistant'

interface ChatMessage {
  id: string
  role: ChatRole
  content: string
}

const messages = ref<ChatMessage[]>([])
const inputMessage = ref('')
const loading = ref(false)
const conversationId = ref<string | null>(localStorage.getItem('hrAssistantConversationId'))
const messageListRef = ref<HTMLElement | null>(null)

const createMessageId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`

const scrollToBottom = async () => {
  await nextTick()
  if (messageListRef.value) {
    messageListRef.value.scrollTop = messageListRef.value.scrollHeight
  }
}

const sendMessage = async () => {
  const content = inputMessage.value.trim()
  if (!content || loading.value) return

  messages.value.push({
    id: createMessageId(),
    role: 'user',
    content,
  })
  inputMessage.value = ''
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

const startNewConversation = () => {
  conversationId.value = null
  localStorage.removeItem('hrAssistantConversationId')
  messages.value = []
  ElMessage.success('已开始新会话')
}
</script>
