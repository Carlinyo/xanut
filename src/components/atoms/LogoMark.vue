<script setup lang="ts">
import { useId } from 'vue'
// Эмблема «Մանղալ»: стальной мангал на ножках, угли светятся в прорезях,
// над ним шампур с мясом и овощами и живое пламя.
const u = useId()
const id = (n: string) => `${u}-${n}`
const url = (n: string) => `url(#${u}-${n})`
</script>

<template>
  <svg viewBox="0 0 64 64" class="mark" aria-hidden="true">
    <defs>
      <radialGradient :id="id('glow')" cx=".5" cy=".62" r=".5">
        <stop offset="0" stop-color="#ff8a1e" stop-opacity=".75" /><stop offset=".6" stop-color="#ff5a1a" stop-opacity=".18" /><stop offset="1" stop-color="#ff5a1a" stop-opacity="0" />
      </radialGradient>
      <linearGradient :id="id('flame')" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0" stop-color="#d9261a" /><stop offset=".4" stop-color="#ff7a1a" /><stop offset=".8" stop-color="#ffc23a" /><stop offset="1" stop-color="#ffe58a" />
      </linearGradient>
      <linearGradient :id="id('core')" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ffb02e" /><stop offset="1" stop-color="#fff7d1" /></linearGradient>
      <linearGradient :id="id('steel')" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#f2f5f6" /><stop offset=".45" stop-color="#a9b4b9" /><stop offset="1" stop-color="#5e6a70" />
      </linearGradient>
      <linearGradient :id="id('body')" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#7d8a90" /><stop offset=".18" stop-color="#4a555a" /><stop offset="1" stop-color="#1f2629" />
      </linearGradient>
      <linearGradient :id="id('meat')" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c47a3a" /><stop offset="1" stop-color="#6b3010" /></linearGradient>
      <linearGradient :id="id('ember')" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe08a" /><stop offset="1" stop-color="#ff5a1a" /></linearGradient>
    </defs>

    <ellipse class="mark__glow" cx="32" cy="34" rx="28" ry="24" :fill="url('glow')" />

    <!-- пламя -->
    <g class="mark__fire">
      <path class="mark__tongue mark__tongue--l" d="M19 14c1.6 5 6.4 8 6 14-.3 4-3 6.6-6 6.6s-5.6-2.6-5.6-6c0-4.6 3.6-8 5.6-14.6z" :fill="url('flame')" />
      <path class="mark__tongue mark__tongue--r" d="M45 14c-1.6 5-6.4 8-6 14 .3 4 3 6.6 6 6.6s5.6-2.6 5.6-6c0-4.6-3.6-8-5.6-14.6z" :fill="url('flame')" />
      <path class="mark__tongue" d="M32 3.5c1.8 8 11 11.6 11 21.6 0 6.6-4.8 10.9-11 10.9S21 31.7 21 26.2c0-5 3-8 5-11 0 3.6 2.2 5.2 4.6 5.6C29 15 29.6 9 32 3.5z" :fill="url('flame')" />
      <path class="mark__core" d="M32 19.5c1.5 3.8 5.8 5.4 5.8 10.2 0 3.5-2.6 6-5.8 6s-5.8-2.5-5.8-6c0-4.4 3.8-6.6 5.8-10.2z" :fill="url('core')" />
    </g>

    <!-- шампур: кольцо-ручка, мясо, помидор, перец -->
    <g stroke-linecap="round">
      <path d="M6.5 33.5 H59" :stroke="url('steel')" stroke-width="1.8" />
      <circle cx="4.2" cy="33.5" r="2.5" fill="none" :stroke="url('steel')" stroke-width="1.3" />
    </g>
    <g>
      <rect x="13" y="28.6" width="9.4" height="9.8" rx="3.4" :fill="url('meat')" />
      <rect x="23.6" y="29.8" width="5" height="7.4" rx="2.5" fill="#d8352b" />
      <rect x="29.8" y="28.2" width="10.4" height="10.6" rx="3.6" :fill="url('meat')" />
      <rect x="41.4" y="29.8" width="5" height="7.4" rx="2.5" fill="#4f9a34" />
      <rect x="47.6" y="28.6" width="8.6" height="9.8" rx="3.2" :fill="url('meat')" />
      <!-- следы решётки и блики -->
      <path d="M15 31.2h5.4M15 35.2h5.4M32 30.8h6M32 35h6M49.4 31.2h5M49.4 35.2h5" stroke="#3a1606" stroke-width="1" stroke-linecap="round" opacity=".75" />
      <path d="M14.6 29.8h3M31.4 29.4h3.4M49 29.8h2.8" stroke="#ffd9a8" stroke-width=".9" stroke-linecap="round" opacity=".65" />
    </g>

    <!-- мангал -->
    <rect x="7" y="40" width="50" height="3.4" rx="1.4" :fill="url('steel')" />
    <path d="M9.4 43.4 H54.6 L51.6 53.2 H12.4 Z" :fill="url('body')" />
    <path d="M10 43.9 H54" stroke="#fff" stroke-opacity=".28" stroke-width=".7" />
    <g class="mark__vents" :fill="url('ember')">
      <rect x="17" y="46.2" width="6" height="3.6" rx="1.2" />
      <rect x="29" y="46.2" width="6" height="3.6" rx="1.2" />
      <rect x="41" y="46.2" width="6" height="3.6" rx="1.2" />
    </g>
    <g :stroke="url('steel')" stroke-width="2.2" stroke-linecap="round">
      <path d="M16 53.2 L13.4 61" />
      <path d="M48 53.2 L50.6 61" />
    </g>
    <path d="M10.6 61 H16.2 M47.8 61 H53.4" stroke="#8f9ba1" stroke-width="1.6" stroke-linecap="round" />

    <!-- искры -->
    <g class="mark__sparks" fill="#ffd36a">
      <circle cx="24.5" cy="10" r=".9" /><circle cx="40.5" cy="8.5" r=".75" /><circle cx="36" cy="3.2" r=".6" />
    </g>
  </svg>
</template>

<style scoped>
.mark { display:block; overflow:visible; }
.mark__tongue, .mark__core { transform-box:fill-box; transform-origin:50% 100%; }
.mark__tongue { animation:flame 2.2s ease-in-out infinite; }
.mark__tongue--l { animation-duration:1.8s; animation-delay:-.6s; }
.mark__tongue--r { animation-duration:2s; animation-delay:-1.1s; }
.mark__core { animation:flame 1.4s ease-in-out infinite reverse; }
.mark__glow { animation:glow 2.6s ease-in-out infinite; }
.mark__vents { animation:vents 1.9s ease-in-out infinite; }
.mark__sparks circle { animation:spark 2.6s ease-out infinite; }
.mark__sparks circle:nth-child(2) { animation-delay:-.9s; }
.mark__sparks circle:nth-child(3) { animation-delay:-1.7s; }
@keyframes flame { 0%, 100% { transform:scale(1, 1) skewX(0); } 35% { transform:scale(1.05, 1.1) skewX(-3deg); } 70% { transform:scale(.96, 1.03) skewX(3deg); } }
@keyframes glow { 50% { opacity:.55; } }
@keyframes vents { 50% { opacity:.7; } }
@keyframes spark { 0% { transform:translateY(5px); opacity:0; } 30% { opacity:1; } 100% { transform:translateY(-7px); opacity:0; } }
@media (prefers-reduced-motion:reduce) { .mark * { animation:none !important; } }
</style>
