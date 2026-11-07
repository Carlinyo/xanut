import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from './stores/auth'
import { t } from './i18n'
// Главная — статически (это страница входа на сайт: грузим сразу, без лишнего запроса за чанком).
import HomeView from './views/HomeView.vue'
// Остальные страницы — лениво: их код и стили выносятся из начального бандла и подгружаются при переходе.
// Один и тот же () => import используется для нескольких маршрутов (CatalogView, AuthView) — тогда это один общий чанк.
const CatalogView = () => import('./views/CatalogView.vue')
const ProductView = () => import('./views/ProductView.vue')
const AboutView = () => import('./views/AboutView.vue')
const ContactView = () => import('./views/ContactView.vue')
const AuthView = () => import('./views/AuthView.vue')
const AccountView = () => import('./views/AccountView.vue')
const PrivacyView = () => import('./views/PrivacyView.vue')
const BonusView = () => import('./views/BonusView.vue')

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
    { path: '/forgot', component: AuthView, props: { mode: 'reset' }, meta: { guest: true, title: 'reset.title' } },
    { path: '/account', component: AccountView, meta: { auth: true, title: 'account.mine' } },
    { path: '/admin', component: () => import('./views/AdminView.vue'), meta: { auth: true, admin: true, title: 'admin.title' } },
    // раздел работников: только заказы и кнопка «Готово» (роль worker; администратор тоже может открыть)
    // meta.bare — без шапки, подвала и каталога (App.vue): работнику нужно только окно заказов
    { path: '/staff', component: () => import('./views/StaffView.vue'), meta: { auth: true, staff: true, bare: true, title: 'staff.title' } },
    // сюда AmeriaBank возвращает покупателя после оплаты (адрес задаёт сервер: BackURL)
    { path: '/payment/return', component: () => import('./views/PaymentReturnView.vue'), meta: { title: 'pay.pageTitle' } },
    // неизвестный адрес — страница «не найдено» с путями дальше (а не молчаливый переход на главную)
    { path: '/:pathMatch(.*)*', component: () => import('./views/NotFoundView.vue'), meta: { title: 'notFound.title' } },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuth()
  // кто вошёл — станет известно после ответа /auth/me (один запрос на всё приложение, идёт параллельно с каталогом)
  await auth.restore()
  // работнику открыт только раздел заказов: любой другой адрес (главная, каталог, кабинет…) ведёт туда
  if (auth.user?.role === 'worker' && to.path !== '/staff') return '/staff'
  if (to.meta.auth && !auth.isAuth) return { path: '/login', query: { redirect: to.fullPath } }
  if (to.meta.admin && auth.user?.role !== 'admin') return '/' // админка — только для роли admin (сервер проверяет то же самое)
  if (to.meta.staff && auth.user?.role !== 'worker' && auth.user?.role !== 'admin') return '/'
  if (to.meta.guest && auth.isAuth) return '/'
  return true
})

// Заголовок вкладки по странице: видно в истории, закладках и поисковиках
const baseTitle = document.title
router.afterEach((to) => { document.title = to.meta.title ? `${t(to.meta.title)} — ${t('brand.name')}` : baseTitle })

export default router
