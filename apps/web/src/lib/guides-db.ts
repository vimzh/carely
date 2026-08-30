import { database } from "@/lib/database";
import { initialGuides, type Guide, type GuideAttachment, type GuideInput } from "@/lib/guides";
import { deleteObject, putObject, readObject } from "@/lib/object-storage";

export type GuideAttachmentUpload = Omit<GuideAttachment, "id" | "createdAt"> & { data: Uint8Array };
export type StoredGuideAttachmentUpload = GuideAttachmentUpload & Pick<GuideAttachment, "id">;

database.exec(`
  CREATE TABLE IF NOT EXISTS guide_owners (
    owner_email TEXT PRIMARY KEY,
    seeded_at TEXT NOT NULL
  ) STRICT;

  CREATE TABLE IF NOT EXISTS guides (
    owner_email TEXT NOT NULL,
    id TEXT NOT NULL,
    title TEXT NOT NULL,
    note TEXT NOT NULL,
    context TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (owner_email, id)
  ) STRICT;

  CREATE TABLE IF NOT EXISTS guide_attachments (
    owner_email TEXT NOT NULL,
    id TEXT NOT NULL,
    guide_id TEXT NOT NULL,
    name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    storage_key TEXT,
    data BLOB NOT NULL DEFAULT X'',
    created_at TEXT NOT NULL,
    PRIMARY KEY (owner_email, id),
    FOREIGN KEY (owner_email, guide_id) REFERENCES guides(owner_email, id) ON DELETE CASCADE
  ) STRICT;
`);

const attachmentColumns = database.prepare("PRAGMA table_info(guide_attachments)").all();
if (!attachmentColumns.some((column) => column.name === "storage_key")) {
  database.exec("ALTER TABLE guide_attachments ADD COLUMN storage_key TEXT");
}

for (const row of database.prepare(`
  SELECT owner_email, id, data
  FROM guide_attachments
  WHERE storage_key IS NULL AND length(data) > 0
`).all()) {
  const storageKey = putObject(row.data as Uint8Array);
  try {
    database.prepare(`
      UPDATE guide_attachments SET storage_key = ?, data = X''
      WHERE owner_email = ? AND id = ?
    `).run(storageKey, row.owner_email, row.id);
  } catch (error) {
    deleteObject(storageKey);
    throw error;
  }
}

