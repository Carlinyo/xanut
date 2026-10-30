import { useRoute, useRouter } from 'vue-router'
import { ApiError } from '../api'
import { useAuth } from '../stores/auth'

/** Сессия истекла (401) — на вход и обратно сюда; нет прав (403) — на главную. true — ошибка обработана. */
export function useAuthRedirect() {
  const router = useRouter(), route = useRoute(), auth = useAuth()
  return (e: unknown): boolean => {
    if (!(e instanceof ApiError)) return false
    if (e.status === 401) {
      auth.user = null
      void router.replace({ path: '/login', query: { redirect: route.fullPath } })
      return true
    }
    if (e.status === 403) {
      void router.replace('/')
      return true
    }
    return false
  }
}
