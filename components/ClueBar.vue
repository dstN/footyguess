<template>
  <div
    class="border-primary-900/60 flex flex-wrap items-center gap-2 rounded-2xl border bg-slate-900/60 px-3 py-3"
  >
    <p class="text-primary-200 text-xs tracking-[0.18em] uppercase">
      Clues
    </p>
    <TransitionGroup
      name="fade"
      tag="div"
      class="flex flex-wrap gap-2"
    >
      <UBadge
        v-for="clue in revealedClues"
        :key="clue.key"
        color="primary"
        variant="soft"
        class="bg-primary-500/10 text-xs"
      >
        {{ clue.label }}<span v-if="clue.value">: {{ clue.value }}</span>
      </UBadge>
    </TransitionGroup>
    <div class="flex flex-wrap gap-2">
      <UBadge
        v-for="clue in hiddenClueLabels"
        :key="clue"
        color="neutral"
        variant="soft"
        class="bg-slate-800/80 text-[11px] tracking-[0.12em] uppercase"
      >
        {{ clue }} locked
      </UBadge>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Clue {
  key: string;
  label: string;
  value?: string | null;
}

defineProps<{
  revealedClues: Clue[];
  hiddenClueLabels: string[];
}>();
</script>
