import { normalizePhoneDigits, type CareRecipient, type CareRecipientInput, type Contact, type ContactInput } from "@/lib/contact";
import { careRecipientMemoryHash } from "@/lib/care-recipient-memory-hash";
import { database } from "@/lib/database";

database.exec(`
  CREATE TABLE IF NOT EXISTS contact_owners (
    owner_email TEXT PRIMARY KEY,
    seeded_at TEXT NOT NULL
  ) STRICT;

  CREATE TABLE IF NOT EXISTS contacts (
    owner_email TEXT NOT NULL,
    id TEXT NOT NULL,
    name TEXT NOT NULL,
    relationship TEXT NOT NULL,
    phone TEXT NOT NULL,
    emergency_from TEXT NOT NULL,
    emergency_until TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (owner_email, id)
  ) STRICT
`);

database.exec(`
  CREATE TABLE IF NOT EXISTS care_recipients (
    owner_email TEXT NOT NULL,
    id TEXT NOT NULL,
    name TEXT NOT NULL,
    relationship TEXT NOT NULL,
    phone TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    latitude REAL,
    longitude REAL,
    likes TEXT NOT NULL,
    dislikes TEXT NOT NULL,
    instructions TEXT NOT NULL,
    memory_hash TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    PRIMARY KEY (owner_email, id)
  ) STRICT
`);

const careRecipientColumns = database
  .prepare("PRAGMA table_info(care_recipients)")
  .all() as Array<{ name: string }>;
if (!careRecipientColumns.some(({ name }) => name === "phone")) {
  database.exec("ALTER TABLE care_recipients ADD COLUMN phone TEXT NOT NULL DEFAULT ''");
}
if (!careRecipientColumns.some(({ name }) => name === "memory_hash")) {
  database.exec("ALTER TABLE care_recipients ADD COLUMN memory_hash TEXT NOT NULL DEFAULT ''");
}
if (!careRecipientColumns.some(({ name }) => name === "address")) {
  database.exec("ALTER TABLE care_recipients ADD COLUMN address TEXT NOT NULL DEFAULT ''");
}
if (!careRecipientColumns.some(({ name }) => name === "latitude")) {
  database.exec("ALTER TABLE care_recipients ADD COLUMN latitude REAL");
}
if (!careRecipientColumns.some(({ name }) => name === "longitude")) {
  database.exec("ALTER TABLE care_recipients ADD COLUMN longitude REAL");
}

const starterContacts: Contact[] = [
  {
    id: "vansh",
    name: "Vansh",
    relationship: "Primary contact",
    phone: "7982538137",
    emergencyFrom: "09:00",
    emergencyUntil: "21:00",
  },
  {
    id: "mom",
    name: "Mom",
    relationship: "Parent",
    phone: "",
    emergencyFrom: "",
    emergencyUntil: "",
  },
  {
    id: "uncle-raj",
    name: "Uncle Raj",
    relationship: "Family",
    phone: "",
    emergencyFrom: "",
    emergencyUntil: "",
  },
];

const starterCareRecipients: CareRecipient[] = [
  {
    id: "grandfather",
    name: "Grandfather",
    relationship: "Grandparent",
    phone: "",
    address: "",
    latitude: null,
    longitude: null,
    likes: "",
    dislikes: "",
    instructions: "",
  },
  {
    id: "grandmother",
    name: "Grandmother",
    relationship: "Grandparent",
    phone: "",
    address: "",
    latitude: null,
    longitude: null,
    likes: "",
    dislikes: "",
    instructions: "",
  },
];

