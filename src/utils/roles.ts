// Роли: admin — главный администратор (вся админка), manager — младший администратор (заказы, каталог и разделы,
// бонусные товары и коды, отзывы и жалобы — без клиентов, акций групп и отчётов), worker — работник (только заказы).
// Сервер проверяет то же самое (plugins/auth.ts → requireAdmin, requireOwner).
/** Есть доступ в админку: главный или младший администратор. */
export const isAdminRole = (role?: string | null): boolean => role === 'admin' || role === 'manager'
/** Главный администратор: клиенты, акции групп, отчёты, роли. */
export const isOwner = (role?: string | null): boolean => role === 'admin'
