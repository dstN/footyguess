<template>
  <div
    class="flex min-h-screen items-center justify-center bg-size-[100vw_100vh] bg-top-left"
    id="aurora"
  >
    <div
      class="relative z-0 flex w-full max-w-xl items-center justify-center overflow-hidden rounded-3xl text-center shadow-lg"
      :class="['glass', { 'animate-shake': shouldShake }]"
      @animationend="shouldShake = false"
    >
      <div
        id="border"
        class="absolute z-2 rounded-3xl p-[2px] content-['']"
      ></div>
      <div
        class="from-darkpurple/5 to-mint/5 relative -z-1 flex min-h-[65vh] w-full flex-col rounded-3xl bg-gradient-to-br via-white/5 p-10 backdrop-blur-xl"
      >
        <div class="relative z-10 flex flex-1">
          <slot @shake="triggerShake" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const shouldShake = ref(false);
function triggerShake() {
  shouldShake.value = true;
}

provide("triggerShake", triggerShake);
</script>

<style scoped>
html.dark #aurora {
  background-image: url("/img/aurora.webp");
}
html:not(.dark) #aurora {
  background-image: url("/img/aurora_light.webp");
}
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
