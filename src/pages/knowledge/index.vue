<template>
  <div class="space-y-5">
    <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div class="mb-4">
        <h2 class="text-lg font-semibold text-slate-900">企业制度知识库</h2>
        <p class="mt-1 text-sm text-slate-500">
          上传制度后，系统会自动解析、切片并建立检索索引。
        </p>
      </div>
      <el-form :model="form" label-position="top" class="w-full">
        <div class="grid gap-x-5 gap-y-1 md:grid-cols-2 xl:grid-cols-4">
          <el-form-item label="制度文件" required class="md:col-span-2 xl:col-span-1">
            <el-upload
              :auto-upload="false"
              :limit="1"
              accept=".pdf,.docx,.md,.markdown,.txt"
              :on-change="onFileChange"
            >
              <el-button>选择文件</el-button>
              <template #tip>
                <div class="el-upload__tip">支持 PDF、DOCX、Markdown、TXT，最大 20MB。</div>
              </template>
            </el-upload>
          </el-form-item>
          <el-form-item label="制度名称" required>
            <el-input v-model="form.title" placeholder="例如：员工休假管理制度" @input="invalidatePreview" />
          </el-form-item>
          <el-form-item label="分类">
            <el-input v-model="form.category" placeholder="例如：leave" />
          </el-form-item>
          <el-form-item label="版本">
            <el-input v-model="form.version" placeholder="例如：V1.0" />
          </el-form-item>
        </div>

        <div class="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <section class="rounded-lg border border-slate-200 bg-slate-50 p-5">
            <div class="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 class="font-semibold text-slate-800">文本分段与清洗</h3>
                <p class="mt-1 text-xs text-slate-500">调整参数后预览，不会上传文件、建立索引或调用 Embedding。</p>
              </div>
              <el-button plain :disabled="!file || previewing" :loading="previewing" @click="previewChunks">
                预览分段
              </el-button>
            </div>

            <el-form-item label="分段方式" class="!mb-4">
              <el-select v-model="processing.chunking.strategy" class="w-full" @change="onStrategyChange">
                <el-option v-for="item in splitterStrategies" :key="item.value" :label="item.label" :value="item.value">
                  <div class="flex flex-col py-1">
                    <span>{{ item.label }}</span>
                    <span class="text-xs text-slate-400">{{ item.description }}</span>
                  </div>
                </el-option>
              </el-select>
              <p class="mt-1 text-xs text-slate-500">{{ selectedStrategyDescription }}</p>
            </el-form-item>

            <div class="grid gap-3 sm:grid-cols-2">
              <el-form-item label="最大长度" class="!mb-0">
                <el-input-number v-model="processing.chunking.max_characters" class="w-full" :min="50" :max="2000" :step="50" @change="invalidatePreview" />
              </el-form-item>
              <el-form-item label="重叠长度" class="!mb-0">
                <el-input-number v-model="processing.chunking.overlap_characters" class="w-full" :min="0" :max="processing.chunking.max_characters - 1" :step="10" @change="invalidatePreview" />
              </el-form-item>
            </div>
            <p class="mt-2 text-xs text-slate-500">长度单位为字符。重叠内容可减少相邻分段的上下文断裂。</p>

            <el-form-item v-if="processing.chunking.strategy === 'custom_character'" label="分隔字符" class="mb-0 mt-4">
              <div class="w-full">
                <el-input v-model="processing.chunking.custom_separator" maxlength="20" show-word-limit @input="invalidatePreview" />
                <p class="mt-1 text-xs text-slate-500">使用一个固定分隔字符或字符串，例如：。 、或第；分隔符会保留在前一段末尾。</p>
              </div>
            </el-form-item>

            <el-form-item v-if="processing.chunking.strategy === 'langchain_recursive'" label="分隔符顺序" class="mb-0 mt-4">
              <div class="w-full">
                <el-input v-model="recursiveSeparatorsJson" type="textarea" :rows="4" @input="invalidatePreview" />
                <p class="mt-1 text-xs text-slate-500">使用 JSON 字符串数组。例如：["\n\n", "\n", "。", "！", "？", ""]；按顺序递归降级，空字符串只能放在最后作为字符级兜底。</p>
              </div>
            </el-form-item>

            <div class="mt-5 border-t border-slate-200 pt-4">
              <p class="mb-3 text-sm font-medium text-slate-700">文本清洗</p>
              <div class="flex flex-col gap-3">
                <el-checkbox v-model="processing.cleaning.normalize_whitespace" @change="invalidatePreview">规范连续空格、换行和制表符</el-checkbox>
                <el-checkbox v-model="processing.cleaning.remove_urls_and_emails" @change="invalidatePreview">移除 URL 和邮箱地址</el-checkbox>
                <el-checkbox v-model="processing.cleaning.remove_blockquote_metadata" @change="invalidatePreview">移除顶部引用元数据</el-checkbox>
              </div>
            </div>
            <p v-if="previewInvalidated" class="mt-4 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">参数已变化，右侧展示的是上一次预览结果；请重新预览。</p>
          </section>

          <section class="min-h-[580px] overflow-hidden rounded-lg border border-slate-200 bg-white xl:sticky xl:top-5 xl:max-h-[calc(100vh-40px)]">
            <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div>
                <h3 class="font-semibold text-slate-900">分段预览</h3>
                <p v-if="preview" class="mt-1 text-xs text-slate-500">原始 {{ preview.raw_block_count }} 块，清洗后 {{ preview.cleaned_block_count }} 块，共 {{ preview.chunk_count }} 个分段、{{ preview.total_characters }} 个字符。</p>
                <p v-else class="mt-1 text-xs text-slate-500">选择文件并完成参数设置后，可在这里查看切分结果。</p>
                <p class="mt-1 text-xs text-slate-400">所有方式都会保留原文的章节和页码来源；若章节较短，可将最大长度调小到 100 左右观察差异。</p>
              </div>
              <div v-if="preview" class="flex items-center gap-2">
                <el-tag effect="plain">{{ previewStrategyLabel }}</el-tag>
                <el-tag v-if="preview.preview_truncated" type="warning">仅展示前 100 个分段</el-tag>
              </div>
            </div>
            <div v-if="preview" class="max-h-[520px] space-y-3 overflow-y-auto p-5 xl:max-h-[calc(100vh-142px)]">
              <article v-for="chunk in preview.chunks" :key="chunk.chunk_index" class="rounded-lg border border-slate-200 p-4">
                <div class="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <el-tag size="small" effect="plain">分段 {{ chunk.chunk_index + 1 }}</el-tag>
                  <span>{{ chunk.character_count }} 字符 · 约 {{ chunk.token_count }} tokens</span>
                  <span v-if="chunk.section_path">{{ chunk.section_path }}</span>
                  <span v-if="chunk.page_number">第 {{ chunk.page_number }} 页</span>
                </div>
                <pre class="mt-3 whitespace-pre-wrap break-words rounded bg-slate-50 p-3 text-xs leading-6 text-slate-700">{{ previewChunkBody(chunk.content) }}</pre>
              </article>
            </div>
            <div v-else class="flex min-h-[470px] items-center justify-center p-6">
              <div class="max-w-xs text-center">
                <p class="text-sm font-medium text-slate-700">尚未生成预览</p>
                <p class="mt-2 text-xs leading-5 text-slate-500">先选择制度文件，再设置左侧分段与清洗规则，点击“预览分段”即可对比切分效果。</p>
              </div>
            </div>
          </section>
        </div>

        <div class="mt-5">
          <el-button type="primary" :loading="uploading" @click="submitUpload">
            上传并建立索引
          </el-button>
        </div>
      </el-form>
    </section>

    <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div class="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold text-slate-900">检索策略</h2>
          <p class="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
            此配置会在每次企业制度检索时立即生效。Rerank 的服务商、模型和密钥仍由服务端环境变量管理，不会在此页面暴露。
          </p>
        </div>
        <el-button type="primary" :loading="savingRetrievalConfig" @click="saveRetrievalConfig">
          保存检索策略
        </el-button>
      </div>

      <el-form label-position="top" class="grid gap-x-5 sm:grid-cols-2 xl:grid-cols-5">
        <el-form-item label="召回方式">
          <el-select v-model="retrievalConfig.retrieval_mode" class="w-full">
            <el-option label="混合检索（Dense + BM25）" value="hybrid" />
            <el-option label="语义检索（Dense）" value="dense" />
            <el-option label="关键词检索（BM25）" value="sparse" />
          </el-select>
        </el-form-item>
        <el-form-item label="Dense 召回数量">
          <el-input-number v-model="retrievalConfig.dense_recall_k" class="w-full" :min="1" :max="100" />
        </el-form-item>
        <el-form-item label="BM25 召回数量">
          <el-input-number v-model="retrievalConfig.sparse_recall_k" class="w-full" :min="1" :max="100" />
        </el-form-item>
        <el-form-item label="融合结果数量">
          <el-input-number v-model="retrievalConfig.hybrid_limit" class="w-full" :min="1" :max="100" />
        </el-form-item>
        <el-form-item label="RRF k 值">
          <el-input-number v-model="retrievalConfig.rrf_k" class="w-full" :min="1" :max="1000" />
        </el-form-item>
      </el-form>

      <div class="grid gap-5 border-t border-slate-100 pt-5 lg:grid-cols-2">
        <div class="rounded-lg bg-slate-50 p-4">
          <div class="flex items-center justify-between gap-4">
            <div>
              <p class="font-medium text-slate-800">启用 Rerank</p>
              <p class="mt-1 text-xs leading-5 text-slate-500">对召回候选进行语义重排；未配置可用 Rerank 服务时请保持关闭。</p>
            </div>
            <el-switch v-model="retrievalConfig.rerank_enabled" />
          </div>
          <div class="mt-4 grid gap-4 sm:grid-cols-2">
            <el-form-item label="重排候选数量" class="!mb-0">
              <el-input-number v-model="retrievalConfig.rerank_top_k" class="w-full" :min="1" :max="100" :disabled="!retrievalConfig.rerank_enabled" />
            </el-form-item>
            <el-form-item label="证据最低分" class="!mb-0">
              <el-input-number v-model="retrievalConfig.minimum_evidence_score" class="w-full" :min="0" :max="1" :step="0.05" :precision="2" :disabled="!retrievalConfig.rerank_enabled" />
            </el-form-item>
          </div>
        </div>

        <div class="rounded-lg bg-slate-50 p-4">
          <p class="font-medium text-slate-800">证据整理</p>
          <p class="mt-1 text-xs leading-5 text-slate-500">限制单个制度文档占据结果列表的段数，并可将同章节相邻切片合并为一条证据。</p>
          <div class="mt-4 flex flex-wrap items-center gap-5">
            <el-form-item label="每篇最多保留" class="!mb-0">
              <el-input-number v-model="retrievalConfig.max_chunks_per_document" :min="1" :max="10" />
            </el-form-item>
            <el-checkbox v-model="retrievalConfig.merge_adjacent_chunks">合并相邻切片</el-checkbox>
          </div>
        </div>
      </div>

      <p class="mt-4 text-xs leading-5 text-slate-400">
        RRF 分数仅用于融合排序，不是百分比相关度；若需要可解释的语义分数，请启用已配置的 Rerank。
      </p>
    </section>

    <section class="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div class="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h2 class="font-semibold text-slate-900">制度文档</h2>
          <p class="mt-1 text-xs text-slate-500">索引状态会在后台任务完成后自动刷新。</p>
        </div>
        <el-button :loading="loading" @click="loadAll">刷新</el-button>
      </div>
      <el-table v-loading="loading" :data="documents" class="w-full">
        <el-table-column prop="title" label="制度名称" min-width="180" />
        <el-table-column prop="file_name" label="文件" min-width="160" />
        <el-table-column prop="version" label="版本" width="100" />
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="最近索引" width="180">
          <template #default="{ row }">{{ formatTime(row.indexed_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="reindex(row)">重建</el-button>
            <el-popconfirm title="归档后将删除检索索引，确认继续？" @confirm="archive(row)">
              <template #reference>
                <el-button link type="danger">归档</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </section>

    <section class="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div class="border-b border-slate-100 px-5 py-4">
        <h2 class="font-semibold text-slate-900">索引任务</h2>
      </div>
      <el-table :data="tasks" class="w-full" size="small">
        <el-table-column prop="task_type" label="类型" width="110" />
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="last_error" label="失败摘要" min-width="280">
          <template #default="{ row }">{{ row.last_error || '-' }}</template>
        </el-table-column>
        <el-table-column label="完成时间" width="180">
          <template #default="{ row }">{{ formatTime(row.completed_at) }}</template>
        </el-table-column>
      </el-table>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, type UploadFile } from 'element-plus'
