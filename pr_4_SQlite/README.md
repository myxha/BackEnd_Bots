# Food Tracker Bot (SQLite Edition)

Цей бот допомагає відстежувати споживання калорій, зберігаючи дані у локальній базі даних SQLite.

## Технології
- [Bun](https://bun.sh/) - середовище виконання
- [grammY](https://grammy.dev/) - фреймворк для Telegram ботів
- [SQLite](https://www.sqlite.org/) - база даних
- [dotenv](https://github.com/motdotla/dotenv) - робота з оточенням

## Команди
- `/set_profile` - заповнення анкети (вік, вага, зріст, стать, активність)
- `/my_profile` - перегляд даних профілю з бази даних
- `/add_meal` - додавання запису про їжу
- `/today` - список страв та сумарні калорії за сьогодні

## Як запустити

1. Встановіть залежності:
```bash
bun install
```

2. Створіть файл `.env` та додайте ваш токен:
```env
BOT_TOKEN=your_telegram_bot_token_here
```

3. Запустіть бота:
```bash
bun run dev
```

## Структура проекту
- `bot.ts` - основна логіка бота та обробка команд
- `db.ts` - взаємодія з SQLite (Bun:SQLite)
- `types.ts` - TypeScript інтерфейси
- `database.db` - файл бази даних (створюється автоматично)
