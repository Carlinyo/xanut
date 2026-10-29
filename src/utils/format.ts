import { t } from '../i18n'
export const money = (n: number): string => `${n.toLocaleString('en-US')} ${t('common.currency')}`

const pad = (n: number): string => String(n).padStart(2, '0')
/** 18 → «18:00–19:00» */
export const hourRange = (h: number): string => `${pad(h)}:00–${pad(h + 1)}:00`
/** «2026-10-28T18:00» → «28.10 · 18:00–19:00» */
export const formatSlot = (key: string): string => `${key.slice(8, 10)}.${key.slice(5, 7)} · ${hourRange(Number(key.slice(11, 13)))}`
