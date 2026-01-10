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

    const ordered = [...player.value.transfers].sort((a: any, b: any) => {
      const toTime = (transfer: any) => {
        if (transfer.transfer_date) {
          const parsed = new Date(transfer.transfer_date).getTime();
          return Number.isNaN(parsed) ? 0 : parsed;
        }
        if (transfer.season) {
          const yearPart = String(transfer.season ?? "").split("/")[0] || "";
          const yearNum = Number.parseInt(yearPart, 10);
          if (Number.isFinite(yearNum)) {
            const year = yearNum < 100 ? 2000 + yearNum : yearNum;
            return new Date(`${year}-07-01`).getTime();
          }
        }
        return 0;
      };

      return toTime(b) - toTime(a);
    });

    return ordered.map((transfer: any, index: number, arr: any[]) => {
      const isLatest = index === 0;
      const isToUnknown =
        !transfer.to_club || transfer.to_club === "Unknown club";
      const toLabel =
        isRetired && isLatest
          ? "Retired"
          : isToUnknown
            ? "Free agent"
            : transfer.to_club;

      const nextTransfer = arr[index + 1];
      const nextToLabel = nextTransfer
        ? !nextTransfer.to_club || nextTransfer.to_club === "Unknown club"
          ? "Free agent"
          : nextTransfer.to_club
        : null;
      const fromIsUnknown =
        transfer.from_club === null || transfer.from_club === "Unknown club";
      const fromLabel =
        nextToLabel === "Free agent" && fromIsUnknown
          ? "Free agent"
          : transfer.from_club || "Unknown club";

      // Show loan type if it's a loan, otherwise show fee
      const loanType = formatLoanType(transfer.transfer_type);
      const baseDescription =
        loanType ?? formatFee(transfer.fee) ?? "Undisclosed";
      const hideDescription =
        toLabel === "Free agent" ||
        fromLabel === "Free agent" ||
        (isRetired && isLatest);
      const description = hideDescription ? "" : baseDescription;

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

function formatFee(fee?: string | number | null) {
  if (!fee || fee === "-" || fee === 0) return "Free transfer";
  if (fee === "?") return "Unknown fee";
  const numeric = Number(fee);
  if (Number.isNaN(numeric) || numeric === 0) return "Free transfer";
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 0,
  }).format(numeric);
}

function formatLoanType(type?: string | null): string | null {
  if (!type) return null;
  switch (type) {
    case "ACTIVE_LOAN_TRANSFER":
      return "Loan";
    case "RETURNED_FROM_PREVIOUS_LOAN":
      return "End of loan";
    default:
      return null;
  }
}
