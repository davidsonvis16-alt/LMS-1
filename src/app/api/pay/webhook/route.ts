import { NextResponse } from "next/server";
import { applyPayment } from "@/lib/certs";
import { validSignature, verify } from "@/lib/paystack";

export async function POST(req: Request) {
  const raw = await req.text();
  if (!validSignature(raw, req.headers.get("x-paystack-signature"))) return new NextResponse("bad signature", { status: 401 });
  const evt = JSON.parse(raw) as { event: string; data: { reference: string } };
  if (evt.event === "charge.success") {
    const v = await verify(evt.data.reference); // never trust the webhook body alone
    if (v?.status === "success") { try { await applyPayment(v.reference, v); } catch { /* profile incomplete: learner finishes from the site */ } }
  }
  return NextResponse.json({ received: true });
}
