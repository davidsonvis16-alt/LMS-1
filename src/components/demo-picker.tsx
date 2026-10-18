import Link from "next/link";
import { Icon } from "./icons";

/** Demo mode sign-in: pick a sample user instead of entering a password. */
export function DemoPicker({ next }: { next?: string }) {
  const q = next ? `&next=${encodeURIComponent(next)}` : "";
  const roles = [
    { as: "learner", t: "Learner", d: "Jane Wanjiku Kamau. One course finished with a certificate, HACCP part-way through." },
    { as: "owner", t: "Company owner", d: "Grace Achieng of Demo Beach Hotel. Staff seats, the invite link and team progress." },
    { as: "admin", t: "Aspire administrator", d: "Courses, slide uploads, questions flagged for review, payments, certificates and companies." },
  ];
  return (
    <div className="auth-card">
      <span className="micro" style={{ marginBottom: 16, color: "var(--amber)" }}>Demo mode · sample data</span>
      <h1>Choose who<br />to be.</h1>
      <p>No database is connected, so the platform runs on sample data. Payments are simulated and certificates are marked as demos.</p>
      <div className="roles">
        {roles.map((r, i) => (
          <a key={r.as} className="role" href={`/api/demo/login?as=${r.as}${q}`}>
            <span className="k">{String(i + 1).padStart(2, "0")}</span>
            <span><b>{r.t}</b><small>{r.d}</small></span>
            <Icon name="arrow" />
          </a>
        ))}
      </div>
      <p className="muted small" style={{ marginTop: 20 }}>Not sure where to start? <Link className="text-link" href="/preview">Open the review guide</Link>. Sample data resets when the server restarts.</p>
    </div>
  );
}
