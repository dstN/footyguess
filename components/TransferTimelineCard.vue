<template>
  <UCard
    class="border-primary-900/50 relative overflow-hidden border bg-slate-950/60"
  >
    <template #header>
      <div class="flex items-center justify-between gap-3 pb-6">
        <div>
          <p class="text-primary-200/80 text-xs tracking-[0.26em] uppercase">
            Club timeline
          </p>
          <p class="text-lg font-semibold text-white">Career history</p>
        </div>
        <UBadge
          v-if="showBadge"
          color="primary"
          variant="soft"
          class="bg-primary-500/10 text-primary-100 text-xs"
        >
          Transfers: {{ items.length }}
        </UBadge>
      </div>
    </template>

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

      <div
        v-else-if="items.length"
        class="border-primary-700/40 relative space-y-5 border-l pl-4"
      >
        <div
          v-for="item in items"
          :key="item.id"
          class="border-primary-900/40 relative rounded-xl border bg-white/5 px-4 py-3 shadow-sm backdrop-blur-sm"
        >
          <span
            class="bg-primary-400 absolute top-4 -left-2 block h-3 w-3 rounded-full shadow-[0_0_12px_rgba(52,211,153,0.6)]"
          />
          <p class="text-primary-200 text-xs tracking-[0.14em] uppercase">
            {{ item.date }}
          </p>
          <div class="flex items-center gap-3 text-sm text-slate-200">
            <span class="font-semibold text-white">{{ item.from }}</span>
            <UIcon
              name="i-lucide-arrow-right"
              class="text-primary-200"
            />
            <span class="font-semibold text-white">{{ item.to }}</span>
          </div>
          <p class="min-h-[1.25rem] text-sm text-slate-300">
            {{ item.description }}
          </p>
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
  </UCard>
</template>

<script setup lang="ts">
interface TimelineItem {
  id: string;
  date: string;
  from: string;
  to: string;
  description?: string | null;
}

defineProps<{
  items: TimelineItem[];
  isLoading: boolean;
  showBadge?: boolean;
}>();
</script>
