import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { SquareClient, SquareEnvironment } from "square";

const squareClient = new SquareClient({
  token: process.env.SQUARE_ACCESS_TOKEN,
  environment: process.env.NODE_ENV === "production" ? SquareEnvironment.Production : SquareEnvironment.Sandbox,
});

export async function POST(req: Request) {
  try {
    const { parent_id, allocations, total } = await req.json();
    // allocations: [{ camper_id, amount }]

    if (!parent_id || !allocations?.length || !total || total <= 0) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== parent_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Build line items for each camper
    const { data: campers } = await supabase
      .from("campers")
      .select("id, first_name, last_name")
      .in("id", allocations.map((a: any) => a.camper_id));

    const camperMap = Object.fromEntries((campers ?? []).map((c: any) => [c.id, c]));

    const lineItems = allocations.map((a: any) => {
      const camper = camperMap[a.camper_id];
      return {
        name: `Store Credit – ${camper?.first_name ?? ""} ${camper?.last_name ?? ""}`.trim(),
        quantity: "1",
        basePriceMoney: { amount: BigInt(Math.round(a.amount * 100)), currency: "USD" },
      };
    });

    // Encode allocations as camperID:amount pairs in the redirect URL
    const allocationParam = allocations
      .map((a: any) => `${a.camper_id}:${a.amount}`)
      .join(",");

    const idempotencyKey = `${parent_id}-store-multi-${Date.now()}`;

    const response = await squareClient.checkout.paymentLinks.create({
      idempotencyKey,
      order: {
        locationId: process.env.SQUARE_LOCATION_ID!,
        lineItems,
      },
      checkoutOptions: {
        redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/square-callback?parent_id=${parent_id}&type=store_credit_multi&allocations=${encodeURIComponent(allocationParam)}`,
      },
    });

    return NextResponse.json({ payment_link: response.paymentLink?.url });
  } catch (err: any) {
    console.error("Add funds error:", err?.message ?? err);
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}
