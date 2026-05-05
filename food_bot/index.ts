import { Bot, Context, session, Keyboard } from "grammy";
import {
  type Conversation,
  type ConversationFlavor,
  conversations,
  createConversation,
} from "@grammyjs/conversations";

// --- Types & Interfaces ---

interface UserProfile {
  age: number;
  height: number;
  weight: number;
  sex: "male" | "female";
  activity: "low" | "light" | "medium" | "high";
  bmr: number;
  tdee: number;
}

// Custom context type to include session and conversations
type MyContext = Context & ConversationFlavor;
type MyConversation = Conversation<MyContext>;

// --- Constants & Config ---

const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  throw new Error("BOT_TOKEN is not defined in .env");
}

// Activity coefficients
const ACTIVITY_LEVELS = {
  low: 1.2,
  light: 1.375,
  medium: 1.55,
  high: 1.725,
};

// In-memory storage for user profiles (Map: userId -> UserProfile)
const userDB = new Map<number, UserProfile>();

// --- Calculation Logic ---

/**
 * Calculates BMR using Mifflin-St Jeor formula
 */
function calculateBMR(weight: number, height: number, age: number, sex: "male" | "female"): number {
  if (sex === "male") {
    return 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    return 10 * weight + 6.25 * height - 5 * age - 161;
  }
}

/**
 * Calculates TDEE by multiplying BMR by activity coefficient
 */
function calculateTDEE(bmr: number, activity: keyof typeof ACTIVITY_LEVELS): number {
  return bmr * ACTIVITY_LEVELS[activity];
}

// --- Conversations (Step-by-step Dialog) ---

async function profileConversation(conversation: MyConversation, ctx: MyContext) {
  // 1. Age Validation
  await ctx.reply("Введи свій вік (10–100):");
  let age = 0;
  while (true) {
    const { message } = await conversation.wait();
    const val = parseInt(message?.text || "");
    if (!isNaN(val) && val >= 10 && val <= 100) {
      age = val;
      break;
    }
    await ctx.reply("Будь ласка, введи коректний вік (число від 10 до 100):");
  }

  // 2. Height Validation
  await ctx.reply("Введи свій зріст у см (100–250):");
  let height = 0;
  while (true) {
    const { message } = await conversation.wait();
    const val = parseInt(message?.text || "");
    if (!isNaN(val) && val >= 100 && val <= 250) {
      height = val;
      break;
    }
    await ctx.reply("Будь ласка, введи коректний зріст (число від 100 до 250):");
  }

  // 3. Weight Validation
  await ctx.reply("Введи свою вагу у кг (30–300):");
  let weight = 0;
  while (true) {
    const { message } = await conversation.wait();
    const val = parseInt(message?.text || "");
    if (!isNaN(val) && val >= 30 && val <= 300) {
      weight = val;
      break;
    }
    await ctx.reply("Будь ласка, введи коректну вагу (число від 30 до 300):");
  }

  // 4. Sex Selection
  const sexKeyboard = new Keyboard().text("male").text("female").resized().oneTime();
  await ctx.reply("Обери свою стать:", { reply_markup: sexKeyboard });
  let sex: "male" | "female" = "male";
  while (true) {
    const { message } = await conversation.wait();
    if (message?.text === "male" || message?.text === "female") {
      sex = message.text;
      break;
    }
    await ctx.reply("Обери стать, натиснувши на кнопку (male або female):", { reply_markup: sexKeyboard });
  }

  // 5. Activity Level Selection
  const activityKeyboard = new Keyboard()
    .text("low").text("light").row()
    .text("medium").text("high")
    .resized().oneTime();
  
  await ctx.reply("Обери свій рівень активності:\nlow (1.2), light (1.375), medium (1.55), high (1.725)", { 
    reply_markup: activityKeyboard 
  });
  
  let activity: keyof typeof ACTIVITY_LEVELS = "low";
  while (true) {
    const { message } = await conversation.wait();
    if (message?.text && message.text in ACTIVITY_LEVELS) {
      activity = message.text as keyof typeof ACTIVITY_LEVELS;
      break;
    }
    await ctx.reply("Будь ласка, обери варіант із запропонованих кнопок:", { reply_markup: activityKeyboard });
  }

  // Calculations
  const bmr = calculateBMR(weight, height, age, sex);
  const tdee = calculateTDEE(bmr, activity);

  // Save to "DB"
  if (ctx.from) {
    userDB.set(ctx.from.id, {
      age, height, weight, sex, activity, bmr: Math.round(bmr), tdee: Math.round(tdee)
    });
  }

  await ctx.reply(
    `✅ Профіль збережено!\n\n` +
    `Твій BMR: ${Math.round(bmr)} ккал\n` +
    `Твій TDEE: ${Math.round(tdee)} ккал`,
    { reply_markup: { remove_keyboard: true } }
  );
}

// --- Bot Setup ---

const bot = new Bot<MyContext>(BOT_TOKEN);

// Required for conversations
bot.use(session({ initial: () => ({}) }));
bot.use(conversations());
bot.use(createConversation(profileConversation));

// Commands
bot.command("start", (ctx) => ctx.reply("Привіт! Я допоможу тобі розрахувати калорії. Використовуй /set_profile для налаштування."));

bot.command("set_profile", async (ctx) => {
  await ctx.conversation.enter("profileConversation");
});

bot.command("my_profile", (ctx) => {
  const profile = userDB.get(ctx.from?.id || 0);
  if (!profile) {
    return ctx.reply("Твій профіль ще не створений. Використовуй /set_profile.");
  }

  ctx.reply(
    `📋 Твій профіль:\n` +
    `Вік: ${profile.age}\n` +
    `Зріст: ${profile.height} см\n` +
    `Вага: ${profile.weight} кг\n` +
    `Стать: ${profile.sex}\n` +
    `Активність: ${profile.activity}\n` +
    `-------------------\n` +
    `BMR: ${profile.bmr} ккал\n` +
    `TDEE: ${profile.tdee} ккал`
  );
});

// Error Handling
bot.catch((err) => {
  console.error(`Error while handling update ${err.ctx.update.update_id}:`, err.error);
});

// Start Bot
console.log("Bot is running...");
bot.start();
