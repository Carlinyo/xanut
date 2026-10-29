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
