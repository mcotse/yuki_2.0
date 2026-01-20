<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const password = ref('')
const error = ref('')
const isLoading = ref(false)

async function handleLogin() {
  error.value = ''
  isLoading.value = true

  try {
    const result = authStore.login(password.value)

    if (result.success) {
      // Redirect to dashboard
      router.push('/')
    } else {
      error.value = result.error || 'Login failed'
      password.value = ''
    }
  } catch {
    error.value = 'An unexpected error occurred'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <main class="min-h-screen flex items-center justify-center p-6 bg-background">
    <div class="w-full max-w-sm">
      <!-- Header -->
      <div class="text-center mb-8">
        <div
          class="w-20 h-20 mx-auto mb-4 bg-accent rounded-full flex items-center justify-center border-2 border-foreground shadow-md"
        >
          <span class="text-3xl">🐕</span>
        </div>
        <h1 class="text-3xl font-bold text-foreground mb-2">Yuki Care</h1>
        <p class="text-muted-foreground">Enter your password to continue</p>
      </div>

      <!-- Login Card -->
      <div class="card p-6">
        <form class="space-y-4" @submit.prevent="handleLogin">
          <!-- Error Message -->
          <div
            v-if="error"
            class="p-3 bg-error/10 border-2 border-error rounded-lg text-error text-sm font-medium"
          >
            {{ error }}
          </div>

          <!-- Password Input -->
          <div>
            <label class="label" for="password">Password</label>
            <input
              id="password"
              v-model="password"
              type="password"
              class="input"
              placeholder="Enter password..."
              autocomplete="current-password"
              :disabled="isLoading"
              required
            />
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            class="btn btn-primary w-full"
            :disabled="isLoading || !password"
          >
            <span v-if="isLoading">Logging in...</span>
            <span v-else>Login</span>
          </button>
        </form>
      </div>

      <!-- Hint -->
      <p class="text-center text-muted-foreground text-sm mt-6">
        Hint: Use your assigned password
      </p>
    </div>
  </main>
</template>
