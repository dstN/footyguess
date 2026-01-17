<template>
  <Teleport to="body">
    <!-- SVG Filter Definition (Hidden) -->
    <svg style="display: none">
      <defs>
        <filter
          id="rgb-glitch"
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
        >
          <!-- 1. Vertical Hold / Roll Distortion -->
          <!-- We use turbulence stretched vertically to create "waves" not blocks -->
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.001 0.05"
            numOctaves="1"
            :seed="noiseSeed"
            result="vHoldNoise"
          />

          <!-- 2. Analogue Signal Noise (Grain) -->
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.8"
            numOctaves="3"
            seed="0"
            result="grain"
          />

          <!-- Merge distortions -->
          <feDisplacementMap
            in="SourceGraphic"
            in2="vHoldNoise"
            :scale="distortScale"
            xChannelSelector="R"
            yChannelSelector="G"
            result="distorted"
          />

          <!-- 3. RGB Separation + BLUR (CRT Phosphor decay) -->
          <!-- Red Channel (Ghosting left) -->
          <feOffset
            in="distorted"
            :dx="redX"
            :dy="redY"
            result="red_raw"
          />
          <feGaussianBlur
            in="red_raw"
            stdDeviation="1"
            result="red_blur"
          />

          <!-- Blue Channel (Ghosting right) -->
          <feOffset
            in="distorted"
            :dx="blueX"
            :dy="blueY"
            result="blue_raw"
          />
          <feGaussianBlur
            in="blue_raw"
            stdDeviation="1"
            result="blue_blur"
          />

          <!-- Green Channel (Base - slightly offset) -->
          <feOffset
            in="distorted"
            :dx="greenX"
            :dy="greenY"
            result="green_raw"
          />

          <!-- Color Matrix to isolate channels -->
          <feColorMatrix
            in="red_blur"
            type="matrix"
            values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.8 0"
            result="red"
          />
          <feColorMatrix
            in="green_raw"
            type="matrix"
            values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 0.9 0"
            result="green"
          />
          <feColorMatrix
            in="blue_blur"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 0.8 0"
            result="blue"
          />

          <!-- Recombine -->
          <feBlend
            in="red"
            in2="green"
            mode="screen"
            result="rg"
          />
          <feBlend
            in="rg"
            in2="blue"
            mode="screen"
            result="rgb"
          />

          <!-- Add Grain (Subtle overlay) on top if heavy distortion -->
          <feComposite
            in="grain"
            in2="rgb"
            operator="arithmetic"
            k1="0"
            k2="0.1"
            k3="0.9"
            k4="0"
            result="final"
          />
        </filter>
      </defs>
    </svg>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from "vue";
import { useInterference } from "~/composables/useInterference";

const { isActive } = useInterference();

// RGB Offsets
const redX = ref(0);
const redY = ref(0);
const blueX = ref(0);
const blueY = ref(0);
const greenX = ref(0);
const greenY = ref(0);

// Glitch Noise Params
const noiseSeed = ref(0);
const distortScale = ref(0);

let animFrame: number;
let startTime: number;
let lastUpdate = 0;
let frameDuration = 0; // How long to hold the current frame
let sequencePhase = 0; // 0: Start, 1: Attack, 2: Sustain/Still, 3: Release/Decay

// Helper to set random glitch state
function setAnalogueGlitch(intensity: number) {
  // Randomize seed for the "wave" distortion
  noiseSeed.value = Math.floor(Math.random() * 100);

  // High vertical displacement -> "Rolling" effect
  distortScale.value =
    (Math.random() > 0.5 ? 1 : -1) * (20 + Math.random() * 50);

  // RGB Split is consistent horizontal drift (not random 360)
  // Simulating misconvergence
  const drift = 5 + Math.random() * 10;
  redX.value = -drift;
  blueX.value = drift;

  // Vertical jitter (V-Hold stutter)
  const vJitter = (Math.random() - 0.5) * 10;
  redY.value = vJitter;
  blueY.value = vJitter;
  greenY.value = vJitter;
}

function animate(timestamp: number) {
  if (!startTime) startTime = timestamp;
  const elapsed = timestamp - startTime;

  // TV Signal Logic
  // Smooth Ramp Up (Attack) - fixes "abrupt start" lag perception
  let currentIntensity = 1;
  if (elapsed < 300) {
    // Ease in over 300ms
    currentIntensity = elapsed / 300;
  }

  if (elapsed < 1500) {
    if (timestamp - lastUpdate < frameDuration) {
      animFrame = requestAnimationFrame(animate);
      return;
    }
    lastUpdate = timestamp;

    // Slower, rolling updates
    frameDuration = 80 + Math.random() * 100;
    setAnalogueGlitch(currentIntensity);
  } else {
    // Recovery: V-Hold locking in
    // Run at full 60fps for smooth "analogue" recovery
    if (timestamp - lastUpdate < 16) {
      animFrame = requestAnimationFrame(animate);
      return;
    }
    lastUpdate = timestamp;

    const decay = 0.94;

    redX.value *= decay;
    blueX.value *= decay;

    // Vertical jitter settles faster (snap)
    redY.value *= 0.8;
    blueY.value *= 0.8;
    greenY.value *= 0.8;

    distortScale.value *= 0.9;

    // Cutoff - extended threshold to prevent "snap to zero" end lag
    if (Math.abs(distortScale.value) < 0.1 && Math.abs(redX.value) < 0.1) {
      distortScale.value = 0;
      redX.value = 0;
      blueX.value = 0;
      greenX.value = 0;
      redY.value = 0;
      blueY.value = 0;
      greenY.value = 0;
      // Don't stop loop immediately, let it idle one frame at 0
    }
  }

  if (isActive.value) {
    animFrame = requestAnimationFrame(animate);
  }
}

watch(
  isActive,
  (active) => {
    if (active) {
      document.body.classList.add("glitch-active");
      startTime = 0;
      animFrame = requestAnimationFrame(animate);
    } else {
      document.body.classList.remove("glitch-active");
      cancelAnimationFrame(animFrame);
      // Reset
      redX.value = 0;
      blueX.value = 0;
      greenX.value = 0;
      redY.value = 0;
      blueY.value = 0;
      greenY.value = 0;
      distortScale.value = 0;
    }
  },
  { immediate: true },
);

onUnmounted(() => {
  if (typeof document !== "undefined") {
    document.body.classList.remove("glitch-active");
  }
  cancelAnimationFrame(animFrame);
});
</script>

<style>
/* Global style applied when interference is active */
.glitch-active {
  filter: url(#rgb-glitch);
  overflow-x: hidden; /* Prevent scrollbars from displacement */
}
</style>
