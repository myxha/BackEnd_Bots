import { Database } from "bun:sqlite";
import { UserProfile, Meal } from "./types";

const db = new Database("database.db", { create: true });

/**
 * Ініціалізація бази даних: створення таблиць, якщо вони не існують.
 */
export function initDB() {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      telegram_id INTEGER PRIMARY KEY,
      age INTEGER,
      weight REAL,
      height REAL,
      sex TEXT,
      activity_level TEXT,
      bmr REAL,
      tdee REAL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS meals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      raw_text TEXT,
      calories_estimated REAL,
      timestamp TEXT,
      notes TEXT,
      FOREIGN KEY(user_id) REFERENCES users(telegram_id)
    )
  `);
}

/**
 * Збереження або оновлення профілю користувача.
 */
export function upsertUser(profile: UserProfile) {
  const query = db.prepare(`
    INSERT INTO users (telegram_id, age, weight, height, sex, activity_level, bmr, tdee)
    VALUES ($telegram_id, $age, $weight, $height, $sex, $activity_level, $bmr, $tdee)
    ON CONFLICT(telegram_id) DO UPDATE SET
      age = excluded.age,
      weight = excluded.weight,
      height = excluded.height,
      sex = excluded.sex,
      activity_level = excluded.activity_level,
      bmr = excluded.bmr,
      tdee = excluded.tdee
  `);

  query.run({
    $telegram_id: profile.telegram_id,
    $age: profile.age,
    $weight: profile.weight,
    $height: profile.height,
    $sex: profile.sex,
    $activity_level: profile.activity_level,
    $bmr: profile.bmr,
    $tdee: profile.tdee,
  });
}

/**
 * Отримання профілю користувача за telegram_id.
 */
export function getUser(telegram_id: number): UserProfile | null {
  const query = db.prepare("SELECT * FROM users WHERE telegram_id = ?");
  return query.get(telegram_id) as UserProfile | null;
}

/**
 * Додавання нового прийому їжі.
 */
export function addMeal(meal: Meal) {
  const query = db.prepare(`
    INSERT INTO meals (user_id, raw_text, calories_estimated, timestamp, notes)
    VALUES ($user_id, $raw_text, $calories_estimated, $timestamp, $notes)
  `);

  query.run({
    $user_id: meal.user_id,
    $raw_text: meal.raw_text,
    $calories_estimated: meal.calories_estimated,
    $timestamp: meal.timestamp,
    $notes: meal.notes || null,
  });
}

/**
 * Отримання списку прийомів їжі за сьогодні для конкретного користувача.
 */
export function getTodayMeals(user_id: number): Meal[] {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const query = db.prepare("SELECT * FROM meals WHERE user_id = ? AND timestamp LIKE ?");
  return query.all(user_id, `${today}%`) as Meal[];
}
