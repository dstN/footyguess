import { ref, onUnmounted } from "vue";

/**
 * Lightweight search composable with debounced remote suggestions.
 */
export function usePlayerSearch() {
  const searchTerm = ref("");
  const suggestions = ref<string[]>([]);
  const searchTimeout = ref<ReturnType<typeof setTimeout> | null>(null);

  function scheduleSearch(term: string) {
    if (searchTimeout.value) clearTimeout(searchTimeout.value);
    searchTimeout.value = setTimeout(() => performSearch(term), 200);
  }

  async function performSearch(term: string) {
    const query = term.trim();
    if (query.length < 2) {
      suggestions.value = [];
      return;
    }

    try {
      suggestions.value = await $fetch<string[]>(
        `/api/searchPlayers?q=${encodeURIComponent(query)}&limit=10`,
      );
    } catch (error) {
      if (import.meta.dev) console.error("Search failed", error);
    }
  }

  function onSearch(term: string) {
    searchTerm.value = term;
    scheduleSearch(term);
  }

  function clearSearch() {
    searchTerm.value = "";
    suggestions.value = [];
    if (searchTimeout.value) clearTimeout(searchTimeout.value);
  }

  // Clean up timeout on component unmount
  onUnmounted(() => {
    clearSearch();
  });

  return {
    searchTerm,
    suggestions,
    onSearch,
    clearSearch,
  };
}
