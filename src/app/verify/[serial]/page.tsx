import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CertificateView } from "@/components/certificate";
import { VerifyForm } from "@/components/forms";
import { Icon } from "@/components/icons";
import { DEMO, supabaseAdmin } from "@/lib/supabase";
import { SITE, maskId } from "@/lib/site";

export const metadata: Metadata = { title: "Certificate verification", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function VerifySerial({ params }: { params: Promise<{ serial: string }> }) {
  const serial = decodeURIComponent((await params).serial).trim().toUpperCase();
  const { data: c } = /^[A-Z0-9-]{6,40}$/.test(serial)
    ? await supabaseAdmin().from("certificates").select("serial,full_name,id_number,course_title,modules,score,issued_at,revoked,company_name").eq("serial", serial).maybeSingle()
    : { data: null };
  const valid = !!c && !c.revoked;
  const issued = c ? new Date(c.issued_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "";
  return (
    <>
      <SiteHeader current="verify" />
      <main id="main" className="verify-page">
        <div className="wrap">
          {DEMO && (
            <p className="demo-note"><b>Demo</b><span>This site is running on sample data. Certificates shown here are simulated and are not valid credentials.</span></p>
          )}
          <div className={`verdict ${valid ? "verdict--ok" : "verdict--bad"}`}>
            <span className="badge-ico"><Icon name={valid ? "check" : "close"} /></span>
            <div>
              <span className="eyebrow">{valid ? "Verified · on record" : c?.revoked ? "Revoked" : "Not found"} · <span className="mono">{serial}</span></span>
              <h1>{valid ? "This certificate is genuine." : c?.revoked ? "This certificate is no longer valid." : "We couldn't find that certificate."}</h1>
              <p>{valid
                ? <>Issued by {SITE.name} to <b>{c!.full_name}</b> for <b>{c!.course_title}</b> on {issued}, with a final mark of <b>{c!.score}%</b>.</>
                : c?.revoked ? <>Certificate {serial} was revoked by {SITE.name}. Contact us if you think this is a mistake.</>
                : <>No certificate has the number <b className="mono">{serial}</b>. Check the number and try again, or contact us.</>}
              </p>
            </div>
          </div>

          {valid && (
            <div className="verify-grid">
              <CertificateView c={{ serial: c!.serial, fullName: c!.full_name, idNumber: maskId(c!.id_number), course: c!.course_title, modules: c!.modules, score: c!.score, issuedAt: c!.issued_at, companyName: c!.company_name }} />
              <dl className="verify-facts">
                <div><dt>Certificate No.</dt><dd className="mono">{c!.serial}</dd></div>
                <div><dt>Holder</dt><dd>{c!.full_name}</dd></div>
                <div><dt>ID / Passport</dt><dd className="mono">{maskId(c!.id_number)}</dd></div>
                <div><dt>Course</dt><dd>{c!.course_title}</dd></div>
                <div><dt>Final mark</dt><dd>{c!.score}%</dd></div>
                <div><dt>Issued</dt><dd>{issued}</dd></div>
                {c!.company_name && <div><dt>Sponsored by</dt><dd>{c!.company_name}</dd></div>}
              </dl>
            </div>
          )}

          <div className="verify-again">
            <h2>Check another certificate</h2>
            <VerifyForm />
            <p className="muted small" style={{ marginTop: 16 }}>Questions? <Link className="text-link" href="/#contact">Contact {SITE.short}</Link></p>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
