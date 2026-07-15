<template>
  <div class="page-shell">
    <div class="surface">
      <div class="surface-header">
        <div class="flex items-center gap-3">
          <span class="icon-tile">
            <el-icon><UserFilled /></el-icon>
          </span>
          <div>
            <h2 class="surface-title">基本信息</h2>
            <p class="surface-subtitle">账号、组织与角色信息</p>
          </div>
        </div>
        <el-tag effect="plain" type="primary">{{ roleLabel }}</el-tag>
      </div>

      <div class="flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
        <span class="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-xl font-semibold text-blue-700">
          {{ userInitial }}
        </span>
        <div class="min-w-0">
          <div class="truncate text-lg font-semibold text-slate-900">{{ userStore.user?.realname || userStore.user?.username || '未设置姓名' }}</div>
          <div class="mt-1 truncate text-sm text-slate-500">{{ userStore.user?.email || '未设置邮箱' }}</div>
        </div>
        <dl class="grid min-w-0 flex-1 grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt class="text-xs text-slate-400">账号</dt>
            <dd class="mt-1 truncate text-sm text-slate-700">{{ userStore.user?.username || '未设置' }}</dd>
          </div>
          <div>
            <dt class="text-xs text-slate-400">手机号</dt>
            <dd class="mt-1 truncate text-sm text-slate-700">{{ userStore.user?.phone_number || '未设置' }}</dd>
          </div>
          <div>
            <dt class="text-xs text-slate-400">所属部门</dt>
            <dd class="mt-1 truncate text-sm text-slate-700">{{ userStore.user?.department?.name || '未设置部门' }}</dd>
          </div>
          <div>
            <dt class="text-xs text-slate-400">账号创建时间</dt>
            <dd class="mt-1 text-sm text-slate-700">{{ formatTime(userStore.user?.created_at) }}</dd>
          </div>
        </dl>
      </div>
    </div>

    <div class="surface">
      <div class="surface-header"><div class="flex items-center gap-3"><span class="icon-tile"><el-icon><Connection /></el-icon></span><div><h2 class="surface-title">钉钉绑定</h2><p class="surface-subtitle">绑定后可接收面试相关通知</p></div></div><el-tag :type="statusResp.is_linked ? 'success' : 'info'" effect="plain">{{ statusResp.is_linked ? '已绑定' : '未绑定' }}</el-tag></div>
      <div class="p-5"><div v-if="dingtalkLoading" class="text-gray-500">加载中...</div><template v-else><div class="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">{{ statusResp.is_linked ? `已绑定钉钉账号${statusResp.dingding_user?.name ? `（${statusResp.dingding_user.name}）` : ''}` : '当前账号尚未绑定钉钉。' }}</div><el-button class="mt-4" type="primary" :loading="bindLoading" @click="onBindDingtalk"><el-icon><Link /></el-icon>登录钉钉</el-button></template></div>
    </div>

    <div class="surface">
      <div class="surface-header"><div class="flex items-center gap-3"><span class="icon-tile"><el-icon><Lock /></el-icon></span><div><h2 class="surface-title">登录密码</h2><p class="surface-subtitle">修改后，所有已登录设备都会退出。</p></div></div><el-button type="primary" @click="passwordVisible = true">修改密码</el-button></div>
    </div>

    <div class="surface">
      <div class="surface-header"><div class="flex items-center gap-3"><span class="icon-tile"><el-icon><Monitor /></el-icon></span><div><h2 class="surface-title">登录设备</h2><p class="surface-subtitle">撤销设备后，该设备的访问令牌将立即失效</p></div></div><el-button link type="primary" :loading="sessionsLoading" @click="loadSessions">刷新</el-button></div>
      <el-table v-loading="sessionsLoading" :data="sessions" class="w-full"><el-table-column label="设备" min-width="180"><template #default="{ row }"><span>浏览器登录</span><el-tag v-if="row.is_current" class="ml-2" size="small" type="success">当前设备</el-tag></template></el-table-column><el-table-column label="最近活跃" min-width="180"><template #default="{ row }">{{ formatTime(row.last_seen_at || row.created_at) }}</template></el-table-column><el-table-column label="到期时间" min-width="180"><template #default="{ row }">{{ formatTime(row.expires_at) }}</template></el-table-column><el-table-column label="状态" width="110"><template #default="{ row }"><el-tag :type="row.revoked_at ? 'info' : 'success'">{{ row.revoked_at ? '已撤销' : '有效' }}</el-tag></template></el-table-column><el-table-column label="操作" width="120"><template #default="{ row }"><el-button v-if="!row.revoked_at" link type="danger" @click="revokeSession(row)">{{ row.is_current ? '退出此设备' : '撤销' }}</el-button></template></el-table-column></el-table>
    </div>

    <el-dialog v-model="passwordVisible" title="修改密码" width="460px" @closed="resetPasswordForm">
      <el-form :model="passwordForm" label-width="105px">
        <el-form-item label="当前密码"><el-input v-model="passwordForm.currentPassword" type="password" show-password autocomplete="current-password" /></el-form-item>
        <el-form-item label="新密码"><el-input v-model="passwordForm.newPassword" type="password" show-password autocomplete="new-password" /></el-form-item>
        <el-form-item label="确认新密码"><el-input v-model="passwordForm.confirmPassword" type="password" show-password autocomplete="new-password" /></el-form-item>
      </el-form>
      <p class="text-xs text-slate-500">密码须至少 12 位，并同时包含大小写字母、数字和特殊字符。</p>
      <template #footer><el-button @click="passwordVisible = false">取消</el-button><el-button type="primary" :loading="passwordSaving" @click="submitPasswordChange">保存并退出登录</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Connection, Link, Lock, Monitor, UserFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { getDingtalkAuthorizeUrl, getDingtalkStatus } from '@/apis/user_api'
