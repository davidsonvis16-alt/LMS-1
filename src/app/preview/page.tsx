import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Icon } from "@/components/icons";
import { DEMO, supabaseAdmin } from "@/lib/supabase";
import { seatPrice } from "@/app/company-actions";

export const metadata: Metadata = { title: "Review guide", robots: { index: false } };
export const dynamic = "force-dynamic";

type Screen = { label: string; path: string; note?: string };
const go = (as: string, path: string) => `/api/demo/login?as=${as}&next=${encodeURIComponent(path)}`;

/** Demo mode only: every screen, grouped by role, for a client review. */
export default async function Preview() {
  if (!DEMO) notFound();
  const db = supabaseAdmin();
  const [{ data: courses }, { count: flagged }, price] = await Promise.all([
    db.from("courses").select("id,slug,title,slide_count,certificate_price_usd").order("sort"),
    db.from("questions").select("id", { count: "exact", head: true }).not("review_note", "is", null),
    seatPrice(),
  ]);
  const list = courses ?? [];
  const haccp = list.find((c) => c.slug === "haccp-principles");
  const firstCourse = list[0];

  const roles: { as: string; title: string; who: string; screens: Screen[] }[] = [
    {
      as: "visitor", title: "Visitor", who: "Anyone on the public website, not signed in.",
      screens: [
        { label: "Homepage", path: "/" },
        { label: "Course catalogue", path: "/courses", note: "Filter by category" },
        ...(firstCourse ? [{ label: "A course page", path: `/courses/${firstCourse.slug}` }] : []),
        { label: "Company accounts", path: "/business" },
        { label: "Verify a certificate", path: "/verify/DEMO-2026-JWK001", note: "A demo certificate on record" },
        { label: "Verification: not found", path: "/verify/ASH-0000-NOPE00" },
        { label: "Staff invite link", path: "/join/DEMOHOTL" },
      ],
    },
    {
      as: "learner", title: "Learner", who: "Jane: one course certified, HACCP part-way through.",
      screens: [
        { label: "Dashboard", path: "/dashboard" },
        ...(haccp ? [
          { label: "Course progress", path: "/learn/haccp-principles" },
          { label: "Slide viewer", path: "/learn/haccp-principles/m/2", note: "Arrow keys, swipe, full screen" },
          { label: "Knowledge check", path: "/learn/haccp-principles/m/1", note: "Open the Knowledge check tab" },
        ] : []),
        { label: "My certificates", path: "/certificates", note: "Download the PDF" },
        { label: "Course with assignment", path: "/learn/personal-health-hygiene" },
        { label: "Account details", path: "/account" },
      ],
    },
    {
      as: "owner", title: "Company owner", who: "Grace from Demo Beach Hotel: seats, invite link, team.",
      screens: [
        { label: "Company dashboard", path: "/company", note: "Seats, invite link, team table" },
        { label: "Her own learning", path: "/dashboard" },
      ],
    },
    {
      as: "admin", title: "Administrator", who: "Aspire staff: content, people, payments and certificates.",
      screens: [
        { label: "Overview & settings", path: "/admin" },
        { label: "Courses", path: "/admin/courses" },
        ...(haccp ? [{ label: "Edit a course", path: `/admin/courses/${haccp.id}`, note: "Slides, modules, questions" }] : []),
        { label: "Learners", path: "/admin/learners" },
        { label: "Certificates", path: "/admin/certificates", note: "Revoke and restore" },
        { label: "Payments", path: "/admin/payments" },
        { label: "Companies", path: "/admin/companies" },
        { label: "Assignments", path: "/admin/submissions" },
      ],
    },
  ];

  const noSlides = list.filter((c) => !c.slide_count);
  const noPrice = list.filter((c) => c.certificate_price_usd == null);

  return (
    <>
      <SiteHeader />
      <main id="main">
        <section className="wrap ptop">
          <div className="ptop-grid">
            <span className="micro" style={{ color: "var(--amber)" }}>Demo mode · for client review</span>
            <h1 className="h-xl">Review<br />guide.</h1>
            <div className="ptop-aside">
              <p className="lede">Every screen, grouped by who sees it. Each link signs you in as that person and opens the page. Switch roles at any time from the bar at the bottom of the screen.</p>
            </div>
          </div>
        </section>
        <section className="wrap" style={{ paddingBottom: 96 }}>
          <div className="guide-roles">
            {roles.map((r, k) => (
              <div className="guide-role" key={r.as}>
                <span className="micro">{String(k + 1).padStart(2, "0")} · View as</span>
                <h2>{r.title}</h2>
                <p>{r.who}</p>
                <ol>
                  {r.screens.map((s, i) => (
                    <li key={s.path + s.label}>
                      <a href={go(r.as, s.path)}>
                        <span className="n">{String(i + 1).padStart(2, "0")}</span>
                        <span>{s.label}{s.note && <small>{s.note}</small>}</span>
                        <Icon name="arrow" />
                      </a>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>

          <div className="guide-missing">
            <span className="micro" style={{ padding: "20px 0 8px" }}>Still needed before launch</span>
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              <li><b>Live services.</b> Supabase and Paystack keys are not set, so this is a demo: nothing is saved permanently, no money moves, and certificates are stamped “Demo · not valid”.</li>
              {noSlides.length > 0 && <li><b>Slides for {noSlides.length} course{noSlides.length > 1 ? "s" : ""}:</b> {noSlides.map((c) => c.title).join(", ")}. Upload each deck as a PDF under Admin › Courses. The deck for “Food Hygiene &amp; Safety for Food Handlers” (Basic_Foundation_Food_Hygiene_Course) was not supplied.</li>}
              {noPrice.length > 0 && <li><b>Certificate fees.</b> Not set for {noPrice.length === list.length ? "any course" : `${noPrice.length} course${noPrice.length > 1 ? "s" : ""}`}. Learners see “price on request” until a fee is entered per course.</li>}
              {price == null && <li><b>Company seat price.</b> Not set. Enter it under Admin › Overview.</li>}
              {(flagged ?? 0) > 0 && <li><b>{flagged} quiz questions flagged for review.</b> Answer keys that need confirming against the decks. Open a course in Admin to review them.</li>}
            </ul>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
