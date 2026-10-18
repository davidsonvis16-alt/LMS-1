/**
 * DEMO MODE: an in-memory stand-in for Supabase, used when NEXT_PUBLIC_SUPABASE_URL is not set.
 * Implements just the query-builder calls this app uses. Data lives in server memory and resets on restart.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import courses from "../../content/courses.json";

type Row = Record<string, unknown>;
type DB = Record<string, Row[]>;

const now = () => new Date().toISOString();
const uuid = () => crypto.randomUUID();
/** Stable ids for seeded rows, so slides saved on disk still match after a restart. */
const stableId = (key: string) => { const h = crypto.createHash("md5").update(key).digest("hex"); return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`; };
export const DEMO_DIR = path.join(process.cwd(), ".demo", "slides");
function readMeta(courseId: string): { version: number; count: number } | null {
  try { return JSON.parse(fs.readFileSync(path.join(DEMO_DIR, courseId, "meta.json"), "utf8")); } catch { return null; }
}
export function writeMeta(courseId: string, version: number, count: number) {
  fs.mkdirSync(path.join(DEMO_DIR, courseId), { recursive: true });
  fs.writeFileSync(path.join(DEMO_DIR, courseId, "meta.json"), JSON.stringify({ version, count }));
}

const DEFAULTS: Record<string, () => Row> = {
  courses: () => ({ categories: [], topics: [], slide_count: 0, slides_version: 0, published: false, sort: 0, certificate_price_usd: null, assignment: null, summary: null, category: "food-safety", created_at: now() }),
  modules: () => ({ extra_pages: [], video_url: null, page_from: 1, page_to: 1 }),
  questions: () => ({ in_final: true, position: 0, review_note: null, source: "admin", module_id: null }),
  profiles: () => ({ role: "learner", company_id: null, company_role: null, country: "Kenya", id_number: null, phone: null, created_at: now() }),
  companies: () => ({ seats: 0, paid_until: null, join_code: crypto.randomBytes(4).toString("hex").toUpperCase(), created_at: now() }),
  certificates: () => ({ revoked: false, issued_at: now(), modules: [], company_name: null, payment_id: null }),
  payments: () => ({ status: "pending", created_at: now(), paid_at: null, channel: null }),
  enrollments: () => ({ created_at: now() }),
  exam_attempts: () => ({ created_at: now() }),
  module_progress: () => ({ viewed_upto: 0, quiz_best: null, completed_at: null }),
  assignment_submissions: () => ({ updated_at: now() }),
  settings: () => ({}),
};
const KEYS: Record<string, string[]> = {
  enrollments: ["user_id", "course_id"], module_progress: ["user_id", "module_id"], assignment_submissions: ["user_id", "course_id"], settings: ["key"],
};
// relation name -> how to join, per table
const REL: Record<string, Record<string, { table: string; local: string; foreign: string; many: boolean }>> = {
  courses: { modules: { table: "modules", local: "id", foreign: "course_id", many: true }, questions: { table: "questions", local: "id", foreign: "course_id", many: true } },
  enrollments: { courses: { table: "courses", local: "course_id", foreign: "id", many: false } },
  payments: { profiles: { table: "profiles", local: "user_id", foreign: "id", many: false }, courses: { table: "courses", local: "course_id", foreign: "id", many: false }, companies: { table: "companies", local: "company_id", foreign: "id", many: false } },
  profiles: { companies: { table: "companies", local: "company_id", foreign: "id", many: false } },
  companies: { profiles: { table: "profiles", local: "id", foreign: "company_id", many: true } },
  assignment_submissions: { profiles: { table: "profiles", local: "user_id", foreign: "id", many: false }, courses: { table: "courses", local: "course_id", foreign: "id", many: false } },
};

export const DEMO_USERS = {
  learner: "00000000-0000-4000-8000-000000000001",
  admin: "00000000-0000-4000-8000-000000000002",
  owner: "00000000-0000-4000-8000-000000000003",
};

function build(): DB {
  const db: DB = Object.fromEntries(Object.keys(DEFAULTS).map((k) => [k, []]));
  const until = new Date(); until.setFullYear(until.getFullYear() + 1);
  const companyId = uuid();
  db.companies.push({ ...DEFAULTS.companies(), id: companyId, name: "Demo Beach Hotel", contact_name: "Grace Achieng", email: "owner@demo.test", phone: "+254700000000", seats: 25, paid_until: until.toISOString().slice(0, 10), join_code: "DEMOHOTL", owner_id: DEMO_USERS.owner });
  db.profiles.push(
    { ...DEFAULTS.profiles(), id: DEMO_USERS.learner, email: "learner@demo.test", full_name: "Jane Wanjiku Kamau", id_number: "32456789", phone: "+254711000000" },
    { ...DEFAULTS.profiles(), id: DEMO_USERS.admin, email: "Aspiresafetystandards@gmail.com", full_name: "Aspire Admin", role: "admin" },
    { ...DEFAULTS.profiles(), id: DEMO_USERS.owner, email: "owner@demo.test", full_name: "Grace Achieng", id_number: "29876543", company_id: companyId, company_role: "owner" },
  );
  (courses as unknown as { slug: string; title: string; category: string; categories: string[]; summary: string; topics: string[]; assignment: string | null; modules: { title: string; pages: number[]; extra_pages?: number[]; quiz: { prompt: string; options: string[]; answer: number[]; source: string; review?: string }[] }[] }[])
    .forEach((c, ci) => {
      const cid = stableId(c.slug);
      const meta = readMeta(cid);
      db.courses.push({ ...DEFAULTS.courses(), id: cid, slide_count: meta?.count ?? 0, slides_version: meta?.version ?? 0, slug: c.slug, title: c.title, category: c.category, categories: c.categories, summary: c.summary, topics: c.topics, assignment: c.assignment, published: true, sort: ci + 1 });
      let pos = 0;
      c.modules.forEach((m, mi) => {
        const mid = stableId(`${c.slug}#${mi + 1}`);
        db.modules.push({ ...DEFAULTS.modules(), id: mid, course_id: cid, position: mi + 1, title: m.title, page_from: m.pages[0], page_to: m.pages[1], extra_pages: m.extra_pages ?? [] });
        m.quiz.forEach((q) => db.questions.push({ ...DEFAULTS.questions(), id: uuid(), course_id: cid, module_id: mid, position: ++pos, prompt: q.prompt, options: q.options, answer: q.answer, source: q.source, review_note: q.review ?? null }));
      });
    });
  // The demo learner has finished Personal Hygiene (with a certificate) and is part-way through HACCP.
  const ph = db.courses.find((c) => c.slug === "personal-health-hygiene")!;
  const haccp = db.courses.find((c) => c.slug === "haccp-principles")!;
  for (const c of [ph, haccp]) db.enrollments.push({ user_id: DEMO_USERS.learner, course_id: c.id, created_at: now() });
  for (const m of db.modules.filter((m) => m.course_id === ph.id)) db.module_progress.push({ user_id: DEMO_USERS.learner, module_id: m.id, course_id: ph.id, viewed_upto: 20, quiz_best: 90, completed_at: now() });
  const hm = db.modules.filter((m) => m.course_id === haccp.id).sort((a, b) => Number(a.position) - Number(b.position));
  db.module_progress.push({ user_id: DEMO_USERS.learner, module_id: hm[0].id, course_id: haccp.id, viewed_upto: 20, quiz_best: 75, completed_at: now() });
  db.module_progress.push({ user_id: DEMO_USERS.learner, module_id: hm[1].id, course_id: haccp.id, viewed_upto: 4, quiz_best: null, completed_at: null });
  db.exam_attempts.push({ id: uuid(), user_id: DEMO_USERS.learner, course_id: ph.id, score: 90, passed: true, created_at: now() });
  db.certificates.push({ ...DEFAULTS.certificates(), id: uuid(), serial: "DEMO-2026-JWK001", user_id: DEMO_USERS.learner, course_id: ph.id, full_name: "Jane Wanjiku Kamau", id_number: "32456789", course_title: String(ph.title), modules: db.modules.filter((m) => m.course_id === ph.id).map((m) => m.title), score: 90 });
  db.settings.push({ key: "seat_price_usd", value: null });
  return db;
}

