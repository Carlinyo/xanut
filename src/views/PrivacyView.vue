<script setup lang="ts">
import { t } from '../i18n'

interface Section { title: string; text?: string[]; items?: string[] }
const sections = t('privacy.sections') as Section[]
// {email}, {phone}, {address}, {brand} подставляются из locales/hy.json — контакты правятся в одном месте.
// Параметры передаются и в t(): без них t() заменяет незнакомые {…} пустой строкой (так пропадало название во вступлении).
const params: Record<string, string> = {
  email: t('contact.email'), phone: t('contact.phone'), address: t('contact.address'), brand: t('brand.name'),
}
const fill = (s: string): string => s.replace(/\{(\w+)\}/g, (m, k: string) => params[k] ?? m)
</script>

<template>
  <div class="wrap page doc">
    <h1>{{ $t('privacy.title') }}</h1>
    <p class="muted">{{ $t('privacy.updated') }}</p>
    <p class="lead">{{ $t('privacy.intro', params) }}</p>
    <section v-for="s in sections" :key="s.title" v-reveal class="doc__sec">
      <h2>{{ s.title }}</h2>
      <p v-for="(p, i) in s.text" :key="i">{{ fill(p) }}</p>
      <ul v-if="s.items"><li v-for="(it, i) in s.items" :key="i">{{ fill(it) }}</li></ul>
    </section>
  </div>
</template>

<style scoped>
.doc { max-width:860px; }
.lead { font-size:clamp(16px, 1.6vw, 18px); color:#3b4745; }
.doc__sec { margin-top:28px; }
h2 { margin:0 0 8px; font-size:clamp(18px, 2vw, 21px); }
p { margin:0 0 10px; }
ul { margin:0 0 10px; padding-left:22px; }
li { margin-bottom:6px; }
li::marker { color:var(--yellow-lo); }
</style>
