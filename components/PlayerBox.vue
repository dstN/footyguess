<template>
  <UContainer>
    <div v-if="player">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <!-- Spalte 1: Basisinfos + Gesamtstatistik -->
        <div>
          <UCard>
            <template #header>
              <h2 class="text-xl font-bold">{{ player.name }}</h2>
            </template>
            <div class="space-y-2">
              <p><strong>Geburtstag:</strong> {{ player.birthdate }}</p>
              <p><strong>Geburtsort:</strong> {{ player.birthplace }}</p>
              <p><strong>Größe:</strong> {{ player.height_cm }} cm</p>
              <p><strong>Starker Fuß:</strong> {{ player.foot }}</p>
              <p><strong>Rückennummer:</strong> {{ player.shirt_number }}</p>
              <p><strong>Hauptposition:</strong> {{ player.main_position }}</p>
              <p v-if="player.secondary_positions?.length">
                <strong>Nebenpositionen:</strong>
                {{ player.secondary_positions.join(", ") }}
              </p>
              <p>
                <strong>Nationalitäten:</strong>
                {{ player.nationalities.join(", ") }}
              </p>
              <p>
                <strong>Status:</strong>
                {{ player.active ? "Aktiv" : "Karriere beendet" }}
              </p>

              <!-- Gesamtstatistik -->
              <div
                v-if="player.total_stats"
                class="mt-4 border-t pt-4 space-y-1"
              >
                <h3 class="text-lg font-semibold">Gesamtstatistik</h3>
                <p>Spiele: {{ player.total_stats.appearances }}</p>
                <p>Tore: {{ player.total_stats.goals }}</p>
                <p>Assists: {{ player.total_stats.assists }}</p>
                <p>Eigentore: {{ player.total_stats.own_goals }}</p>
                <p>Einwechslungen: {{ player.total_stats.subbed_on }}</p>
                <p>Auswechslungen: {{ player.total_stats.subbed_off }}</p>
                <p>Gelbe Karten: {{ player.total_stats.yellow_cards }}</p>
                <p>
                  Gelb-Rote Karten: {{ player.total_stats.yellow_red_cards }}
                </p>
                <p>Rote Karten: {{ player.total_stats.red_cards }}</p>
                <p>Elfmetertore: {{ player.total_stats.penalties }}</p>
                <p>Spielminuten: {{ player.total_stats.minutes_played }}</p>
                <p>
                  Ø Minuten pro Spiel:
                  {{ player.total_stats.avg_minutes_per_match }}
                </p>
              </div>
            </div>
          </UCard>
        </div>

        <!-- Spalte 2: Transfers -->
        <div>
          <UCard>
            <template #header>
              <h3 class="text-lg font-semibold">Transfers</h3>
            </template>
            <ul class="space-y-2">
              <li
                v-for="(transfer, index) in player.transfers"
                :key="index"
              >
                {{ transfer.season }}:
                <img
                  :src="transfer.from_club_logo"
                  alt=""
                  width="16"
                  class="inline-block"
                  v-if="transfer.from_club_logo"
                />
                {{ transfer.from_club || "Unbekannt" }}
                →
                <img
                  :src="transfer.to_club_logo"
                  alt=""
                  width="16"
                  class="inline-block"
                  v-if="transfer.to_club_logo"
                />
                {{ transfer.to_club || "Unbekannt" }}
                <span v-if="transfer.fee"> ({{ transfer.fee }})</span>
              </li>
            </ul>
          </UCard>
        </div>

        <!-- Spalte 3: Wettbewerbsstatistiken -->
        <div>
          <UCard>
            <template #header>
              <h3 class="text-lg font-semibold">Wettbewerbsstatistiken</h3>
            </template>
            <ul class="space-y-2">
              <li
                v-for="(stat, index) in player.stats"
                :key="index"
              >
                <img
                  :src="stat.competition_logo"
                  alt=""
                  width="16"
                  class="inline-block"
                  v-if="stat.competition_logo"
                />
                {{ stat.competition }} – {{ stat.appearances }} Spiele,
                {{ stat.goals }} Tore
              </li>
            </ul>
          </UCard>
        </div>
      </div>
    </div>

    <div v-else>Lade Spieler...</div>
  </UContainer>
</template>

<script setup lang="ts">
const player = ref<any>(null);

onMounted(async () => {
  try {
    const res = await fetch("/api/getPlayer?name=Lionel%20Messi");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    player.value = await res.json();

    if (typeof player.value.secondary_positions === "string") {
      player.value.secondary_positions = JSON.parse(
        player.value.secondary_positions
      );
    }
    if (typeof player.value.nationalities === "string") {
      player.value.nationalities = JSON.parse(player.value.nationalities);
    }
    if (typeof player.value.total_stats === "string") {
      player.value.total_stats = JSON.parse(player.value.total_stats);
    }
  } catch (err) {
    console.error("Fehler beim Laden des Spielers:", err);
  }
});
</script>
