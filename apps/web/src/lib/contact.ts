export type Contact = {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  emergencyFrom: string;
  emergencyUntil: string;
};

export type ContactInput = Omit<Contact, "id">;

export type CareRecipient = {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  likes: string;
  dislikes: string;
  instructions: string;
};

export type CareRecipientInput = Omit<CareRecipient, "id">;

const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export function normalizePhoneDigits(phone: string) {
  return phone.replace(/\D/g, "");
}

export function validateContact(input: ContactInput): ContactInput {
  const name = input.name.trim();
  const relationship = input.relationship.trim() || "Family";
  const phone = input.phone.trim();
  const digitCount = normalizePhoneDigits(phone).length;

  if (!name || name.length > 80) throw new Error("Enter a name under 80 characters.");
  if (relationship.length > 80) throw new Error("Keep the relationship under 80 characters.");
  if (digitCount < 7 || digitCount > 15 || !/^[+\d\s()-]+$/.test(phone)) {
    throw new Error("Enter a valid phone number.");
  }
  if (!timePattern.test(input.emergencyFrom) || !timePattern.test(input.emergencyUntil)) {
    throw new Error("Choose valid emergency calling hours.");
  }

  return { name, relationship, phone, emergencyFrom: input.emergencyFrom, emergencyUntil: input.emergencyUntil };
}

export function validateContactUpdate(updates: Partial<ContactInput>): Partial<ContactInput> {
  if ("phone" in updates) {
    const phone = updates.phone?.trim() ?? "";
    const digitCount = normalizePhoneDigits(phone).length;
    if (digitCount < 7 || digitCount > 15 || !/^[+\d\s()-]+$/.test(phone)) {
      throw new Error("Enter a valid phone number.");
    }
    return { phone };
  }

  if ("emergencyFrom" in updates || "emergencyUntil" in updates) {
    if (!timePattern.test(updates.emergencyFrom ?? "") || !timePattern.test(updates.emergencyUntil ?? "")) {
      throw new Error("Choose valid emergency calling hours.");
    }
    return { emergencyFrom: updates.emergencyFrom, emergencyUntil: updates.emergencyUntil };
  }

  throw new Error("No supported contact changes were provided.");
}

export function validateCareRecipient(input: CareRecipientInput): CareRecipientInput {
  const recipient = {
    name: input.name.trim(),
    relationship: input.relationship.trim() || "Grandparent",
    phone: input.phone.trim(),
    address: input.address.trim(),
    latitude: input.latitude,
    longitude: input.longitude,
    likes: input.likes.trim(),
    dislikes: input.dislikes.trim(),
    instructions: input.instructions.trim(),
  };

  if (!recipient.name || recipient.name.length > 80) {
    throw new Error("Enter a name under 80 characters.");
  }
  if (recipient.relationship.length > 80) {
    throw new Error("Keep the relationship under 80 characters.");
  }
  const digitCount = normalizePhoneDigits(recipient.phone).length;
  if (recipient.phone && (digitCount < 7 || digitCount > 15 || !/^[+\d\s()-]+$/.test(recipient.phone))) {
    throw new Error("Enter a valid phone number.");
  }
  const hasLocation = Boolean(recipient.address) || recipient.latitude !== null || recipient.longitude !== null;
  if (recipient.address.length > 300) {
    throw new Error("Keep the home address under 300 characters.");
  }
  if (hasLocation && (
    !recipient.address ||
    recipient.latitude === null ||
    recipient.longitude === null ||
    !Number.isFinite(recipient.latitude) ||
    !Number.isFinite(recipient.longitude) ||
    recipient.latitude < -90 ||
    recipient.latitude > 90 ||
    recipient.longitude < -180 ||
    recipient.longitude > 180
  )) {
    throw new Error("Select the home location on the map.");
  }
  if ([recipient.likes, recipient.dislikes, recipient.instructions].some((value) => value.length > 4000)) {
    throw new Error("Keep each profile note under 4,000 characters.");
  }

  return recipient;
}
