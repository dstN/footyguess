<template>
  <div class="space-y-4">
    <div
      v-if="isLoading"
      class="space-y-4"
    >
      <USkeleton
        v-for="n in 4"
        :key="n"
        class="h-16 rounded-xl bg-white/5"
      />
    </div>

    <div v-else-if="items.length">
      <!-- Mobile single column -->
      <div
        v-if="useTwoColumn"
        class="border-primary-700/40 relative space-y-5 border-l pl-4 sm:hidden"
      >
        <TransferItem
          v-for="entry in itemsWithIndex"
          :key="entry.item.id"
          :item="entry.item"
          :index="entry.index"
        />
      </div>

      <!-- Tablet/Desktop two column -->
      <div
        v-if="useTwoColumn"
        class="hidden gap-6 sm:grid sm:grid-cols-2"
      >
        <div class="border-primary-700/40 relative space-y-5 border-l pl-4">
          <TransferItem
            v-for="entry in leftItems"
            :key="entry.item.id"
            :item="entry.item"
            :index="entry.index"
          />
        </div>
        <div class="border-primary-700/40 relative space-y-5 border-l pl-4">
          <TransferItem
            v-for="entry in rightItems"
            :key="entry.item.id"
            :item="entry.item"
            :index="entry.index"
          />
        </div>
      </div>

      <!-- Single column layout -->
      <div
        v-else
        class="border-primary-700/40 relative space-y-5 border-l pl-4"
      >
        <TransferItem
          v-for="entry in itemsWithIndex"
          :key="entry.item.id"
          :item="entry.item"
          :index="entry.index"
        />
      </div>
    </div>

    <UEmpty
      v-else
      icon="i-lucide-compass"
      title="No timeline data"
      description="We couldn't find transfers for this player."
      class="bg-white/5"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import TransferItem from "~/components/TransferItem.vue";

interface TimelineItem {
  id: string;
  date: string;
  from: string;
  to: string;
  description?: string | null;
}

const props = defineProps<{
  items: TimelineItem[];
  isLoading: boolean;
}>();

/**
 * Add index to each item for styling
 */
const itemsWithIndex = computed(() =>
  props.items.map((item, index) => ({ item, index })),
);

/**
 * Use two-column layout for 6+ items
 */
const useTwoColumn = computed(() => props.items.length >= 6);

/**
 * Split point for two-column layout
 */
const splitIndex = computed(() => Math.ceil(itemsWithIndex.value.length / 2));

/**
 * Left column items
 */
const leftItems = computed(() =>
  itemsWithIndex.value.slice(0, splitIndex.value),
);

/**
 * Right column items
 */
const rightItems = computed(() => itemsWithIndex.value.slice(splitIndex.value));
</script>
