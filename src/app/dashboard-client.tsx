"use client";

import { useState } from "react";

interface RecentTask {
  id: number;
  originalFileName: string | null;
  editType: string;
  status: string;
  createdAt: Date;
}

interface DashboardProps {
  stats: {
    totalUsers: number;
    totalTasks: number;
    recentTasks: RecentTask[];
  };
  hasToken: boolean;
}

const editTypeLabels: Record<string, string> = {
  rename: "تغییر نام",
  artist: "تغییر خواننده",
  album: "تغییر آلبوم",
  cover: "تغییر کاور",
  year: "تغییر سال",
  cut: "برش آهنگ",
  full_edit: "ویرایش کامل",
};

const statusLabels: Record<string, { text: string; color: string }> = {
  pending: { text: "در انتظار", color: "bg-yellow-500" },
  processing: { text: "در حال پردازش", color: "bg-blue-500" },
  done: { text: "انجام شده", color: "bg-green-500" },
  error: { text: "خطا", color: "bg-red-500" },
};

export default function Dashboard({ stats, hasToken }: DashboardProps) {
  const [botStatus, setBotStatus] = useState<"stopped" | "starting" | "running" | "error">("stopped");
  const [statusMessage, setStatusMessage] = useState("");

  const startBot = async () => {
    setBotStatus("starting");
    setStatusMessage("در حال شروع ربات...");

    try {
      const res = await fetch("/api/bot/start", { method: "POST" });
      const data = await res.json();

      if (data.status === "started" || data.status === "already_running") {
        setBotStatus("running");
        setStatusMessage("✅ ربات با موفقیت شروع شد!");
      } else {
        setBotStatus("error");
        setStatusMessage(`❌ ${data.message}`);
      }
    } catch (err) {
      setBotStatus("error");
      setStatusMessage("❌ خطا در اتصال به سرور");
    }
  };

  const checkStatus = async () => {
    try {
      const res = await fetch("/api/bot/start");
      const data = await res.json();
      if (data.status === "running") {
        setBotStatus("running");
        setStatusMessage("✅ ربات فعال است");
      } else {
        setBotStatus("stopped");
        setStatusMessage("⏹ ربات متوقف است");
      }
    } catch {
      setStatusMessage("❌ خطا در بررسی وضعیت");
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* Header */}
      <header className="text-center mb-12 animate-slide-up">
        <div className="text-6xl mb-4 animate-float">🎵</div>
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent mb-4">
          ربات ویرایش موسیقی
        </h1>
        <p className="text-gray-300 text-lg md:text-xl max-w-2xl mx-auto">
          ربات تلگرام برای ویرایش فایل‌های موسیقی - تغییر نام، خواننده، کاور و برش آهنگ
        </p>
      </header>

      {/* Bot Control Panel */}
      <div className="max-w-4xl mx-auto mb-12">
        <div className="glass-card rounded-2xl p-6 md:p-8 animate-pulse-glow">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            🤖 کنترل ربات
          </h2>

          {!hasToken ? (
            <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-4">
              <p className="text-red-300 font-medium">
                ⚠️ توکن ربات تلگرام تنظیم نشده!
              </p>
              <p className="text-red-200 text-sm mt-2">
                متغیر محیطی <code className="bg-red-500/30 px-2 py-0.5 rounded">TELEGRAM_BOT_TOKEN</code> را در فایل <code className="bg-red-500/30 px-2 py-0.5 rounded">.env</code> تنظیم کنید.
              </p>
              <div className="mt-3 bg-black/30 rounded-lg p-3 font-mono text-sm">
                TELEGRAM_BOT_TOKEN=your_bot_token_here
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-4 items-center">
              <button
                onClick={startBot}
                disabled={botStatus === "starting" || botStatus === "running"}
                className={`px-6 py-3 rounded-xl font-bold text-lg transition-all duration-300 ${
                  botStatus === "running"
                    ? "bg-green-600 cursor-default"
                    : botStatus === "starting"
                    ? "bg-yellow-600 cursor-wait"
                    : "bg-purple-600 hover:bg-purple-500 hover:scale-105 cursor-pointer"
                }`}
              >
                {botStatus === "running"
                  ? "✅ فعال"
                  : botStatus === "starting"
                  ? "⏳ در حال شروع..."
                  : "🚀 شروع ربات"}
              </button>

              <button
                onClick={checkStatus}
                className="px-6 py-3 rounded-xl font-medium bg-gray-700 hover:bg-gray-600 transition-all cursor-pointer"
              >
                🔄 بررسی وضعیت
              </button>

              {statusMessage && (
                <span className="text-sm text-gray-300">{statusMessage}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Features */}
      <div className="max-w-4xl mx-auto mb-12">
        <h2 className="text-2xl font-bold mb-6 text-center">✨ قابلیت‌ها</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { icon: "🎤", title: "تغییر نام آهنگ", desc: "نام آهنگ رو عوض کنید" },
            { icon: "👤", title: "تغییر خواننده", desc: "نام خواننده رو تغییر بدید" },
            { icon: "💿", title: "تغییر آلبوم", desc: "نام آلبوم رو عوض کنید" },
            { icon: "📅", title: "تغییر سال", desc: "سال انتشار رو تغییر بدید" },
            { icon: "🖼", title: "تغییر کاور", desc: "عکس کاور آهنگ رو عوض کنید" },
            { icon: "✂️", title: "برش آهنگ", desc: "آهنگ رو از هر جایی کات کنید" },
          ].map((feature, i) => (
            <div
              key={i}
              className="glass-card rounded-xl p-5 hover:bg-white/10 transition-all duration-300 hover:scale-105"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="text-3xl mb-3">{feature.icon}</div>
              <h3 className="font-bold text-lg mb-1">{feature.title}</h3>
              <p className="text-gray-400 text-sm">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-4xl mx-auto mb-12">
        <h2 className="text-2xl font-bold mb-6 text-center">📊 آمار</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="glass-card rounded-xl p-6 text-center">
            <div className="text-4xl font-bold text-purple-400 mb-2">
              {stats.totalUsers}
            </div>
            <div className="text-gray-300">👥 کاربران</div>
          </div>
          <div className="glass-card rounded-xl p-6 text-center">
            <div className="text-4xl font-bold text-pink-400 mb-2">
              {stats.totalTasks}
            </div>
            <div className="text-gray-300">🎵 ویرایش‌ها</div>
          </div>
        </div>
      </div>

      {/* Recent Tasks */}
      {stats.recentTasks.length > 0 && (
        <div className="max-w-4xl mx-auto mb-12">
          <h2 className="text-2xl font-bold mb-6 text-center">📋 آخرین ویرایش‌ها</h2>
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-right p-4 text-gray-400 font-medium">#</th>
                    <th className="text-right p-4 text-gray-400 font-medium">فایل</th>
                    <th className="text-right p-4 text-gray-400 font-medium">نوع</th>
                    <th className="text-right p-4 text-gray-400 font-medium">وضعیت</th>
                    <th className="text-right p-4 text-gray-400 font-medium">تاریخ</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentTasks.map((task, i) => {
                    const status = statusLabels[task.status] || {
                      text: task.status,
                      color: "bg-gray-500",
                    };
                    return (
                      <tr
                        key={task.id}
                        className="border-b border-white/5 hover:bg-white/5 transition"
                      >
                        <td className="p-4 text-gray-500">{i + 1}</td>
                        <td className="p-4 text-sm">
                          {task.originalFileName || "—"}
                        </td>
                        <td className="p-4 text-sm">
                          {editTypeLabels[task.editType] || task.editType}
                        </td>
                        <td className="p-4">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${status.color}`}
                          >
                            {status.text}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-gray-400">
                          {new Date(task.createdAt).toLocaleDateString("fa-IR")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* How to Use */}
      <div className="max-w-4xl mx-auto mb-12">
        <h2 className="text-2xl font-bold mb-6 text-center">📖 نحوه استفاده</h2>
        <div className="glass-card rounded-xl p-6 md:p-8">
          <div className="space-y-4">
            {[
              { step: "۱", text: "ابتدا ربات رو از دکمه بالا فعال کنید" },
              { step: "۲", text: "در تلگرام به ربات پیام /start بفرستید" },
              { step: "۳", text: "یک فایل موسیقی (MP3) ارسال کنید" },
              { step: "۴", text: "از دکمه‌های موجود، تغییرات دلخواه رو اعمال کنید" },
              { step: "۵", text: "دکمه «اعمال تغییرات» رو بزنید و فایل ویرایش شده رو دریافت کنید!" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0 font-bold">
                  {item.step}
                </div>
                <p className="text-gray-300 pt-1">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-8 text-gray-500 text-sm">
        <p>ساخته شده با ❤️ | ربات ویرایش موسیقی تلگرام</p>
      </footer>
    </div>
  );
}
