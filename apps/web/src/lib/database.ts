import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

const dataDirectory = join(process.cwd(), "data");
mkdirSync(dataDirectory, { recursive: true });

const globalDatabase = globalThis as typeof globalThis & { carelyDatabase?: DatabaseSync };

export const database =
  globalDatabase.carelyDatabase ?? new DatabaseSync(join(dataDirectory, "carely.sqlite"));

globalDatabase.carelyDatabase = database;
database.exec("PRAGMA foreign_keys = ON");
