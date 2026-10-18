import { NextResponse } from "next/server";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase";
import { grade, loadQuestions } from "@/lib/grading";
import { SITE, pagesOf } from "@/lib/site";

type Body =
  | { type: "progress"; moduleId: string; page: number }
  | { type: "quiz"; moduleId: string; answers: Record<string, number[]> }
  | { type: "exam"; courseId: string; answers: Record<string, number[]> };

export async function POST(req: Request) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const db = supabaseAdmin();

  if (body.type === "progress" || body.type === "quiz") {
    const { data: mod } = await db.from("modules").select("id,course_id,page_from,page_to,extra_pages").eq("id", body.moduleId).single();
    if (!mod) return NextResponse.json({ error: "Module not found" }, { status: 404 });
    const { data: enr } = await db.from("enrollments").select("course_id").eq("user_id", user.id).eq("course_id", mod.course_id).maybeSingle();
    if (!enr) return NextResponse.json({ error: "Not enrolled" }, { status: 403 });
    const { data: cur } = await db.from("module_progress").select("*").eq("user_id", user.id).eq("module_id", mod.id).maybeSingle();
    const slides = pagesOf(mod).length;

    if (body.type === "progress") {
      const page = Math.max(0, Math.min(slides, Math.floor(Number(body.page) || 0)));
      if (!cur || page > cur.viewed_upto) {
        await db.from("module_progress").upsert({ user_id: user.id, module_id: mod.id, course_id: mod.course_id, viewed_upto: Math.max(page, cur?.viewed_upto ?? 0), quiz_best: cur?.quiz_best ?? null, completed_at: cur?.completed_at ?? null });
      }
      return NextResponse.json({ ok: true });
    }

    // quiz
    const qs = await loadQuestions({ moduleId: mod.id });
    const g = grade(qs, body.answers ?? {});
    const best = Math.max(g.score, cur?.quiz_best ?? 0);
    // A module is complete once the learner has seen every slide and attempted its knowledge check.
    const seenAll = Math.max(cur?.viewed_upto ?? 0, slides) >= slides;
    await db.from("module_progress").upsert({
      user_id: user.id, module_id: mod.id, course_id: mod.course_id,
      viewed_upto: Math.max(cur?.viewed_upto ?? 0, slides), quiz_best: best,
      completed_at: cur?.completed_at ?? (seenAll ? new Date().toISOString() : null),
    });
    return NextResponse.json({ score: g.score, correct: g.correct, total: g.total, results: g.results });
  }

  if (body.type === "exam") {
    const { data: course } = await db.from("courses").select("id").eq("id", body.courseId).single();
    if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });
    const [{ count: modCount }, { count: doneCount }] = await Promise.all([
      db.from("modules").select("id", { count: "exact", head: true }).eq("course_id", course.id),
      db.from("module_progress").select("module_id", { count: "exact", head: true }).eq("course_id", course.id).eq("user_id", user.id).not("completed_at", "is", null),
    ]);
    if ((doneCount ?? 0) < (modCount ?? 0)) return NextResponse.json({ error: "Complete all modules first" }, { status: 403 });
    const qs = await loadQuestions({ courseId: course.id, finalOnly: true });
    const g = grade(qs, body.answers ?? {});
    const passed = g.score >= SITE.passMark;
    await db.from("exam_attempts").insert({ user_id: user.id, course_id: course.id, score: g.score, passed });
    // Final exam: report the score only, not which answers were right.
    return NextResponse.json({ score: g.score, correct: g.correct, total: g.total, passed });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
