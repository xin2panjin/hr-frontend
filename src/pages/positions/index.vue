<template>
  <div class="page-shell">
    <div class="grid gap-4 md:grid-cols-3">
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <span class="text-sm text-slate-500">职位总数</span>
          <span class="icon-tile"
            ><el-icon><Postcard /></el-icon
          ></span>
        </div>
        <div class="mt-3 text-3xl font-semibold text-slate-950">{{ pagination.total }}</div>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <span class="text-sm text-slate-500">开放职位</span>
          <span class="icon-tile"
            ><el-icon><Unlock /></el-icon
          ></span>
        </div>
        <div class="mt-3 text-3xl font-semibold text-slate-950">{{ openPositionCount }}</div>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <span class="text-sm text-slate-500">招聘人数</span>
          <span class="icon-tile"
            ><el-icon><User /></el-icon
          ></span>
        </div>
        <div class="mt-3 text-3xl font-semibold text-slate-950">{{ recruitmentTotal }}</div>
      </div>
    </div>

    <div class="surface overflow-hidden">
      <div class="surface-header">
        <div>
          <div class="surface-title">筛选条件</div>
          <div class="surface-subtitle">按职位信息、部门、状态和要求快速定位招聘需求</div>
        </div>
      </div>
      <div class="filter-bar">
        <div class="filter-fields">
          <el-input
            v-model="filters.keyword"
            class="filter-control filter-control--keyword"
            clearable
            placeholder="标题、描述或要求"
            @keyup.enter="searchPositions"
          />
          <el-select
            v-model="filters.departmentId"
            class="filter-control filter-control--medium"
            clearable
            filterable
            placeholder="全部部门"
          >
            <el-option
              v-for="department in departments"
              :key="department.id"
              :label="department.name"
              :value="department.id"
            />
          </el-select>
          <el-select v-model="filters.isOpen" class="filter-control filter-control--short" clearable placeholder="全部状态">
            <el-option label="开放" :value="true" />
            <el-option label="关闭" :value="false" />
          </el-select>
          <el-select v-model="filters.education" class="filter-control filter-control--short" clearable placeholder="全部学历">
            <el-option
              v-for="item in Object.values(EducationEnum)"
              :key="item"
              :label="item"
              :value="item"
            />
          </el-select>
          <el-input-number
            v-model="filters.workYearMin"
            :min="0"
            :controls="false"
            class="filter-control filter-control--year"
            placeholder="最低年限"
          />
          <el-input-number
            v-model="filters.workYearMax"
            :min="0"
            :controls="false"
            class="filter-control filter-control--year"
            placeholder="最高年限"
          />
          <el-date-picker
            v-model="filters.createdAtRange"
            type="datetimerange"
            start-placeholder="创建起始"
            end-placeholder="创建结束"
            class="filter-control filter-control--date"
          />
        </div>
        <div class="filter-actions">
          <el-button type="primary" @click="searchPositions">查询</el-button>
          <el-button @click="resetFilters">重置</el-button>
        </div>
      </div>
    </div>

    <div class="surface overflow-hidden">
      <div class="surface-header">
        <div>
          <div class="surface-title">职位列表</div>
          <div class="surface-subtitle">
            共 {{ pagination.total }} 个职位，悬停职位名称可查看岗位详情
          </div>
        </div>
        <el-button size="small" type="primary" @click="handleAdd">
          <el-icon><Plus /></el-icon>
          添加职位
        </el-button>
      </div>

      <el-table v-loading="loading" :data="positions" stripe>
        <el-table-column prop="title" label="标题" min-width="180">
          <template #default="{ row }">
            <el-popover placement="right" :width="500" trigger="hover" :show-after="300">
              <template #reference>
                <span class="cursor-pointer font-semibold text-blue-700 hover:text-blue-800">
                  {{ row.title }}
                </span>
              </template>
              <div class="position-popover">
                <h3 class="mb-3 text-lg font-semibold text-slate-900">{{ row.title }}</h3>
                <div class="space-y-2 text-sm">
                  <div v-if="row.department">
                    <span class="font-semibold text-slate-600">部门：</span>
                    <span class="text-slate-800">{{ row.department.name }}</span>
                  </div>
                  <div v-if="row.description">
                    <span class="font-semibold text-slate-600">职位描述：</span>
                    <p class="mt-1 whitespace-pre-wrap text-slate-800">{{ row.description }}</p>
                  </div>
                  <div v-if="row.requirements">
                    <span class="font-semibold text-slate-600">职位要求：</span>
                    <p class="mt-1 whitespace-pre-wrap text-slate-800">{{ row.requirements }}</p>
                  </div>
                  <div>
                    <span class="font-semibold text-slate-600">薪资范围：</span>
                    <span class="text-slate-800">
                      {{ row.min_salary ?? '面议' }} - {{ row.max_salary ?? '面议' }} 元/月
                    </span>
                  </div>
                  <div>
                    <span class="font-semibold text-gray-600">招聘人数：</span>
                    <span class="text-gray-800">{{ row.recruitment_count }} 人</span>
                  </div>
                  <div>
                    <span class="font-semibold text-gray-600">学历要求：</span>
                    <span class="text-gray-800">{{ row.education }}</span>
                  </div>
                  <div>
                    <span class="font-semibold text-gray-600">工作年限：</span>
                    <span class="text-gray-800">{{ row.work_year }} 年</span>
                  </div>
                  <div>
                    <span class="font-semibold text-gray-600">状态：</span>
                    <el-tag :type="row.is_open ? 'success' : 'danger'" size="small">
                      {{ row.is_open ? '开放' : '关闭' }}
                    </el-tag>
                  </div>
                  <div v-if="row.deadline">
                    <span class="font-semibold text-gray-600">截止日期：</span>
                    <span class="text-gray-800">{{ row.deadline }}</span>
                  </div>
                  <div>
                    <span class="font-semibold text-gray-600">创建时间：</span>
                    <span class="text-gray-800">{{ row.created_at }}</span>
                  </div>
                </div>
              </div>
            </el-popover>
          </template>
        </el-table-column>
        <el-table-column prop="department.name" label="部门" min-width="120" />
        <el-table-column label="薪资范围" min-width="150">
          <template #default="{ row }"> {{ formatSalary(row) }} </template>
        </el-table-column>
        <el-table-column prop="recruitment_count" label="招聘人数" min-width="100" />
        <el-table-column prop="education" label="学历要求" min-width="100" />
        <el-table-column label="工作年限" min-width="100">
          <template #default="{ row }"> {{ row.work_year }} 年 </template>
        </el-table-column>
        <el-table-column label="发布者" min-width="120">
          <template #default="{ row }">
            {{ row.creator?.name ?? row.creator?.username ?? '-' }}
          </template>
        </el-table-column>
        <el-table-column label="状态" min-width="100">
          <template #default="{ row }">
            <el-tag :type="row.is_open ? 'success' : 'danger'">
              {{ row.is_open ? '开放' : '关闭' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" min-width="170" />
        <el-table-column label="操作" width="180">
          <template #default="{ row }">
            <el-popconfirm
              title="确定删除这个职位吗?"
              @confirm="handleDelete(row.id)"
              confirm-button-text="确定"
              cancel-button-text="取消"
            >
              <template #reference>
                <el-button type="danger" size="small">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div class="mt-4 flex justify-end">
      <el-pagination
        background
        layout="prev, pager, next"
        :total="pagination.total"
        :page-size="pagination.pageSize"
        v-model:current-page="pagination.currentPage"
        @current-change="handlePageChange"
      />
    </div>

    <el-dialog v-model="dialog.visible" :title="dialog.title" width="920px">
      <el-form :model="positionForm" label-width="auto">
        <el-form-item label="职位标题">
          <el-input v-model="positionForm.title" placeholder="请输入标题" />
        </el-form-item>
        <el-form-item label="职位描述">
          <el-input
            v-model="positionForm.description"
            type="textarea"
            placeholder="请输入描述"
            :rows="8"
          />
        </el-form-item>
        <el-form-item label="职位要求">
          <el-input
            v-model="positionForm.requirements"
            type="textarea"
            placeholder="请输入要求"
            :rows="8"
          />
        </el-form-item>
        <el-form-item label="薪资范围">
          <el-input-number v-model="positionForm.min_salary" :min="0" />
          <span class="mx-2">-</span>
          <el-input-number v-model="positionForm.max_salary" :min="0" />
          <span class="ml-2">元/月</span>
        </el-form-item>
        <el-form-item label="招聘人数">
          <el-input-number v-model="positionForm.recruitment_count" :min="1" />
        </el-form-item>
        <el-form-item label="学历要求">
          <el-select v-model="positionForm.education" placeholder="请选择">
            <el-option
              v-for="item in Object.values(EducationEnum)"
              :key="item"
              :label="item"
              :value="item"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="工作年限">
          <el-input-number v-model="positionForm.work_year" :min="0" />
        </el-form-item>
        <el-form-item label="是否开放">
          <el-switch v-model="positionForm.is_open" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialog.visible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit">确认</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Postcard, Unlock, User } from '@element-plus/icons-vue'
import {
  createPosition,
  getPositionList,
  deletePosition,
  type Position,
  type PositionCreateData,
  EducationEnum,
} from '@/apis/position_api'
import { getIamDepartments, type IamDepartment } from '@/apis/iam_api'

const dialog = reactive({
  visible: false,
  title: '',
})
const isEditMode = ref(false)
const editingPositionId = ref<string | null>(null)

const positions = ref<Position[]>([])
const departments = ref<IamDepartment[]>([])
const loading = ref(false)
const positionForm = reactive<PositionCreateData>({
  title: '',
  description: '',
  requirements: '',
  min_salary: 0,
  max_salary: 0,
  deadline: null,
  recruitment_count: 1,
  education: EducationEnum.BenKe,
  work_year: 0,
  is_open: true,
})

const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0,
})

