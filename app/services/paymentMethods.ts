import { api, qs } from "@/app/lib/api";
import { unwrapList } from "@/app/lib/mappers";
import type {
  PaymentMethod,
  PaymentMethodKind,
  PaymentProof,
} from "@/app/types";

type Row = Record<string, unknown>;

const str = (v: unknown, fb = ""): string =>
  typeof v === "string" ? v : fb;
const num = (v: unknown): number | undefined =>
  typeof v === "number" && Number.isFinite(v) ? v : undefined;
const row = (v: unknown): Row => (v && typeof v === "object" ? (v as Row) : {});

const kindOf = (v: unknown): PaymentMethodKind => {
  const s = str(v).toLowerCase();
  return s === "wallet" || s === "cash" ? s : "bank";
};

const proofStatusOf = (v: unknown): PaymentProof["status"] => {
  const s = str(v).toLowerCase();
  return s === "approved" || s === "rejected" ? s : "pending";
};

function toMethod(r: Row): PaymentMethod {
  return {
    id: str(r.id),
    kind: kindOf(r.kind),
    label: str(r.label),
    account: str(r.account),
    details: r.details ? str(r.details) : undefined,
    isActive: r.isActive !== false,
    createdAt: str(r.createdAt),
  };
}

function toProof(r: Row): PaymentProof {
  const method = row(r.method);
  const payment = row(r.payment);
  const student = row(payment.student);
  const user = row(student.user);
  const course = row(payment.course);
  return {
    id: str(r.id),
    paymentId: str(r.paymentId),
    amount: num(r.amount) ?? 0,
    reference: r.reference ? str(r.reference) : undefined,
    screenshot: r.screenshot ? str(r.screenshot) : undefined,
    status: proofStatusOf(r.status),
    notes: r.notes ? str(r.notes) : undefined,
    createdAt: str(r.createdAt),
    methodId: r.methodId ? str(r.methodId) : undefined,
    methodKind: method.kind ? kindOf(method.kind) : undefined,
    methodLabel: method.label ? str(method.label) : undefined,
    methodAccount: method.account ? str(method.account) : undefined,
    studentId: student.id ? str(student.id) : undefined,
    studentName: user.name ? str(user.name) : undefined,
    courseName: course.name ? str(course.name) : undefined,
  };
}

// ── collection accounts (admin) ─────────────────────────────────────

export async function getPaymentMethods(): Promise<PaymentMethod[]> {
  const data = await api.get<unknown>("/payment-methods");
  return unwrapList<Row>(data).map(toMethod);
}

export async function createPaymentMethod(input: {
  kind: PaymentMethodKind;
  label: string;
  account: string;
  details?: string;
}): Promise<PaymentMethod> {
  return toMethod(await api.post<Row>("/payment-methods", input));
}

export async function updatePaymentMethod(
  id: string,
  input: Partial<{
    label: string;
    account: string;
    details: string;
    isActive: boolean;
  }>
): Promise<PaymentMethod> {
  return toMethod(await api.patch<Row>(`/payment-methods/${id}`, input));
}

export async function deletePaymentMethod(id: string): Promise<void> {
  await api.delete(`/payment-methods/${id}`);
}

// ── transfer proofs ─────────────────────────────────────────────────

/** Student submits a proof (screenshot + ref) against their invoice. */
export async function submitPaymentProof(
  paymentId: string,
  input: {
    methodId?: string;
    amount?: number;
    reference?: string;
    screenshot?: string;
  }
): Promise<PaymentProof> {
  return toProof(
    await api.post<Row>(`/payments/${paymentId}/proofs`, input)
  );
}

/** Student: own proofs. */
export async function getMyPaymentProofs(): Promise<PaymentProof[]> {
  const data = await api.get<unknown>("/payment-proofs/mine");
  return unwrapList<Row>(data).map(toProof);
}

/** Admin: proofs in the center (optionally filtered by status). */
export async function getPaymentProofs(
  status?: "pending" | "approved" | "rejected"
): Promise<PaymentProof[]> {
  const data = await api.get<unknown>(
    `/payment-proofs${qs({ status: status?.toUpperCase() })}`
  );
  return unwrapList<Row>(data).map(toProof);
}

/** Admin: approve settles the invoice automatically; reject flags it. */
export async function reviewPaymentProof(
  id: string,
  action: "approve" | "reject",
  notes?: string
): Promise<PaymentProof> {
  return toProof(
    await api.patch<Row>(`/payment-proofs/${id}`, { action, notes })
  );
}