import {
  archiveKnowledgeDocument,
  getKnowledgeRetrievalConfig,
  listKnowledgeDocuments,
  listKnowledgeTasks,
  previewKnowledgeDocument,
  reindexKnowledgeDocument,
  updateKnowledgeRetrievalConfig,
  uploadKnowledgeDocument,
  type KnowledgeDocument,
  type KnowledgeDocumentPreview,
  type KnowledgeRetrievalConfig,
  type KnowledgeTask,
  type KnowledgeTextProcessingConfig,
} from '@/apis/knowledge_api'

const documents = ref<KnowledgeDocument[]>([])
const tasks = ref<KnowledgeTask[]>([])
const loading = ref(false)
const uploading = ref(false)
const previewing = ref(false)
const file = ref<File | null>(null)
const preview = ref<KnowledgeDocumentPreview | null>(null)
const previewInvalidated = ref(false)
const savingRetrievalConfig = ref(false)
const form = reactive({ title: '', category: '', version: '' })
const processing = reactive<KnowledgeTextProcessingConfig>({
  cleaning: { normalize_whitespace: true, remove_urls_and_emails: false, remove_blockquote_metadata: false },
  chunking: {
    max_characters: 500,
    overlap_characters: 80,
    strategy: 'structured_builtin',
    custom_separator: '。',
    recursive_separators: ['\n\n', '\n', '。', '！', '？', '；', ';', '，', ',', ' ', ''],
  },
})
const recursiveSeparatorsJson = ref(JSON.stringify(processing.chunking.recursive_separators))
const retrievalConfig = reactive<KnowledgeRetrievalConfig>({
  retrieval_mode: 'hybrid',
  dense_recall_k: 20,
  sparse_recall_k: 20,
  hybrid_limit: 20,
  rrf_k: 60,
  rerank_enabled: false,
  rerank_top_k: 5,
  minimum_evidence_score: 0.3,
  max_chunks_per_document: 2,
  merge_adjacent_chunks: true,
})
const splitterStrategies = [
  { value: 'structured_builtin', label: '句子聚合', description: '按章节和页码分组后聚合完整句子，适合制度类文档。' },
  { value: 'fixed_length', label: '按固定长度分段', description: '按照设定长度和重叠内容均匀切分，适合结构不规则的文档。' },
  { value: 'custom_character', label: '固定字符切分', description: '使用 LangChain CharacterTextSplitter 按指定分隔字符切分。' },
  { value: 'langchain_recursive', label: '递归分段', description: '按你设置的分隔符顺序递归降级，从段落逐级切至字符。' },
] as const
const selectedStrategyDescription = computed(() =>
  splitterStrategies.find((item) => item.value === processing.chunking.strategy)?.description || '',
)
const previewStrategyLabel = computed(() => {
  const strategy = preview.value?.processing_config.chunking.strategy
  return splitterStrategies.find((item) => item.value === strategy)?.label || '未知分段方式'
})
const previewChunkBody = (content: string): string => {
  const lines = content.split('\n')
  if (lines[0]?.startsWith('制度：')) lines.shift()
  if (lines[0]?.startsWith('章节：')) lines.shift()
  if (lines[0]?.startsWith('正文：')) lines[0] = lines[0].slice('正文：'.length).trimStart()
  return lines.join('\n').trim()
}
let previewRequestId = 0

