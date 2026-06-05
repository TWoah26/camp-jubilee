import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const parentId = searchParams.get("parent_id");
    const orderId = searchParams.get("orderId") ?? searchParams.get("checkoutId");

    const supabase = await createAdminClient();

    if (type === "store_credit_multi") {
      const allocationsParam = searchParams.get("allocations") ?? "";
      const allocations = allocationsParam.split(",").map(pair => {
        const [camper_id, amountStr] = pair.split(":");
        return { camper_id, amount: parseFloat(amountStr) };
      }).filter(a => a.camper_id && a.amount > 0);

      if (!allocations.length) {
        return NextResponse.redirect(new URL("/payments?error=invalid_callback", BASE_URL));
      }

      // Idempotency check — skip if webhook already processed this order
      if (orderId) {
        const { data: existing } = await supabase
          .from("store_transactions")
          .select("id")
          .eq("square_order_id", orderId)
          .limit(1);
        if (existing && existing.length > 0) {
          return NextResponse.redirect(new URL("/payments?success=1", BASE_URL));
        }
      }

      const updateErrors: string[] = [];
      await Promise.all(allocations.map(async ({ camper_id, amount }) => {
        const { error: txError } = await supabase.from("store_transactions").insert({
          camper_id,
          amount,
          type: "credit",
          note: "Parent top-up",
          payment_method: "square",
          staff_id: parentId,
          square_order_id: orderId ?? null,
        });
        if (txError) {
          updateErrors.push(`tx:${camper_id}: ${txError.message}`);
          return;
        }
        // Atomic balance increment via Postgres function
        const { error: balError } = await supabase.rpc("add_store_balance", {
          p_camper_id: camper_id,
          p_amount: amount,
        });
        if (balError) updateErrors.push(`bal:${camper_id}: ${balError.message}`);
      }));

      if (updateErrors.length > 0) {
        console.error("Square callback store_credit_multi errors:", updateErrors);
        return NextResponse.redirect(new URL("/payments?error=callback_failed", BASE_URL));
      }

    } else if (type === "tuition_multi") {
      const allocationsParam = searchParams.get("allocations") ?? "";
      const allocations = allocationsParam.split(",").map(part => {
        const [camper_id, amountStr, session_id] = part.split(":");
        return { camper_id, amount: parseFloat(amountStr), session_id: session_id || null };
      }).filter(a => a.camper_id && a.amount > 0);

      if (!allocations.length) {
        return NextResponse.redirect(new URL("/payments?error=invalid_callback", BASE_URL));
      }

      // Idempotency check — skip if already processed (keyed by square_payment_id + camper)
      if (orderId) {
        const camperIds = allocations.map(a => a.camper_id);
        const { data: existing } = await supabase
          .from("tuition_payments")
          .select("id")
          .eq("square_payment_id", orderId)
          .in("camper_id", camperIds)
          .limit(1);
        if (existing && existing.length > 0) {
          return NextResponse.redirect(new URL("/payments?success=1", BASE_URL));
        }
      }

      const tuitionErrors: string[] = [];
      await Promise.all(allocations.map(async ({ camper_id, amount, session_id }) => {
        const { error } = await supabase.from("tuition_payments").insert({
          camper_id,
          parent_id: parentId,
          amount,
          type: "tuition",
          payment_method: "square",
          square_payment_id: orderId ?? null,
          session_id,
        });
        if (error) tuitionErrors.push(`${camper_id}: ${error.message}`);
      }));

      if (tuitionErrors.length > 0) {
        console.error("Square callback tuition_multi errors:", tuitionErrors);
        return NextResponse.redirect(new URL("/payments?error=callback_failed", BASE_URL));
      }

    } else if (type === "store_credit") {
      const camperId = searchParams.get("camper_id");
      const amount = parseFloat(searchParams.get("amount") ?? "0");
      if (!camperId || !amount) {
        return NextResponse.redirect(new URL("/payments?error=invalid_callback", BASE_URL));
      }

      // Idempotency check
      if (orderId) {
        const { data: existing } = await supabase
          .from("store_transactions")
          .select("id")
          .eq("square_order_id", orderId)
          .limit(1);
        if (existing && existing.length > 0) {
          return NextResponse.redirect(new URL("/payments?success=1", BASE_URL));
        }
      }

      const { error: txError } = await supabase.from("store_transactions").insert({
        camper_id: camperId,
        amount,
        type: "credit",
        note: "Parent top-up",
        payment_method: "square",
        staff_id: parentId,
        square_order_id: orderId ?? null,
      });
      if (txError) {
        console.error("Square callback store_credit tx error:", txError.message);
        return NextResponse.redirect(new URL("/payments?error=callback_failed", BASE_URL));
      }
      const { error: balError } = await supabase.rpc("add_store_balance", {
        p_camper_id: camperId,
        p_amount: amount,
      });
      if (balError) {
        console.error("Square callback store_credit balance error:", balError.message);
        return NextResponse.redirect(new URL("/payments?error=callback_failed", BASE_URL));
      }

    } else {
      // Tuition / registration fee payment (single)
      const camperId = searchParams.get("camper_id");
      const amount = parseFloat(searchParams.get("amount") ?? "0");
      const sessionId = searchParams.get("session_id") ?? null;
      if (!camperId || !parentId || !type || !amount) {
        return NextResponse.redirect(new URL("/payments?error=invalid_callback", BASE_URL));
      }
      const { error } = await supabase.from("tuition_payments").insert({
        camper_id: camperId,
        parent_id: parentId,
        amount,
        type,
        payment_method: "square",
        square_payment_id: orderId,
        session_id: sessionId,
      });
      if (error) {
        console.error("Square callback tuition error:", error.message);
        return NextResponse.redirect(new URL("/payments?error=callback_failed", BASE_URL));
      }
    }

    return NextResponse.redirect(new URL("/payments?success=1", BASE_URL));
  } catch (err) {
    console.error("Square callback error:", err);
    return NextResponse.redirect(new URL("/payments?error=callback_failed", BASE_URL));
  }
}
