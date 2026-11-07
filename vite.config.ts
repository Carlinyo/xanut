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
    // Имена файлов сборки с хэшем длиннее обычного (10 знаков вместо 8): так все файлы один раз получили новые имена.
    // Раньше /assets кэшировались на год без проверки, и браузер, открывший сайт в момент выкладки, мог запомнить
    // ошибку вместо файла — сайт у него не открывался. Теперь браузер сверяет файлы с сервером (vercel.json),
    // а под новыми именами старые испорченные записи кэша больше не используются.
    build: {
      rollupOptions: {
        output: {
          entryFileNames: 'assets/[name]-[hash:10].js',
          chunkFileNames: 'assets/[name]-[hash:10].js',
          assetFileNames: 'assets/[name]-[hash:10][extname]',
        },
      },
    },
  }
})
