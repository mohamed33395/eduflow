"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "@/app/lib/i18n/client";
import { getPayments } from "@/app/services/payments";
import {
  getPaymentMethods,
  getMyPaymentProofs,
  submitPaymentProof,
} from "@/app/services/paymentMethods";
import { uploadFile } from "@/app/services/storage";
import {
  IMAGE_EXTS,
  uploadErrorMessage,
  validateUploadFile,
} from "@/app/lib/validators";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { StatusBadge } from "@/app/components/ui/status-badge";
import { formatCurrency } from "@/app/lib/utils";
import {
  Building2,
  Smartphone,
  Banknote,
  Copy,
  Check,
  Loader2,
} from "lucide-react";
import type {
  Payment,
  PaymentMethod,
  PaymentProof,
} from "@/app/types";

const KIND_ICON = { bank: Building2, wallet: Smartphone, cash: Banknote };

const cardCls =
  "rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800";

function kindLabel(
  k: PaymentMethod["kind"] | undefined,
  t: (s: string) => string
) {
  return k === "wallet"
    ? t("methodWallet")
    : k === "cash"
      ? t("methodCash")
      : t("methodBank");
}

function accountLabel(
  k: PaymentMethod["kind"] | undefined,
  t: (s: string) => string
) {
  return k === "wallet"
    ? t("walletNumber")
    : k === "cash"
      ? t("cashDetails")
      : t("bankAccountNumber");
}