const filters = reactive<{
  keyword: string
  departmentId: string
  isOpen: boolean | ''
  education: EducationEnum | ''
  workYearMin: number | undefined
  workYearMax: number | undefined
  createdAtRange: [Date, Date] | null
}>({
  keyword: '',
  departmentId: '',
  isOpen: '',
  education: '',
  workYearMin: undefined,
  workYearMax: undefined,
  createdAtRange: null,
})

const openPositionCount = computed(() => {
  return positions.value.filter((position) => position.is_open).length
})

const recruitmentTotal = computed(() => {
  return positions.value.reduce((total, position) => total + (position.recruitment_count || 0), 0)
})

const formatSalary = (position: Position) => {
  if (position.min_salary === null && position.max_salary === null) return '面议'
  return `${position.min_salary ?? '面议'} - ${position.max_salary ?? '面议'}`
}

const fetchPositions = async () => {
  loading.value = true
  try {
    const data = await getPositionList({
      page: pagination.currentPage,
      size: pagination.pageSize,
      keyword: filters.keyword.trim() || undefined,
      department_id: filters.departmentId || undefined,
      is_open: filters.isOpen === '' ? undefined : filters.isOpen,
      education: filters.education || undefined,
      work_year_min: filters.workYearMin,
      work_year_max: filters.workYearMax,
      created_at_start: filters.createdAtRange?.[0]?.toISOString(),
      created_at_end: filters.createdAtRange?.[1]?.toISOString(),
    })
    positions.value = data.positions
    pagination.total = data.total || 0
  } catch (error) {
    ElMessage.error('获取职位列表失败')
    console.error(error)
  } finally {
    loading.value = false
  }
}

