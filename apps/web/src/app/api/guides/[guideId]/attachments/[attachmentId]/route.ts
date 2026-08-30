import { auth } from "@/auth";
import { getGuideAttachment } from "@/lib/guides-db";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ guideId: string; attachmentId: string }> },
) {
  const session = await auth();
  const ownerEmail = session?.user?.email?.trim().toLowerCase();
  if (!ownerEmail) return new Response("Unauthorized", { status: 401 });

  const { guideId, attachmentId } = await params;
  const attachment = getGuideAttachment(ownerEmail, guideId, attachmentId);
  if (!attachment) return new Response("Not found", { status: 404 });

  const encodedName = encodeURIComponent(attachment.name).replace(/[']/g, "%27");
  return new Response(Buffer.from(attachment.data), {
    headers: {
      "Content-Disposition": `inline; filename*=UTF-8''${encodedName}`,
      "Content-Length": String(attachment.size),
      "Content-Type": attachment.mimeType,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
