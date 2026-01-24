<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAuth } from '@/composables/useAuth'
import { LogOut, Pill, User, Shield } from 'lucide-vue-next'

const router = useRouter()
const authStore = useAuthStore()
const { displayName, isAdmin, canManageMedications } = useAuth()

function handleLogout() {
  authStore.logout()
  router.push('/login')
}
</script>

<template>
  <main class="p-6 pb-24 max-w-lg mx-auto">
    <h1 class="text-3xl font-bold mb-8 text-foreground">Settings</h1>

    <!-- User Info Card -->
    <div class="card p-4 mb-6">
      <div class="flex items-center gap-4">
        <div
          class="w-14 h-14 bg-accent rounded-full flex items-center justify-center border-2 border-foreground shadow-sm"
        >
          <User class="w-7 h-7 text-white" />
        </div>
        <div class="flex-1">
          <h2 class="text-lg font-bold text-foreground">{{ displayName }}</h2>
          <div class="flex items-center gap-2">
            <span
              v-if="isAdmin"
              class="inline-flex items-center gap-1 px-2 py-0.5 bg-accent/20 text-accent text-xs font-medium rounded-full"
            >
              <Shield class="w-3 h-3" />
              Admin
            </span>
            <span v-else class="text-sm text-muted-foreground">User</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Admin Section -->
    <div v-if="canManageMedications()" class="mb-6">
      <h2 class="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">
        Admin
      </h2>
      <div class="card divide-y divide-muted">
        <button
          class="w-full flex items-center gap-4 p-4 text-left hover:bg-muted/50 transition-colors"
          @click="router.push('/medications')"
        >
          <div class="w-10 h-10 bg-secondary/20 rounded-xl flex items-center justify-center">
            <Pill class="w-5 h-5 text-secondary" />
          </div>
          <div class="flex-1">
            <div class="font-medium text-foreground">Manage Medications</div>
            <div class="text-sm text-muted-foreground">Add, edit, or deactivate medications</div>
          </div>
        </button>
      </div>
    </div>

    <!-- Account Section -->
    <div>
      <h2 class="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">
        Account
      </h2>
      <div class="card divide-y divide-muted">
        <button
          class="w-full flex items-center gap-4 p-4 text-left hover:bg-error/10 transition-colors"
          @click="handleLogout"
        >
          <div class="w-10 h-10 bg-error/20 rounded-xl flex items-center justify-center">
            <LogOut class="w-5 h-5 text-error" />
          </div>
          <div class="flex-1">
            <div class="font-medium text-error">Log Out</div>
            <div class="text-sm text-muted-foreground">Sign out of your account</div>
          </div>
        </button>
      </div>
    </div>
  </main>
</template>
