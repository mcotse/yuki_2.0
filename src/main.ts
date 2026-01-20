// Fonts - self-hosted via @fontsource for offline support
import '@fontsource-variable/outfit'
import '@fontsource-variable/plus-jakarta-sans'

import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

import App from './App.vue'
import router from './router'

const app = createApp(App)

// Create Pinia with persistence plugin
const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

app.use(pinia)
app.use(router)

app.mount('#app')