const buildProcessingConfig = (): string | null => {
  if (processing.chunking.strategy === 'custom_character' && !processing.chunking.custom_separator) {
    ElMessage.warning('固定字符切分需要填写分隔字符')
    return null
  }
  try {
    const recursiveSeparators = JSON.parse(recursiveSeparatorsJson.value)
    if (!Array.isArray(recursiveSeparators) || recursiveSeparators.some((item) => typeof item !== 'string')) {
      throw new Error('分隔符必须是字符串数组')
    }
    return JSON.stringify({
      cleaning: processing.cleaning,
      chunking: { ...processing.chunking, recursive_separators: recursiveSeparators },
    })
  } catch {
    ElMessage.warning('递归分段的分隔符必须填写为合法的 JSON 字符串数组')
    return null
  }
}

const invalidatePreview = () => {
  // 使尚未返回的旧请求失效，避免其覆盖最新参数对应的预览。
  previewRequestId += 1
  previewing.value = false
  if (preview.value) previewInvalidated.value = true
}

const onStrategyChange = () => {
  invalidatePreview()
  // 策略是最容易被拿来对比的参数：选择后自动刷新，避免继续误看旧预览。
  if (file.value && form.title.trim()) void previewChunks()
}

const onFileChange = (uploadFile: UploadFile) => {
  file.value = uploadFile.raw || null
  invalidatePreview()
  if (!form.title && file.value) {
    form.title = file.value.name.replace(/\.[^.]+$/, '')
  }
}

