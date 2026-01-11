<template>
  <UModal
    v-model:open="isOpen"
    title="Choose Difficulty"
    description="Select your challenge level before starting"
  >
    <slot>
      <!-- Default slot for trigger button - can be overridden -->
      <UButton
        icon="i-lucide-play"
        color="primary"
        size="xl"
        class="cursor-pointer"
      >
        Play Game
      </UButton>
    </slot>

    <template #body>
      <div class="space-y-4">
        <p class="text-sm text-slate-400">
          Higher difficulty = higher score multiplier. "Default" picks a random
          difficulty from Easy, Medium, or Hard.
        </p>

        <URadioGroup
          v-model="selectedDifficulty"
          :items="difficultyOptions"
          class="space-y-2"
        >
          <template #label="{ item }">
            <div class="flex w-full items-center justify-between">
              <div class="flex items-center gap-2">
                <UBadge
                  :color="getBadgeColor(item.value as UserSelectedDifficulty)"
                  variant="soft"
                  size="sm"
                >
                  {{ item.label }}
                </UBadge>
                <span
                  v-if="item.value === 'default'"
                  class="text-xs text-slate-500"
                >
                  (Random: Easy/Med/Hard)
                </span>
              </div>
              <span class="text-xs text-slate-400">
                {{ getMultiplierText(item.value as UserSelectedDifficulty) }}
              </span>
            </div>
          </template>
        </URadioGroup>
      </div>
    </template>

    <template #footer="{ close }">
      <div class="flex justify-end gap-2">
        <UButton
          variant="ghost"
          color="neutral"
          class="cursor-pointer"
          @click="close"
        >
          Cancel
        </UButton>
        <UButton
          color="primary"
          class="cursor-pointer"
          icon="i-lucide-play"
          @click="handleConfirm(close)"
        >
          Start Game
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import type { UserSelectedDifficulty } from "~/types/player";
import { MAX_POINTS_BY_TIER } from "~/utils/scoring-constants";

const props = withDefaults(
  defineProps<{
    modelValue?: UserSelectedDifficulty;
  }>(),
  {
    modelValue: "default",
  },
);

const emit = defineEmits<{
  (e: "update:modelValue", value: UserSelectedDifficulty): void;
  (e: "confirm", difficulty: UserSelectedDifficulty): void;
}>();

const isOpen = ref(false);
const selectedDifficulty = ref<UserSelectedDifficulty>(props.modelValue);

// Sync with prop changes
watch(
  () => props.modelValue,
  (newVal) => {
    selectedDifficulty.value = newVal;
  },
);

// Emit changes
watch(selectedDifficulty, (newVal) => {
  emit("update:modelValue", newVal);
});

const difficultyOptions = [
  { value: "default", label: "Default" },
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
  { value: "ultra", label: "Ultra" },
];

function getBadgeColor(
  difficulty: UserSelectedDifficulty,
): "primary" | "success" | "warning" | "error" {
  switch (difficulty) {
    case "default":
      return "primary";
    case "easy":
      return "success";
    case "medium":
      return "warning";
    case "hard":
      return "warning";
    case "ultra":
      return "error";
    default:
      return "primary";
  }
}

function getMultiplierText(difficulty: UserSelectedDifficulty): string {
  switch (difficulty) {
    case "default":
      return "1×–3× (random)";
    case "easy":
      return `1× (${MAX_POINTS_BY_TIER.easy} pts max)`;
    case "medium":
      return `2× (${MAX_POINTS_BY_TIER.medium} pts max)`;
    case "hard":
      return `3× (${MAX_POINTS_BY_TIER.hard} pts max)`;
    case "ultra":
      return `4× (${MAX_POINTS_BY_TIER.ultra} pts max)`;
    default:
      return "";
  }
}

function handleConfirm(close: () => void) {
  emit("confirm", selectedDifficulty.value);
  close();
}

/**
 * Open the modal programmatically
 */
function open() {
  isOpen.value = true;
}

/**
 * Close the modal programmatically
 */
function close() {
  isOpen.value = false;
}

defineExpose({ open, close });
</script>
