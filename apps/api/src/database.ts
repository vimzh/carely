// Provides the single persistent SQLite connection used by Carely's API services.
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'

import { Database } from 'bun:sqlite'

const databasePath = process.env.CARELY_API_DATABASE_PATH ?? join(import.meta.dir, '..', 'data', 'carely-api.sqlite')
if (databasePath !== ':memory:') mkdirSync(dirname(databasePath), { recursive: true })

export const database = new Database(databasePath, { create: true })
