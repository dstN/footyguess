export default defineAppConfig({
  ui: {
    colors: {
      primary: "mint",
      secondary: "mew",
    },
    card: {
      slots: {
        root: "w-full rounded-3xl border border-primary-900/50 bg-white/5 text-slate-100 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-sm",
        body: "p-4 sm:p-6",
        header: "p-4 sm:p-6",
        footer: "p-4 sm:p-6",
      },
    },
    inputMenu: {
      slots: {
        content:
          "max-h-72 w-[var(--reka-combobox-trigger-width)] max-w-[calc(100vw-2rem)] min-w-[12rem] rounded-2xl border border-primary-800/60 bg-white/5 text-slate-50 shadow-[0_24px_70px_rgba(0,0,0,0.5)] ring-1 ring-primary-900/60 backdrop-blur-sm data-[state=open]:animate-[scale-in_120ms_ease-out] data-[state=closed]:animate-[scale-out_100ms_ease-in] origin-[var(--reka-combobox-content-transform-origin)] pointer-events-auto overflow-hidden",
        item: "group relative w-full flex items-start gap-2 p-3 text-sm text-slate-200 select-none outline-none transition before:absolute before:inset-1 before:rounded-lg before:bg-primary-500/0 before:blur-[6px] before:transition data-highlighted:text-white data-highlighted:before:bg-primary-500/20 data-highlighted:bg-primary-500/5",
        itemLabel: "truncate font-semibold",
        itemDescription: "truncate text-xs text-slate-400",
        group: "isolate p-0",
      },
    },
    toast: {
      slots: {
        root: "backdrop-blur-xs bg-white/5 border border-primary-900/40 text-slate-100 shadow-[0_20px_60px_rgba(0,0,0,0.45)] rounded-2xl",
        icon: "text-primary-200",
        title: "font-semibold",
        description: "text-sm text-slate-200/80",
        actions: "gap-2",
      },
    },
    modal: {
      variants: {
        fullscreen: {
          false: {
            content:
              "w-[calc(100vw-2rem)] max-w-lg rounded-3xl bg-white/5 text-slate-100 shadow-[0_20px_80px_rgba(0,0,0,0.45)] ring ring-default backdrop-blur-xs z-[102]",
          },
        },
        overlay: {
          true: {
            overlay: "bg-black/55 backdrop-blur-sm z-[101]",
          },
        },
      },
    },
    tooltip: {
      slots: {
        content:
          "flex items-center gap-1 rounded-lg bg-white/5 text-slate-100 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-xs text-highlighted ring ring-default h-6 px-2.5 py-1 text-xs select-none data-[state=delayed-open]:animate-[scale-in_100ms_ease-out] data-[state=closed]:animate-[scale-out_100ms_ease-in] origin-(--reka-tooltip-content-transform-origin) pointer-events-auto",
      },
    },
    popover: {
      slots: {
        content:
          "rounded-2xl border border-primary-900/50 bg-slate-950/80 text-slate-100 shadow-[0_20px_80px_rgba(0,0,0,0.45)] ring ring-primary-900/40 backdrop-blur-md data-[state=open]:animate-[scale-in_100ms_ease-out] data-[state=closed]:animate-[scale-out_100ms_ease-in] origin-(--reka-popover-content-transform-origin) focus:outline-none pointer-events-auto",
        arrow: "fill-slate-950/80",
      },
    },
  },
});
