import { Bot, Context } from "grammy";
import * as dotenv from "dotenv";


dotenv.config();

const token = process.env.BOT_TOKEN;

if (!token) {
  throw new Error("BOT_TOKEN is not defined in .env file");
}


const bot = new Bot(token);

const randomResponses = [
  "Цікаво! Розкажи більше. 😊",
  "Ого, я про це не думав. 🤔",
  "Круто! Ти молодець! ✨",
  "Буває й таке. 🙃",
  "Я просто бот, але мені приємно з тобою спілкуватися! 🤖"
];


bot.command("start", async (ctx) => {
  await ctx.reply(
    "Привіт! Я твій новий Telegram-бот, створений на Bun та grammY. 🚀\n\n" +
    "Я можу відповідати на твої повідомлення, розповідати жарти та допомагати тобі.\n" +
    "Натисни /help, щоб побачити всі команди."
  );
});


bot.command("help", async (ctx) => {
  await ctx.reply(
    "Ось що я вмію:\n" +
    "/start - Запустити бота\n" +
    "/help - Список команд\n" +
    "/joke - Отримати випадковий жарт"
  );
});


bot.command("joke", async (ctx) => {
  const jokes = [
    "Їдуть двоє вірменів на інвалідних візках по пустелі. Їдуть-їдуть, раптом хоба - лампу знайшли. Потерли її й звідти джин виліз і каже: «Можете загадати будь-яке бажання, і я його виконаю». Чоловіки в унісон кажуть: «Ходити хочемо!». Джин киває й каже: «Ну раз бажання одне на двох, то будете ходити по черзі».І дав їм нарди:)",
    "Поїхали ми з Галочкою на море, вона одразу пішла в душ, а я сполоснувся в раковині, так, чисто для галочки",
    "Біля привокзальної повії гальмує джип, опускається вікно, і з нього виглядає пика: \n - Што’сь навчена чинити за сто баксу?\n - Усьо!!! \n - Но тоди сідай, поможеш бетоновати фундамент.",
  ];
  const randomJoke = jokes[Math.floor(Math.random() * jokes.length)];
  await ctx.reply(randomJoke);
});



bot.on("message:text", async (ctx) => {
  const text = ctx.message.text.toLowerCase();


  if (text.includes("hello") || text.includes("привіт")) {
    await ctx.reply("Привіт! Чим я можу тобі допомогти? 👋");
    return;
  }

 
  if (text === "help") {
    await ctx.reply("Скористайся командою /help");
    return;
  }


  const useRandom = Math.random() > 0.7; // 30% шанс на випадкову відповідь
  
  if (useRandom) {
    const randomReply = randomResponses[Math.floor(Math.random() * randomResponses.length)];
    await ctx.reply(randomReply);
  } else {
    await ctx.reply(`${ctx.message.text}`);
  }
});



bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`Error while handling update ${ctx.update.update_id}:`);
  console.error(err.error);
});


console.log("Бот успішно запущений...");
bot.start();
