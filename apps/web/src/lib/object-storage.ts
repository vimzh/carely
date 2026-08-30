import { mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const bucketDirectory = join(process.cwd(), "data", "uploads", "guides");
mkdirSync(bucketDirectory, { recursive: true });

function objectPath(key: string) {
  if (!/^[0-9a-f-]{36}$/.test(key)) throw new Error("Invalid attachment storage key.");
  return join(bucketDirectory, key);
}

export function putObject(data: Uint8Array) {
  const key = crypto.randomUUID();
  const temporaryPath = `${objectPath(key)}.tmp`;
  writeFileSync(temporaryPath, data, { flag: "wx" });
  renameSync(temporaryPath, objectPath(key));
  return key;
}

export function readObject(key: string) {
  return readFileSync(objectPath(key));
}

export function deleteObject(key: string) {
  try {
    unlinkSync(objectPath(key));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}
