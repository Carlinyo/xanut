import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Запросы /api уходят на бэкенд: так cookie сессии работают без настройки CORS.
// 127.0.0.1, а не localhost: иначе на части систем Node идёт на IPv6 (::1), где сервер не слушает.
export default defineConfig({
  plugins: [vue()],
  server: { proxy: { '/api': 'http://127.0.0.1:3000' } },
})