const previewChunks = async () => {
  if (!file.value || !form.title.trim()) {
    return ElMessage.warning('请选择文件并填写制度名称后再预览')
  }
  if (processing.chunking.overlap_characters >= processing.chunking.max_characters) {
    return ElMessage.warning('分段重叠长度必须小于分段最大长度')
  }
  const requestId = ++previewRequestId
  previewing.value = true
  try {
    const processingConfig = buildProcessingConfig()
    if (!processingConfig) return
    const data = new FormData()
    data.append('file', file.value)
    data.append('title', form.title.trim())
    data.append('processing_config', processingConfig)
    const result = await previewKnowledgeDocument(data)
    if (requestId === previewRequestId) {
      preview.value = result
      previewInvalidated.value = false
    }
  } finally {
    if (requestId === previewRequestId) previewing.value = false
  }
}

const loadAll = async () => {
  loading.value = true
  try {
    const [docs, taskList, config] = await Promise.all([
      listKnowledgeDocuments(),
      listKnowledgeTasks(),
      getKnowledgeRetrievalConfig(),
    ])
    documents.value = docs.items
    tasks.value = taskList.items
    Object.assign(retrievalConfig, config)
  } finally {
    loading.value = false
  }
}

const saveRetrievalConfig = async () => {
  savingRetrievalConfig.value = true
  try {
    const config = await updateKnowledgeRetrievalConfig({ ...retrievalConfig })
    Object.assign(retrievalConfig, config)
    ElMessage.success('检索策略已保存，后续制度检索将立即使用新配置')
  } finally {
    savingRetrievalConfig.value = false
  }
}

