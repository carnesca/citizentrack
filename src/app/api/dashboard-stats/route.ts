import { NextResponse } from "next/server";
import { getDashboardStats } from "@/lib/data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  return NextResponse.json(await getDashboardStats(), {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
