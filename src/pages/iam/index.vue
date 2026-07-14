<template>
  <div class="page-shell">
    <div class="flex flex-wrap justify-end gap-2">
        <el-button v-if="can('role.read')" plain @click="router.push('/iam/roles')">角色与权限</el-button>
        <el-button v-if="can('audit.read')" plain @click="openAudit">审计日志</el-button>
        <el-button v-if="can('user.invite')" type="primary" @click="inviteVisible = true">创建用户</el-button>
    </div>

    <div class="grid gap-5 xl:grid-cols-[278px_minmax(0,1fr)]" v-loading="loading">
      <aside class="surface min-h-[620px] overflow-hidden">
        <div class="border-b border-slate-100 p-4">
          <div class="mb-3 flex items-center justify-between">
            <div class="surface-title">部门架构</div>
            <el-button v-if="can('department.create')" link type="primary" @click="openDepartmentCreate(null)">新增根部门</el-button>
          </div>
          <el-input v-model="treeKeyword" placeholder="搜索部门" clearable />
        </div>
        <div class="p-3">
          <el-tree ref="treeRef" :data="departmentTree" node-key="id" :props="treeProps" highlight-current :expand-on-click-node="false" :filter-node-method="filterTree" @node-click="selectDepartment">
            <template #default="{ data }">
              <div class="flex min-w-0 flex-1 items-center justify-between gap-2 py-1">
                <span class="truncate text-sm">{{ data.name }}</span>
                <el-dropdown v-if="selectedDepartment?.id === data.id && (can('department.create') || can('department.update') || can('department.archive'))" trigger="click" @click.stop>
                  <el-button link type="primary" @click.stop>操作</el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item v-if="can('department.create')" @click="openDepartmentCreate(data.id)">新增子部门</el-dropdown-item>
                      <el-dropdown-item v-if="can('department.update')" @click="openDepartmentEdit(data)">编辑部门</el-dropdown-item>
                      <el-dropdown-item v-if="can('department.archive')" divided @click="removeDepartment(data)">归档部门</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </template>
          </el-tree>
          <div v-if="!departmentTree.length" class="empty-hint mt-3">暂无可见部门</div>
        </div>
      </aside>

      <section class="min-w-0 space-y-5">
        <section class="surface">
          <div class="surface-header">
            <div>
              <div class="surface-title">{{ selectedDepartment?.name || '全部用户' }}</div>
              <div class="surface-subtitle">{{ selectedDepartment ? '当前部门下的账号与人员信息' : '请从左侧选择部门查看成员' }}</div>
            </div>
            <div v-if="departmentSummary" class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
              <span>直接成员 {{ departmentSummary.direct_user_count }}</span>
              <span>下级部门 {{ departmentSummary.child_department_count }}</span>
              <span>开放职位 {{ departmentSummary.open_position_count }}</span>
              <span>角色范围 {{ departmentSummary.active_role_scope_count }}</span>
            </div>
          </div>
          <div class="filter-bar">
            <div class="filter-fields">
              <el-input v-model="filters.keyword" class="filter-control filter-control--wide" placeholder="姓名、用户名或邮箱" clearable @keyup.enter="loadUsers" />
              <el-select v-model="filters.roleCode" class="filter-control filter-control--medium" clearable placeholder="全部角色">
                <el-option v-for="role in roles" :key="role.code" :label="role.name" :value="role.code" />
              </el-select>
              <el-select v-model="filters.status" class="filter-control filter-control--short" clearable placeholder="全部状态">
                <el-option label="正常" value="ACTIVE" />
                <el-option label="停用" value="BLOCKED" />
                <el-option label="已离职" value="RESIGNED" />
              </el-select>
              <el-checkbox v-model="filters.includeDescendants" class="filter-check" :disabled="!selectedDepartment">包含下级部门</el-checkbox>
            </div>
            <div class="filter-actions">
              <el-button type="primary" @click="loadUsers">查询</el-button>
              <el-button @click="resetFilters">重置</el-button>
            </div>
          </div>
        </section>

        <section class="surface overflow-hidden">
          <el-table v-loading="usersLoading" :data="users" empty-text="暂无用户" class="w-full">
            <el-table-column prop="realname" label="姓名" min-width="120" />
            <el-table-column prop="username" label="用户名" min-width="130" show-overflow-tooltip />
            <el-table-column prop="email" label="邮箱" min-width="220" show-overflow-tooltip />
            <el-table-column prop="department.name" label="主所属部门" min-width="130" />
            <el-table-column label="角色" min-width="180">
              <template #default="{ row }">
                <el-tag v-for="roleCode in row.role_codes" :key="roleCode" class="mr-1 mb-1" effect="plain">{{ roleName(roleCode) }}</el-tag>
                <span v-if="!row.role_codes.length" class="text-slate-400">未授予角色</span>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="105"><template #default="{ row }"><el-tag :type="statusTagType(row.status)" effect="light">{{ statusLabel(row.status) }}</el-tag></template></el-table-column>
            <el-table-column label="操作" min-width="250" fixed="right">
              <template #default="{ row }">
                <el-button v-if="can('user.update')" link type="primary" @click="openUserEdit(row)">编辑资料</el-button>
                <el-button v-if="can('role.assign')" link type="primary" @click="openGrant(row)">授予角色</el-button>
                <el-button v-if="can('role.read')" link type="primary" @click="openRoleManager(row)">角色与范围</el-button>
                <el-button v-if="can('user.disable') && row.status === 'ACTIVE'" link type="danger" @click="changeStatus(row, 'BLOCKED')">停用</el-button>
                <el-button v-else-if="can('user.disable') && row.status === 'BLOCKED'" link type="success" @click="changeStatus(row, 'ACTIVE')">启用</el-button>
              </template>
            </el-table-column>
          </el-table>
          <div class="flex justify-end p-4"><el-pagination v-model:current-page="page" :page-size="pageSize" layout="total, prev, pager, next" :total="total" @current-change="loadUsers" /></div>
        </section>
      </section>
    </div>

    <el-dialog v-model="inviteVisible" title="创建用户" width="520px"><el-form :model="inviteForm" label-width="110px"><el-form-item label="用户名"><el-input v-model="inviteForm.username" placeholder="仅小写字母、数字、点、下划线或短横线" /></el-form-item><el-form-item label="邮箱"><el-input v-model="inviteForm.email" /></el-form-item><el-form-item label="主所属部门"><el-select v-model="inviteForm.department_id" class="w-full"><el-option v-for="dept in flatDepartments" :key="dept.id" :label="dept.name" :value="dept.id" /></el-select></el-form-item><el-form-item label="初始角色"><el-select v-model="inviteForm.role_code" class="w-full"><el-option v-for="role in roles" :key="role.code" :label="role.name" :value="role.code" /></el-select></el-form-item><el-form-item v-if="inviteForm.role_code === RECRUITER_ROLE_CODE" label="负责部门"><el-select v-model="inviteForm.department_scope_ids" multiple class="w-full"><el-option v-for="dept in flatDepartments" :key="dept.id" :label="dept.name" :value="dept.id" /></el-select></el-form-item><el-form-item label="授权说明"><el-input v-model="inviteForm.reason" /></el-form-item></el-form><template #footer><el-button @click="inviteVisible = false">取消</el-button><el-button type="primary" @click="submitInvite">创建并发送邀请</el-button></template></el-dialog>

    <el-dialog v-model="departmentVisible" :title="editingDepartment ? '编辑部门' : '新增部门'" width="480px"><el-form :model="departmentForm" label-width="100px"><el-form-item label="部门编码"><el-input v-model="departmentForm.code" placeholder="DEPT-HR-001" :disabled="Boolean(editingDepartment)" /></el-form-item><el-form-item label="部门名称"><el-input v-model="departmentForm.name" /></el-form-item><el-form-item label="上级部门"><el-select v-model="departmentForm.parent_id" clearable class="w-full" placeholder="不设置上级部门"><el-option v-for="dept in availableParents" :key="dept.id" :label="dept.name" :value="dept.id" /></el-select></el-form-item><el-form-item label="描述"><el-input v-model="departmentForm.description" type="textarea" :rows="3" /></el-form-item></el-form><template #footer><el-button @click="departmentVisible = false">取消</el-button><el-button type="primary" @click="submitDepartment">保存</el-button></template></el-dialog>

    <el-dialog v-model="grantVisible" title="授予角色" width="480px"><el-form :model="grantForm" label-width="100px"><el-form-item label="角色"><el-select v-model="grantForm.role_code" class="w-full"><el-option v-for="role in roles" :key="role.code" :label="role.name" :value="role.code" /></el-select></el-form-item><el-form-item v-if="grantForm.role_code === RECRUITER_ROLE_CODE" label="负责部门"><el-select v-model="grantForm.department_ids" multiple class="w-full"><el-option v-for="dept in flatDepartments" :key="dept.id" :label="dept.name" :value="dept.id" /></el-select></el-form-item><el-form-item label="授权原因"><el-input v-model="grantForm.reason" /></el-form-item></el-form><template #footer><el-button @click="grantVisible = false">取消</el-button><el-button type="primary" @click="submitGrant">保存</el-button></template></el-dialog>

    <el-drawer v-model="userEditVisible" title="编辑用户资料" size="480px"><el-form :model="userForm" label-position="top"><el-form-item label="姓名"><el-input v-model="userForm.realname" /></el-form-item><el-form-item label="手机号"><el-input v-model="userForm.phone_number" /></el-form-item><el-form-item label="主所属部门"><el-select v-model="userForm.department_id" class="w-full"><el-option v-for="dept in flatDepartments" :key="dept.id" :label="dept.name" :value="dept.id" /></el-select></el-form-item></el-form><template #footer><div class="flex justify-end gap-2"><el-button @click="userEditVisible = false">取消</el-button><el-button type="primary" @click="saveUser">保存资料</el-button></div></template></el-drawer>

    <el-drawer v-model="roleManagerVisible" title="角色与部门范围" size="560px"><el-table :data="managedRoles"><el-table-column label="角色" min-width="150"><template #default="{ row }">{{ roleName(row.role_code) }}</template></el-table-column><el-table-column label="负责部门" min-width="220"><template #default="{ row }"><el-select v-if="row.role_code === RECRUITER_ROLE_CODE" v-model="scopeDraft[row.id]" multiple class="w-full"><el-option v-for="dept in flatDepartments" :key="dept.id" :label="dept.name" :value="dept.id" /></el-select><span v-else class="text-slate-400">该角色不配置部门范围</span></template></el-table-column><el-table-column label="操作" width="130"><template #default="{ row }"><el-button v-if="row.role_code === RECRUITER_ROLE_CODE && can('role.assign')" link type="primary" @click="saveScopes(row)">保存范围</el-button><el-button v-if="can('role.assign')" link type="danger" @click="removeRole(row)">撤销</el-button></template></el-table-column></el-table></el-drawer>

    <el-drawer v-model="auditVisible" title="审计日志" size="90%">
      <div class="filter-bar filter-bar--compact mb-4">
        <div class="filter-fields">
          <el-input v-model="auditFilters.action" class="filter-control filter-control--medium" clearable placeholder="操作类型" @keyup.enter="loadAuditLogs" />
          <el-input v-model="auditFilters.targetType" class="filter-control filter-control--short" clearable placeholder="对象类型" @keyup.enter="loadAuditLogs" />
          <el-input v-model="auditFilters.targetId" class="filter-control filter-control--medium" clearable placeholder="对象ID" @keyup.enter="loadAuditLogs" />
          <el-date-picker v-model="auditFilters.createdAtRange" type="datetimerange" start-placeholder="开始时间" end-placeholder="结束时间" class="filter-control filter-control--date" />
        </div>
        <div class="filter-actions">
          <el-button type="primary" @click="searchAuditLogs">查询</el-button>
          <el-button @click="resetAuditFilters">重置</el-button>
        </div>
      </div>
      <el-table v-loading="auditLoading" :data="auditLogs">
        <el-table-column prop="action" label="操作" min-width="180" />
        <el-table-column prop="target_type" label="对象" width="110" />
        <el-table-column prop="target_id" label="对象ID" min-width="180" show-overflow-tooltip />
        <el-table-column prop="created_at" label="时间" min-width="180"><template #default="{ row }">{{ formatTime(row.created_at) }}</template></el-table-column>
      </el-table>
      <div class="mt-4 flex justify-end">
        <el-pagination v-model:current-page="auditPage" :page-size="auditPageSize" layout="total, prev, pager, next" :total="auditTotal" @current-change="loadAuditLogs" />
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'
import { archiveDepartment, createDepartment, createIamInvitation, DEPARTMENT_CODE_PATTERN, getAuditLogs, getDepartmentDependencies, getDepartmentSummary, getDepartmentTree, getIamRoles, getIamUsers, getUserRoles, grantRole, RECRUITER_ROLE_CODE, replaceRoleScopes, revokeRole, updateDepartment, updateUserProfile, updateUserStatus, type AuditLog, type DepartmentSummary, type IamDepartment, type IamDepartmentTreeNode, type IamRole, type IamUser, type UserRole } from '@/apis/iam_api'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const store = useUserStore()
const can = store.can
const treeProps = { label: 'name', children: 'children' }
const treeRef = ref<{ filter: (value: string) => void }>()
const loading = ref(false)
const usersLoading = ref(false)
const treeKeyword = ref('')
const departmentTree = ref<IamDepartmentTreeNode[]>([])
const roles = ref<IamRole[]>([])
const users = ref<IamUser[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const selectedDepartment = ref<IamDepartment | null>(null)
const departmentSummary = ref<DepartmentSummary | null>(null)
const filters = reactive({ keyword: '', roleCode: '', status: '', includeDescendants: false })
const inviteVisible = ref(false)
const departmentVisible = ref(false)
const grantVisible = ref(false)
const userEditVisible = ref(false)
const roleManagerVisible = ref(false)
const auditVisible = ref(false)
const auditLoading = ref(false)
const auditLogs = ref<AuditLog[]>([])
const auditTotal = ref(0)
const auditPage = ref(1)
const auditPageSize = 30
const auditFilters = reactive({
  action: '',
  targetType: '',
  targetId: '',
  createdAtRange: null as [Date, Date] | null,
})
const selectedUser = ref<IamUser | null>(null)
const editingDepartment = ref<IamDepartment | null>(null)
const managedRoles = ref<UserRole[]>([])
const scopeDraft = reactive<Record<string, string[]>>({})
const inviteForm = reactive({ username: '', email: '', department_id: '', role_code: '', department_scope_ids: [] as string[], reason: '' })
const departmentForm = reactive({ code: '', name: '', description: '', parent_id: '' as string | null })
const grantForm = reactive({ role_code: '', department_ids: [] as string[], reason: '' })
const userForm = reactive({ realname: '', phone_number: '', department_id: '' })

const flatDepartments = computed<IamDepartment[]>(() => {
  const result: IamDepartment[] = []
  const walk = (nodes: IamDepartmentTreeNode[]) => nodes.forEach((node) => { result.push(node); walk(node.children) })
  walk(departmentTree.value)
  return result
})
const availableParents = computed(() => flatDepartments.value.filter((department) => department.id !== editingDepartment.value?.id))
const roleName = (code: string) => roles.value.find((role) => role.code === code)?.name || '未识别角色'
const statusLabel = (status: string) => ({ ACTIVE: '正常', BLOCKED: '停用', RESIGNED: '已离职' }[status] || status)
const statusTagType = (status: string) => status === 'ACTIVE' ? 'success' : status === 'BLOCKED' ? 'warning' : 'info'
const formatTime = (value: string) => new Date(value).toLocaleString()
const filterTree = (value: string, data: IamDepartment) => !value || data.name.includes(value) || data.code.includes(value.toUpperCase())

watch(treeKeyword, (value) => treeRef.value?.filter(value))

const loadUsers = async () => {
  usersLoading.value = true
  try {
    const response = await getIamUsers({ page: page.value, size: pageSize, department_id: selectedDepartment.value?.id || undefined, include_descendants: filters.includeDescendants, role_code: filters.roleCode || undefined, keyword: filters.keyword || undefined, status: filters.status || undefined })
    users.value = response.users
    total.value = response.total
  } catch {
    ElMessage.error('用户列表加载失败')
  } finally {
    usersLoading.value = false
  }
}

const loadSummary = async () => {
  if (!selectedDepartment.value) return departmentSummary.value = null
  try { departmentSummary.value = await getDepartmentSummary(selectedDepartment.value.id) } catch { departmentSummary.value = null }
}
const loadBase = async () => {
  loading.value = true
  try {
    const [tree, roleData] = await Promise.all([
      getDepartmentTree(),
      can('role.read') ? getIamRoles() : Promise.resolve([] as IamRole[]),
    ])
    departmentTree.value = tree
    roles.value = roleData
    const preferred = flatDepartments.value.find((department) => department.id === store.user?.department?.id) || flatDepartments.value[0]
    if (preferred) selectedDepartment.value = preferred
    await Promise.all([loadSummary(), loadUsers()])
  } catch {
    ElMessage.error('组织数据加载失败，请确认当前账号权限')
  } finally {
    loading.value = false
  }
}
const selectDepartment = async (department: IamDepartment) => {
  selectedDepartment.value = department
  page.value = 1
  filters.includeDescendants = false
  await Promise.all([loadSummary(), loadUsers()])
}
const resetFilters = async () => {
  Object.assign(filters, { keyword: '', roleCode: '', status: '', includeDescendants: false })
  page.value = 1
  await loadUsers()
}
const openDepartmentCreate = (parentId: string | null) => {
  editingDepartment.value = null
  Object.assign(departmentForm, { code: '', name: '', description: '', parent_id: parentId })
  departmentVisible.value = true
}
const openDepartmentEdit = (department: IamDepartment) => {
  editingDepartment.value = department
  Object.assign(departmentForm, { code: department.code, name: department.name, description: department.description || '', parent_id: department.parent_id })
  departmentVisible.value = true
}
const submitDepartment = async () => {
  departmentForm.code = departmentForm.code.trim().toUpperCase()
  if (!departmentForm.name.trim()) return ElMessage.warning('请填写部门名称')
  if (!editingDepartment.value && !DEPARTMENT_CODE_PATTERN.test(departmentForm.code)) return ElMessage.warning('部门编码须为 DEPT-业务域-序号，例如 DEPT-HR-001')
  try {
    if (editingDepartment.value) await updateDepartment(editingDepartment.value.id, { name: departmentForm.name, description: departmentForm.description, parent_id: departmentForm.parent_id })
    else await createDepartment(departmentForm)
    ElMessage.success('部门已保存')
    departmentVisible.value = false
    await loadBase()
  } catch { ElMessage.error('部门保存失败') }
}
const removeDepartment = async (department: IamDepartment) => {
  try {
    const dependencies = await getDepartmentDependencies(department.id)
    if (Object.values(dependencies).some((count) => count > 0)) return ElMessage.warning(`无法归档：${dependencies.active_users} 名用户、${dependencies.active_child_departments} 个下级部门、${dependencies.open_positions} 个开放职位、${dependencies.active_role_scopes} 个有效范围待处理`)
    await ElMessageBox.confirm(`确认归档“${department.name}”吗？`, '归档部门', { type: 'warning' })
    await archiveDepartment(department.id)
    ElMessage.success('部门已归档')
    await loadBase()
  } catch (error) { if (error !== 'cancel' && error !== 'close') ElMessage.error('部门归档失败') }
}
const submitInvite = async () => {
  if (!/^[a-z][a-z0-9._-]{1,31}$/.test(inviteForm.username.trim().toLowerCase())) return ElMessage.warning('用户名须为 2-32 位小写字母、数字、点、下划线或短横线，且以字母开头')
  if (!inviteForm.email || !inviteForm.department_id || !inviteForm.role_code || (inviteForm.role_code === RECRUITER_ROLE_CODE && !inviteForm.department_scope_ids.length)) return ElMessage.warning('请完整填写创建信息与部门范围')
  try { await createIamInvitation({ ...inviteForm, username: inviteForm.username.trim().toLowerCase() }); ElMessage.success('用户已创建，注册邀请已发送'); inviteVisible.value = false } catch { ElMessage.error('创建用户失败') }
}
const openGrant = (user: IamUser) => { selectedUser.value = user; Object.assign(grantForm, { role_code: '', department_ids: [], reason: '' }); grantVisible.value = true }
const submitGrant = async () => {
  if (!selectedUser.value || !grantForm.role_code || (grantForm.role_code === RECRUITER_ROLE_CODE && !grantForm.department_ids.length)) return ElMessage.warning('请完成角色和范围配置')
  try { await grantRole(selectedUser.value.id, grantForm); ElMessage.success('角色已授予'); grantVisible.value = false; await loadUsers() } catch { ElMessage.error('角色授予失败') }
}
const openRoleManager = async (user: IamUser) => {
  selectedUser.value = user
  try { managedRoles.value = await getUserRoles(user.id); managedRoles.value.forEach((role) => { scopeDraft[role.id] = [...role.department_ids] }); roleManagerVisible.value = true } catch { ElMessage.error('角色明细加载失败') }
}
const saveScopes = async (role: UserRole) => {
  try { await replaceRoleScopes(role.id, scopeDraft[role.id] || []); ElMessage.success('范围已更新'); await openRoleManager(selectedUser.value!) } catch { ElMessage.error('范围更新失败') }
}
const removeRole = async (role: UserRole) => {
  try { await revokeRole(role.id, '管理员调整授权'); ElMessage.success('角色已撤销'); await openRoleManager(selectedUser.value!); await loadUsers() } catch { ElMessage.error('角色撤销失败') }
}
const openUserEdit = (user: IamUser) => { selectedUser.value = user; Object.assign(userForm, { realname: user.realname, phone_number: user.phone_number || '', department_id: user.department_id || '' }); userEditVisible.value = true }
const saveUser = async () => {
  if (!selectedUser.value || !userForm.realname || !userForm.department_id) return ElMessage.warning('请填写姓名和主所属部门')
  try { await updateUserProfile(selectedUser.value.id, userForm); ElMessage.success('用户资料已保存'); userEditVisible.value = false; await Promise.all([loadUsers(), loadSummary()]) } catch { ElMessage.error('用户资料保存失败') }
}
const changeStatus = async (user: IamUser, status: string) => {
  try { await updateUserStatus(user.id, status); ElMessage.success('账号状态已更新'); await loadUsers() } catch { ElMessage.error('账号状态更新失败') }
}
const openAudit = async () => {
  auditVisible.value = true
  auditPage.value = 1
  await loadAuditLogs()
}
const loadAuditLogs = async () => {
  auditLoading.value = true
  try {
    const response = await getAuditLogs({
      page: auditPage.value,
      size: auditPageSize,
      action: auditFilters.action.trim() || undefined,
      target_type: auditFilters.targetType.trim() || undefined,
      target_id: auditFilters.targetId.trim() || undefined,
      started_at: auditFilters.createdAtRange?.[0]?.toISOString(),
      ended_at: auditFilters.createdAtRange?.[1]?.toISOString(),
    })
    auditLogs.value = response.items
    auditTotal.value = response.total
  } catch { ElMessage.error('审计日志加载失败') } finally { auditLoading.value = false }
}
const searchAuditLogs = () => {
  auditPage.value = 1
  void loadAuditLogs()
}
const resetAuditFilters = () => {
  Object.assign(auditFilters, { action: '', targetType: '', targetId: '', createdAtRange: null })
  auditPage.value = 1
  void loadAuditLogs()
}

onMounted(() => {
  void (async () => {
    try {
      // 页面热更新或旧标签页恢复时不会重新触发路由守卫，因此此处再次与服务端
      // 对齐主体，避免 localStorage 中的姓名/角色与实际令牌不一致。
      await store.refreshPrincipal()
      if (!store.can('user.read') || !store.can('department.read')) {
        ElMessage.warning('当前登录账号没有组织与用户管理权限')
        await router.replace('/dashboard')
        return
      }
      await loadBase()
    } catch {
      store.logout()
      ElMessage.error('登录状态已失效，请重新登录')
      await router.replace({ path: '/login', query: { redirect: '/iam' } })
    }
  })()
})
</script>
