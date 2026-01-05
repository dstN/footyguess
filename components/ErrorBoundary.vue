<template>
  <div v-if="hasError" class="flex flex-col items-center justify-center min-h-screen bg-slate-950 p-4">
    <div class="max-w-md text-center space-y-4">
      <div class="text-6xl">⚠️</div>
      <h1 class="text-3xl font-bold text-red-500">Something went wrong</h1>
      <p class="text-lg text-slate-300">{{ errorMessage }}</p>
      
      <div class="flex gap-2 justify-center pt-4">
        <button 
          @click="reset"
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition"
        >
          Try again
        </button>
        <button 
          @click="goHome"
          class="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded font-medium transition"
        >
          Go home
        </button>
      </div>

      <details v-if="import.meta.dev" class="mt-6 text-left">
        <summary class="cursor-pointer text-sm text-slate-400 hover:text-slate-300">
          Error details (dev only)
        </summary>
        <pre class="mt-2 p-3 bg-slate-900 text-xs text-red-400 overflow-auto rounded border border-slate-800">{{ stack }}</pre>
      </details>
    </div>
  </div>
  <slot v-else />
</template>

<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue'
import { useRouter } from 'vue-router'
import { logError } from '~/server/utils/logger'

const hasError = ref(false)
const errorMessage = ref('An unexpected error occurred')
const stack = ref('')
const router = useRouter()

const reset = () => {
  hasError.value = false
  errorMessage.value = ''
  stack.value = ''
}

const goHome = () => {
  reset()
  router.push('/').catch(() => {
    // If navigation fails, reload page
    window.location.href = '/'
  })
}

onErrorCaptured((err: any) => {
  hasError.value = true
  
  // Extract message safely
  if (err instanceof Error) {
    errorMessage.value = err.message || 'An unexpected error occurred'
    stack.value = err.stack || ''
  } else if (typeof err === 'string') {
    errorMessage.value = err
  } else {
    errorMessage.value = String(err)
  }

  // Log to console and error tracking (if available)
  console.error('[ErrorBoundary]', err)
  
  // Prevent error from propagating further
  return false
})
</script>
