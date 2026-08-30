import { expect, test } from "bun:test";

import { deleteObject, putObject, readObject } from "@/lib/object-storage";

test("stores, reads, and removes an attachment object", () => {
  const key = putObject(new Uint8Array([1, 2, 3]));
  expect([...readObject(key)]).toEqual([1, 2, 3]);
  deleteObject(key);
  expect(() => readObject(key)).toThrow();
});