const fetchDepartments = async () => {
  try {
    departments.value = await getIamDepartments()
  } catch (error) {
    ElMessage.error('获取部门列表失败')
  }
}

const searchPositions = () => {
  pagination.currentPage = 1
  void fetchPositions()
}

const resetFilters = () => {
  Object.assign(filters, {
    keyword: '',
    departmentId: '',
    isOpen: '',
    education: '',
    workYearMin: undefined,
    workYearMax: undefined,
    createdAtRange: null,
  })
  pagination.currentPage = 1
  void fetchPositions()
}

const resetForm = () => {
  Object.assign(positionForm, {
    title: '',
    description: '',
    requirements: '',
    min_salary: 0,
    max_salary: 0,
    deadline: null,
    recruitment_count: 1,
    education: EducationEnum.BenKe,
    work_year: 0,
    is_open: true,
  })
}

const handleAdd = () => {
  resetForm()
  isEditMode.value = false
  editingPositionId.value = null
  dialog.title = '添加职位'
  dialog.visible = true
}

const handleSubmit = async () => {
  try {
    await createPosition(positionForm as PositionCreateData)
    ElMessage.success('职位创建成功')
    dialog.visible = false
    await fetchPositions() // Refresh list
  } catch (error) {
    ElMessage.error('职位创建失败')
    console.error(error)
  }
}

const handleDelete = async (id: string) => {
  try {
    await deletePosition(id)
    ElMessage.success('职位删除成功')
    await fetchPositions() // Refresh list
  } catch (error) {
    ElMessage.error('职位删除失败')
    console.error(error)
  }
}

const handlePageChange = (page: number) => {
  pagination.currentPage = page
  fetchPositions()
}

onMounted(() => {
  fetchPositions()
  fetchDepartments()
})
</script>