function seedGuides(ownerEmail: string) {
  const result = database
    .prepare("INSERT OR IGNORE INTO guide_owners (owner_email, seeded_at) VALUES (?, ?)")
    .run(ownerEmail, new Date().toISOString());
  if (result.changes === 0) return;

  const insert = database.prepare(`
    INSERT INTO guides (owner_email, id, title, note, context, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const now = new Date().toISOString();
  database.exec("BEGIN");
  try {
    for (const guide of initialGuides) {
      insert.run(ownerEmail, guide.id, guide.title, guide.note, guide.context, now, now);
    }
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    database.prepare("DELETE FROM guide_owners WHERE owner_email = ?").run(ownerEmail);
    throw error;
  }
}

function listAttachments(ownerEmail: string, guideId: string): GuideAttachment[] {
  return database
    .prepare(`
      SELECT id, name, mime_type, size, created_at
      FROM guide_attachments
      WHERE owner_email = ? AND guide_id = ?
      ORDER BY created_at, id
    `)
    .all(ownerEmail, guideId)
    .map((row) => ({
      id: String(row.id),
      name: String(row.name),
      mimeType: String(row.mime_type),
      size: Number(row.size),
      createdAt: String(row.created_at),
    }));
}

function toGuide(ownerEmail: string, row: Record<string, unknown>): Guide {
  const id = String(row.id);
  return {
    id,
    title: String(row.title),
    note: String(row.note),
    context: String(row.context),
    attachments: listAttachments(ownerEmail, id),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function insertAttachments(ownerEmail: string, guideId: string, attachments: GuideAttachmentUpload[]) {
  if (!attachments.length) return [];
  const insert = database.prepare(`
    INSERT INTO guide_attachments
      (owner_email, id, guide_id, name, mime_type, size, storage_key, data, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, X'', ?)
  `);
  const now = new Date().toISOString();
  const storageKeys: string[] = [];
  try {
    for (const attachment of attachments) {
      const storageKey = putObject(attachment.data);
      storageKeys.push(storageKey);
      insert.run(
        ownerEmail,
        crypto.randomUUID(),
        guideId,
        attachment.name,
        attachment.mimeType,
        attachment.size,
        storageKey,
        now,
      );
    }
    return storageKeys;
  } catch (error) {
    storageKeys.forEach(deleteObject);
    throw error;
  }
}

export function listGuides(ownerEmail: string): Guide[] {
  seedGuides(ownerEmail);
  return database
    .prepare(`
      SELECT id, title, note, context, created_at, updated_at
      FROM guides
      WHERE owner_email = ?
      ORDER BY created_at,
        CASE id WHEN 'air-conditioner' THEN 0 WHEN 'oven' THEN 1 WHEN 'tv-remote' THEN 2 ELSE 3 END,
        id
    `)
    .all(ownerEmail)
    .map((row) => toGuide(ownerEmail, row));
}

export function getGuide(ownerEmail: string, guideId: string): Guide | null {
  seedGuides(ownerEmail);
  const row = database
    .prepare(
      "SELECT id, title, note, context, created_at, updated_at FROM guides WHERE owner_email = ? AND id = ?",
    )
    .get(ownerEmail, guideId);
  return row ? toGuide(ownerEmail, row) : null;
}

export function insertGuide(
  ownerEmail: string,
  input: GuideInput,
  attachments: GuideAttachmentUpload[],
  guideId = crypto.randomUUID(),
): Guide {
  seedGuides(ownerEmail);
  const guide = { id: guideId, ...input };
  const now = new Date().toISOString();
  let storedKeys: string[] = [];
  database.exec("BEGIN");
  try {
    database.prepare(`
      INSERT INTO guides (owner_email, id, title, note, context, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(ownerEmail, guide.id, guide.title, guide.note, guide.context, now, now);
    storedKeys = insertAttachments(ownerEmail, guide.id, attachments);
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    storedKeys.forEach(deleteObject);
    throw error;
  }
  return getGuide(ownerEmail, guide.id)!;
}

export function updateGuide(
  ownerEmail: string,
  guideId: string,
  input: GuideInput,
  attachments: GuideAttachmentUpload[],
): Guide {
  let storedKeys: string[] = [];
  database.exec("BEGIN");
  try {
    const result = database.prepare(`
      UPDATE guides
      SET title = ?, note = ?, context = ?, updated_at = ?
      WHERE owner_email = ? AND id = ?
    `).run(input.title, input.note, input.context, new Date().toISOString(), ownerEmail, guideId);
    if (result.changes === 0) throw new Error("Guide not found.");
    storedKeys = insertAttachments(ownerEmail, guideId, attachments);
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    storedKeys.forEach(deleteObject);
    throw error;
  }
  return getGuide(ownerEmail, guideId)!;
}

export function listGuideAttachmentUploads(ownerEmail: string, guideId: string): StoredGuideAttachmentUpload[] {
  return database
    .prepare(`
      SELECT id, name, mime_type, size, storage_key
      FROM guide_attachments
      WHERE owner_email = ? AND guide_id = ? AND storage_key IS NOT NULL
      ORDER BY created_at, id
    `)
    .all(ownerEmail, guideId)
    .map((row) => ({
      id: String(row.id),
      name: String(row.name),
      mimeType: String(row.mime_type),
      size: Number(row.size),
      data: readObject(String(row.storage_key)),
    }));
}

export function deleteGuideAttachment(ownerEmail: string, guideId: string, attachmentId: string) {
  const row = database
    .prepare(`
      SELECT storage_key FROM guide_attachments
      WHERE owner_email = ? AND guide_id = ? AND id = ?
    `)
    .get(ownerEmail, guideId, attachmentId);
  if (!row) throw new Error("Attachment not found.");

  const result = database
    .prepare("DELETE FROM guide_attachments WHERE owner_email = ? AND guide_id = ? AND id = ?")
    .run(ownerEmail, guideId, attachmentId);
  if (result.changes === 0) throw new Error("Attachment not found.");
  if (row.storage_key) deleteObject(String(row.storage_key));
}

export function deleteGuide(ownerEmail: string, guideId: string) {
  const storageKeys = database
    .prepare(`
      SELECT storage_key FROM guide_attachments
      WHERE owner_email = ? AND guide_id = ? AND storage_key IS NOT NULL
    `)
    .all(ownerEmail, guideId)
    .map((row) => String(row.storage_key));
  const result = database
    .prepare("DELETE FROM guides WHERE owner_email = ? AND id = ?")
    .run(ownerEmail, guideId);
  if (result.changes === 0) throw new Error("Guide not found.");
  for (const storageKey of storageKeys) {
    deleteObject(storageKey);
  }
}

export function getGuideAttachment(ownerEmail: string, guideId: string, attachmentId: string) {
  const row = database
    .prepare(`
      SELECT name, mime_type, size, storage_key
      FROM guide_attachments
      WHERE owner_email = ? AND guide_id = ? AND id = ?
    `)
    .get(ownerEmail, guideId, attachmentId);
  if (!row) return null;
  if (!row.storage_key) throw new Error("Attachment storage object is missing.");

  return {
    name: String(row.name),
    mimeType: String(row.mime_type),
    size: Number(row.size),
    data: readObject(String(row.storage_key)),
  };
}
