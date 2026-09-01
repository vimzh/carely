// Ingests, retrieves, and lists each family's durable Gemini File Search context.
import { createHash } from 'node:crypto'

import { database } from './database'
import { createGeminiDeveloperClient } from './gemini-client'
import { createFamilyContextSearchPrompt, createGuideVideoContextPrompt, createImageContextPrompt, createMediaContextPrompt } from './prompts/carely'

const CONTEXT_MODEL = 'gemini-3.5-flash-lite'

const ai = createGeminiDeveloperClient()
// ponytail: process-local creation lock; persist store IDs before horizontally scaling the API.
const storeNamePromises = new Map<string, Promise<string>>()

database.exec(`
  CREATE TABLE IF NOT EXISTS guide_context_records (
    owner_email TEXT NOT NULL,
    context_key TEXT NOT NULL,
    title TEXT NOT NULL,
    record TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (owner_email, context_key)
  ) STRICT
`)

type ContextSourceType = 'audio' | 'file' | 'image' | 'text' | 'video'

type GuideMedia = {
  content: Blob
  mimeType: string
  name: string
}

function familyKey(ownerEmail: string) {
  const normalized = ownerEmail.trim().toLowerCase()
  if (!normalized || normalized.length > 320) throw new Error('A family owner email is required')
  return createHash('sha256').update(normalized).digest('hex').slice(0, 24)
}

export function familyStoreDisplayName(ownerEmail: string) {
  return `carely-family-${familyKey(ownerEmail)}`
}

async function resolveStoreName(displayName: string) {
  const stores = await ai.fileSearchStores.list()
  for await (const store of stores) {
    if (store.displayName === displayName && store.name) return store.name
  }

  const store = await ai.fileSearchStores.create({
    config: {
      displayName,
      embeddingModel: 'models/gemini-embedding-2',
    },
  })

  if (!store.name) throw new Error('Gemini File Search created a store without a name')
  return store.name
}

function getStoreName(ownerEmail: string) {
  const displayName = familyStoreDisplayName(ownerEmail)
  const existing = storeNamePromises.get(displayName)
  if (existing) return existing

  const pending = resolveStoreName(displayName).catch((error) => {
    storeNamePromises.delete(displayName)
    throw error
  })
  storeNamePromises.set(displayName, pending)
  return pending
}

export async function ingestFamilyContext(ownerEmail: string, input: {
  content: Blob
  contextKey?: string
  displayName: string
  mimeType: string
  sourceType: ContextSourceType
}) {
  const mediaText =
    input.sourceType === 'audio' || input.sourceType === 'video'
      ? await extractMediaContext(input.content, input.mimeType, input.sourceType)
      : null
  const documentName = await uploadContextDocument(ownerEmail, {
    content: mediaText ? new Blob([mediaText], { type: 'text/plain' }) : input.content,
    contextKey: input.contextKey,
    displayName: input.displayName,
    mimeType: mediaText ? 'text/plain' : input.mimeType,
    sourceMimeType: input.mimeType,
    sourceType: input.sourceType,
  })

  if (input.contextKey) {
    await deleteContextDocuments(ownerEmail, input.contextKey, new Set([documentName]))
  }

  return { documentName, displayName: input.displayName }
}

async function uploadContextDocument(ownerEmail: string, input: {
  content: Blob
  contextKey?: string
  displayName: string
  mimeType: string
  sourceMimeType: string
  sourceType: ContextSourceType
}) {
  const storeName = await getStoreName(ownerEmail)
  let operation = await ai.fileSearchStores.uploadToFileSearchStore({
    fileSearchStoreName: storeName,
    file: input.content,
    config: {
      displayName: input.displayName,
      mimeType: input.mimeType,
      customMetadata: [
        { key: 'family_id', stringValue: familyKey(ownerEmail) },
        { key: 'source_type', stringValue: input.sourceType },
        { key: 'source_mime_type', stringValue: input.sourceMimeType },
        ...(input.contextKey ? [{ key: 'context_key', stringValue: input.contextKey }] : []),
      ],
    },
  })

  for (let attempt = 0; !operation.done && !operation.response?.documentName && attempt < 120; attempt += 1) {
    await Bun.sleep(1000)
    operation = await ai.operations.get({ operation })
  }

  if (!operation.done && !operation.response?.documentName) throw new Error('Gemini File Search ingestion timed out')
  if (operation.error) throw new Error(`Gemini File Search ingestion failed: ${JSON.stringify(operation.error)}`)
  if (!operation.response?.documentName) throw new Error('Gemini File Search returned no document name')
  return operation.response.documentName
}

function metadataValue(document: { customMetadata?: Array<{ key?: string; stringValue?: string }> }, key: string) {
  return document.customMetadata?.find((metadata) => metadata.key === key)?.stringValue
}