const g = globalThis as unknown as { __aspireDemo?: DB };
export const demoDb = () => (g.__aspireDemo ??= build());

/** Demo slide storage on disk (.demo/slides/<courseId>/v<n>/<page>.webp). */
export function demoSlidePath(parts: string[]) {
  const safe = parts.filter((p) => /^[A-Za-z0-9._-]+$/.test(p) && p !== "..");
  if (safe.length !== parts.length) return null;
  return path.join(DEMO_DIR, ...safe);
}

// ---------------- query builder ----------------
type Filter = (r: Row) => boolean;
type Sel = { field: string; rel?: { name: string; fields: Sel[] } };

function parseSelect(s: string): Sel[] {
  const out: Sel[] = []; let i = 0;
  const read = (): Sel[] => {
    const list: Sel[] = []; let tok = "";
    while (i < s.length) {
      const ch = s[i++];
      if (ch === "(") { const name = tok.trim().split("!")[0]; tok = ""; list.push({ field: name, rel: { name, fields: read() } }); }
      else if (ch === ")") { if (tok.trim()) list.push({ field: tok.trim() }); return list; }
      else if (ch === ",") { if (tok.trim()) list.push({ field: tok.trim() }); tok = ""; }
      else tok += ch;
    }
    if (tok.trim()) list.push({ field: tok.trim() });
    return list;
  };
  out.push(...read());
  return out;
}

