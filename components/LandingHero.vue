<template>
  <div
    class="glass relative z-0 flex w-full max-w-lg items-center justify-center overflow-hidden rounded-3xl text-center shadow-lg"
  >
    <div
      id="border"
      class="absolute z-2 rounded-3xl p-[2px] content-['']"
    ></div>
    <div
      class="from-darkpurple/5 to-mint/5 relative -z-1 flex min-h-[60vh] w-full flex-col rounded-3xl bg-gradient-to-br via-white/5 p-10 backdrop-blur-md"
    >
      <div class="relative z-10 flex flex-1 flex-col justify-between">
        <h1 class="text-2xl font-bold text-white">Footyguess</h1>
        <p class="text-mint text-lg font-medium">
          Guess the football player<br />
          based on their transfer history
        </p>

        <button
          class="bg-mint hover:bg-mint mt-4 w-full rounded-xl py-3 text-lg font-bold text-black transition"
        >
          Play
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
#border {
  inset: 0;
  mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}
#border:before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    315deg,
    rgba(14, 249, 174, 1) 0%,
    rgba(24, 42, 85, 0.5) 35%,
    rgba(24, 42, 85, 1) 50%,
    rgba(24, 42, 85, 0.5) 65%,
    rgba(14, 249, 174, 1) 100%
  );
  transform: scale(1.5);
  transform-origin: center;
  animation: animate 6s linear infinite;
}

.light #border:before {
  background: linear-gradient(
    315deg,
    rgba(27, 18, 55, 1) 0%,
    rgba(238, 232, 255, 0.5) 35%,
    rgba(14, 249, 174, 1) 50%,
    rgba(238, 232, 255, 0.5) 65%,
    rgba(27, 18, 55, 1) 100%
  );
  animation: animate 24s linear infinite;
}

@keyframes animate {
  0% {
    rotate: 0deg;
  }

  50% {
    rotate: 30deg;
  }

  100% {
    rotate: 0deg;
  }
}
</style>