async function deleteContextDocuments(ownerEmail: string, contextKey: string, keepDocumentNames = new Set<string>()) {
  const storeName = await getStoreName(ownerEmail)
  const documents = await ai.fileSearchStores.documents.list({ parent: storeName })
  for await (const document of documents) {
    if (!document.name || keepDocumentNames.has(document.name)) continue
    if (metadataValue(document, 'context_key') !== contextKey) continue
    await ai.fileSearchStores.documents.delete({ name: document.name, config: { force: true } })
  }
}

async function deleteDocumentsByName(documentNames: string[]) {
  const results = await Promise.allSettled(
    documentNames.map((name) => ai.fileSearchStores.documents.delete({ name, config: { force: true } })),
  )
  const failed = results.filter((result) => result.status === 'rejected')
  if (failed.length) console.error(`Could not clean up ${failed.length} incomplete guide-memory document(s)`)
}

export async function deleteFamilyContext(ownerEmail: string, contextKey: string) {
  await deleteContextDocuments(ownerEmail, contextKey)
  database.query('DELETE FROM guide_context_records WHERE owner_email = ? AND context_key = ?')
    .run(ownerEmail.trim().toLowerCase(), contextKey)
}

export function listGuideContextRecords(ownerEmail: string, limit = 8) {
  const rows = database.query(`
    SELECT title, record
    FROM guide_context_records
    WHERE owner_email = ?
    ORDER BY updated_at DESC
    LIMIT ?
  `).all(ownerEmail.trim().toLowerCase(), limit) as Array<{ title: string; record: string }>

  return rows.map(({ title, record }) => ({ title, record: record.slice(0, 4_000) }))
}

export async function ingestGuideContext(ownerEmail: string, input: {
  contextKey: string
  title: string
  note: string
  instructions: string
  audio: GuideMedia[]
  documents: GuideMedia[]
  images: GuideMedia[]
  videos: GuideMedia[]
}) {
  const writtenContext = [
    `Guide title: ${input.title}`,
    input.note ? `Family note: ${input.note}` : '',
    input.instructions ? `Written instructions:\n${input.instructions}` : '',
  ].filter(Boolean).join('\n\n')
  const visualRecords = await Promise.all(
    input.images.map(async (image) => ({
      name: image.name,
      text: await extractImageContext(image.content, image.mimeType, writtenContext),
    })),
  )
  const videoRecords = await Promise.all(
    input.videos.map(async (video) => ({
      name: video.name,
      text: await extractGuideVideoContext(video.content, video.mimeType, writtenContext),
    })),
  )
  const audioRecords = await Promise.all(
    input.audio.map(async (audio) => ({
      name: audio.name,
      text: await extractMediaContext(audio.content, audio.mimeType, 'audio'),
    })),
  )
  const record = [
    writtenContext,
    ...visualRecords.map(({ name, text }) => `Visual reference (${name}):\n${text}`),
    ...videoRecords.map(({ name, text }) => `Video walkthrough (${name}):\n${text}`),
    ...audioRecords.map(({ name, text }) => `Spoken tutorial (${name}):\n${text}`),
  ].join('\n\n')

  const documentNames: string[] = []
  try {
    documentNames.push(await uploadContextDocument(ownerEmail, {
      content: new Blob([record], { type: 'text/plain' }),
      contextKey: input.contextKey,
      displayName: `Guide: ${input.title}`,
      mimeType: 'text/plain',
      sourceMimeType: 'text/plain',
      sourceType: 'text',
    }))
    for (const document of input.documents) {
      documentNames.push(await uploadContextDocument(ownerEmail, {
        content: document.content,
        contextKey: input.contextKey,
        displayName: `${input.title}: ${document.name}`,
        mimeType: document.mimeType,
        sourceMimeType: document.mimeType,
        sourceType: 'file',
      }))
    }
  } catch (error) {
    await deleteDocumentsByName(documentNames)
    throw error
  }

  await deleteContextDocuments(ownerEmail, input.contextKey, new Set(documentNames))
  database.query(`
    INSERT INTO guide_context_records (owner_email, context_key, title, record, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT (owner_email, context_key) DO UPDATE SET
      title = excluded.title,
      record = excluded.record,
      updated_at = excluded.updated_at
  `).run(ownerEmail.trim().toLowerCase(), input.contextKey, input.title, record, new Date().toISOString())
  return { documentNames, displayName: `Guide: ${input.title}` }
}

export async function ingestCareRecipientContext(ownerEmail: string, input: {
  recipientId: string
  name: string
  relationship: string
  address: string
  latitude: number | null
  longitude: number | null
  likes: string
  dislikes: string
  instructions: string
}) {
  const content = [
    `Care recipient: ${input.name}`,
    `Relationship: ${input.relationship || 'Not provided'}`,
    `Home location: ${input.address || 'Not provided'}`,
    input.latitude === null || input.longitude === null
      ? 'Home coordinates: Not provided'
      : `Home coordinates: ${input.latitude}, ${input.longitude}`,
    `Likes: ${input.likes || 'Not provided'}`,
    `Dislikes: ${input.dislikes || 'Not provided'}`,
    `Personalized instructions: ${input.instructions || 'Not provided'}`,
  ].join('\n')

  return ingestFamilyContext(ownerEmail, {
    content: new Blob([content], { type: 'text/plain' }),
    contextKey: `care-recipient-${input.recipientId}`,
    displayName: `Care profile: ${input.name}`,
    mimeType: 'text/plain',
    sourceType: 'text',
  })
}

