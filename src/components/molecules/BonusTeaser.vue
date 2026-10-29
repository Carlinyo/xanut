<script setup lang="ts">
// Полоса на главной: «2% возвращается баллами» → страница бонусов.
import { useBonus } from '../../stores/bonus'
import ProductArt from '../atoms/ProductArt.vue'
const bonus = useBonus()
</script>

<template>
  <RouterLink v-reveal="'zoom'" to="/bonus" class="teaser-b">
    <span class="teaser-b__gift" aria-hidden="true">🎁</span>
    <div class="teaser-b__txt">
      <h3>{{ $t('bonus.teaserTitle', { percent: bonus.percent }) }}</h3>
      <p>{{ $t('bonus.teaserText') }}</p>
    </div>
    <span class="teaser-b__arts" aria-hidden="true"><ProductArt kind="bread" /><ProductArt kind="grill" /><ProductArt kind="spice" /></span>
    <span class="teaser-b__cta">{{ $t('bonus.teaserCta') }} →</span>
  </RouterLink>
</template>

<style scoped>
.teaser-b { position:relative; display:flex; align-items:center; gap:clamp(12px, 2vw, 22px); padding:clamp(16px, 2.4vw, 24px) clamp(18px, 3vw, 30px); border-radius:var(--r-lg); color:#1b1500; overflow:hidden;
  background:radial-gradient(300px 160px at 12% 50%, rgb(255 255 255 / .55), transparent 70%), linear-gradient(100deg, var(--yellow-hi), var(--yellow) 55%, #e9a300); box-shadow:0 18px 34px -24px rgb(120 80 0 / .8); transition:transform var(--t) var(--ease), box-shadow var(--t); }
.teaser-b__gift { flex:none; display:grid; place-items:center; width:58px; height:58px; border-radius:50%; background:#fff; font-size:30px; box-shadow:0 8px 18px -10px rgb(0 0 0 / .4); animation:float 6s ease-in-out infinite; }
.teaser-b__txt { flex:1; min-width:0; position:relative; z-index:1; }
h3 { margin:0 0 4px; font-size:clamp(18px, 2.2vw, 24px); }
p { margin:0; font-size:14px; color:#4a3700; }
.teaser-b__cta { flex:none; position:relative; z-index:1; padding:9px 18px; border-radius:var(--pill); background:var(--dark); color:#fff; font-size:14px; font-weight:700; transition:padding .3s var(--ease); }
.teaser-b__arts { flex:none; display:flex; pointer-events:none; }
.teaser-b__arts > * { width:64px; height:64px; margin-left:-14px; filter:drop-shadow(0 8px 10px rgb(90 60 0 / .35)); }
.teaser-b__arts > :nth-child(2) { transform:translateY(-6px) rotate(-6deg); }
@media (hover:hover) { .teaser-b:hover { transform:translateY(-3px); box-shadow:0 24px 40px -24px rgb(120 80 0 / .9); } .teaser-b:hover .teaser-b__cta { padding-inline:24px; } }
@media (max-width:1000px) { .teaser-b__arts { display:none; } }
@media (max-width:760px) { .teaser-b { flex-wrap:wrap; } .teaser-b__cta { margin-left:72px; } }
@media (max-width:420px) { .teaser-b__gift { width:46px; height:46px; font-size:24px; } .teaser-b__cta { margin-left:0; } }
</style>
