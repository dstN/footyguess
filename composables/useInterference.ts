export const useInterference = () => {
  const isActive = useState<boolean>("interference_active", () => false);
  const intensity = useState<"low" | "medium" | "high">(
    "interference_intensity",
    () => "medium",
  );

  let timeout: NodeJS.Timeout | null = null;

  function trigger(
    duration = 600,
    level: "low" | "medium" | "high" = "medium",
  ) {
    intensity.value = level;
    isActive.value = true;

    if (timeout) clearTimeout(timeout);

    timeout = setTimeout(() => {
      isActive.value = false;
    }, duration);
  }

  return {
    isActive,
    intensity,
    trigger,
  };
};
