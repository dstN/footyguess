import { computed, type Ref } from "vue";
import type { Player } from "~/types/player";

export interface TimelineItem {
  id: string;
  date: string;
  from: string;
  to: string;
  description?: string | null;
  icon: string;
}

export function useTransferTimeline(player: Ref<Player | null>) {
  const careerTimeline = computed<TimelineItem[]>(() => {
    if (!player.value?.transfers?.length) return [];
    const isRetired = player.value?.active === 0;

    const ordered = [...player.value.transfers].reverse();
    let prevWasFreeAgent = false;

    return ordered.map((transfer: any, index: number, arr: any[]) => {
      const isLatest = index === arr.length - 1;
      const isToUnknown = !transfer.to_club || transfer.to_club === "Unknown club";
      const toLabel =
        isRetired && isLatest
          ? "Retired"
          : isToUnknown
            ? "Free agent"
            : transfer.to_club;

      const fromLabel =
        prevWasFreeAgent &&
        (transfer.from_club === null || transfer.from_club === "Unknown club")
          ? "Free agent"
          : transfer.from_club || "Unknown club";

      const baseDescription =
        formatFee(transfer.fee) ?? transfer.transfer_type ?? "Undisclosed";
      const hideDescription =
        toLabel === "Free agent" ||
        fromLabel === "Free agent" ||
        (isRetired && isLatest);
      const description = hideDescription ? "" : baseDescription;

      prevWasFreeAgent = toLabel === "Free agent";

      return {
        id: `${transfer.transfer_date ?? transfer.season ?? Math.random()}`,
        value: index,
        date: transfer.season || "Unknown season",
        from: fromLabel,
        to: toLabel,
        description,
        icon: "i-lucide-football",
      };
    });
  });

  return { careerTimeline };
}

function formatFee(fee?: string | null) {
  if (!fee || fee === "-") return "free transfer";
  if (fee === "?") return "Unknown fee";
  const numeric = Number(fee);
  if (Number.isNaN(numeric)) return fee;
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 0,
  }).format(numeric);
}
