function toE164(phone: string, defaultCountry: string): string {
  if (phone.startsWith("+")) return phone;
  // remove any leading zero used as a trunk prefix
  const withoutZero = phone.replace(/^0+/, "");
  if (/^\d{10,}$/.test(withoutZero)) {
    return `+${defaultCountry}${withoutZero}`;
  }
  return `+${withoutZero}`;
}

async function sendViaCallMeBot(phone: string, code: string): Promise<boolean> {
  const apiKey = process.env.CALLMEBOT_API_KEY;
  const defaultCountry = process.env.DEFAULT_COUNTRY_CODE || "966";

  if (!apiKey) {
    return false;
  }

  const to = toE164(phone, defaultCountry);
  const text = `Your EduFlow password reset code is: ${code}`;
  const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(
    to
  )}&apikey=${encodeURIComponent(apiKey)}&text=${encodeURIComponent(text)}`;

  try {
    const res = await fetch(url);
    const text = await res.text();
    if (!res.ok) {
      console.error("[sendVerificationCode] CallMeBot error:", text);
      return false;
    }
    console.log("[sendVerificationCode] CallMeBot response:", text);
    return true;
  } catch (err) {
    console.error("[sendVerificationCode] CallMeBot fetch error:", err);
    return false;
  }
}

async function sendViaTwilio(
  phone: string,
  code: string,
  channel: "sms" | "whatsapp"
): Promise<boolean> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const smsFrom = process.env.TWILIO_PHONE_NUMBER;
  const whatsappFrom = process.env.TWILIO_WHATSAPP_NUMBER;
  const defaultCountry = process.env.DEFAULT_COUNTRY_CODE || "966";

  if (!accountSid || !authToken || (!smsFrom && !whatsappFrom)) {
    return false;
  }

  let to = toE164(phone, defaultCountry);
  let from: string | undefined;

  if (channel === "whatsapp") {
    to = `whatsapp:${to}`;
    from = whatsappFrom
      ? whatsappFrom.startsWith("whatsapp:")
        ? whatsappFrom
        : `whatsapp:${whatsappFrom}`
      : smsFrom
        ? `whatsapp:${smsFrom}`
        : undefined;
  } else {
    from = smsFrom;
  }

  if (!from) {
    console.warn("[sendVerificationCode] no sender configured for", channel);
    return false;
  }

  const body = new URLSearchParams({
    To: to,
    From: from,
    Body: `Your EduFlow password reset code is: ${code}`,
  });

  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      console.error("[sendVerificationCode] Twilio error:", text);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[sendVerificationCode] Twilio fetch error:", err);
    return false;
  }
}

export async function sendVerificationCode(
  phone: string,
  code: string,
  channel: "sms" | "whatsapp" = "sms"
): Promise<boolean> {
  if (channel === "whatsapp") {
    // try CallMeBot first (free WhatsApp), then Twilio
    const sent = await sendViaCallMeBot(phone, code);
    if (sent) return true;
    return sendViaTwilio(phone, code, channel);
  }

  const sent = await sendViaTwilio(phone, code, channel);
  if (!sent) {
    console.log(
      `[sendVerificationCode] no provider sent. Code for ${phone}: ${code}`
    );
  }
  return sent;
}
