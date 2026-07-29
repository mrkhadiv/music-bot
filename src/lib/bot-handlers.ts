import type { TgBotInstance, TgMessage, TgCallbackQuery } from "./telegram-types";
import { sessions, type UserSession } from "./bot";
import { processAudioEdit } from "./audio-processor";
import { db } from "@/db";
import { users, editTasks } from "@/db/schema";
import { eq } from "drizzle-orm";

function getOrCreateSession(userId: number): UserSession {
  let session = sessions.get(userId);
  if (!session) {
    session = { state: "idle" };
    sessions.set(userId, session);
  }
  return session;
}

function getEditMenuKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: "🎤 تغییر نام آهنگ", callback_data: "edit_title" },
        { text: "👤 تغییر خواننده", callback_data: "edit_artist" },
      ],
      [
        { text: "💿 تغییر آلبوم", callback_data: "edit_album" },
        { text: "📅 تغییر سال", callback_data: "edit_year" },
      ],
      [
        { text: "🖼 تغییر کاور", callback_data: "edit_cover" },
        { text: "✂️ برش آهنگ", callback_data: "edit_cut" },
      ],
      [{ text: "✅ اعمال تغییرات و دریافت فایل", callback_data: "apply_changes" }],
      [{ text: "❌ لغو", callback_data: "cancel" }],
    ],
  };
}

function getSessionSummary(session: UserSession): string {
  const lines: string[] = ["📋 *وضعیت فعلی ویرایش‌ها:*\n"];

  if (session.fileName) lines.push(`📁 فایل: \`${session.fileName}\``);
  if (session.title) lines.push(`🎤 نام آهنگ: \`${session.title}\``);
  if (session.artist) lines.push(`👤 خواننده: \`${session.artist}\``);
  if (session.album) lines.push(`💿 آلبوم: \`${session.album}\``);
  if (session.year) lines.push(`📅 سال: \`${session.year}\``);
  if (session.coverFileId) lines.push(`🖼 کاور: ✅ تنظیم شده`);
  if (session.cutStart && session.cutEnd) {
    lines.push(`✂️ برش: از \`${session.cutStart}\` تا \`${session.cutEnd}\``);
  }

  lines.push("\n*یک گزینه رو انتخاب کنید:*");

  return lines.join("\n");
}

export async function handleAudio(bot: TgBotInstance, msg: TgMessage) {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;
  if (!userId) return;

  let fileId: string | undefined;
  let fileName: string | undefined;

  if (msg.audio) {
    fileId = msg.audio.file_id;
    fileName = msg.audio.file_name || msg.audio.title || "audio.mp3";
  } else if (msg.document) {
    fileId = msg.document.file_id;
    fileName = msg.document.file_name || "audio.mp3";
  } else if (msg.voice) {
    fileId = msg.voice.file_id;
    fileName = "voice.ogg";
  }

  if (!fileId) return;

  const session = getOrCreateSession(userId);
  session.state = "audio_received";
  session.fileId = fileId;
  session.fileName = fileName;
  session.title = msg.audio?.title || undefined;
  session.artist = msg.audio?.performer || undefined;

  const text = `🎵 *فایل دریافت شد!*\n\n📁 نام فایل: \`${fileName}\`\n${
    session.title ? `🎤 نام آهنگ: \`${session.title}\`\n` : ""
  }${session.artist ? `👤 خواننده: \`${session.artist}\`\n` : ""}\n*چه تغییری می‌خواهید بدید؟*`;

  bot.sendMessage(chatId, text, {
    parse_mode: "Markdown",
    reply_markup: getEditMenuKeyboard(),
  });
}

export async function handlePhoto(bot: TgBotInstance, msg: TgMessage) {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;
  if (!userId) return;

  const session = sessions.get(userId);
  if (!session || session.state !== "waiting_cover") {
    return;
  }

  const photo = msg.photo?.[msg.photo.length - 1];
  if (!photo) return;

  session.coverFileId = photo.file_id;
  session.state = "audio_received";

  const summary = getSessionSummary(session);
  bot.sendMessage(chatId, `✅ کاور جدید تنظیم شد!\n\n${summary}`, {
    parse_mode: "Markdown",
    reply_markup: getEditMenuKeyboard(),
  });
}

export async function handleCallbackQuery(
  bot: TgBotInstance,
  query: TgCallbackQuery
) {
  const chatId = query.message?.chat.id;
  const userId = query.from.id;
  if (!chatId) return;

  bot.answerCallbackQuery(query.id);

  const session = getOrCreateSession(userId);

  switch (query.data) {
    case "edit_title":
      session.state = "waiting_title";
      bot.sendMessage(chatId, "🎤 *نام جدید آهنگ رو بفرستید:*", {
        parse_mode: "Markdown",
      });
      break;

    case "edit_artist":
      session.state = "waiting_artist";
      bot.sendMessage(chatId, "👤 *نام خواننده جدید رو بفرستید:*", {
        parse_mode: "Markdown",
      });
      break;

    case "edit_album":
      session.state = "waiting_album";
      bot.sendMessage(chatId, "💿 *نام آلبوم جدید رو بفرستید:*", {
        parse_mode: "Markdown",
      });
      break;

    case "edit_year":
      session.state = "waiting_year";
      bot.sendMessage(chatId, "📅 *سال انتشار رو بفرستید (مثلاً: 2024):*", {
        parse_mode: "Markdown",
      });
      break;

    case "edit_cover":
      session.state = "waiting_cover";
      bot.sendMessage(chatId, "🖼 *عکس کاور جدید رو بفرستید:*\n(یک عکس ارسال کنید)", {
        parse_mode: "Markdown",
      });
      break;

    case "edit_cut":
      session.state = "waiting_cut_start";
      bot.sendMessage(
        chatId,
        "✂️ *زمان شروع برش رو وارد کنید:*\n\nفرمت: `دقیقه:ثانیه` (مثلاً: `0:30` یا `1:45`)",
        { parse_mode: "Markdown" }
      );
      break;

    case "apply_changes":
      if (!session.fileId) {
        bot.sendMessage(chatId, "❌ ابتدا یک فایل صوتی ارسال کنید.");
        return;
      }

      {
        const hasEdits =
          session.title ||
          session.artist ||
          session.album ||
          session.year ||
          session.coverFileId ||
          (session.cutStart && session.cutEnd);

        if (!hasEdits) {
          bot.sendMessage(chatId, "⚠️ هیچ تغییری انتخاب نشده! یک گزینه رو انتخاب کنید.", {
            reply_markup: getEditMenuKeyboard(),
          });
          return;
        }
      }

      bot.sendMessage(chatId, "⏳ *در حال پردازش...*\nلطفاً صبر کنید.", {
        parse_mode: "Markdown",
      });

      try {
        const existingUsers = await db
          .select()
          .from(users)
          .where(eq(users.telegramId, userId))
          .limit(1);

        let dbUserId = existingUsers[0]?.id;
        if (!dbUserId) {
          const inserted = await db
            .insert(users)
            .values({
              telegramId: userId,
              username: query.from.username || null,
              firstName: query.from.first_name || null,
              lastName: query.from.last_name || null,
            })
            .returning({ id: users.id });
          dbUserId = inserted[0].id;
        }

        let editType = "full_edit";
        if (session.cutStart && session.cutEnd) editType = "cut";
        else if (session.title && !session.artist) editType = "rename";

        await db.insert(editTasks).values({
          userId: dbUserId,
          telegramId: userId,
          originalFileName: session.fileName || "unknown",
          editType,
          status: "processing",
        });

        await processAudioEdit(bot, chatId, userId, session);

        session.state = "idle";
        sessions.delete(userId);
      } catch (error: unknown) {
        console.error("Processing error:", error);
        const errMsg = error instanceof Error ? error.message : "Unknown error";
        bot.sendMessage(
          chatId,
          `❌ *خطا در پردازش:*\n\`${errMsg}\`\n\nلطفاً دوباره تلاش کنید.`,
          { parse_mode: "Markdown" }
        );
      }
      break;

    case "cancel":
      sessions.delete(userId);
      bot.sendMessage(chatId, "❌ عملیات لغو شد.\n\nبرای شروع مجدد یک فایل صوتی ارسال کنید.");
      break;
  }
}

