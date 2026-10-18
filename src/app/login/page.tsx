import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { DemoPicker } from "@/components/demo-picker";
import { AuthFrame } from "@/components/auth-aside";
import { DEMO } from "@/lib/supabase";

export const metadata: Metadata = { title: "Sign in" };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <AuthFrame>{DEMO ? <DemoPicker next={next} /> : <Suspense><AuthForm mode="login" /></Suspense>}</AuthFrame>;
}
