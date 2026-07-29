import { db } from "@/db";
import { users, editTasks } from "@/db/schema";
import { sql } from "drizzle-orm";
import Dashboard from "./dashboard-client";

export const dynamic = "force-dynamic";

async function getStats() {
  try {
    const [userCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users);

    const [taskCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(editTasks);

    const recentTasks = await db
      .select({
        id: editTasks.id,
        originalFileName: editTasks.originalFileName,
        editType: editTasks.editType,
        status: editTasks.status,
        createdAt: editTasks.createdAt,
      })
      .from(editTasks)
      .orderBy(sql`${editTasks.createdAt} DESC`)
      .limit(10);

    return {
      totalUsers: userCount?.count ?? 0,
      totalTasks: taskCount?.count ?? 0,
      recentTasks,
    };
  } catch {
    return { totalUsers: 0, totalTasks: 0, recentTasks: [] };
  }
}

export default async function HomePage() {
  const stats = await getStats();
  const hasToken = !!process.env.TELEGRAM_BOT_TOKEN;

  return <Dashboard stats={stats} hasToken={hasToken} />;
}
