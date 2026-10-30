import { useRouter } from 'vue-router'
import { t } from '../i18n'
import { useAuth } from '../stores/auth'
import { useConfirm } from '../stores/confirm'

/** Выход из аккаунта — после подтверждения; затем на главную. */
export function useLogout() {
  const auth = useAuth(), confirm = useConfirm(), router = useRouter()
  return async () => {
    const ok = await confirm.ask({ icon: '👋', title: t('confirm.logout.title'), text: t('confirm.logout.text'), yes: t('confirm.logout.yes'), no: t('confirm.logout.no') })
    if (!ok) return
    await auth.logout()
    void router.push('/')
  }
}