export default function StudentPaymentsPage() {
  const { t } = useI18n();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [proofs, setProofs] = useState<PaymentProof[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState("");

  /** Invoice the student is currently paying (expanded pay form). */
  const [payingId, setPayingId] = useState("");
  const [payForm, setPayForm] = useState({
    methodId: "",
    amount: 0,
    reference: "",
  });
  const [shot, setShot] = useState<File | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      getPayments(),
      getPaymentMethods(),
      getMyPaymentProofs(),
    ])
      .then(([p, m, pr]) => {
        setPayments(p);
        setMethods(m);
        setProofs(pr);
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const id = setTimeout(load, 0);
    return () => clearTimeout(id);
  }, [load]);

  const selectedMethod = useMemo(
    () => methods.find((m) => m.id === payForm.methodId),
    [methods, payForm.methodId]
  );

  /** latest proof status per invoice (for badge under the pay button). */
  const proofByPayment = useMemo(() => {
    const map = new Map<string, PaymentProof>();
    for (const pr of proofs) map.set(pr.paymentId, pr);
    return map;
  }, [proofs]);

  const openPay = (p: Payment) => {
    setPayingId(payingId === p.id ? "" : p.id);
    setPayForm({
      methodId: methods[0]?.id ?? "",
      amount: p.remaining,
      reference: "",
    });
    setShot(null);
  };

  const copyAccount = (text: string) => {
    navigator.clipboard?.writeText(text).catch(() => null);
    setCopied(text);
    setTimeout(() => setCopied(""), 1500);
  };

  const submitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    const invoice = payments.find((p) => p.id === payingId);
    const amount = payForm.amount;
    if (!invoice) return;
    // Mirror of the backend checks — fast feedback before any upload.
    if (!Number.isFinite(amount) || amount <= 0) {
      setError(t("invalidAmount"));
      return;
    }
    if (amount > invoice.remaining) {
      setError(t("amountExceedsRemaining"));
      return;
    }
    const reference = payForm.reference.trim();
    if (!reference && !shot) {
      setError(t("referenceOrScreenshot"));
      return;
    }
    setBusy(true);
    setError("");
    try {
      let screenshot: string | undefined;
      if (shot) {
        const up = await uploadFile(shot, "submissions", undefined, {
          extensions: IMAGE_EXTS,
          maxMb: 10,
        });
        screenshot = up.url;
      }
      await submitPaymentProof(payingId, {
        methodId: payForm.methodId || undefined,
        amount,
        reference: reference || undefined,
        screenshot,
      });
      setPayingId("");
      setNotice(t("proofSent"));
      setTimeout(() => setNotice(""), 5000);
      load();
    } catch (err) {
      setError(uploadErrorMessage(err, t));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <p className="p-6 text-slate-500">{t("loading")}</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {t("payments")}
        </h1>
        <p className="mt-1 text-sm text-slate-500">{t("myPaymentsHint")}</p>
      </div>

      {notice && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          {notice}
        </p>
      )}
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {/* ── invoices ── */}
      {payments.length === 0 ? (
        <p className={`${cardCls} text-sm text-slate-500`}>{t("noInvoices")}</p>
      ) : (
        <div className="space-y-3">
          {payments.map((p) => {
            const paidOff = p.remaining <= 0;
            const lastProof = proofByPayment.get(p.id);
            return (
              <div key={p.id} className={cardCls}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {p.courseName || t("course")}
                    </p>
                    <p className="text-xs text-slate-400">
                      {t("dueDate")}:{" "}
                      {p.dueDate ? p.dueDate.slice(0, 10) : "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span>
                      {t("amount")}:{" "}
                      <strong>{formatCurrency(p.amount)}</strong>
                    </span>
                    <span className="text-emerald-600">
                      {t("paid")}: <strong>{formatCurrency(p.paid)}</strong>
                    </span>
                    <span className="text-rose-600">
                      {t("remaining")}:{" "}
                      <strong>{formatCurrency(p.remaining)}</strong>
                    </span>
                    {paidOff ? (
                      <StatusBadge
                        status="approved"
                        label={t("statusPaid")}
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        {lastProof?.status === "pending" && (
                          <StatusBadge
                            status="pending"
                            label={t("proofPending")}
                          />
                        )}
                        {lastProof?.status === "rejected" && (
                          <StatusBadge
                            status="rejected"
                            label={t("rejected")}
                          />
                        )}
                        <Button size="sm" onClick={() => openPay(p)}>
                          {payingId === p.id ? t("cancel") : t("payNow")}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── pay form ── */}
                {payingId === p.id && !paidOff && (
                  <form
                    onSubmit={submitProof}
                    className="mt-4 space-y-4 border-t border-slate-100 pt-4 dark:border-slate-700"
                  >
                    {/* pick a collection account */}
                    <div className="grid gap-2 sm:grid-cols-3">
                      {methods.length === 0 && (
                        <p className="text-sm text-slate-500 sm:col-span-3">
                          {t("noMethodsForStudent")}
                        </p>
                      )}
                      {methods.map((m) => {
                        const Icon = KIND_ICON[m.kind] ?? Banknote;
                        const active = payForm.methodId === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() =>
                              setPayForm({ ...payForm, methodId: m.id })
                            }
                            className={`rounded-lg border p-3 text-start transition-colors ${
                              active
                                ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40"
                                : "border-slate-200 hover:border-slate-300 dark:border-slate-700"
                            }`}
                          >
                            <div className="flex items-center gap-2 text-sm font-semibold">
                              <Icon size={16} />
                              {m.label}
                              <span className="text-xs font-normal text-slate-400">
                                {kindLabel(m.kind, t)}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* transfer destination */}
                    {selectedMethod && (
                      <div className="flex flex-wrap items-center gap-3 rounded-lg bg-slate-50 px-4 py-3 dark:bg-slate-900">
                        <span className="text-sm text-slate-500">
                          {t("transferTo")} {accountLabel(selectedMethod.kind, t)}:
                        </span>
                        <span className="select-all font-mono text-sm font-semibold">
                          {selectedMethod.account}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyAccount(selectedMethod.account)}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          {copied === selectedMethod.account ? (
                            <Check size={15} className="text-green-600" />
                          ) : (
                            <Copy size={15} />
                          )}
                        </button>
                        {selectedMethod.details && (
                          <span className="w-full text-xs text-slate-400">
                            {selectedMethod.details}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="grid gap-4 sm:grid-cols-3">
                      <Input
                        label={t("amount")}
                        type="number"
                        min={0.01}
                        step="0.01"
                        value={payForm.amount}
                        onChange={(e) =>
                          setPayForm({
                            ...payForm,
                            amount: Number(e.target.value),
                          })
                        }
                        required
                      />
                      <Input
                        label={t("referenceNumber")}
                        value={payForm.reference}
                        onChange={(e) =>
                          setPayForm({
                            ...payForm,
                            reference: e.target.value,
                          })
                        }
                        placeholder={t("referenceHint")}
                      />
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                          {t("screenshot")}
                        </label>
                        <input
                          type="file"
                          accept={IMAGE_EXTS.join(",")}
                          onChange={(e) => {
                            const f = e.target.files?.[0] ?? null;
                            const bad = validateUploadFile(f, {
                              extensions: IMAGE_EXTS,
                              maxMb: 10,
                            });
                            if (f && bad) {
                              setShot(null);
                              e.target.value = "";
                              setError(t(bad));
                              return;
                            }
                            setError("");
                            setShot(f);
                          }}
                          className="block w-full text-sm text-slate-600 file:me-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100 dark:text-slate-300"
                        />
                      </div>
                    </div>

                    <Button type="submit" disabled={busy || !payForm.methodId}>
                      {busy && <Loader2 size={15} className="animate-spin" />}
                      {t("sendProof")}
                    </Button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── my proofs ── */}
      {proofs.length > 0 && (
        <section className={cardCls}>
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
            {t("myProofs")}
          </h2>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {proofs.map((pr) => (
              <li
                key={pr.id}
                className="flex flex-wrap items-center gap-3 py-3 text-sm"
              >
                <span className="font-medium">
                  {pr.courseName ?? "—"}
                </span>
                <span className="text-slate-400">
                  {pr.methodLabel
                    ? `${kindLabel(pr.methodKind, t)} · ${pr.methodLabel}`
                    : "—"}
                </span>
                <span className="font-mono text-xs text-slate-400">
                  {pr.reference || "—"}
                </span>
                {pr.screenshot && (
                  <a
                    href={pr.screenshot}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 hover:underline"
                  >
                    {t("view")}
                  </a>
                )}
                <span className="ms-auto font-semibold">
                  {formatCurrency(pr.amount)}
                </span>
                <StatusBadge status={pr.status} label={t(pr.status)} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