export async function handleTextMessage(
  bot: TgBotInstance,
  msg: TgMessage
) {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;
  if (!userId || !msg.text) return;

  const session = sessions.get(userId);
  if (!session) {
    bot.sendMessage(
      chatId,
      "📤 برای شروع، یک فایل صوتی (MP3) ارسال کنید.\n\nیا از /start استفاده کنید."
    );
    return;
  }

  switch (session.state) {
    case "waiting_title":
      session.title = msg.text;
      session.state = "audio_received";
      bot.sendMessage(chatId, `✅ نام آهنگ به «${msg.text}» تغییر خواهد کرد.\n\n${getSessionSummary(session)}`, {
        parse_mode: "Markdown",
        reply_markup: getEditMenuKeyboard(),
      });
      break;

    case "waiting_artist":
      session.artist = msg.text;
      session.state = "audio_received";
      bot.sendMessage(chatId, `✅ نام خواننده به «${msg.text}» تغییر خواهد کرد.\n\n${getSessionSummary(session)}`, {
        parse_mode: "Markdown",
        reply_markup: getEditMenuKeyboard(),
      });
      break;

    case "waiting_album":
      session.album = msg.text;
      session.state = "audio_received";
      bot.sendMessage(chatId, `✅ نام آلبوم به «${msg.text}» تغییر خواهد کرد.\n\n${getSessionSummary(session)}`, {
        parse_mode: "Markdown",
        reply_markup: getEditMenuKeyboard(),
      });
      break;

    case "waiting_year":
      if (!/^\d{4}$/.test(msg.text)) {
        bot.sendMessage(chatId, "⚠️ لطفاً یک سال معتبر وارد کنید (مثلاً: 2024)");
        return;
      }
      session.year = msg.text;
      session.state = "audio_received";
      bot.sendMessage(chatId, `✅ سال انتشار به «${msg.text}» تغییر خواهد کرد.\n\n${getSessionSummary(session)}`, {
        parse_mode: "Markdown",
        reply_markup: getEditMenuKeyboard(),
      });
      break;

    case "waiting_cut_end": {
      const endMatch = msg.text.match(/^(\d+):(\d{1,2})$/);
      if (!endMatch) {
        bot.sendMessage(chatId, "⚠️ فرمت نادرست! مثال: `2:00`", {
          parse_mode: "Markdown",
        });
        return;
      }
      session.cutEnd = msg.text;
      session.state = "audio_received";
      bot.sendMessage(
        chatId,
        `✅ برش تنظیم شد: از \`${session.cutStart}\` تا \`${msg.text}\`\n\n${getSessionSummary(session)}`,
        {
          parse_mode: "Markdown",
          reply_markup: getEditMenuKeyboard(),
        }
      );
      break;
    }

    default:
      bot.sendMessage(chatId, "📤 یک فایل صوتی (MP3) ارسال کنید تا ویرایش رو شروع کنیم.");
      break;
  }
}
