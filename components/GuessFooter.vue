<template>
  <Teleport to="body">
    <div
      class="fixed inset-x-0 bottom-0 z-[100] mx-auto flex w-full max-w-5xl justify-center pb-0"
      role="region"
      aria-label="Guess submission"
    >
      <div
        class="w-full rounded-t-3xl bg-white/5 p-6 text-slate-100 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-xs sm:p-8"
      >
        <UForm
          :schema="schema"
          :state="state"
          @submit="(e) => emit('submit', e)"
          class="flex w-full flex-row items-center gap-2"
          aria-label="Player guess form"
        >
          <UInputMenu
            ref="inputMenuRef"
            v-model="modelValue"
            v-model:search-term="searchTermModel"
            placeholder="Type or search the player's name"
            :items="suggestions"
            :color="isError ? 'error' : 'primary'"
            size="lg"
            class="min-w-[14rem] flex-1 bg-slate-900/20 text-white"
            :loading="isLoading"
            :highlight="true"
            :ignore-filter="true"
            :create-item="false"
            variant="none"
            trailing
            aria-label="Player name input with search suggestions"
            :aria-expanded="modelValue.length > 0"
            :aria-invalid="isError"
            :aria-describedby="isError ? 'error-message' : undefined"
            @update:search-term="(val) => emit('update:searchTerm', val)"
            @keydown.enter="handleEnter"
            :content="{
              position: 'popper',
              align: 'start',
              sideOffset: 38,
            }"
          >
            <template #trailing>
              <UButton
                v-if="hasGuess"
                icon="i-lucide-x"
                color="neutral"
                variant="ghost"
                size="xs"
                class="cursor-pointer sm:hidden"
                aria-label="Clear guess input"
                @click.stop="emit('clear')"
              />
            </template>
          </UInputMenu>
          <div class="flex flex-nowrap gap-2 sm:justify-end">
            <UButton
              type="submit"
              color="primary"
              variant="solid"
              size="lg"
              class="cursor-pointer"
              :loading="isLoading"
              :aria-busy="isLoading"
              aria-label="Submit your guess"
            >
              Check
            </UButton>
            <UButton
              variant="ghost"
              color="neutral"
              size="lg"
              class="hidden cursor-pointer sm:flex"
              :disabled="isLoading"
              aria-label="Clear guess input"
              @click="emit('clear')"
            >
              Clear
            </UButton>
          </div>
        </UForm>
        <div
          v-if="isError"
          id="error-message"
          class="sr-only"
          role="alert"
          aria-live="polite"
        >
          Invalid guess - please try again
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";
import type {
  GuessFormState,
  GuessFormOutput,
  GuessFormSchema,
} from "~/types/forms";

const props = defineProps<{
  schema: GuessFormSchema;
  state: GuessFormState;
  modelValue: string;
  searchTerm: string;
  suggestions: string[];
  isLoading: boolean;
  isError: boolean;
  hasGuess: boolean;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
  (e: "update:searchTerm", value: string): void;
  (e: "submit", event: FormSubmitEvent<GuessFormOutput>): void;
  (e: "enter", guess: string): void;
  (e: "clear"): void;
}>();

const modelValue = computed({
  get: () => props.modelValue,
  set: (val: string) => emit("update:modelValue", val),
});

const searchTermModel = computed({
  get: () => props.searchTerm,
  set: (val: string) => emit("update:searchTerm", val),
});

function handleEnter(event: KeyboardEvent) {
  // Prevent double submission if already loading
  if (props.isLoading) {
    event.preventDefault();
    return;
  }

  // If there's an active suggestion match, let the menu handle selection (don't prevent default)
  const isExactMatch = props.suggestions.some(
    (s) => s.toLowerCase() === props.modelValue.toLowerCase(),
  );

  if (isExactMatch) {
    // This is a selection from the dropdown, let it proceed naturally
    return;
  }

  // Otherwise, treat it as a guess submission
  event.preventDefault();
  emit("enter", props.modelValue);
}

const inputMenuRef = ref();

function focusInput() {
  // Use exposed inputRef from Nuxt UI component (HTMLInputElement or Ref<HTMLInputElement>)
  const input = inputMenuRef.value?.inputRef || inputMenuRef.value?.input;

  if (input?.focus) {
    input.focus({ preventScroll: true });
  } else if (input?.value?.focus) {
    // Handle if it's a ref wrapper (unwrapped ref in template vs script usage)
    input.value.focus({ preventScroll: true });
  }
}

defineExpose({
  focusInput,
});
</script>
