<template>
  <UCard
    v-if="visible"
    class="border-primary-900/40 border bg-slate-950/60"
  >
    <template #header>
      <p class="text-primary-200 text-xs tracking-[0.18em] uppercase">
        Dev only
      </p>
    </template>
    <div class="space-y-3">
      <p class="text-sm text-slate-300">
        Request a player by Transfermarkt URL.
      </p>
      <div class="flex flex-col gap-2 sm:flex-row">
        <UInput
          :model-value="url"
          placeholder="https://www.transfermarkt.com/..."
          size="lg"
          class="flex-1"
          @update:model-value="$emit('update:url', $event)"
        />
        <UButton
          color="primary"
          class="cursor-pointer"
          :loading="submitting"
          @click="$emit('submit')"
        >
          Submit URL
        </UButton>
      </div>
      <p
        v-if="status"
        class="text-sm text-slate-200"
      >
        Status: {{ status }}
        <span v-if="playerId"> (Player ID: {{ playerId }})</span>
      </p>
      <p
        v-if="error"
        class="text-sm text-red-400"
      >
        {{ error }}
      </p>
    </div>
  </UCard>
</template>

<script setup lang="ts">
defineProps<{
  visible: boolean;
  url: string;
  submitting: boolean;
  status: string | null;
  playerId: number | null;
  error: string | null;
}>();

defineEmits<{
  (e: "update:url", value: string): void;
  (e: "submit"): void;
}>();
</script>
