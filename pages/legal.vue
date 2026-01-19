<template>
  <div class="w-full space-y-8">
    <!-- Header -->
    <div class="text-center">
      <div
        class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-500/10 ring-1 ring-slate-500/50"
      >
        <UIcon
          name="i-lucide-scale"
          class="h-8 w-8 text-slate-400"
        />
      </div>
      <h1 class="mt-4 text-3xl font-bold tracking-tight text-white">
        Legal Information
      </h1>
      <p class="text-primary-200/60 mt-2">Imprint & Privacy Policy</p>
    </div>

    <!-- 3-Column Layout: Imprint (1/3) | Privacy (2/3 with 2 inner columns) -->
    <div class="grid gap-6 lg:grid-cols-3">
      <!-- Column 1: Imprint (1/3) -->
      <div class="lg:col-span-1">
        <section class="space-y-4">
          <h2 class="flex items-center gap-2 text-xl font-semibold text-white">
            <UIcon
              name="i-lucide-user"
              class="h-5 w-5 text-slate-400"
            />
            Imprint
          </h2>
          <div
            class="h-full rounded-xl border border-slate-700/50 bg-slate-900/50 p-4 text-sm text-slate-300"
          >
            <p class="font-medium text-white">
              Information according to § 5 DDG:
            </p>
            <div class="mt-3 space-y-3">
              <p>
                <strong>Responsible:</strong><br />
                Dustin Tramm<br />
                Impressums-Service Impressum4u<br />
                c/o LEADERLY UG (haftungsbeschränkt)<br />
                Amtstraße 22<br />
                44575 Castrop-Rauxel<br />
                Deutschland
              </p>
              <p>
                <strong>Contact:</strong><br />
                Email:
                <a
                  role="link"
                  tabindex="0"
                  aria-label="Send email to abuse at yinside.de"
                  class="text-primary-400 cursor-pointer hover:underline"
                  @click="handleEmailClick"
                  @keydown.enter="handleEmailClick"
                >
                  {{ obfuscatedEmail }}
                </a>
              </p>
            </div>
          </div>
        </section>
      </div>

      <!-- Column 2+3: Privacy Policy (2/3) -->
      <div class="lg:col-span-2">
        <section class="space-y-4">
          <h2 class="flex items-center gap-2 text-xl font-semibold text-white">
            <UIcon
              name="i-lucide-shield"
              class="h-5 w-5 text-slate-400"
            />
            Privacy Policy
          </h2>
          <div
            class="rounded-xl border border-slate-700/50 bg-slate-900/50 p-4 text-sm text-slate-300"
          >
            <!-- Inner 2-column grid for Privacy Policy -->
            <div class="grid gap-6 md:grid-cols-2">
              <!-- Left column -->
              <div class="space-y-4">
                <div>
                  <p class="font-medium text-white">1. Data Controller</p>
                  <p class="mt-2">
                    Dustin Tramm<br />
                    c/o LEADERLY UG (haftungsbeschränkt)<br />
                    Amtstraße 22<br />
                    44575 Castrop-Rauxel
                  </p>
                </div>

                <!-- 2. Hosting -->
                <div>
                  <p class="font-medium text-white">
                    2. Hosting and Server Log Files
                  </p>
                  <p class="mt-2">
                    My hosting provider (Netcup) automatically collects
                    information in server log files (IP address, browser type,
                    time). This is technically necessary to display the site
                    securely.
                  </p>
                  <p class="mt-2">
                    I have configured daily log rotation. IP addresses are
                    automatically deleted after 24 hours at the latest.
                  </p>
                </div>

                <!-- 3. LocalStorage -->
                <div>
                  <p class="font-medium text-white">
                    3. Data Collection (LocalStorage)
                  </p>
                  <p class="mt-2">
                    This website uses your browser's local storage
                    (LocalStorage) to save game progress. This data stays on
                    your device:
                  </p>
                  <ul class="mt-2 list-inside list-disc space-y-1 pl-2">
                    <li>
                      Session ID (<code class="text-primary-400"
                        >footyguess_session_id</code
                      >)
                    </li>
                    <li>Game progress (streak, difficulty)</li>
                    <li>Optional nickname for the leaderboard</li>
                  </ul>
                </div>
              </div>

              <!-- Right column -->
              <div class="space-y-4">
                <!-- 4. Database -->
                <div>
                  <p class="font-medium text-white">
                    4. Database (Leaderboard)
                  </p>
                  <p class="mt-2">
                    When you submit a score, the chosen nickname, score, and
                    random session ID are stored in my database. This data is
                    used solely for displaying the leaderboard.
                  </p>
                </div>

                <!-- 5. Deletion -->
                <div>
                  <p class="font-medium text-white">
                    5. Right to Erasure (Self-Service)
                  </p>
                  <p class="mt-2">
                    You have the right to delete your data. I provide an
                    automated solution: At
                    <NuxtLink
                      to="/delete"
                      class="text-primary-400 hover:underline"
                    >
                      footyguess.yinside.de/delete
                    </NuxtLink>
                    you can permanently remove your entry from the database at
                    any time.
                  </p>
                </div>

                <!-- 6. External Links -->
                <div>
                  <p class="font-medium text-white">
                    6. External Links & Donations
                  </p>
                  <p class="mt-2">
                    This website links to external sites (e.g., Transfermarkt,
                    Ko-fi). Their respective operators are responsible for their
                    privacy practices.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>

    <!-- Back button -->
    <div class="flex justify-center pt-4">
      <UButton
        variant="ghost"
        to="/"
        color="neutral"
        size="md"
      >
        Back to Home
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "thin-extended",
});

useSeoMeta({
  title: "Legal - FootyGuess",
  description:
    "Imprint and Privacy Policy for FootyGuess - the football guessing game.",
});

// Email obfuscation to prevent spam bots
// The email is assembled at runtime, not visible in HTML source
const emailParts = ["abuse", "yinside", "de"];
const obfuscatedEmail = computed(
  () => `${emailParts[0]}@${emailParts[1]}.${emailParts[2]}`,
);

function handleEmailClick() {
  if (import.meta.client) {
    window.location.href = `mailto:${emailParts[0]}@${emailParts[1]}.${emailParts[2]}`;
  }
}
</script>
