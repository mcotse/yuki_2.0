<script setup lang="ts">
import { ref, computed } from 'vue'
import { useInstancesStore } from '@/stores/instances'
import { Plus, Cookie, Activity, Thermometer, MessageSquare, Check, X } from 'lucide-vue-next'

const emit = defineEmits<{
  logged: []
}>()

const instancesStore = useInstancesStore()

// UI State
const isExpanded = ref(false)
const selectedCategory = ref<string | null>(null)
const noteText = ref('')
const isSubmitting = ref(false)
const showSuccess = ref(false)

// Category definitions with icons and colors
const categories = [
  {
    id: 'snack',
    label: 'Snack',
    icon: Cookie,
    colorClass: 'bg-amber-500/20 text-amber-600 border-amber-400/40',
    activeClass: 'bg-amber-500 text-white border-amber-500',
  },
  {
    id: 'behavior',
    label: 'Behavior',
    icon: Activity,
    colorClass: 'bg-blue-500/20 text-blue-600 border-blue-400/40',
    activeClass: 'bg-blue-500 text-white border-blue-500',
  },
  {
    id: 'symptom',
    label: 'Symptom',
    icon: Thermometer,
    colorClass: 'bg-rose-500/20 text-rose-600 border-rose-400/40',
    activeClass: 'bg-rose-500 text-white border-rose-500',
  },
  {
    id: 'other',
    label: 'Other',
    icon: MessageSquare,
    colorClass: 'bg-slate-500/20 text-slate-600 border-slate-400/40',
    activeClass: 'bg-slate-500 text-white border-slate-500',
  },
]

const selectedCategoryData = computed(() =>
  categories.find((c) => c.id === selectedCategory.value)
)

function toggleExpand() {
  isExpanded.value = !isExpanded.value
  if (!isExpanded.value) {
    resetForm()
  }
}

function selectCategory(categoryId: string) {
  selectedCategory.value = categoryId
}

function resetForm() {
  selectedCategory.value = null
  noteText.value = ''
  isSubmitting.value = false
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    isExpanded.value = false
    resetForm()
  }
}

async function handleSubmit() {
  if (!selectedCategory.value || isSubmitting.value) return

  isSubmitting.value = true

  try {
    const result = await instancesStore.createQuickLog({
      category: selectedCategory.value,
      note: noteText.value || undefined,
    })

    if (result.success) {
      showSuccess.value = true
      emit('logged')

      // Reset after brief success animation
      setTimeout(() => {
        showSuccess.value = false
        isExpanded.value = false
        resetForm()
      }, 800)
    } else {
      console.error('[QuickLogCard] Failed:', result.error)
    }
  } finally {
    isSubmitting.value = false
  }
}

function handleInputKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && selectedCategory.value) {
    handleSubmit()
  }
}
</script>

