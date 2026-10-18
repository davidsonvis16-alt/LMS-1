import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { DEMO } from "@/lib/supabase";
import { demoSlidePath } from "@/lib/demo-db";
import { getSession } from "@/lib/auth";

// Demo mode only: slides uploaded in admin are saved under .demo/slides in the project folder.
export async function GET(_: Request, { params }: { params: Promise<{ path: string[] }> }) {
  if (!DEMO) return new NextResponse("Not found", { status: 404 });
  const file = demoSlidePath((await params).path);
  if (!file || !fs.existsSync(file)) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(new Uint8Array(fs.readFileSync(file)), { headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=3600" } });
}

export async function POST(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  if (!DEMO) return new NextResponse("Not found", { status: 404 });
  const { profile } = await getSession();
  if (profile?.role !== "admin") return new NextResponse("Forbidden", { status: 403 });
  const file = demoSlidePath((await params).path);
  if (!file) return new NextResponse("Bad path", { status: 400 });
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.from(await req.arrayBuffer()));
  return NextResponse.json({ ok: true });
}
