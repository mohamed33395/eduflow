import { NextResponse, type NextRequest } from "next/server";
import { getAdminDb } from "@/app/lib/firebase-admin";
import { sendVerificationCode } from "@/app/lib/sms";
import { phonesMatch, toPhoneDigits } from "@/app/lib/phone";
import { FieldValue } from "firebase-admin/firestore";

const CODE_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: NextRequest) {
  const adminDb = getAdminDb();
  if (!adminDb) {
    return NextResponse.json(
      { error: "Firebase Admin not configured" },
      { status: 500 }
    );
  }

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const rawPhone = body.phone;
    const channel = (body.channel as "sms" | "whatsapp") || "sms";

    if (!rawPhone || typeof rawPhone !== "string") {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      );
    }

    const phone = rawPhone.trim();

    let userId = "";

    // 1) try exact match
    const usersByPhone = await adminDb
      .collection("users")
      .where("phone", "==", phone)
      .limit(1)
      .get();

    if (!usersByPhone.empty) {
      userId = usersByPhone.docs[0].id;
    }

    // 2) fallback: flexible match against all users with phone (handles 05... vs +...)
    if (!userId) {
      const allWithPhone = await adminDb
        .collection("users")
        .where("phone", ">", "")
        .limit(100)
        .get();

      for (const doc of allWithPhone.docs) {
        const userPhone = ((doc.data() as Record<string, unknown>).phone as string) || "";
        if (phonesMatch(userPhone, phone)) {
          userId = doc.id;
          break;
        }
      }
    }

    // 3) fallback: center with this phone and its owner
    if (!userId) {
      const centersByPhone = await adminDb
        .collection("centers")
        .where("phone", "==", phone)
        .limit(1)
        .get();

      if (centersByPhone.empty) {
        // flexible match against center phones
        const allCenters = await adminDb
          .collection("centers")
          .where("phone", ">", "")
          .limit(100)
          .get();
        for (const doc of allCenters.docs) {
          const centerPhone = (doc.data().phone as string) || "";
          if (phonesMatch(centerPhone, phone)) {
            const centerData = doc.data() as Record<string, unknown>;
            const centerOwnerId = (centerData.ownerId as string) || "";
            if (centerOwnerId) {
              userId = centerOwnerId;
              await adminDb.collection("users").doc(centerOwnerId).update({
                phone: toPhoneDigits(phone),
              });
            }
            break;
          }
        }
      } else {
        const centerData = centersByPhone.docs[0].data() as Record<string, unknown>;
        const centerOwnerId = (centerData.ownerId as string) || "";
        if (centerOwnerId) {
          const ownerDoc = await adminDb
            .collection("users")
            .doc(centerOwnerId)
            .get();
          if (ownerDoc.exists) {
            userId = centerOwnerId;
            await adminDb
              .collection("users")
              .doc(centerOwnerId)
              .update({ phone: toPhoneDigits(phone) });
          }
        }
      }
    }

    // 4) fallback: course owner phone stored on user doc (existing users updated manually)
    if (!userId) {
      const allOwners = await adminDb
        .collection("users")
        .where("role", "in", ["course_owner", "center_owner"])
        .limit(200)
        .get();
      for (const doc of allOwners.docs) {
        const userPhone = ((doc.data() as Record<string, unknown>).phone as string) || "";
        if (phonesMatch(userPhone, phone)) {
          userId = doc.id;
          break;
        }
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: "No account found with this phone number" },
        { status: 404 }
      );
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);
    const phoneDigits = toPhoneDigits(phone);

    const resetRef = adminDb.collection("passwordResets").doc(phoneDigits);
    await resetRef.set({
      phone: phoneDigits,
      code,
      userId,
      channel,
      attempts: 0,
      expiresAt: expiresAt.toISOString(),
      createdAt: FieldValue.serverTimestamp(),
    });

    const sent = await sendVerificationCode(phoneDigits, code, channel);

    // in development without a provider, return the code so the dev can test
    if (!sent) {
      if (process.env.NODE_ENV === "development") {
        return NextResponse.json({ ok: true, phone, debugCode: code });
      }
      return NextResponse.json(
        { error: "Failed to send verification code" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, phone });
  } catch (err) {
    console.error("[api/forgot-password] send failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Send failed" },
      { status: 500 }
    );
  }
}