<template>
  <div
    data-testid="quick-log-card"
    class="quick-log-card"
    :class="{ 'quick-log-card-expanded': isExpanded, 'quick-log-card-success': showSuccess }"
    @keydown="handleKeydown"
    tabindex="0"
  >
    <!-- Trigger / Header -->
    <button
      data-testid="quick-log-trigger"
      class="quick-log-trigger"
      @click="toggleExpand"
    >
      <div class="quick-log-icon" :class="{ 'rotate-45': isExpanded }">
        <Plus class="w-5 h-5" />
      </div>
      <span class="quick-log-label">Quick Log</span>
      <span class="quick-log-hint">Tap to add</span>
    </button>

    <!-- Expanded Content -->
    <Transition name="quick-log-expand">
      <div v-if="isExpanded" data-testid="quick-log-options" class="quick-log-content">
        <!-- Category Pills -->
        <div class="quick-log-categories">
          <button
            v-for="cat in categories"
            :key="cat.id"
            :data-testid="`category-${cat.id}`"
            class="category-chip"
            :class="[
              selectedCategory === cat.id ? cat.activeClass + ' selected' : cat.colorClass,
            ]"
            @click="selectCategory(cat.id)"
          >
            <component :is="cat.icon" class="w-4 h-4" />
            <span>{{ cat.label }}</span>
          </button>
        </div>

        <!-- Note Input (shown when category selected) -->
        <Transition name="fade-slide">
          <div v-if="selectedCategory" class="quick-log-input-wrapper">
            <input
              data-testid="quick-log-input"
              v-model="noteText"
              type="text"
              class="quick-log-input"
              :placeholder="`What happened? (optional)`"
              @keydown="handleInputKeydown"
            />
            <div class="quick-log-actions">
              <button
                class="quick-log-cancel"
                @click="resetForm"
              >
                <X class="w-4 h-4" />
              </button>
              <button
                data-testid="quick-log-submit"
                class="quick-log-submit"
                :class="selectedCategoryData?.activeClass"
                :disabled="isSubmitting"
                @click="handleSubmit"
              >
                <Check class="w-4 h-4" />
                <span>Log</span>
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>

    <!-- Success Overlay -->
    <Transition name="success-pop">
      <div v-if="showSuccess" class="quick-log-success-overlay">
        <div class="success-check">
          <Check class="w-6 h-6" />
        </div>
        <span>Logged!</span>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.quick-log-card {
  position: relative;
  background: linear-gradient(135deg, #F0EBFF 0%, #FFEEF8 50%, #FFF7ED 100%);
  border: 2px dashed var(--color-accent);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: all 0.3s var(--ease-bounce);
}

.quick-log-card:hover {
  border-style: solid;
  transform: translateY(-2px);
  box-shadow: var(--shadow-accent);
}

.quick-log-card-expanded {
  border-style: solid;
  background: linear-gradient(135deg, #F8F5FF 0%, #FFF5F9 50%, #FFFAF5 100%);
}

.quick-log-card-success {
  border-color: var(--color-quaternary);
  background: linear-gradient(135deg, #ECFDF5 0%, #F0FDF4 100%);
}

.quick-log-trigger {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 1rem 1.25rem;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
}

.quick-log-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: var(--color-accent);
  color: white;
  border-radius: var(--radius-md);
  transition: transform 0.3s var(--ease-bounce);
  box-shadow: var(--shadow-sm);
}

.quick-log-label {
  font-family: var(--font-display);
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--color-foreground);
}

.quick-log-hint {
  margin-left: auto;
  font-size: 0.75rem;
  color: var(--color-muted-foreground);
  opacity: 0.7;
}

.quick-log-content {
  padding: 0 1.25rem 1.25rem;
}

.quick-log-categories {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.category-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.875rem;
  font-size: 0.875rem;
  font-weight: 600;
  border: 2px solid;
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: all 0.2s var(--ease-bounce);
}

.category-chip:hover {
  transform: scale(1.05);
}

.category-chip:active {
  transform: scale(0.98);
}

.category-chip.selected {
  box-shadow: var(--shadow-sm);
}

.quick-log-input-wrapper {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.quick-log-input {
  flex: 1;
  padding: 0.75rem 1rem;
  font-size: 0.9375rem;
  background: white;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: all 0.2s ease;
}

.quick-log-input:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
}

.quick-log-actions {
  display: flex;
  gap: 0.375rem;
}

.quick-log-cancel {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: var(--color-muted);
  color: var(--color-muted-foreground);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
}

.quick-log-cancel:hover {
  background: var(--color-border);
  color: var(--color-foreground);
}

.quick-log-submit {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 700;
  color: white;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s var(--ease-bounce);
  box-shadow: var(--shadow-sm);
}

.quick-log-submit:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.quick-log-submit:active {
  transform: translateY(1px);
  box-shadow: none;
}

.quick-log-submit:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* Success Overlay */
.quick-log-success-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background: rgba(34, 197, 94, 0.95);
  color: white;
  font-family: var(--font-display);
  font-size: 1.125rem;
  font-weight: 700;
}

.success-check {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: white;
  color: var(--color-quaternary);
  border-radius: 50%;
  animation: success-bounce 0.5s var(--ease-bounce);
}

@keyframes success-bounce {
  0% { transform: scale(0); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

/* Transitions */
.quick-log-expand-enter-active {
  animation: expand-in 0.3s var(--ease-bounce);
}

.quick-log-expand-leave-active {
  animation: expand-out 0.2s ease-out forwards;
}

@keyframes expand-in {
  0% {
    opacity: 0;
    max-height: 0;
    transform: translateY(-10px);
  }
  100% {
    opacity: 1;
    max-height: 200px;
    transform: translateY(0);
  }
}

@keyframes expand-out {
  0% {
    opacity: 1;
    max-height: 200px;
  }
  100% {
    opacity: 0;
    max-height: 0;
  }
}

.fade-slide-enter-active {
  animation: fade-slide-in 0.25s ease-out;
}

.fade-slide-leave-active {
  animation: fade-slide-out 0.2s ease-out forwards;
}

@keyframes fade-slide-in {
  0% {
    opacity: 0;
    transform: translateY(-8px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fade-slide-out {
  0% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

.success-pop-enter-active {
  animation: pop-in 0.3s var(--ease-bounce);
}

.success-pop-leave-active {
  animation: pop-out 0.2s ease-out forwards;
}

@keyframes pop-in {
  0% {
    opacity: 0;
    transform: scale(0.8);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes pop-out {
  0% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .quick-log-card,
  .quick-log-icon,
  .category-chip,
  .quick-log-submit {
    transition: none;
  }

  .success-check {
    animation: none;
  }
}
</style>
