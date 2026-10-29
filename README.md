# Մանղալ — сайт (Vue 3 + TypeScript + Vite)

Магазин мяса и шашлыка в Джермуке: каталог, заказ шашлыка и мяса с доставкой, регистрация с кодом подтверждения.

## Запуск

Сначала запустите сервер (папка `merkhanut-api`: `npm install`, `npm run setup`, `npm run dev` — см. его README про Firebase). Затем здесь, во втором окне:

```bash
npm install
npm run dev        # http://localhost:5173
```
Запросы `/api` Vite передаёт серверу на `http://127.0.0.1:3000` (`vite.config.ts`).

Сборка для хостинга: `npm run build` → папка `dist`. Отдавайте её с того же домена, что и API (например, nginx: `/` → `dist`, `/api` → сервер).

## Где что менять

Все тексты сайта — в `src/locales/hy.json`:
- `contact.phone`, `contact.email`, `contact.address`, `contact.hours` — контакты магазина (они же подставляются в политику конфиденциальности вместо `{phone}`, `{email}`, `{address}`);
- `privacy.sections[0]` — владелец данных (ИП и ИНН/ՀՎՀՀ); `privacy.updated` — дата редакции политики.

Координаты магазина для карты — `src/shop.ts`.

Ограничения, которые сайт повторяет за сервером, — меняйте вместе с `merkhanut-api`:
- шашлык (вес 0.5–50 кг, комментарий до 300 знаков) — `src/utils/kebab.ts`;
- не больше 99 штук одной позиции в корзине — `MAX_QTY` в `src/stores/cart.ts`;
- требования к паролю — `src/utils/passwordPolicy.ts`.

## Картинки

Изображения товаров и фоны генерируются скриптами (нужны `playwright` и `sharp`, в зависимости проекта они не входят):

```bash
npm i -D playwright sharp && npx playwright install chromium
node tools/render-art.mjs            # public/img/art/*.webp
node tools/render-backgrounds.mjs    # public/img/bg/*.webp
```

## Тестовый режим

Пока на сервере не вставлен пароль приложения Gmail, письма не уходят: при регистрации и входе код подтверждения показывается прямо на экране ввода кода — плашка «🧪 Թեստային ռեժիմ»; нажмите на код, и он подставится сам. После `npm run setup` на сервере плашка исчезает, коды приходят на почту.
