<template>
  <div
    class="relative rounded-xl border px-4 py-3 shadow-sm backdrop-blur-sm"
    :class="cardClass"
  >
    <span
      class="absolute top-4 -left-2 block h-3 w-3 rounded-full shadow-[0_0_12px_rgba(52,211,153,0.6)]"
      :class="dotClass"
    />
    <p
      class="text-xs tracking-[0.14em] uppercase"
      :class="metaClass"
    >
      {{ item.date }}
    </p>
    <div class="flex items-center gap-3 text-sm text-slate-200">
      <span class="font-semibold text-white">{{ item.from }}</span>
      <UIcon
        name="i-lucide-arrow-right"
        :class="arrowClass"
      />
      <span class="font-semibold text-white">{{ item.to }}</span>
    </div>
    <p class="min-h-[1.25rem] text-sm text-slate-300">
      {{ item.description }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

interface TimelineItem {
  id: string;
  date: string;
  from: string;
  to: string;
  description?: string | null;
}

const props = defineProps<{
  item: TimelineItem;
  index: number;
}>();

/**
 * Card styling based on alternating index
 */
const cardClass = computed(() =>
  props.index % 2 === 0
    ? "border-primary-900/40 bg-primary/10"
    : "border-secondary-900/40 bg-secondary/10",
);

/**
 * Dot color based on alternating index
 */
const dotClass = computed(() =>
  props.index % 2 === 0 ? "bg-primary-400" : "bg-secondary",
);

/**
 * Meta text color based on alternating index
 */
const metaClass = computed(() =>
  props.index % 2 === 0 ? "text-primary-200" : "text-secondary",
);

/**
 * Arrow icon color based on alternating index
 */
const arrowClass = computed(() =>
  props.index % 2 === 0 ? "text-primary-200" : "text-secondary",
);
</script>
