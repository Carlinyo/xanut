import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import i18n from './i18n'
import reveal from './directives/reveal'
import parallax from './directives/parallax'
import tilt from './directives/tilt'
import { useAuth } from './stores/auth'
import './styles/tokens.css'
import './styles/base.css'

const app = createApp(App)
app.use(createPinia())
// сессия восстанавливается параллельно с показом сайта; защищённые маршруты дожидаются её в router.beforeEach
void useAuth().restore()
app.use(router).use(i18n).directive('reveal', reveal).directive('parallax', parallax).directive('tilt', tilt).mount('#app')

// Страховка от «сайта без оформления». Если страница грузилась в момент выкладки, браузер мог получить вместо
// файла стилей ошибку и запомнить её надолго (файлы /assets кэшируются на год). Стили не применились
// (нет переменных из tokens.css) — загружаем тот же файл ещё раз, мимо кэша. В npm run dev стили — не файлом, тут ничего не делается.
window.addEventListener('load', () => {
  if (getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()) return
  document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"][href*="/assets/"]').forEach((link) => {
    const fresh = link.cloneNode() as HTMLLinkElement
    fresh.href = `${link.href.split('?')[0]}?r=${Date.now()}`
    link.after(fresh)
  })
}, { once: true })
