// Receives the short spoken response collected after a reminder call.
import { createHmac, timingSafeEqual } from "node:crypto";

import { getReminderCall, saveReminderCallResponse } from "@/lib/reminders-db";

function isValidTwilioSignature(request: Request, form: FormData) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const signature = request.headers.get("x-twilio-signature");
  if (!authToken || !signature) return false;

  const values = [...form.entries()]
    .filter(([, value]) => typeof value === "string")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}${value}`)
    .join("");
  const expected = createHmac("sha1", authToken)
    .update(`${request.url}${values}`)
    .digest("base64");
  const expectedBytes = Buffer.from(expected);
  const signatureBytes = Buffer.from(signature);
  return expectedBytes.length === signatureBytes.length && timingSafeEqual(expectedBytes, signatureBytes);
}

function twiml(message: string) {
  const escaped = message.replace(/[<>&'"]/g, (character) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    "'": "&apos;",
    '"': "&quot;",
  })[character]!);
  return `<Response><Say>${escaped}</Say></Response>`;
}

export async function POST(request: Request) {
  const deliveryId = new URL(request.url).searchParams.get("deliveryId");
  if (!deliveryId || !/^[0-9a-f-]{36}$/i.test(deliveryId)) {
    return new Response("Missing reminder delivery.", { status: 400 });
  }

  const form = await request.formData();
  if (!isValidTwilioSignature(request, form)) {
    return new Response("Invalid Twilio signature.", { status: 403 });
  }

  const reminderCall = getReminderCall(deliveryId);
  if (!reminderCall) return new Response("Reminder delivery not found.", { status: 404 });

  const response = String(form.get("SpeechResult") ?? form.get("Digits") ?? "").trim();
  if (response) saveReminderCallResponse(deliveryId, response.slice(0, 4_000));

  return new Response(
    twiml(
      response.toLowerCase().includes("help")
        ? `I heard that you need help with ${reminderCall.title}. Please call a trusted family member now.`
        : `Thank you. I heard your answer about ${reminderCall.title}.`,
    ),
    { headers: { "content-type": "text/xml; charset=utf-8" } },
  );
}
