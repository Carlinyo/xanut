import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

// Запросы /api уходят на бэкенд через этот же адрес: так cookie сессии работают без настройки CORS.
// По умолчанию — локальный сервер (127.0.0.1, а не localhost: иначе на части систем Node идёт на IPv6 (::1), где сервер не слушает).
// Работать с задеплоенным сервером: API_PROXY_TARGET=https://xanutback.vercel.app в .env.local.
// В продакшене то же самое делает vercel.json (rewrites).
export default defineConfig(({ mode }) => {
  const target = loadEnv(mode, '.', '').API_PROXY_TARGET || 'http://127.0.0.1:3000'
  const proxy = { '/api': { target, changeOrigin: true } }
  return {
    plugins: [vue()],
    server: { proxy },
    preview: { proxy },
  }
})
