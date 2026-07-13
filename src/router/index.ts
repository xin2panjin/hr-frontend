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
          meta: { requiresHRAssistantAccess: true },
        },
        {
          path: 'candidates/add',
          name: 'candidates-add',
          component: () => import('@/pages/candidates/add.vue'),
        },
        {
          path: 'employees',
          name: 'employees',
          component: () => import('@/pages/employees/index.vue'),
        },
        {
          path: 'hr-management',
          name: 'hr-management',
          component: () => import('@/pages/hr-management/index.vue'),
        },
        {
          path: 'settings',
          name: 'settings',
          component: () => import('@/pages/settings/index.vue'),
        },
      ],
    },
  ],
})

router.beforeEach((to) => {
  // 菜单隐藏只改善体验；路由守卫可防止用户手工输入地址直接进入页面。
  if (!to.matched.some((record) => record.meta.requiresHRAssistantAccess)) {
    return true
  }

  const userStore = useUserStore()
  if (userStore.canUseHRAssistant) {
    return true
  }

  return { name: 'dashboard' }
})

export default router
