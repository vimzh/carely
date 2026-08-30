"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { requireAgentSecret } from "@/lib/agent-secret";
import {
  deleteGuideAttachment as removeGuideAttachment,
  deleteGuide as removeGuide,
  getGuide,
  insertGuide,
  listGuideAttachmentUploads,
  updateGuide as patchGuide,
  type GuideAttachmentUpload,
} from "@/lib/guides-db";
import { normalizeGuideMimeType, parseGuideFiles, parseGuideInput, type GuideInput } from "@/lib/guides";

const apiUrl = (process.env.CARELY_API_URL ?? "http://localhost:3001").replace(/\/$/, "");

async function ownerEmail() {
  const session = await auth();
  return session?.user?.email?.trim().toLowerCase() ?? null;
}

async function attachmentsFrom(formData: FormData) {
  return Promise.all(
    parseGuideFiles(formData).map(async (file) => ({
      name: file.name,
      mimeType: normalizeGuideMimeType(file.type),
      size: file.size,
      data: new Uint8Array(await file.arrayBuffer()),
    })),
  );
}

export async function createGuide(formData: FormData) {
  const email = await ownerEmail();
  if (!email) return { ok: false as const, error: "You must be signed in." };

  let guideData: Awaited<ReturnType<typeof guideDataFrom>>;
  try {
    guideData = await guideDataFrom(formData);
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Check the guide details.",
    };
  }

  try {
    const guideId = crypto.randomUUID();
    await syncGuideContext(email, guideId, guideData.input, guideData.attachments);
    const guide = insertGuide(email, guideData.input, guideData.attachments, guideId);
    revalidatePath("/guides");
    return { ok: true as const, guide };
  } catch (error) {
    console.error("Could not add guide", error);
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Could not add the guide. Try again.",
    };
  }
}

export async function updateGuide(guideId: string, formData: FormData) {
  const email = await ownerEmail();
  if (!email) return { ok: false as const, error: "You must be signed in." };
  if (!guideId) return { ok: false as const, error: "Guide not found." };

  let guideData: Awaited<ReturnType<typeof guideDataFrom>>;
  try {
    guideData = await guideDataFrom(formData);
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Check the guide details.",
    };
  }

  try {
    if (!getGuide(email, guideId)) return { ok: false as const, error: "Guide not found." };
    await syncGuideContext(
      email,
      guideId,
      guideData.input,
      [...listGuideAttachmentUploads(email, guideId), ...guideData.attachments],
    );
    const guide = patchGuide(email, guideId, guideData.input, guideData.attachments);
    revalidatePath("/guides");
    revalidatePath(`/guides/${guideId}`);
    return { ok: true as const, guide };
  } catch (error) {
    console.error("Could not update guide", error);
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Could not save the guide. Try again.",
    };
  }
}

export async function deleteGuide(guideId: string) {
  const email = await ownerEmail();
  if (!email) return { ok: false as const, error: "You must be signed in." };
  if (!guideId) return { ok: false as const, error: "Guide not found." };

  try {
    if (!getGuide(email, guideId)) return { ok: false as const, error: "Guide not found." };
    await deleteGuideContext(email, guideId);
    removeGuide(email, guideId);
    revalidatePath("/guides");
    revalidatePath(`/guides/${guideId}`);
    return { ok: true as const };
  } catch (error) {
    console.error("Could not delete guide", error);
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Could not delete the guide. Try again.",
    };
  }
}

export async function deleteGuideAttachment(guideId: string, attachmentId: string) {
  const email = await ownerEmail();
  if (!email) return { ok: false as const, error: "You must be signed in." };
  if (!guideId || !attachmentId) return { ok: false as const, error: "Attachment not found." };

  try {
    const guide = getGuide(email, guideId);
    if (!guide) return { ok: false as const, error: "Guide not found." };
    const attachments = listGuideAttachmentUploads(email, guideId);
    if (!attachments.some((attachment) => attachment.id === attachmentId)) {
      return { ok: false as const, error: "Attachment not found." };
    }

    await syncGuideContext(
      email,
      guideId,
      { title: guide.title, note: guide.note, context: guide.context },
      attachments.filter((attachment) => attachment.id !== attachmentId),
    );
    removeGuideAttachment(email, guideId, attachmentId);
    revalidatePath("/guides");
    revalidatePath(`/guides/${guideId}`);
    return { ok: true as const };
  } catch (error) {
    console.error("Could not delete guide attachment", error);
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Could not delete the attachment. Try again.",
    };
  }
}

async function guideDataFrom(formData: FormData) {
  return {
    input: parseGuideInput(formData),
    attachments: await attachmentsFrom(formData),
  };
}

async function syncGuideContext(
  ownerEmail: string,
  guideId: string,
  input: GuideInput,
  attachments: GuideAttachmentUpload[],
) {
  const form = new FormData();
  form.set("ownerEmail", ownerEmail);
  form.set("contextKey", guideId);
  form.set("title", input.title);
  form.set("note", input.note);
  form.set("text", input.context);
  for (const attachment of attachments) {
    const field = attachment.mimeType.startsWith("image/")
      ? "images"
      : attachment.mimeType.startsWith("video/")
        ? "videos"
        : attachment.mimeType.startsWith("audio/")
          ? "audio"
          : "documents";
    form.append(
      field,
      new Blob([Uint8Array.from(attachment.data)], { type: attachment.mimeType }),
      attachment.name,
    );
  }

  const response = await fetch(`${apiUrl}/context/guide`, {
    method: "POST",
    headers: { authorization: `Bearer ${requireAgentSecret()}` },
    body: form,
  });
  if (response.ok) return;
  const body = await response.json().catch(() => null);
  throw new Error(
    body && typeof body === "object" && "error" in body && typeof body.error === "string"
      ? body.error
      : `Carely API returned ${response.status}.`,
  );
}

async function deleteGuideContext(ownerEmail: string, guideId: string) {
  const url = new URL(`${apiUrl}/context/guide/${encodeURIComponent(guideId)}`);
  url.searchParams.set("ownerEmail", ownerEmail);
  const response = await fetch(url, {
    method: "DELETE",
    headers: { authorization: `Bearer ${requireAgentSecret()}` },
  });
  if (!response.ok) throw new Error(`Carely API returned ${response.status}.`);
}
