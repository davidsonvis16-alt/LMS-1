"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { DEMO, supabaseAdmin, supabaseServer } from "@/lib/supabase";
import { requireUser } from "@/lib/auth";

export async function enrol(formData: FormData) {
  const slug = String(formData.get("slug"));
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect(`/signup?next=${encodeURIComponent(`/courses/${slug}`)}`);
  const admin = supabaseAdmin();
  const { data: course } = await admin.from("courses").select("id").eq("slug", slug).eq("published", true).single();
  if (!course) redirect("/courses");
  await admin.from("enrollments").upsert({ user_id: user.id, course_id: course.id }, { onConflict: "user_id,course_id", ignoreDuplicates: true });
  redirect(`/learn/${slug}`);
}

export async function signOut() {
  if (DEMO) { (await cookies()).delete("demo_uid"); redirect("/"); }
  const sb = await supabaseServer();
  await sb.auth.signOut();
  redirect("/");
}

export async function updateProfile(formData: FormData) {
  const { user } = await requireUser("/account");
  const clean = (k: string, max = 120) => String(formData.get(k) ?? "").trim().slice(0, max) || null;
  await supabaseAdmin().from("profiles").update({
    full_name: clean("full_name"), id_number: clean("id_number", 40), phone: clean("phone", 30), country: clean("country", 60),
  }).eq("id", user.id);
  revalidatePath("/account");
  const next = String(formData.get("next") ?? "");
  redirect(next.startsWith("/") ? next : "/account?saved=1");
}

export async function saveAssignment(formData: FormData) {
  const { user } = await requireUser();
  const courseId = String(formData.get("course_id"));
  const slug = String(formData.get("slug"));
  const body = String(formData.get("body") ?? "").trim().slice(0, 20000);
  if (body) await supabaseAdmin().from("assignment_submissions").upsert({ user_id: user.id, course_id: courseId, body, updated_at: new Date().toISOString() });
  redirect(`/learn/${slug}?assignment=saved`);
}
