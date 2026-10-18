"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type Role = "visitor" | "learner" | "owner" | "admin";
const ROLES: { as: Role; label: string; home: string }[] = [
  { as: "visitor", label: "Visitor", home: "/" },
  { as: "learner", label: "Learner", home: "/dashboard" },
  { as: "owner", label: "Company owner", home: "/company" },
  { as: "admin", label: "Admin", home: "/admin" },
];

/** Demo mode only: a persistent switcher so a reviewer can see every role without signing in. */
export function DemoBar({ role }: { role: Role | null }) {
  const path = usePathname();
  const [open, setOpen] = useState(true);
  useEffect(() => {
    try { if (localStorage.getItem("demo-bar") === "min") setOpen(false); } catch { /* storage unavailable */ }
  }, []);
  const toggle = (v: boolean) => { setOpen(v); try { localStorage.setItem("demo-bar", v ? "open" : "min"); } catch { /* ignore */ } };
  if (path?.startsWith("/learn/") && path.includes("/m/")) return null; // keep the slide viewer distraction-free

  if (!open) {
    return (
      <button type="button" className="demobar-min" onClick={() => toggle(true)} aria-label="Show demo role switcher">
        <i aria-hidden="true" />Demo · {ROLES.find((r) => r.as === role)?.label ?? "Visitor"}
      </button>
    );
  }
  return (
    <aside className="demobar" aria-label="Demo mode">
      <span className="demobar-tag"><i aria-hidden="true" />Demo mode</span>
      <span className="demobar-note">Sample data · simulated payments</span>
      <nav className="demobar-roles" aria-label="View the platform as">
        <span className="demobar-k">View as</span>
        {ROLES.map((r) => (
          <a key={r.as} href={`/api/demo/login?as=${r.as}&next=${encodeURIComponent(r.home)}`} aria-current={role === r.as ? "true" : undefined}>{r.label}</a>
        ))}
      </nav>
      <Link className="demobar-guide" href="/preview">Review guide</Link>
      <button type="button" className="demobar-x" onClick={() => toggle(false)} aria-label="Minimise demo bar">–</button>
    </aside>
  );
}
