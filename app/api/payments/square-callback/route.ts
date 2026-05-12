import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const parentId = searchParams.get("parent_id");
    const orderId = searchParams.get("orderId") ?? searchParams.get("checkoutId");

    const supabase = await createClient();

    if (type === "store_credit_multi") {
      // Multi-camper store credit
      const allocationsParam = searchParams.get("allocations") ?? "";
      const allocations = allocationsParam.split(",").map(pair => {
        const [camper_id, amountStr] = pair.split(":");
        return { camper_id, amount: parseFloat(amountStr) };
      }).filter(a => a.camper_id && a.amount > 0);

      if (!allocations.length) {
        return NextResponse.redirect(new URL("/payments?error=invalid_callback", BASE_URL));
      }

      await Promise.all(allocations.map(async ({ camper_id, amount }) => {
        const { data: camper } = await supabase.from("campers").select("store_balance").eq("id", camper_id).single();
        const newBalance = parseFloat(((camper?.store_balance ?? 0) + amount).toFixed(2));
        await Promise.all([
          supabase.from("store_transactions").insert({
            camper_id,
            amount,
            type: "credit",
            note: "Parent top-up",
            staff_id: parentId,
            square_order_id: orderId ?? null,
          }),
          supabase.from("campers").update({ store_balance: newBalance }).eq("id", camper_id),
        ]);
      }));

    } else if (type === "store_credit") {
      const camperId = searchParams.get("camper_id");
      const amount = parseFloat(searchParams.get("amount") ?? "0");
      if (!camperId || !amount) {
        return NextResponse.redirect(new URL("/payments?error=invalid_callback", BASE_URL));
      }
      const { data: camper } = await supabase.from("campers").select("store_balance").eq("id", camperId).single();
      const newBalance = parseFloat(((camper?.store_balance ?? 0) + amount).toFixed(2));
      await Promise.all([
        supabase.from("store_transactions").insert({
          camper_id: camperId,
          amount,
          type: "credit",
          note: "Parent top-up",
          staff_id: parentId,
          square_order_id: orderId ?? null,
        }),
        supabase.from("campers").update({ store_balance: newBalance }).eq("id", camperId),
      ]);

    } else {
      // Tuition / registration fee payment
      const camperId = searchParams.get("camper_id");
      const amount = parseFloat(searchParams.get("amount") ?? "0");
      const sessionId = searchParams.get("session_id") ?? null;
      if (!camperId || !parentId || !type || !amount) {
        return NextResponse.redirect(new URL("/payments?error=invalid_callback", BASE_URL));
      }
      await supabase.from("tuition_payments").insert({
        camper_id: camperId,
        parent_id: parentId,
        amount,
        type,
        payment_method: "square",
        square_payment_id: orderId,
        session_id: sessionId,
      });
    }

    return NextResponse.redirect(new URL("/payments?success=1", BASE_URL));
  } catch (err) {
    console.error("Square callback error:", err);
    return NextResponse.redirect(new URL("/payments?error=callback_failed", BASE_URL));
  }
}
