import { defineStore } from 'pinia'
import { api } from '../api'
import type { Channel, OtpChallenge, PublicUser } from '../types'

export interface RegisterData { name: string; email: string; phone: string; password: string; consent: boolean; channel: Channel }

const isChallenge = (r: unknown): r is OtpChallenge => typeof r === 'object' && r !== null && 'challengeId' in r

// Сессия живёт в httpOnly-cookie на сервере; здесь хранится только профиль для интерфейса.
// Вход и регистрация проходят в два шага: данные → код подтверждения (email или SMS) → сессия.
export const useAuth = defineStore('auth', {
  state: () => ({ user: null as PublicUser | null }),
  getters: { isAuth: (s): boolean => s.user !== null },
  actions: {
    /** Восстанавливает сессию при старте. Нет сессии или нет связи — остаёмся гостем. */
    async fetchMe() {
      try { this.user = await api<PublicUser>('/auth/me') } catch { this.user = null }
    },
    /** Шаг 1 регистрации: сервер проверяет данные и отправляет код. Аккаунт появится только после verify(). */
    async register(data: RegisterData): Promise<OtpChallenge> {
      return api<OtpChallenge>('/auth/register', { method: 'POST', body: data })
    },
    /** Шаг 1 входа: пароль. Если устройство доверенное — сразу вход (null), иначе нужен код. */
    async login(email: string, password: string): Promise<OtpChallenge | null> {
      const r = await api<OtpChallenge | PublicUser>('/auth/login', { method: 'POST', body: { email, password } })
      if (isChallenge(r)) return r
      this.user = r
      return null
    },
    /** Шаг 2: код из письма или SMS. */
    async verify(challengeId: string, code: string, trustDevice: boolean) {
      this.user = await api<PublicUser>('/auth/verify', { method: 'POST', body: { challengeId, code, trustDevice } })
    },
    async resend(challengeId: string): Promise<{ expiresIn: number; resendIn: number; devCode?: string }> {
      return api('/auth/resend', { method: 'POST', body: { challengeId } })
    },
    async logout() {
      this.user = null
      try { await api('/auth/logout', { method: 'POST' }) } catch { /* сессия истечёт сама */ }
    },
  },
})
