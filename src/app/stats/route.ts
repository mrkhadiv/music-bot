import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, editTasks } from "@/db/schema";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
    const [userCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users);

    const [taskCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(editTasks);

    const [doneCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(editTasks)
      .where(sql`${editTasks.status} = 'processing' OR ${editTasks.status} = 'done'`);

    const recentTasks = await db
      .select()
      .from(editTasks)
      .orderBy(sql`${editTasks.createdAt} DESC`)
      .limit(10);

    return NextResponse.json({
      totalUsers: userCount.count,
      totalTasks: taskCount.count,
      completedTasks: doneCount.count,
      recentTasks,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
