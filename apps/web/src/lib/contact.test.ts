import { describe, expect, test } from "bun:test";

import { normalizePhoneDigits, validateCareRecipient, validateContact, validateContactUpdate } from "@/lib/contact";
import { careRecipientMemoryHash } from "@/lib/care-recipient-memory-hash";

describe("contact validation", () => {
  test("normalizes a saved caller ID for Twilio lookup", () => {
    expect(normalizePhoneDigits("+91 98765-43210")).toBe("919876543210");
  });

  test("trims and accepts a valid emergency contact", () => {
    expect(validateContact({
      name: "  Dadi  ",
      relationship: " Grandparent ",
      phone: "+91 79825 38137",
      emergencyFrom: "09:00",
      emergencyUntil: "21:00",
    })).toEqual({
      name: "Dadi",
      relationship: "Grandparent",
      phone: "+91 79825 38137",
      emergencyFrom: "09:00",
      emergencyUntil: "21:00",
    });
  });

  test("rejects invalid phone numbers and times", () => {
    expect(() => validateContactUpdate({ phone: "123" })).toThrow("valid phone number");
    expect(() => validateContactUpdate({ emergencyFrom: "25:00", emergencyUntil: "21:00" })).toThrow(
      "valid emergency calling hours",
    );
  });

  test("trims a personalized care profile", () => {
    expect(validateCareRecipient({
      name: "  Dadaji ",
      relationship: " Grandfather ",
      phone: " +91 98765 43210 ",
      address: " Village Road, Haryana ",
      latitude: 29.0588,
      longitude: 76.0856,
      likes: " Cricket and tea ",
      dislikes: " Being rushed ",
      instructions: " Speak slowly in Hindi. ",
    })).toEqual({
      name: "Dadaji",
      relationship: "Grandfather",
      phone: "+91 98765 43210",
      address: "Village Road, Haryana",
      latitude: 29.0588,
      longitude: 76.0856,
      likes: "Cricket and tea",
      dislikes: "Being rushed",
      instructions: "Speak slowly in Hindi.",
    });
  });

  test("resynchronizes only when agent-visible profile fields change", () => {
    const recipient = {
      name: "Dadaji",
      relationship: "Grandfather",
      phone: "+91 98765 43210",
      address: "Village Road, Haryana",
      latitude: 29.0588,
      longitude: 76.0856,
      likes: "Cricket",
      dislikes: "Being rushed",
      instructions: "Speak slowly in Hindi.",
    };
    const changedPhone = { ...recipient, phone: "" };
    expect(careRecipientMemoryHash(changedPhone)).toBe(careRecipientMemoryHash(recipient));
    expect(careRecipientMemoryHash({ ...recipient, latitude: 29.1 })).not.toBe(careRecipientMemoryHash(recipient));
    expect(careRecipientMemoryHash({ ...recipient, likes: "Tea" })).not.toBe(careRecipientMemoryHash(recipient));
  });

  test("requires map coordinates when a home address is added", () => {
    expect(() => validateCareRecipient({
      name: "Dadaji",
      relationship: "Grandfather",
      phone: "",
      address: "Village Road, Haryana",
      latitude: null,
      longitude: null,
      likes: "",
      dislikes: "",
      instructions: "",
    })).toThrow("Select the home location on the map");
  });

});