function seedContacts(ownerEmail: string) {
  const result = database
    .prepare("INSERT OR IGNORE INTO contact_owners (owner_email, seeded_at) VALUES (?, ?)")
    .run(ownerEmail, new Date().toISOString());
  if (result.changes === 0) return;

  const insert = database.prepare(`
    INSERT OR IGNORE INTO contacts
      (owner_email, id, name, relationship, phone, emergency_from, emergency_until, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const now = new Date().toISOString();
  database.exec("BEGIN");
  try {
    for (const contact of starterContacts) {
      insert.run(ownerEmail, contact.id, contact.name, contact.relationship, contact.phone, contact.emergencyFrom, contact.emergencyUntil, now);
    }
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    database.prepare("DELETE FROM contact_owners WHERE owner_email = ?").run(ownerEmail);
    throw error;
  }
}

function toContact(row: Record<string, unknown>): Contact {
  return {
    id: String(row.id),
    name: String(row.name),
    relationship: String(row.relationship),
    phone: String(row.phone),
    emergencyFrom: String(row.emergency_from),
    emergencyUntil: String(row.emergency_until),
  };
}

function toCareRecipient(row: Record<string, unknown>): CareRecipient {
  return {
    id: String(row.id),
    name: String(row.name),
    relationship: String(row.relationship),
    phone: String(row.phone ?? ""),
    address: String(row.address ?? ""),
    latitude: row.latitude === null || row.latitude === undefined ? null : Number(row.latitude),
    longitude: row.longitude === null || row.longitude === undefined ? null : Number(row.longitude),
    likes: String(row.likes),
    dislikes: String(row.dislikes),
    instructions: String(row.instructions),
  };
}

export function listContacts(ownerEmail: string): Contact[] {
  seedContacts(ownerEmail);

  return database
    .prepare(`
      SELECT id, name, relationship, phone, emergency_from, emergency_until
      FROM contacts
      WHERE owner_email = ?
      ORDER BY created_at,
        CASE id WHEN 'vansh' THEN 0 WHEN 'mom' THEN 1 WHEN 'uncle-raj' THEN 2 ELSE 3 END,
        id
    `)
    .all(ownerEmail)
    .map(toContact);
}

export function getContact(ownerEmail: string, contactId: string): Contact | null {
  const row = database
    .prepare(`
      SELECT id, name, relationship, phone, emergency_from, emergency_until
      FROM contacts
      WHERE owner_email = ? AND id = ?
    `)
    .get(ownerEmail, contactId);
  return row ? toContact(row) : null;
}

export function insertContact(ownerEmail: string, input: ContactInput): Contact {
  const contact = { id: crypto.randomUUID(), ...input };
  database.prepare(`
    INSERT INTO contacts
      (owner_email, id, name, relationship, phone, emergency_from, emergency_until, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    ownerEmail,
    contact.id,
    contact.name,
    contact.relationship,
    contact.phone,
    contact.emergencyFrom,
    contact.emergencyUntil,
    new Date().toISOString(),
  );
  return contact;
}

export function patchContact(ownerEmail: string, contactId: string, updates: Partial<ContactInput>): Contact {
  const current = database.prepare(`
    SELECT id, name, relationship, phone, emergency_from, emergency_until
    FROM contacts
    WHERE owner_email = ? AND id = ?
  `).get(ownerEmail, contactId);
  if (!current) throw new Error("Contact not found.");

  const contact = { ...toContact(current), ...updates };
  database.prepare(`
    UPDATE contacts
    SET name = ?, relationship = ?, phone = ?, emergency_from = ?, emergency_until = ?
    WHERE owner_email = ? AND id = ?
  `).run(
    contact.name,
    contact.relationship,
    contact.phone,
    contact.emergencyFrom,
    contact.emergencyUntil,
    ownerEmail,
    contactId,
  );
  return contact;
}

export function deleteContact(ownerEmail: string, contactId: string) {
  const result = database
    .prepare("DELETE FROM contacts WHERE owner_email = ? AND id = ?")
    .run(ownerEmail, contactId);
  if (result.changes === 0) throw new Error("Contact not found.");
}

export function listCareRecipients(ownerEmail: string): CareRecipient[] {
  const count = database
    .prepare("SELECT COUNT(*) AS count FROM care_recipients WHERE owner_email = ?")
    .get(ownerEmail) as { count: number };

  if (count.count === 0) {
    const insert = database.prepare(`
      INSERT OR IGNORE INTO care_recipients
        (owner_email, id, name, relationship, phone, address, latitude, longitude, likes, dislikes, instructions, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const now = new Date().toISOString();
    database.exec("BEGIN");
    try {
      for (const recipient of starterCareRecipients) {
        insert.run(
          ownerEmail,
          recipient.id,
          recipient.name,
          recipient.relationship,
          recipient.phone,
          recipient.address,
          recipient.latitude,
          recipient.longitude,
          recipient.likes,
          recipient.dislikes,
          recipient.instructions,
          now,
        );
      }
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  }

  return database
    .prepare(`
      SELECT id, name, relationship, phone, address, latitude, longitude, likes, dislikes, instructions
      FROM care_recipients
      WHERE owner_email = ?
      ORDER BY created_at,
        CASE id WHEN 'grandfather' THEN 0 WHEN 'grandmother' THEN 1 ELSE 2 END,
        id
    `)
    .all(ownerEmail)
    .map(toCareRecipient);
}

export function insertCareRecipient(
  ownerEmail: string,
  input: CareRecipientInput,
  recipientId = crypto.randomUUID(),
  memoryHash = "",
): CareRecipient {
  const recipient = { id: recipientId, ...input };
  database.prepare(`
    INSERT INTO care_recipients
      (owner_email, id, name, relationship, phone, address, latitude, longitude, likes, dislikes, instructions, memory_hash, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    ownerEmail,
    recipient.id,
    recipient.name,
    recipient.relationship,
    recipient.phone,
    recipient.address,
    recipient.latitude,
    recipient.longitude,
    recipient.likes,
    recipient.dislikes,
    recipient.instructions,
    memoryHash,
    new Date().toISOString(),
  );
  return recipient;
}

export function patchCareRecipient(
  ownerEmail: string,
  recipientId: string,
  input: CareRecipientInput,
  memoryHash = "",
): CareRecipient {
  const result = database.prepare(`
    UPDATE care_recipients
    SET name = ?, relationship = ?, phone = ?, address = ?, latitude = ?, longitude = ?, likes = ?, dislikes = ?, instructions = ?, memory_hash = ?
    WHERE owner_email = ? AND id = ?
  `).run(
    input.name,
    input.relationship,
    input.phone,
    input.address,
    input.latitude,
    input.longitude,
    input.likes,
    input.dislikes,
    input.instructions,
    memoryHash,
    ownerEmail,
    recipientId,
  );
  if (result.changes === 0) throw new Error("Care recipient not found.");
  return { id: recipientId, ...input };
}

export function listCareRecipientsNeedingMemorySync(ownerEmail: string): CareRecipient[] {
  listCareRecipients(ownerEmail);
  return database
    .prepare(`
      SELECT id, name, relationship, phone, address, latitude, longitude, likes, dislikes, instructions, memory_hash
      FROM care_recipients
      WHERE owner_email = ?
      ORDER BY created_at, id
    `)
    .all(ownerEmail)
    .filter((row) => String(row.memory_hash) !== careRecipientMemoryHash(toCareRecipient(row)))
    .map(toCareRecipient);
}

export function markCareRecipientMemorySynced(ownerEmail: string, recipientId: string, memoryHash: string) {
  const result = database
    .prepare("UPDATE care_recipients SET memory_hash = ? WHERE owner_email = ? AND id = ?")
    .run(memoryHash, ownerEmail, recipientId);
  if (result.changes === 0) throw new Error("Care recipient not found.");
}

export function getCareRecipient(ownerEmail: string, recipientId: string): CareRecipient | null {
  const row = database.prepare(`
    SELECT id, name, relationship, phone, address, latitude, longitude, likes, dislikes, instructions
    FROM care_recipients
    WHERE owner_email = ? AND id = ?
  `).get(ownerEmail, recipientId);
  return row ? toCareRecipient(row) : null;
}

export function findCareRecipientByName(ownerEmail: string, name: string): CareRecipient | null {
  const row = database.prepare(`
    SELECT id, name, relationship, phone, address, latitude, longitude, likes, dislikes, instructions
    FROM care_recipients
    WHERE owner_email = ? AND lower(name) = lower(?)
    ORDER BY created_at, id
    LIMIT 1
  `).get(ownerEmail, name.trim());
  return row ? toCareRecipient(row) : null;
}

export function findCareRecipientByPhone(phone: string): { ownerEmail: string; recipient: CareRecipient } | null {
  const digits = normalizePhoneDigits(phone);
  if (digits.length < 7 || digits.length > 15) return null;

  const rows = database.prepare(`
    SELECT owner_email, id, name, relationship, phone, address, latitude, longitude, likes, dislikes, instructions
    FROM care_recipients
    WHERE phone <> ''
    ORDER BY created_at, id
  `).all() as Array<Record<string, unknown>>;
  const matches = rows.filter((row) => normalizePhoneDigits(String(row.phone)) === digits);
  if (matches.length > 1) throw new Error("This phone number is linked to more than one care recipient.");
  if (!matches[0]) return null;
  return { ownerEmail: String(matches[0].owner_email), recipient: toCareRecipient(matches[0]) };
}
