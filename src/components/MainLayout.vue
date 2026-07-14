<template>
  <div class="flex h-screen overflow-hidden bg-[#f5f7fb]">
    <aside
      class="flex w-[252px] shrink-0 flex-col border-r border-slate-200 bg-[#111827] text-white"
    >
      <div class="flex h-16 items-center gap-3 border-b border-white/10 px-5">
        <div
          class="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500 text-white shadow-sm"
        >
          <el-icon size="20"><Briefcase /></el-icon>
        </div>
        <div class="min-w-0">
          <div class="truncate text-base font-semibold">AI智能招聘系统</div>
          <div class="text-xs text-slate-400">Talent Workspace</div>
        </div>
      </div>

      <nav class="flex-1 overflow-y-auto px-3 py-4">
        <ul class="space-y-1">
          <li v-for="item in navItems" :key="item.to">
            <router-link :to="item.to" class="nav-link">
              <el-icon size="18"><component :is="item.icon" /></el-icon>
              <span>{{ item.label }}</span>
            </router-link>
          </li>
        </ul>
      </nav>

      <div class="border-t border-white/10 p-4">
        <div class="rounded-lg border border-white/10 bg-white/5 p-3">
          <div class="text-xs text-slate-400">当前部门</div>
          <div class="mt-1 truncate text-sm font-medium">
            {{ userStore.user?.department?.name || '未设置部门' }}
          </div>
        </div>
      </div>
    </aside>

    <div class="flex min-w-0 flex-1 flex-col">
      <header
        class="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white/90 px-6 backdrop-blur"
      >
        <div>
          <div class="text-sm font-semibold text-slate-900">{{ currentRouteTitle }}</div>
          <div class="text-xs text-slate-500">{{ currentRouteSubtitle }}</div>
        </div>
        <div class="flex items-center gap-3">
          <el-button circle plain @click="goToSettings">
            <el-icon><Setting /></el-icon>
          </el-button>
          <el-dropdown>
            <span
              class="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:outline-none"
            >
              <span
                class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 font-semibold text-blue-700"
              >
                {{ userInitial }}
              </span>
              <span class="min-w-0">
                <span class="block max-w-32 truncate font-medium text-slate-900">
                  {{ userStore.user?.realname || userStore.user?.username || '用户' }}
                </span>
                <span class="block max-w-32 truncate text-xs text-slate-500">
                  {{ userRoleLabel }}
                </span>
              </span>
              <el-icon><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="goToSettings">
                  <el-icon><Setting /></el-icon>
                  <span>设置</span>
                </el-dropdown-item>
                <el-dropdown-item @click="handleLogout">
                  <el-icon><SwitchButton /></el-icon>
                  <span>退出登录</span>
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>

      <main class="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <router-view></router-view>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeMount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import {
  House,
  Postcard,
  User,
  ChatDotRound,
  ArrowDown,
  Setting,
  SwitchButton,
  Briefcase,
} from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const navItems = computed(() => {
  const items = [
    { to: '/dashboard', label: '首页', icon: House, visible: true },
    { to: '/positions', label: '职位管理', icon: Postcard, visible: true },
    { to: '/candidates', label: '候选人管理', icon: User, visible: true },
    {
      to: '/hr-assistant',
      label: 'HR助手',
      icon: ChatDotRound,
      visible: userStore.can('assistant.use'),
    },
    { to: '/iam', label: '权限与安全', icon: Setting, visible: userStore.can('user.read') },
  ]

  return items.filter((item) => item.visible)
})

const routeMetaMap: Record<string, { title: string; subtitle: string }> = {
  dashboard: { title: '招聘概览', subtitle: '查看关键指标和近期趋势' },
  positions: { title: '职位管理', subtitle: '维护招聘需求和开放状态' },
  candidates: { title: '候选人管理', subtitle: '跟进候选人状态和简历信息' },
  'candidates-add': { title: '添加候选人', subtitle: '上传简历并校对解析结果' },
  'hr-assistant': { title: 'HR 助手', subtitle: '用自然语言检索和对比候选人' },
  settings: { title: '设置', subtitle: '管理账号绑定和个人配置' },
  iam: { title: '组织与用户', subtitle: '在部门上下文中维护用户与角色授权' },
  'iam-roles': { title: '角色与权限', subtitle: '查看或调整角色的业务能力配置' },
  'iam-role-permissions': { title: '角色权限', subtitle: '查看角色可用的系统能力' },
  'iam-role-permissions-edit': { title: '编辑角色权限', subtitle: '调整角色的系统能力配置' },
}

const currentRouteInfo = computed(() => {
  const routeName = String(route.name || 'dashboard')
  return routeMetaMap[routeName] ?? { title: '招聘概览', subtitle: '查看关键指标和近期趋势' }
})

const currentRouteTitle = computed(() => currentRouteInfo.value.title)
const currentRouteSubtitle = computed(() => currentRouteInfo.value.subtitle)

const userInitial = computed(() => {
  const name = userStore.user?.realname || userStore.user?.username || 'U'
  return name.slice(0, 1).toUpperCase()
})

const userRoleLabel = computed(() => {
  return userStore.roles.map((role) => role.name).join('、') || '员工'
})

onBeforeMount(() => {
  if (!userStore.isLoggedIn) {
    router.push('/login')
  }
})

const handleLogout = () => {
  userStore.logout()
  router.push('/login')
}

const goToSettings = () => {
  router.push('/settings')
}
</script>

<style scoped>
.nav-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  border-radius: 8px;
  padding: 0.72rem 0.85rem;
  color: #cbd5e1;
  transition:
    background-color 0.16s ease,
    color 0.16s ease;
}

.nav-link:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
}

.nav-link.router-link-active {
  background: #ffffff;
  color: #1d4ed8;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.18);
}
</style>

<style>
.el-dropdown-menu {
  min-width: 120px;
}

.el-dropdown-menu__item {
  font-size: 1rem; /* Corresponds to text-base in Tailwind CSS */
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
}

.el-dropdown-menu__item .el-icon {
  margin-right: 8px;
}
</style>