const submitUpload = async () => {
  if (!file.value || !form.title.trim()) {
    return ElMessage.warning('请选择文件并填写制度名称')
  }
  if (processing.chunking.overlap_characters >= processing.chunking.max_characters) {
    return ElMessage.warning('分段重叠长度必须小于分段最大长度')
  }
  uploading.value = true
  try {
    const processingConfig = buildProcessingConfig()
    if (!processingConfig) return
    const data = new FormData()
    data.append('file', file.value)
    data.append('title', form.title.trim())
    if (form.category.trim()) data.append('category', form.category.trim())
    if (form.version.trim()) data.append('version', form.version.trim())
    data.append('processing_config', processingConfig)
    await uploadKnowledgeDocument(data)
    ElMessage.success('已提交索引任务')
    file.value = null
    preview.value = null
    previewInvalidated.value = false
    form.title = ''
    form.category = ''
    form.version = ''
    await loadAll()
  } finally {
    uploading.value = false
  }
}

const reindex = async (row: KnowledgeDocument) => {
  await reindexKnowledgeDocument(row.id)
  ElMessage.success('已提交重建任务')
  await loadAll()
}

const archive = async (row: KnowledgeDocument) => {
  await archiveKnowledgeDocument(row.id)
  ElMessage.success('已归档并提交清理任务')
  await loadAll()
}

const statusLabel = (status: string) =>
  (
    {
      draft: '待索引',
      active: '可用',
      archived: '已归档',
      index_failed: '索引失败',
      pending: '待处理',
      processing: '处理中',
      succeeded: '已完成',
      failed: '失败',
    } as Record<string, string>
  )[status] || status

const statusType = (status: string) =>
  (
    {
      active: 'success',
      succeeded: 'success',
      failed: 'danger',
      index_failed: 'danger',
      processing: 'warning',
      archived: 'info',
    } as Record<string, string>
  )[status] || 'info'

const formatTime = (value: string | null) =>
  value ? new Date(value).toLocaleString() : '-'

onMounted(loadAll)
</script>
