import { describe, expect, it } from "vitest";
import { ref } from "vue";
import { useTransferTimeline } from "~/composables/useTransferTimeline";

const samplePlayer = ref({
  active: 1,
  transfers: [
    {
      season: "21/22",
      transfer_date: "2022-07-01",
      fee: "17000000",
      from_club: "Juventus",
      to_club: "Man Utd",
    },
    {
      season: "22/23",
      transfer_date: "2023-07-01",
      fee: null,
      from_club: "Man Utd",
      to_club: null, // becomes Free agent
    },
    {
      season: "22/23",
      transfer_date: "2023-12-01",
      fee: "-",
      from_club: null,
      to_club: "Al-Nassr",
    },
  ],
} as any);

const retiredPlayer = ref({
  active: 0,
  transfers: [
    {
      season: "23/24",
      transfer_date: "2024-07-05",
      fee: null,
      from_club: "Real Madrid",
      to_club: null, // becomes Retired on latest
    },
  ],
} as any);

describe("useTransferTimeline", () => {
  it("maps transfers and handles free agent/unknown club labels", () => {
    const { careerTimeline } = useTransferTimeline(samplePlayer);
    const items = careerTimeline.value;

    expect(items).toHaveLength(3);
    expect(items[1]?.to).toBe("Free agent"); // unknown mid-career -> Free agent
    expect(items[0]?.from).toBe("Unknown club"); // first item had no from_club
    expect(items[2]?.from).toBe("Juventus");
    expect(items[0]?.description).toBe("free transfer");
    expect(items[2]?.description).toMatch(/17[.,]000[.,]000/); // formatted fee on earliest move (locale-aware)
  });

  it("marks last transfer as retired when player is inactive", () => {
    const { careerTimeline } = useTransferTimeline(retiredPlayer);
    const [last] = careerTimeline.value;
    expect(last?.to).toBe("Retired");
    expect(last?.description).toBe(""); // hides description on retired
  });
});