import { changeMyPassword, getMySessions, revokeMySession, type AuthSession } from '@/apis/iam_api'
import { useUserStore } from '@/stores/user'

type DingTalkStatusResp = { is_linked: boolean; dingding_user: null | { name: string; union_id: string } }
const router = useRouter(); const userStore = useUserStore(); const dingtalkLoading = ref(true); const bindLoading = ref(false); const sessionsLoading = ref(false); const passwordVisible = ref(false); const passwordSaving = ref(false); const statusResp = ref<DingTalkStatusResp>({ is_linked: false, dingding_user: null }); const sessions = ref<AuthSession[]>([])
const passwordForm = ref({ currentPassword: '', newPassword: '', confirmPassword: '' })
const userInitial = computed(() => (userStore.user?.realname || userStore.user?.username || 'U').slice(0, 1).toUpperCase())
const roleLabel = computed(() => userStore.roles.map((role) => role.name).join('、') || '未分配角色')
const formatTime = (value?: string) => value ? new Date(value).toLocaleString() : '未记录'
async function fetchStatus() { try { const resp = await getDingtalkStatus(); statusResp.value = { is_linked: Boolean(resp.dingding_user), dingding_user: resp.dingding_user } } catch { ElMessage.error('获取钉钉绑定状态失败') } finally { dingtalkLoading.value = false } }
async function onBindDingtalk() { bindLoading.value = true; try { const resp = await getDingtalkAuthorizeUrl(); if (!resp?.authorize_url) throw new Error(); window.location.href = resp.authorize_url } catch { ElMessage.error('跳转钉钉登录失败') } finally { bindLoading.value = false } }
async function loadSessions() { sessionsLoading.value = true; try { sessions.value = await getMySessions() } catch { ElMessage.error('登录设备加载失败') } finally { sessionsLoading.value = false } }
async function revokeSession(session: AuthSession) { try { await revokeMySession(session.id); ElMessage.success('会话已撤销'); if (session.is_current) { userStore.logout(); await router.replace('/login') } else await loadSessions() } catch { ElMessage.error('会话撤销失败') } }
function resetPasswordForm() { passwordForm.value = { currentPassword: '', newPassword: '', confirmPassword: '' } }
async function submitPasswordChange() {
  const { currentPassword, newPassword, confirmPassword } = passwordForm.value
  if (!currentPassword || !newPassword) return ElMessage.warning('请填写当前密码和新密码')
  if (newPassword.length < 12) return ElMessage.warning('新密码至少需要 12 位')
  if (newPassword !== confirmPassword) return ElMessage.warning('两次输入的新密码不一致')
  passwordSaving.value = true
  try {
    await changeMyPassword({ current_password: currentPassword, new_password: newPassword })
    userStore.logout()
    ElMessage.success('密码已修改，请使用新密码重新登录')
    await router.replace('/login')
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.detail || '密码修改失败，请检查当前密码和安全规则')
  } finally { passwordSaving.value = false }
}
onMounted(() => { void fetchStatus(); void loadSessions() })
</script>