function project(db: DB, table: string, row: Row, sel: Sel[]): Row {
  const out: Row = {};
  for (const s of sel) {
    if (s.rel) {
      const rel = REL[table]?.[s.rel.name];
      if (!rel) continue;
      const matches = db[rel.table].filter((x) => x[rel.foreign] === row[rel.local]);
      if (s.rel.fields.length === 1 && s.rel.fields[0].field === "count") { out[s.rel.name] = [{ count: matches.length }]; continue; }
      const proj = (x: Row) => project(db, rel.table, x, s.rel!.fields);
      out[s.rel.name] = rel.many ? matches.map(proj) : matches[0] ? proj(matches[0]) : null;
    } else if (s.field === "*") Object.assign(out, structuredClone(row));
    else out[s.field] = structuredClone(row[s.field]);
  }
  return out;
}

class Query implements PromiseLike<{ data: unknown; error: { message: string } | null; count?: number | null }> {
  private filters: Filter[] = [];
  private orders: { col: string; asc: boolean }[] = [];
  private lim?: number;
  private mode: "select" | "insert" | "update" | "upsert" | "delete" = "select";
  private sel: Sel[] = [{ field: "*" }];
  private returning = false;
  private head = false;
  private countMode = false;
  private payload: Row[] = [];
  private patch: Row = {};
  private one: "single" | "maybe" | null = null;
  private upsertOpts: { onConflict?: string; ignoreDuplicates?: boolean } = {};
  constructor(private table: string) {}

