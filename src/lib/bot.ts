import TelegramBot, { type TgBotInstance, type TgMessage, type TgCallbackQuery } from "./telegram-types";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { handleAudio, handleCallbackQuery, handleTextMessage, handlePhoto } from "./bot-handlers";

export interface UserSession {
  state:
    | "idle"
    | "waiting_audio"
    | "audio_received"
    | "waiting_title"
    | "waiting_artist"
    | "waiting_cover"
    | "waiting_year"
    | "waiting_cut_start"
    | "waiting_cut_end"
    | "waiting_album";
  fileId?: string;
  fileName?: string;
  title?: string;
  artist?: string;
  album?: string;
  year?: string;
  coverFileId?: string;
  cutStart?: string;
  cutEnd?: string;
  messageId?: number;
}

export const sessions = new Map<number, UserSession>();

let botInstance: TgBotInstance | null = null;

export function getBot(): TgBotInstance | null {
  return botInstance;
}

export function initBot(): TgBotInstance | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    console.warn("TELEGRAM_BOT_TOKEN is not set. Bot will not start.");
    return null;
  }

  if (botInstance) {
    return botInstance;
  }

  const bot = new TelegramBot(token, { polling: true });
  botInstance = bot;

  console.log("Bot is starting...");

  bot.onText(/\/start/, async (msg: TgMessage) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    if (!userId) return;

    try {
      const existing = await db
        .select()
        .from(users)
        .where(eq(users.telegramId, userId))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(users).values({
          telegramId: userId,
          username: msg.from?.username || null,
          firstName: msg.from?.first_name || null,
          lastName: msg.from?.last_name || null,
        });
      }
    } catch (e) {
      console.error("Error saving user:", e);
    }

    const welcomeText = `🎵 *به ربات ویرایش موسیقی خوش آمدید!*

با این ربات می‌تونید فایل‌های موسیقی خودتون رو ویرایش کنید:

🎤 تغییر نام آهنگ
👤 تغییر نام خواننده
💿 تغییر نام آلبوم
📅 تغییر سال انتشار
🖼 تغییر کاور (عکس آهنگ)
✂️ برش (کات) آهنگ

📤 *برای شروع، یک فایل صوتی (MP3) ارسال کنید.*`;

    bot.sendMessage(chatId, welcomeText, { parse_mode: "Markdown" });
  });

  bot.onText(/\/help/, (msg: TgMessage) => {
    const helpText = `📖 *راهنمای استفاده*

1️⃣ یک فایل MP3 ارسال کنید
2️⃣ از منوی نمایش داده شده، عملیات مورد نظر رو انتخاب کنید
3️⃣ اطلاعات جدید رو وارد کنید
4️⃣ فایل ویرایش شده رو دریافت کنید!

*دستورات:*
/start - شروع مجدد
/help - راهنما
/cancel - لغو عملیات فعلی`;

    bot.sendMessage(msg.chat.id, helpText, { parse_mode: "Markdown" });
  });

  bot.onText(/\/cancel/, (msg: TgMessage) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    if (!userId) return;

    sessions.delete(userId);
    bot.sendMessage(chatId, "❌ عملیات لغو شد. برای شروع مجدد یک فایل صوتی ارسال کنید.");
  });

  bot.on("audio", (msg: never) => handleAudio(bot, msg as TgMessage));

  bot.on("document", (msg: never) => {
    const m = msg as TgMessage;
    if (m.document?.mime_type?.includes("audio")) {
      handleAudio(bot, m);
    }
  });

  bot.on("voice", (msg: never) => handleAudio(bot, msg as TgMessage));

  bot.on("photo", (msg: never) => handlePhoto(bot, msg as TgMessage));

  bot.on("callback_query", (query: never) => handleCallbackQuery(bot, query as TgCallbackQuery));

  bot.on("message", (msg: never) => {
    const m = msg as TgMessage;
    if (m.text && !m.text.startsWith("/") && !m.audio && !m.document && !m.voice && !m.photo) {
      handleTextMessage(bot, m);
    }
  });

  bot.on("polling_error", (error: never) => {
    const e = error as Error;
    console.error("Polling error:", e.message);
  });

  console.log("Bot started successfully!");
  return bot;
}
