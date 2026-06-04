"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";

interface Camper {
  id: string;
  first_name: string;
  last_name: string;
  store_balance: number;
}

interface CamperChoice {
  donate: string;
  refund: string;
}

interface Props {
  campers: Camper[];
  sessionId: string;
  parentId: string;
}

export default function SessionCloseChoice({ campers, sessionId, parentId }: Props) {
  const [choices, setChoices] = useState<Record<string, CamperChoice>>(
    Object.fromEntries(campers.map(c => [c.id, { donate: "", refund: String(c.store_balance) }]))
  );
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const updateDonate = (camperId: string, balance: number, value: string) => {
    const donate = parseFloat(value) || 0;
    const refund = parseFloat((balance - donate).toFixed(2));
    setChoices(c => ({ ...c, [camperId]: { donate: value, refund: refund >= 0 ? String(refund) : "0" } }));
    setErrors(e => ({ ...e, [camperId]: "" }));
  };

  const updateRefund = (camperId: string, balance: number, value: string) => {
    const refund = parseFloat(value) || 0;
    const donate = parseFloat((balance - refund).toFixed(2));
    setChoices(c => ({ ...c, [camperId]: { refund: value, donate: donate >= 0 ? String(donate) : "0" } }));
    setErrors(e => ({ ...e, [camperId]: "" }));
  };

  const setPreset = (camperId: string, balance: number, preset: "all_donate" | "all_refund") => {
    if (preset === "all_donate") setChoices(c => ({ ...c, [camperId]: { donate: String(balance), refund: "0" } }));
    else setChoices(c => ({ ...c, [camperId]: { donate: "0", refund: String(balance) } }));
    setErrors(e => ({ ...e, [camperId]: "" }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    for (const camper of campers) {
      const donate = parseFloat(choices[camper.id]?.donate || "0");
      const refund = parseFloat(choices[camper.id]?.refund || "0");
      const total = parseFloat((donate + refund).toFixed(2));
      if (Math.abs(total - camper.store_balance) > 0.01) {
        newErrors[camper.id] = `Amounts must add up to ${formatCurrency(camper.store_balance)}`;
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    setSubmitError(null);
    const results = await Promise.all(
      campers.map(async camper => {
        const donate = parseFloat(choices[camper.id]?.donate || "0");
        const refund = parseFloat(choices[camper.id]?.refund || "0");
        const choice = donate === 0 ? "refund" : refund === 0 ? "donate" : "split";
        const res = await fetch("/api/parent/session-choice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            camper_id: camper.id,
            parent_id: parentId,
            session_id: sessionId,
            choice,
            balance: camper.store_balance,
            donate_amount: donate,
            refund_amount: refund,
          }),
        });
        const data = await res.json();
        return { ok: res.ok, error: data.error };
      })
    );
    setLoading(false);
    const failed = results.filter(r => !r.ok);
    if (failed.length > 0) {
      setSubmitError(`Something went wrong: ${failed[0].error ?? "please try again"}`);
    } else {
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <div className="bg-jubilee-green/10 border border-jubilee-green rounded-2xl p-6 text-center">
        <div className="text-4xl mb-3">🎉</div>
        <p className="font-semibold text-jubilee-navy text-lg">All done — thank you!</p>
        <div className="mt-3 space-y-2">
          {campers.map(c => {
            const donate = parseFloat(choices[c.id]?.donate || "0");
            const refund = parseFloat(choices[c.id]?.refund || "0");
            return (
              <div key={c.id} className="text-sm text-gray-600">
                <p className="font-medium text-jubilee-navy">{c.first_name} {c.last_name}</p>
                {donate > 0 && <p>💚 {formatCurrency(donate)} donated to Camp Jubilee</p>}
                {refund > 0 && <p>💸 {formatCurrency(refund)} refund requested</p>}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {campers.map(camper => {
        const choice = choices[camper.id] ?? { donate: "0", refund: String(camper.store_balance) };
        return (
          <div key={camper.id} className="bg-white rounded-2xl shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="font-semibold text-jubilee-navy text-lg">{camper.first_name} {camper.last_name}</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Remaining balance: <span className="font-bold text-jubilee-green">{formatCurrency(camper.store_balance)}</span>
                </p>
              </div>
            </div>

            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setPreset(camper.id, camper.store_balance, "all_donate")}
                className="flex-1 py-1.5 rounded-lg border border-gray-200 text-xs font-medium hover:bg-jubilee-green/10 hover:border-jubilee-green"
              >
                💚 All Donate
              </button>
              <button
                onClick={() => setPreset(camper.id, camper.store_balance, "all_refund")}
                className="flex-1 py-1.5 rounded-lg border border-gray-200 text-xs font-medium hover:bg-jubilee-navy/10 hover:border-jubilee-navy"
              >
                💸 All Refund
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">💚 Donate to Camp</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input
                    type="number"
                    min="0"
                    max={camper.store_balance}
                    step="0.01"
                    value={choice.donate}
                    onChange={e => updateDonate(camper.id, camper.store_balance, e.target.value)}
                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-jubilee-gold"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">💸 Request Refund</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input
                    type="number"
                    min="0"
                    max={camper.store_balance}
                    step="0.01"
                    value={choice.refund}
                    onChange={e => updateRefund(camper.id, camper.store_balance, e.target.value)}
                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-jubilee-gold"
                  />
                </div>
              </div>
            </div>
            {errors[camper.id] && <p className="text-red-500 text-xs mt-2">{errors[camper.id]}</p>}
          </div>
        );
      })}

      {submitError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          ⚠️ {submitError}
        </div>
      )}
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full bg-jubilee-navy text-white py-3 rounded-xl font-medium hover:bg-jubilee-gold disabled:opacity-50 text-sm"
      >
        {loading ? "Submitting..." : "Confirm All Choices"}
      </button>
    </div>
  );
}
