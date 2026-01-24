import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: () => import('@/views/DashboardView.vue'),
      meta: { title: 'Dashboard', icon: 'home', requiresAuth: true },
    },
    {
      path: '/history',
      name: 'history',
      component: () => import('@/views/HistoryView.vue'),
      meta: { title: 'History', icon: 'clock', requiresAuth: true },
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/SettingsView.vue'),
      meta: { title: 'Settings', icon: 'settings', requiresAuth: true },
    },
    {
      path: '/medications',
      name: 'medications',
      component: () => import('@/views/MedicationsView.vue'),
      meta: { title: 'Manage Medications', requiresAuth: true, requiresAdmin: true },
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/admin/medications',
      name: 'admin-medications',
      component: () => import('@/views/AdminMedicationsView.vue'),
      meta: { title: 'Manage Medications', requiresAuth: true, requiresAdmin: true },
    },
    // Catch-all redirect to dashboard
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

// Navigation guard for auth
router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore()

  // Initialize auth from stored session if not already done
  if (!authStore.isInitialized) {
    authStore.initialize()
  }

  const requiresAuth = to.meta.requiresAuth !== false
  const requiresAdmin = to.meta.requiresAdmin === true
  const isAuthenticated = authStore.isAuthenticated
  const isAdmin = authStore.isAdmin

  if (requiresAuth && !isAuthenticated) {
    // Redirect to login if auth required but not authenticated
    next({ name: 'login' })
  } else if (requiresAdmin && !isAdmin) {
    // Redirect to settings if admin required but user is not admin
    next({ name: 'settings' })
  } else if (to.name === 'login' && isAuthenticated) {
    // Redirect to dashboard if already authenticated and trying to access login
    next({ name: 'dashboard' })
  } else {
    next()
  }
})

export default router