async function extractMediaContext(content: Blob, mimeType: string, sourceType: 'audio' | 'video') {
  const data = Buffer.from(await content.arrayBuffer()).toString('base64')
  const media =
    sourceType === 'audio'
      ? ({ type: 'audio', data, mime_type: mimeType } as const)
      : ({ type: 'video', data, mime_type: mimeType } as const)
  const interaction = await ai.interactions.create({
    model: CONTEXT_MODEL,
    input: [
      {
        type: 'text',
        text: createMediaContextPrompt(sourceType),
      },
      media,
    ],
    generation_config: { max_output_tokens: 1800 },
  })
  const text = interaction.output_text?.trim()
  if (!text) throw new Error(`Gemini returned no context for the ${sourceType}`)
  return text
}

async function extractImageContext(content: Blob, mimeType: string, writtenContext: string) {
  const data = Buffer.from(await content.arrayBuffer()).toString('base64')
  const interaction = await ai.interactions.create({
    model: CONTEXT_MODEL,
    input: [
      { type: 'text', text: createImageContextPrompt(writtenContext) },
      { type: 'image', data, mime_type: mimeType },
    ],
    generation_config: { max_output_tokens: 1400 },
  })
  const text = interaction.output_text?.trim()
  if (!text) throw new Error('Gemini returned no visual context for the guide image')
  return text
}

async function extractGuideVideoContext(content: Blob, mimeType: string, writtenContext: string) {
  let video = await ai.files.upload({ file: content, config: { mimeType } })
  if (!video.name) throw new Error('Gemini uploaded the guide video without a file name')
  const videoName = video.name

  try {
    for (let attempt = 0; video.state === 'PROCESSING' && attempt < 120; attempt += 1) {
      await Bun.sleep(1000)
      video = await ai.files.get({ name: videoName })
    }
    if (video.state === 'PROCESSING') throw new Error('Gemini guide video processing timed out')
    if (video.state === 'FAILED') throw new Error(`Gemini guide video processing failed: ${video.error?.message ?? 'unknown error'}`)
    if (!video.uri) throw new Error('Gemini returned no URI for the guide video')

    const interaction = await ai.interactions.create({
      model: CONTEXT_MODEL,
      input: [
        { type: 'text', text: createGuideVideoContextPrompt(writtenContext) },
        { type: 'video', uri: video.uri, mime_type: video.mimeType ?? mimeType },
      ],
      generation_config: { max_output_tokens: 2400 },
    })
    const text = interaction.output_text?.trim()
    if (!text) throw new Error('Gemini returned no context for the guide video')
    return text
  } finally {
    await ai.files.delete({ name: videoName })
  }
}

export async function searchFamilyContext(ownerEmail: string, query: string) {
  const storeName = await getStoreName(ownerEmail)
  const interaction = await ai.interactions.create({
    model: CONTEXT_MODEL,
    input: createFamilyContextSearchPrompt(query),
    tools: [{ type: 'file_search', file_search_store_names: [storeName], top_k: 3 }],
    generation_config: { max_output_tokens: 800 },
  })

  if (interaction.status === 'failed') {
    throw new Error(`Gemini File Search failed: ${JSON.stringify(interaction.errors ?? [])}`)
  }

  const sources = new Set<string>()
  for (const step of interaction.steps) {
    if (step.type !== 'model_output') continue
    for (const content of step.content ?? []) {
      if (content.type !== 'text') continue
      for (const annotation of content.annotations ?? []) {
        if (annotation.type === 'file_citation' && annotation.file_name) {
          sources.add(annotation.file_name)
        }
      }
    }
  }

  const context = interaction.output_text?.trim() ?? ''
  if (!sources.size || !context || context.includes('NO_RELEVANT_CONTEXT')) {
    return { found: false, context: 'No relevant family context was found.', sources: [] }
  }

  return { found: true, context, sources: [...sources] }
}

export async function listFamilyContext(ownerEmail: string) {
  const storeName = await getStoreName(ownerEmail)
  const documents = await ai.fileSearchStores.documents.list({ parent: storeName })
  const results = []

  for await (const document of documents) {
    results.push({
      name: document.name,
      displayName: document.displayName,
      mimeType: document.mimeType,
      sizeBytes: document.sizeBytes,
      state: document.state,
      createdAt: document.createTime,
    })
  }

  return results
}
