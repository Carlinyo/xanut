<script setup lang="ts">
// «Вы стали постоянным клиентом / VIP до конца месяца» — на любой странице, пока покупатель не закроет сообщение
// (или не перейдёт к подробностям). Сервер запоминает, что сообщение закрыто, и присылает то же письмом.
import { computed } from 'vue'
import { useBonus } from '../../stores/bonus'
import { lastDayText, SEGMENT_ICON } from '../../utils/segments'

const bonus = useBonus()
const notice = computed(() => {
  const l = bonus.level
  return l?.notice && l.month ? { segment: l.notice.segment, day: lastDayText(l.month.until) } : null
})
</script>

<template>
  <Transition name="lvn">
    <div v-if="notice" class="lvn" :class="`is-${notice.segment}`" role="status">
      <div class="wrap lvn__in">
        <span class="lvn__icon" aria-hidden="true">{{ SEGMENT_ICON[notice.segment] }}</span>
        <p class="lvn__txt">{{ $t('segments.notice', { name: $t('segments.names.' + notice.segment), day: notice.day }) }}</p>
        <RouterLink to="/bonus" class="lvn__more" @click="bonus.dismissNotice()">{{ $t('segments.noticeMore') }} →</RouterLink>
        <button type="button" class="lvn__x" :aria-label="$t('segments.noticeClose')" @click="bonus.dismissNotice()">✕</button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.lvn { color:#fff; background:radial-gradient(320px 120px at 12% 50%, rgb(246 178 26 / .35), transparent 70%), var(--dark); border-bottom:2px solid var(--yellow); }
.lvn__in { display:flex; align-items:center; gap:10px 14px; padding-block:10px; }
.lvn__icon { flex:none; font-size:22px; line-height:1; }
.lvn__txt { flex:1; min-width:0; margin:0; font-size:14px; font-weight:600; line-height:1.45; }
.lvn__more { flex:none; padding:6px 14px; border-radius:var(--pill); background:var(--yellow); color:#1b1500; font-size:13px; font-weight:800; white-space:nowrap; }
.lvn__x { flex:none; width:32px; height:32px; border:0; border-radius:50%; background:rgb(255 255 255 / .1); color:#fff; font-size:14px; line-height:1; }
.lvn__x:hover { background:rgb(255 255 255 / .2); }
.lvn-enter-active, .lvn-leave-active { transition:opacity .3s, transform .3s var(--ease); }
.lvn-enter-from, .lvn-leave-to { opacity:0; transform:translateY(-8px); }
@media (max-width:560px) { .lvn__in { flex-wrap:wrap; } .lvn__txt { flex-basis:calc(100% - 80px); } .lvn__more { margin-left:36px; } }
</style>
