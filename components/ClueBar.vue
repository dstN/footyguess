<template>
  <div
    class="border-primary-900/60 flex flex-wrap items-center gap-2 rounded-2xl border bg-slate-900/60 px-3 py-3"
    role="region"
    aria-label="Clue information"
    data-testid="clues"
  >
    <p
      class="text-primary-200 text-xs tracking-[0.18em] uppercase"
      id="clue-section-label"
    >
      Clues
    </p>
    <TransitionGroup
      name="fade"
      tag="div"
      class="flex flex-wrap gap-2"
      role="list"
      aria-label="Revealed clues"
      aria-labelledby="clue-section-label"
    >
      <UBadge
        v-for="clue in revealedClues"
        :key="clue.key"
        color="primary"
        variant="soft"
        class="bg-primary-500/10 text-xs"
        role="listitem"
        :aria-label="`${clue.label}${clue.value ? ': ' + clue.value : ''}`"
        data-testid="clue-item"
      >
        {{ clue.label
        }}<span
          v-if="clue.value"
          aria-hidden="false"
          >: {{ clue.value }}</span
        >
      </UBadge>
    </TransitionGroup>
    <div
      class="flex flex-wrap gap-2"
      role="list"
      aria-label="Locked clues"
    >
      <UBadge
        v-for="clue in hiddenClueLabels"
        :key="clue"
        color="neutral"
        variant="soft"
        class="bg-slate-800/80 text-[11px] tracking-[0.12em] uppercase"
        role="listitem"
        :aria-label="`${clue} locked`"
      >
        {{ clue }} <span class="sr-only">locked</span>
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
