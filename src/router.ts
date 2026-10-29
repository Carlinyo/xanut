import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from './stores/auth'
import HomeView from './views/HomeView.vue'
import CatalogView from './views/CatalogView.vue'
import ProductView from './views/ProductView.vue'
import AboutView from './views/AboutView.vue'
import ContactView from './views/ContactView.vue'
import AuthView from './views/AuthView.vue'
import AccountView from './views/AccountView.vue'
import PrivacyView from './views/PrivacyView.vue'

const router = createRouter({
  history: createWebHistory(),
  // «Назад»/«Вперёд» в браузере возвращают на прежнее место страницы, новый переход — наверх
  scrollBehavior: (_to, _from, saved) => saved ?? { top: 0 },
  routes: [
    { path: '/', component: HomeView },
    { path: '/products', component: CatalogView },
    { path: '/products/:id', component: ProductView },
    { path: '/offers', component: CatalogView, props: { offersOnly: true } },
    { path: '/about', component: AboutView },
    { path: '/contact', component: ContactView },
    { path: '/privacy', component: PrivacyView },
    { path: '/login', component: AuthView, props: { mode: 'login' }, meta: { guest: true } },
    { path: '/register', component: AuthView, props: { mode: 'register' }, meta: { guest: true } },
    { path: '/account', component: AccountView, meta: { auth: true } },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuth()
  if (to.meta.auth || to.meta.guest) await auth.restore() // вошёл ли человек, станет известно после ответа /auth/me
  if (to.meta.auth && !auth.isAuth) return { path: '/login', query: { redirect: to.fullPath } }
  if (to.meta.guest && auth.isAuth) return '/'
  return true
})

export default router
