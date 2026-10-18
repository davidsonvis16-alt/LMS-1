import { NextResponse } from "next/server";
import { DEMO } from "@/lib/supabase";
import { DEMO_USERS } from "@/lib/demo-db";

/** Demo mode only: sign in as a sample user (or sign out with as=visitor). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  if (!DEMO) return NextResponse.redirect(new URL("/login", url.origin));
  const as = url.searchParams.get("as") ?? "learner";
  const out = as === "visitor" || as === "out";
  const dest = out ? "/" : as === "admin" ? "/admin" : as === "owner" ? "/company" : "/dashboard";
  const raw = url.searchParams.get("next");
  const safe = raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : null;
  const res = NextResponse.redirect(new URL(safe && safe !== "/dashboard" ? safe : dest, url.origin));
  if (out) res.cookies.delete("demo_uid");
  else res.cookies.set("demo_uid", DEMO_USERS[as as keyof typeof DEMO_USERS] ?? DEMO_USERS.learner, { path: "/", httpOnly: true, sameSite: "lax" });
  return res;
}
