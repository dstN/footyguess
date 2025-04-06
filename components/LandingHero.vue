<template>
  <div
    class="rounded-3xl max-w-lg w-full text-center relative flex items-center justify-center glass overflow-hidden z-0"
  >
    <div
      id="border"
      class="content-[''] absolute z-2 rounded-3xl p-[2px]"
    ></div>
    <div
      class="relative -z-1 rounded-3xl bg-white/1 min-h-[60vh] backdrop-blur-md w-full p-10"
    >
      <div class="relative z-10">
        <h1 class="text-white text-2xl font-bold">Footyguess</h1>
        <p class="text-mint text-lg font-medium">
          Guess the football player<br />
          based on their transfer history
        </p>

        <button
          class="mt-4 w-full rounded-xl bg-mint text-black font-bold text-lg py-3 hover:bg-[#00e6a0] transition"
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
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
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
