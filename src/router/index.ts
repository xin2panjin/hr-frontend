import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/pages/login/index.vue'),
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/pages/register/index.vue'),
    },
    { path: '/candidate-portal/login', name: 'candidate-portal-login', component: () => import('@/pages/candidate-portal/login.vue'), meta: { public: true } },
    { path: '/candidate-portal', name: 'candidate-portal', component: () => import('@/pages/candidate-portal/index.vue'), meta: { candidatePortal: true } },
    {
      path: '/',
      component: () => import('@/components/MainLayout.vue'),
      redirect: '/dashboard',
      children: [
        {
          path: 'dashboard',
          name: 'dashboard',
          component: () => import('@/pages/dashboard/index.vue'),
        },
        {
          path: 'positions',
          name: 'positions',
          component: () => import('@/pages/positions/index.vue'),
        },
        {
          path: 'candidates',
          name: 'candidates',
          component: () => import('@/pages/candidates/index.vue'),
        },
        {
          path: 'hr-assistant',
          name: 'hr-assistant',
          component: () => import('@/pages/hr-assistant/index.vue'),
          meta: { permissions: ['assistant.use'] },
        },
        { path: 'candidate-communications', name: 'candidate-communications', component: () => import('@/pages/candidate-communications/index.vue'), meta: { permissions: ['candidate.communication.use'] } },
        { path: 'knowledge', name: 'knowledge', component: () => import('@/pages/knowledge/index.vue'), meta: { permissions: ['knowledge.document_manage'] } },
        {
          path: 'candidates/add',
          name: 'candidates-add',
          component: () => import('@/pages/candidates/add.vue'),
        },
        {
          path: 'settings',
          name: 'settings',
          component: () => import('@/pages/settings/index.vue'),
        },
        {
          path: 'iam',
          name: 'iam',
          component: () => import('@/pages/iam/index.vue'),
          meta: { permissions: ['user.read', 'department.read'] },
        },
        {
          path: 'iam/roles',
          name: 'iam-roles',
          component: () => import('@/pages/iam/roles.vue'),
          meta: { permissions: ['role.read'] },
        },
        {
          path: 'iam/roles/:roleId/permissions',
          name: 'iam-role-permissions',
          component: () => import('@/pages/iam/role-permissions.vue'),
          meta: { permissions: ['role.read'] },
        },
        {
          path: 'iam/roles/:roleId/permissions/edit',
          name: 'iam-role-permissions-edit',
          component: () => import('@/pages/iam/role-permissions.vue'),
          meta: { permissions: ['role.update_permissions'] },
        },
      ],
    },
  ],
})

router.beforeEach(async (to) => {
  if (to.matched.some((record) => record.meta.public)) return true
  if (to.matched.some((record) => record.meta.candidatePortal)) {
    return localStorage.getItem('candidatePortalAccessToken') ? true : { name: 'candidate-portal-login' }
  }
  const userStore = useUserStore()
  const required = to.matched.flatMap((record) => (record.meta.permissions as string[] | undefined) || [])
  if (
    to.name !== 'login'
    && to.name !== 'register'
    && userStore.isLoggedIn
    // 权限路由必须以本次请求的服务端主体为准。只依赖 localStorage 会出现
    // “页面显示 A 用户、请求令牌却属于 B 用户”的身份错配。
    && (required.length > 0 || userStore.permissions.length === 0)
  ) {
    try { await userStore.refreshPrincipal() } catch { userStore.logout(); return { name: 'login' } }
  }
  return required.every((permission) => userStore.can(permission)) ? true : { name: 'dashboard' }
})

export default router
