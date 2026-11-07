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

// Страховка от «сайта без оформления». Если страница грузилась в момент выкладки, браузер мог получить вместо
// файла стилей ошибку и запомнить её надолго (файлы /assets кэшируются на год). Пока стили не применились, страница
// скрыта (index.html прячет #app, base.css показывает), поэтому голая разметка не мелькает. Стилей нет (нет переменных
// из tokens.css) — сразу подключаем тот же файл мимо кэша и заодно перекачиваем его в кэш браузера: следующие загрузки
// будут обычными. Скрипт выполняется, когда файл стилей уже загрузился или не смог. В npm run dev стили — не файлом.
const showPage = () => document.getElementById('app')?.style.setProperty('visibility', 'visible')
if (!getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()) {
  const links = document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"][href*="/assets/"]')
  links.forEach((link) => {
    void fetch(link.href, { cache: 'reload' }).catch(() => {})
    const fresh = link.cloneNode() as HTMLLinkElement
    fresh.href = `${link.href.split('?')[0]}?r=${Date.now()}`
    link.after(fresh)
  })
  // крайний случай (нет сети): показать хоть без оформления, а не пустую страницу; load ждёт и новый файл стилей
  if (links.length) window.addEventListener('load', showPage, { once: true }); else showPage()
}

const app = createApp(App)
app.use(createPinia())
// сессия восстанавливается параллельно с показом сайта; защищённые маршруты дожидаются её в router.beforeEach
void useAuth().restore()
app.use(router).use(i18n).directive('reveal', reveal).directive('parallax', parallax).directive('tilt', tilt).mount('#app')
