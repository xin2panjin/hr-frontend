<template>
  <div class="page-shell">
    <div class="surface mb-5">
      <div class="surface-header"><div class="flex items-center gap-3"><span class="icon-tile"><el-icon><Connection /></el-icon></span><div><h2 class="surface-title">钉钉绑定</h2><p class="surface-subtitle">绑定后可接收面试相关通知</p></div></div><el-tag :type="statusResp.is_linked ? 'success' : 'info'" effect="plain">{{ statusResp.is_linked ? '已绑定' : '未绑定' }}</el-tag></div>
      <div class="p-5"><div v-if="dingtalkLoading" class="text-gray-500">加载中...</div><template v-else><div class="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">{{ statusResp.is_linked ? `已绑定钉钉账号${statusResp.dingding_user?.name ? `（${statusResp.dingding_user.name}）` : ''}` : '当前账号尚未绑定钉钉。' }}</div><el-button class="mt-4" type="primary" :loading="bindLoading" @click="onBindDingtalk"><el-icon><Link /></el-icon>登录钉钉</el-button></template></div>
    </div>

    <div class="surface">
      <div class="surface-header"><div class="flex items-center gap-3"><span class="icon-tile"><el-icon><Monitor /></el-icon></span><div><h2 class="surface-title">登录设备</h2><p class="surface-subtitle">撤销设备后，该设备的访问令牌将立即失效</p></div></div><el-button link type="primary" :loading="sessionsLoading" @click="loadSessions">刷新</el-button></div>
      <el-table v-loading="sessionsLoading" :data="sessions" class="w-full"><el-table-column label="设备" min-width="180"><template #default="{ row }"><span>浏览器登录</span><el-tag v-if="row.is_current" class="ml-2" size="small" type="success">当前设备</el-tag></template></el-table-column><el-table-column label="最近活跃" min-width="180"><template #default="{ row }">{{ formatTime(row.last_seen_at || row.created_at) }}</template></el-table-column><el-table-column label="到期时间" min-width="180"><template #default="{ row }">{{ formatTime(row.expires_at) }}</template></el-table-column><el-table-column label="状态" width="110"><template #default="{ row }"><el-tag :type="row.revoked_at ? 'info' : 'success'">{{ row.revoked_at ? '已撤销' : '有效' }}</el-tag></template></el-table-column><el-table-column label="操作" width="120"><template #default="{ row }"><el-button v-if="!row.revoked_at" link type="danger" @click="revokeSession(row)">{{ row.is_current ? '退出此设备' : '撤销' }}</el-button></template></el-table-column></el-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Connection, Link, Monitor } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { getDingtalkAuthorizeUrl, getDingtalkStatus } from '@/apis/user_api'
import { getMySessions, revokeMySession, type AuthSession } from '@/apis/iam_api'
import { useUserStore } from '@/stores/user'

type DingTalkStatusResp = { is_linked: boolean; dingding_user: null | { name: string; union_id: string } }
const router = useRouter(); const userStore = useUserStore(); const dingtalkLoading = ref(true); const bindLoading = ref(false); const sessionsLoading = ref(false); const statusResp = ref<DingTalkStatusResp>({ is_linked: false, dingding_user: null }); const sessions = ref<AuthSession[]>([])
const formatTime = (value: string) => new Date(value).toLocaleString()
async function fetchStatus() { try { const resp = await getDingtalkStatus(); statusResp.value = { is_linked: Boolean(resp.dingding_user), dingding_user: resp.dingding_user } } catch { ElMessage.error('获取钉钉绑定状态失败') } finally { dingtalkLoading.value = false } }
async function onBindDingtalk() { bindLoading.value = true; try { const resp = await getDingtalkAuthorizeUrl(); if (!resp?.authorize_url) throw new Error(); window.location.href = resp.authorize_url } catch { ElMessage.error('跳转钉钉登录失败') } finally { bindLoading.value = false } }
async function loadSessions() { sessionsLoading.value = true; try { sessions.value = await getMySessions() } catch { ElMessage.error('登录设备加载失败') } finally { sessionsLoading.value = false } }
async function revokeSession(session: AuthSession) { try { await revokeMySession(session.id); ElMessage.success('会话已撤销'); if (session.is_current) { userStore.logout(); await router.replace('/login') } else await loadSessions() } catch { ElMessage.error('会话撤销失败') } }
onMounted(() => { void fetchStatus(); void loadSessions() })
</script>
