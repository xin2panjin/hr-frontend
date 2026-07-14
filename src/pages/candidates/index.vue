<template>
  <div class="page-shell">
    <div class="grid gap-4 md:grid-cols-3">
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <span class="text-sm text-slate-500">候选人总数</span>
          <span class="icon-tile"
            ><el-icon><User /></el-icon
          ></span>
        </div>
        <div class="mt-3 text-3xl font-semibold text-slate-950">{{ pagination.total }}</div>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <span class="text-sm text-slate-500">待面试</span>
          <span class="icon-tile"
            ><el-icon><Calendar /></el-icon
          ></span>
        </div>
        <div class="mt-3 text-3xl font-semibold text-slate-950">{{ waitingInterviewCount }}</div>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <span class="text-sm text-slate-500">已入职</span>
          <span class="icon-tile"
            ><el-icon><CircleCheck /></el-icon
          ></span>
        </div>
        <div class="mt-3 text-3xl font-semibold text-slate-950">{{ hiredCount }}</div>
      </div>
    </div>

    <div class="surface">
      <div class="surface-header">
        <div>
          <div class="surface-title">筛选条件</div>
          <div class="surface-subtitle">按职位、状态、关键词和创建时间定位候选人</div>
        </div>
      </div>
      <div class="filter-bar">
        <div class="filter-fields">
          <el-input
            v-model="filters.keyword"
            class="filter-control filter-control--wide"
            clearable
            placeholder="姓名、邮箱或手机号"
            @keyup.enter="searchCandidates"
          />
          <el-select v-model="filters.positionId" class="filter-control filter-control--medium" clearable filterable placeholder="全部职位">
            <el-option
              v-for="position in positions"
              :key="position.id"
              :label="position.title"
              :value="position.id"
            />
          </el-select>
          <el-select v-model="filters.status" class="filter-control filter-control--short" clearable placeholder="全部状态">
            <el-option
              v-for="status in candidateStatusOptions"
              :key="status"
              :label="status"
              :value="status"
            />
          </el-select>
          <el-date-picker
            v-model="filters.createdAtRange"
            type="datetimerange"
            start-placeholder="创建起始"
            end-placeholder="创建结束"
            class="filter-control filter-control--date"
          />
        </div>
        <div class="filter-actions">
          <el-button type="primary" @click="searchCandidates">查询</el-button>
          <el-button @click="resetFilters">重置</el-button>
        </div>
      </div>
    </div>

    <div class="surface">
      <div class="surface-header">
        <div>
          <div class="surface-title">候选人列表</div>
          <div class="surface-subtitle">共 {{ pagination.total }} 位候选人</div>
        </div>
        <router-link to="/candidates/add">
          <el-button size="small" type="primary">
            <el-icon><Plus /></el-icon>
            添加候选人
          </el-button>
        </router-link>
      </div>

      <el-table v-loading="loading" :data="candidates" style="width: 100%" stripe>
        <el-table-column prop="name" label="姓名" min-width="120">
          <template #default="scope">
            <div class="font-semibold text-slate-950">{{ scope.row.name || '-' }}</div>
            <div class="mt-1 text-xs text-slate-500">{{ scope.row.email || '-' }}</div>
          </template>
        </el-table-column>
        <el-table-column prop="position.title" label="职位" min-width="150"></el-table-column>
        <el-table-column label="联系方式" min-width="180">
          <template #default="scope">
            <div>{{ scope.row.phone_number || '-' }}</div>
            <div class="mt-1 text-xs text-slate-500">{{ scope.row.gender || '未知性别' }}</div>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" min-width="120">
          <template #default="scope">
            <el-tag :type="getStatusTagType(scope.row.status)">{{ scope.row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" min-width="170"></el-table-column>
        <el-table-column label="操作" width="250" fixed="right">
          <template #default="scope">
            <el-button link type="primary" @click="showDetails(scope.row)">详情</el-button>
            <el-button link type="primary" @click="openStatusDialog(scope.row)">修改状态</el-button>
            <el-link
              type="primary"
              :href="http.baseURL + '/media/' + scope.row.resume.file_path"
              target="_blank"
              >简历</el-link
            >
            <el-button link type="primary" @click="showAIScore(scope.row)">AI评分</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="flex justify-end p-4">
        <el-pagination
          v-model:current-page="pagination.currentPage"
          background
          layout="total, prev, pager, next"
          :total="pagination.total"
          :page-size="pagination.pageSize"
          @current-change="fetchCandidates"
        />
      </div>
    </div>

    <el-dialog v-model="detailsDialogVisible" title="候选人详情" width="860px">
      <el-descriptions v-if="selectedCandidate" :column="2" border>
        <el-descriptions-item label="姓名">{{ selectedCandidate.name }}</el-descriptions-item>
        <el-descriptions-item label="职位">{{
          selectedCandidate.position.title
        }}</el-descriptions-item>
        <el-descriptions-item label="性别">
          <el-tag v-if="selectedCandidate.gender == '男'" type="success">男</el-tag>
          <el-tag v-else-if="selectedCandidate.gender == '女'" type="danger">女</el-tag>
          <el-tag v-else type="warning">未知</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="邮箱">{{ selectedCandidate.email }}</el-descriptions-item>
        <el-descriptions-item label="手机">{{
          selectedCandidate.phone_number
        }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="getStatusTagType(selectedCandidate.status as string)">{{
            selectedCandidate.status
          }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item v-if="selectedCandidate.creator" label="推荐人">{{
          selectedCandidate.creator.realname
        }}</el-descriptions-item>
        <!-- <el-descriptions-item label="创建时间">{{
          selectedCandidate.created_at
        }}</el-descriptions-item> -->
        <el-descriptions-item label="工作经历" :span="2">{{
          selectedCandidate.work_experience || '-'
        }}</el-descriptions-item>
        <el-descriptions-item label="项目经历" :span="2">{{
          selectedCandidate.project_experience || '-'
        }}</el-descriptions-item>
        <el-descriptions-item label="教育经历" :span="2">{{
          selectedCandidate.education_experience || '-'
        }}</el-descriptions-item>
        <el-descriptions-item label="技能" :span="2">{{
          selectedCandidate.skills || '-'
        }}</el-descriptions-item>
        <el-descriptions-item label="自我评价" :span="2">{{
          selectedCandidate.self_evaluation || '-'
        }}</el-descriptions-item>
        <el-descriptions-item label="其他信息" :span="2">{{
          selectedCandidate.other_information || '-'
        }}</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="detailsDialogVisible = false">关闭</el-button>
        </span>
      </template>
    </el-dialog>

    <el-dialog v-model="aiScoreDialogVisible" title="AI评分详情" width="760px">
      <div v-if="aiScore">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="综合得分">{{ aiScore.overall_score }}</el-descriptions-item>
          <el-descriptions-item label="工作经验">{{
            aiScore.work_experience_score
          }}</el-descriptions-item>
          <el-descriptions-item label="技术能力">{{
            aiScore.technical_skills_score
          }}</el-descriptions-item>
          <el-descriptions-item label="软技能">{{
            aiScore.soft_skills_score
          }}</el-descriptions-item>
          <el-descriptions-item label="教育背景">{{
            aiScore.educational_background_score
          }}</el-descriptions-item>
          <el-descriptions-item label="项目经验">{{
            aiScore.project_experience_score
          }}</el-descriptions-item>
          <el-descriptions-item label="优势" :span="2">
            <ul>
              <li v-for="(strength, index) in aiScore.strengths" :key="index">{{ strength }}</li>
            </ul>
          </el-descriptions-item>
          <el-descriptions-item label="劣势" :span="2">
            <ul>
              <li v-for="(weakness, index) in aiScore.weaknesses" :key="index">{{ weakness }}</li>
            </ul>
          </el-descriptions-item>
          <el-descriptions-item label="总结" :span="2">{{ aiScore.summary }}</el-descriptions-item>
        </el-descriptions>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="aiScoreDialogVisible = false">关闭</el-button>
        </span>
      </template>
    </el-dialog>

    <el-dialog v-model="statusDialogVisible" title="修改候选人状态" width="520px">
      <el-form :model="statusForm" label-width="100px">
        <el-form-item label="当前状态">
          <el-tag
            v-if="statusCandidate"
            :type="getStatusTagType(statusCandidate.status as string)"
            >{{ statusCandidate.status }}</el-tag
          >
        </el-form-item>

        <el-form-item label="目标状态" required>
          <el-select v-model="statusForm.status" placeholder="请选择目标状态" style="width: 100%">
            <el-option v-for="s in selectableNextStatuses" :key="s" :label="s" :value="s" />
          </el-select>
        </el-form-item>

        <el-form-item v-if="statusForm.status === '待面试'" label="面试时间" required>
          <el-date-picker
            v-model="statusForm.interview_time"
            type="datetime"
            placeholder="请选择面试时间"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item v-if="statusForm.status === '面试未通过'" label="未通过原因" required>
          <el-input
            v-model="statusForm.rejection_reason"
            type="textarea"
            :rows="3"
            placeholder="请输入未通过原因"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="statusDialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="statusSubmitting" @click="submitStatus"
            >确认</el-button
          >
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { Calendar, CircleCheck, Plus, User } from '@element-plus/icons-vue'
import { getCandidates, getCandidateAiScore, updateCandidateStatus } from '@/apis/candidate_api'
import type { Candidate, CandidateAIScore } from '@/apis/candidate_api'
import { CandidateStatusEnum } from '@/apis/candidate_api'
import http from '@/apis/request'
import { getPositionList, type Position } from '@/apis/position_api'

const candidates = ref<Candidate[]>([])
const positions = ref<Position[]>([])
const loading = ref(false)
const candidateStatusOptions = Object.values(CandidateStatusEnum)

const filters = reactive<{
  keyword: string
  positionId: string
  status: CandidateStatusEnum | ''
  createdAtRange: [Date, Date] | null
}>({
  keyword: '',
  positionId: '',
  status: '',
  createdAtRange: null,
})

const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0,
})

const waitingInterviewCount = computed(() => {
  return candidates.value.filter(
    (candidate) => candidate.status === CandidateStatusEnum.WAITING_FOR_INTERVIEW,
  ).length
})

const hiredCount = computed(() => {
  return candidates.value.filter((candidate) => candidate.status === CandidateStatusEnum.HIRED)
    .length
})

const detailsDialogVisible = ref(false)
const selectedCandidate = ref<Candidate | null>(null)

const showDetails = (candidate: Candidate) => {
  selectedCandidate.value = candidate
  detailsDialogVisible.value = true
}

// 修改状态
const statusDialogVisible = ref(false)
const statusSubmitting = ref(false)
const statusCandidate = ref<Candidate | null>(null)
const statusForm = ref<{
  status: string
  interview_time: Date | null
  rejection_reason: string
}>({
  status: '',
  interview_time: null,
  rejection_reason: '',
})

const statusFlow: string[] = [
  CandidateStatusEnum.APPLICATION,
  CandidateStatusEnum.AI_FILTER_FAILED,
  CandidateStatusEnum.AI_FILTER_PASSED,
  CandidateStatusEnum.WAITING_FOR_INTERVIEW,
  CandidateStatusEnum.REFUSED_INTERVIEW,
  CandidateStatusEnum.INTERVIEW_PASSED,
  CandidateStatusEnum.INTERVIEW_REJECTED,
  CandidateStatusEnum.HIRED,
  CandidateStatusEnum.REJECTED,
]

const selectableNextStatuses = computed(() => {
  if (!statusCandidate.value) return []
  const current = statusCandidate.value.status as unknown as string
  const idx = statusFlow.indexOf(current)
  if (idx < 0) return []
  return statusFlow.slice(idx + 1)
})

const openStatusDialog = (candidate: Candidate) => {
  statusCandidate.value = candidate
  statusForm.value = {
    status: '',
    interview_time: null,
    rejection_reason: '',
  }
  statusDialogVisible.value = true
}

const submitStatus = async () => {
  if (!statusCandidate.value) return
  if (!statusForm.value.status) {
    ElMessage.error('请选择目标状态')
    return
  }
  if (
    statusForm.value.status === CandidateStatusEnum.WAITING_FOR_INTERVIEW &&
    !statusForm.value.interview_time
  ) {
    ElMessage.error('请选择面试时间')
    return
  }
  if (
    statusForm.value.status === CandidateStatusEnum.INTERVIEW_REJECTED &&
    !statusForm.value.rejection_reason
  ) {
    ElMessage.error('请输入未通过原因')
    return
  }

  try {
    statusSubmitting.value = true
    await updateCandidateStatus(statusCandidate.value.id, {
      status: statusForm.value.status as any,
      interview_time: statusForm.value.interview_time
        ? (statusForm.value.interview_time as any).toISOString()
        : null,
      rejection_reason: statusForm.value.rejection_reason || null,
    })
    ElMessage.success('状态修改成功')
    statusDialogVisible.value = false
    await fetchCandidates()
  } catch (e) {
    ElMessage.error('状态修改失败')
  } finally {
    statusSubmitting.value = false
  }
}

const fetchCandidates = async () => {
  loading.value = true
  try {
    const response = await getCandidates({
      page: pagination.currentPage,
      size: pagination.pageSize,
      keyword: filters.keyword.trim() || undefined,
      position_id: filters.positionId || undefined,
      status: filters.status || undefined,
      created_at_start: filters.createdAtRange?.[0]?.toISOString(),
      created_at_end: filters.createdAtRange?.[1]?.toISOString(),
    })
    candidates.value = response.candidates || []
    pagination.total = response.total || 0
  } catch (error) {
    ElMessage.error('获取候选人列表失败')
  } finally {
    loading.value = false
  }
}

const fetchPositions = async () => {
  try {
    const response = await getPositionList({ page: 1, size: 100 })
    positions.value = response.positions || []
  } catch (error) {
    ElMessage.error('获取职位列表失败')
  }
}

const searchCandidates = () => {
  pagination.currentPage = 1
  void fetchCandidates()
}

const resetFilters = () => {
  Object.assign(filters, {
    keyword: '',
    positionId: '',
    status: '',
    createdAtRange: null,
  })
  pagination.currentPage = 1
  void fetchCandidates()
}

// Map candidate status to Element Plus tag type
const getStatusTagType = (status: string): string => {
  switch (status) {
    case '已投递':
      return 'info'
    case 'AI筛选失败':
    case 'AI筛选未通过':
      return 'danger'
    case 'AI筛选成功':
    case 'AI筛选通过':
      return 'success'
    case '待面试':
      return 'warning'
    case '拒绝面试':
      return 'info'
    case '面试通过':
      return 'success'
    case '面试未通过':
      return 'danger'
    case '已入职':
      return 'success'
    case '已拒绝':
      return 'danger'
    default:
      return 'default'
  }
}

// AI Score dialog
const aiScoreDialogVisible = ref(false)
const aiScore = ref<CandidateAIScore | null>(null)

const showAIScore = async (candidate: Candidate) => {
  try {
    const data = await getCandidateAiScore(candidate.id)
    aiScore.value = data.ai_score
    aiScoreDialogVisible.value = true
  } catch (error) {
    ElMessage.error('暂无AI评分！')
  }
}

onMounted(() => {
  fetchCandidates()
  fetchPositions()
})
</script>