  select(cols = "*", opts?: { count?: string; head?: boolean }) {
    if (this.mode === "select") { this.sel = parseSelect(cols); this.countMode = !!opts?.count; this.head = !!opts?.head; }
    else { this.returning = true; this.sel = parseSelect(cols); }
    return this;
  }
  insert(rows: Row | Row[]) { this.mode = "insert"; this.payload = Array.isArray(rows) ? rows : [rows]; return this; }
  update(p: Row) { this.mode = "update"; this.patch = p; return this; }
  upsert(rows: Row | Row[], opts: { onConflict?: string; ignoreDuplicates?: boolean } = {}) { this.mode = "upsert"; this.payload = Array.isArray(rows) ? rows : [rows]; this.upsertOpts = opts; return this; }
  delete() { this.mode = "delete"; return this; }
  eq(c: string, v: unknown) { this.filters.push((r) => r[c] === v); return this; }
  neq(c: string, v: unknown) { this.filters.push((r) => r[c] !== v); return this; }
  in(c: string, vs: unknown[]) { this.filters.push((r) => vs.includes(r[c])); return this; }
  not(c: string, op: string, v: unknown) { this.filters.push((r) => (op === "is" && v === null ? r[c] != null : r[c] !== v)); return this; }
  ilike(c: string, pat: string) { const re = new RegExp("^" + pat.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*") + "$", "i"); this.filters.push((r) => re.test(String(r[c] ?? ""))); return this; }
  or(expr: string) {
    const parts = expr.split(",").map((p) => p.split(".")); // col.ilike.%x%
    this.filters.push((r) => parts.some(([c, , pat]) => new RegExp(pat.replace(/%/g, ".*"), "i").test(String(r[c] ?? ""))));
    return this;
  }
  order(c: string, o?: { ascending?: boolean }) { this.orders.push({ col: c, asc: o?.ascending !== false }); return this; }
  limit(n: number) { this.lim = n; return this; }
  single() { this.one = "single"; return this; }
  maybeSingle() { this.one = "maybe"; return this; }

  private run() {
    const db = demoDb(); const t = db[this.table] ??= [];
    const match = (r: Row) => this.filters.every((f) => f(r));
    let affected: Row[] = [];
    if (this.mode === "insert") {
      for (const p of this.payload) {
        const keys = KEYS[this.table];
        if (this.table === "certificates" && t.some((r) => r.serial === p.serial || (r.user_id === p.user_id && r.course_id === p.course_id)))
          return { data: null, error: { message: "duplicate key value violates unique constraint" } };
        if (keys && t.some((r) => keys.every((k) => r[k] === p[k]))) return { data: null, error: { message: "duplicate key value" } };
        const row: Row = { ...(DEFAULTS[this.table]?.() ?? {}), ...(KEYS[this.table] ? {} : { id: uuid() }), ...structuredClone(p) };
        t.push(row); affected.push(row);
      }
    } else if (this.mode === "upsert") {
      const keys = this.upsertOpts.onConflict?.split(",") ?? KEYS[this.table] ?? ["id"];
      for (const p of this.payload) {
        const ex = t.find((r) => keys.every((k) => r[k] === p[k]));
        if (ex) { if (!this.upsertOpts.ignoreDuplicates) Object.assign(ex, structuredClone(p)); affected.push(ex); }
        else { const row: Row = { ...(DEFAULTS[this.table]?.() ?? {}), ...structuredClone(p) }; if (!KEYS[this.table] && !row.id) row.id = uuid(); t.push(row); affected.push(row); }
      }
    } else if (this.mode === "update") {
      affected = t.filter(match); for (const r of affected) Object.assign(r, structuredClone(this.patch));
    } else if (this.mode === "delete") {
      affected = t.filter(match); db[this.table] = t.filter((r) => !match(r));
      // cascade the few relationships that matter
      if (this.table === "courses") for (const c of affected) for (const k of ["modules", "questions", "enrollments", "module_progress"]) db[k] = db[k].filter((r) => r.course_id !== c.id);
      if (this.table === "modules") for (const m of affected) { db.questions = db.questions.filter((q) => q.module_id !== m.id); db.module_progress = db.module_progress.filter((p) => p.module_id !== m.id); }
    } else {
      affected = t.filter(match);
    }
    if (this.mode !== "select" && !this.returning) return { data: null, error: null };
    let rows = [...affected];
    for (const o of [...this.orders].reverse()) rows.sort((a, b) => { const x = a[o.col] as never, y = b[o.col] as never; return (x > y ? 1 : x < y ? -1 : 0) * (o.asc ? 1 : -1); });
    if (this.lim != null) rows = rows.slice(0, this.lim);
    const count = rows.length;
    if (this.head) return { data: null, error: null, count };
    const data = rows.map((r) => project(db, this.table, r, this.sel));
    if (this.one) {
      if (data.length === 0) return this.one === "single" ? { data: null, error: { message: "No rows" } } : { data: null, error: null };
      return { data: data[0], error: null, count: this.countMode ? count : null };
    }
    return { data, error: null, count: this.countMode ? count : null };
  }

  then<A, B>(ok?: ((v: { data: unknown; error: { message: string } | null; count?: number | null }) => A | PromiseLike<A>) | null, bad?: ((e: unknown) => B | PromiseLike<B>) | null) {
    try { return Promise.resolve(this.run()).then(ok, bad); } catch (e) { return Promise.reject(e).then(ok, bad); }
  }
}

export function demoClient(uid: string | null) {
  return {
    from: (t: string) => new Query(t),
    auth: {
      getUser: async () => {
        const p = uid ? demoDb().profiles.find((x) => x.id === uid) : null;
        return { data: { user: p ? { id: String(p.id), email: String(p.email) } : null }, error: null };
      },
      signOut: async () => ({ error: null }),
      exchangeCodeForSession: async () => ({ error: null }),
    },
  };
}
