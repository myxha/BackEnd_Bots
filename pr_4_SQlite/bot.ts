import { Bot, session, Keyboard } from "grammy";
import { conversations, createConversation } from "@grammyjs/conversations";
import * as dotenv from "dotenv";
import { MyContext, MyConversation, UserProfile, Meal } from "./types";
import { initDB, upsertUser, getUser, addMeal, getTodayMeals } from "./db";

dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  throw new Error("BOT_TOKEN is not defined in .env");
}

// Ініціалізація БД
initDB();

// Коефіцієнти активності
const ACTIVITY_LEVELS: Record<string, number> = {
  low: 1.2,
  light: 1.375,
  medium: 1.55,
  high: 1.725,
};

/**
 * Розрахунок BMR за формулою Міффліна-Сан Жеора
 */
function calculateBMR(weight: number, height: number, age: number, sex: "male" | "female"): number {
  if (sex === "male") {
    return 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    return 10 * weight + 6.25 * height - 5 * age - 161;
  }
}

/**
 * Розрахунок TDEE
 */
function calculateTDEE(bmr: number, activity: string): number {
  const coef = ACTIVITY_LEVELS[activity] || 1.2;
  return bmr * coef;
}

// --- Conversations ---

/**
 * Діалог налаштування профілю
 */
async function setProfileConversation(conversation: MyConversation, ctx: MyContext) {
  await ctx.reply("Введи свій вік (10–100):");
  const age = await conversation.form.number((ctx) => ctx.reply("Будь ласка, введи коректне число."));

  await ctx.reply("Введи свій зріст у см (100–250):");
  const height = await conversation.form.number((ctx) => ctx.reply("Будь ласка, введи коректне число."));

  await ctx.reply("Введи свою вагу у кг (30–300):");
  const weight = await conversation.form.number((ctx) => ctx.reply("Будь ласка, введи коректне число."));

  const sexKeyboard = new Keyboard().text("male").text("female").resized().oneTime();
  await ctx.reply("Обери свою стать:", { reply_markup: sexKeyboard });
  const sexMsg = await conversation.waitFor("message:text");
  const sex = sexMsg.message.text === "female" ? "female" : "male";

  const activityKeyboard = new Keyboard()
    .text("low").text("light").row()
    .text("medium").text("high")
    .resized().oneTime();
  await ctx.reply("Обери свій рівень активності:", { reply_markup: activityKeyboard });
  const activityMsg = await conversation.waitFor("message:text");
  const activity = activityMsg.message.text || "low";

  const bmr = Math.round(calculateBMR(weight, height, age, sex));
  const tdee = Math.round(calculateTDEE(bmr, activity));

  const profile: UserProfile = {
    telegram_id: ctx.from!.id,
    age,
    weight,
    height,
    sex,
    activity_level: activity,
    bmr,
    tdee,
  };

  upsertUser(profile);

  await ctx.reply(
    `✅ Профіль збережено у SQLite!\n\n` +
    `Твій BMR: ${bmr} ккал\n` +
    `Твій TDEE: ${tdee} ккал`,
    { reply_markup: { remove_keyboard: true } }
  );
}

/**
 * Діалог додавання їжі
 */
async function addMealConversation(conversation: MyConversation, ctx: MyContext) {
  await ctx.reply("Що ви їли?");
  const { message } = await conversation.wait();
  
  if (!message?.text) {
    await ctx.reply("Потрібно ввести текст прийому їжі.");
    return;
  }

  const meal: Meal = {
    user_id: ctx.from!.id,
    raw_text: message.text,
    calories_estimated: 0,
    timestamp: new Date().toISOString(),
  };

  addMeal(meal);

  await ctx.reply("Прийом їжі збережено ✅");
}

// --- Bot Setup ---

const bot = new Bot<MyContext>(BOT_TOKEN);

bot.use(session({ initial: () => ({}) }));
bot.use(conversations());
bot.use(createConversation(setProfileConversation));
bot.use(createConversation(addMealConversation));

bot.command("start", (ctx) => {
  ctx.reply(
    "Привіт! Я допоможу тобі стежити за харчуванням.\n\n" +
    "Команди:\n" +
    "/set_profile - Налаштувати профіль\n" +
    "/my_profile - Мій профіль\n" +
    "/add_meal - Додати їжу\n" +
    "/today - Що я з'їв сьогодні"
  );
});

bot.command("set_profile", async (ctx) => {
  await ctx.conversation.enter("setProfileConversation");
});

bot.command("my_profile", async (ctx) => {
  const profile = getUser(ctx.from!.id);
  if (!profile) {
    return ctx.reply("Твій профіль ще не створений. Використовуй /set_profile.");
  }

  await ctx.reply(
    `📋 Твій профіль (з БД):\n` +
    `Вік: ${profile.age}\n` +
    `Зріст: ${profile.height} см\n` +
    `Вага: ${profile.weight} кг\n` +
    `Стать: ${profile.sex === "male" ? "Чоловік" : "Жінка"}\n` +
    `Активність: ${profile.activity_level}\n` +
    `-------------------\n` +
    `BMR: ${profile.bmr} ккал\n` +
    `TDEE: ${profile.tdee} ккал`
  );
});

bot.command("add_meal", async (ctx) => {
  await ctx.conversation.enter("addMealConversation");
});

bot.command("today", async (ctx) => {
  const meals = getTodayMeals(ctx.from!.id);

  if (meals.length === 0) {
    return ctx.reply("Сьогодні ще немає записаних прийомів їжі.");
  }

  let totalCalories = 0;
  let report = "Сьогодні ви зʼїли:\n\n";

  meals.forEach((meal, index) => {
    const time = new Date(meal.timestamp).toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" });
    report += `${index + 1}. ${meal.raw_text} (${time})\n`;
    totalCalories += meal.calories_estimated;
  });

  report += `\nВсього: ${totalCalories} kcal`;

  await ctx.reply(report);
});

bot.catch((err) => {
  console.error(`Помилка: ${err.ctx.update.update_id}:`, err.error);
});

console.log("Бот запускається...");
bot.start();
