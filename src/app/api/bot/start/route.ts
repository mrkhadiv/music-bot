import { NextResponse } from "next/server";
import { initBot, getBot } from "@/lib/bot";

export async function POST() {
  try {
    const bot = getBot();
    if (bot) {
      return NextResponse.json({ status: "already_running", message: "Bot is already running" });
    }

    const newBot = initBot();
    if (!newBot) {
      return NextResponse.json(
        { status: "error", message: "TELEGRAM_BOT_TOKEN is not configured" },
        { status: 400 }
      );
    }

    return NextResponse.json({ status: "started", message: "Bot started successfully" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ status: "error", message }, { status: 500 });
  }
}

export async function GET() {
  const bot = getBot();
  return NextResponse.json({
    status: bot ? "running" : "stopped",
    hasToken: !!process.env.TELEGRAM_BOT_TOKEN,
  });
}
