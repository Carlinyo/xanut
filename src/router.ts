import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from './stores/auth'
import { t } from './i18n'
import HomeView from './views/HomeView.vue'
import CatalogView from './views/CatalogView.vue'
import ProductView from './views/ProductView.vue'
import AboutView from './views/AboutView.vue'
import ContactView from './views/ContactView.vue'
import AuthView from './views/AuthView.vue'
import AccountView from './views/AccountView.vue'
import PrivacyView from './views/PrivacyView.vue'
import BonusView from './views/BonusView.vue'

const router = createRouter({
  history: createWebHistory(),
  // «Назад»/«Вперёд» в браузере возвращают на прежнее место страницы, новый переход — наверх
  scrollBehavior: (_to, _from, saved) => saved ?? { top: 0 },
  routes: [
    // meta.catalog — странице нужен каталог: пока он грузится, вместо неё показывается «Загрузка»
    { path: '/', component: HomeView, meta: { catalog: true } },
    // meta.title — ключ текста для заголовка вкладки (страница товара ставит название товара сама)
    { path: '/products', component: CatalogView, meta: { catalog: true, title: 'catalog.title' } },
    { path: '/products/:id', component: ProductView, meta: { catalog: true } },
    { path: '/offers', component: CatalogView, props: { offersOnly: true }, meta: { catalog: true, title: 'sections.offers' } },
    { path: '/about', component: AboutView, meta: { title: 'about.title' } },
    { path: '/contact', component: ContactView, meta: { title: 'contact.title' } },
    { path: '/privacy', component: PrivacyView, meta: { title: 'privacy.title' } },
    { path: '/bonus', component: BonusView, meta: { catalog: true, title: 'bonus.title' } },
    { path: '/login', component: AuthView, props: { mode: 'login' }, meta: { guest: true, title: 'auth.login' } },
    { path: '/register', component: AuthView, props: { mode: 'register' }, meta: { guest: true, title: 'auth.registerBtn' } },
    { path: '/account', component: AccountView, meta: { auth: true, title: 'account.mine' } },
    { path: '/admin', component: () => import('./views/AdminView.vue'), meta: { auth: true, admin: true, title: 'admin.title' } },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuth()
  if (to.meta.auth || to.meta.guest) await auth.restore() // вошёл ли человек, станет известно после ответа /auth/me
  if (to.meta.auth && !auth.isAuth) return { path: '/login', query: { redirect: to.fullPath } }
  if (to.meta.admin && auth.user?.role !== 'admin') return '/' // админка — только для роли admin (сервер проверяет то же самое)
  if (to.meta.guest && auth.isAuth) return '/'
  return true
})

// Заголовок вкладки по странице: видно в истории, закладках и поисковиках
const baseTitle = document.title
router.afterEach((to) => { document.title = to.meta.title ? `${t(to.meta.title)} — ${t('brand.name')}` : baseTitle })

export default router
