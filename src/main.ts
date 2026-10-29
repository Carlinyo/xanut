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

async function bootstrap() {
  const app = createApp(App)
  app.use(createPinia())
  await useAuth().fetchMe() // восстановить сессию до первой навигации: от неё зависят защищённые маршруты
  app.use(router).use(i18n).directive('reveal', reveal).directive('parallax', parallax).directive('tilt', tilt).mount('#app')
}
bootstrap()
