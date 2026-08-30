// Stores care-recipient locations and searches Google Places only for nearby requests.
import { database } from './database'

export type RecipientLocation = {
  recipientId: string
  recipientName: string
  address: string
  latitude: number
  longitude: number
}

database.exec(`
  CREATE TABLE IF NOT EXISTS care_recipient_locations (
    owner_email TEXT NOT NULL,
    recipient_id TEXT NOT NULL,
    recipient_name TEXT NOT NULL,
    address TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (owner_email, recipient_id)
  ) STRICT;
`)

function toLocation(row: Record<string, unknown>): RecipientLocation {
  return {
    recipientId: String(row.recipient_id),
    recipientName: String(row.recipient_name),
    address: String(row.address),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
  }
}

export function saveRecipientLocation(ownerEmail: string, input: {
  recipientId: string
  recipientName: string
  address: string
  latitude: number | null
  longitude: number | null
}) {
  if (!input.address || input.latitude === null || input.longitude === null) {
    database.prepare(
      'DELETE FROM care_recipient_locations WHERE owner_email = ? AND recipient_id = ?',
    ).run(ownerEmail, input.recipientId)
    return
  }

  database.prepare(`
    INSERT INTO care_recipient_locations
      (owner_email, recipient_id, recipient_name, address, latitude, longitude, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(owner_email, recipient_id) DO UPDATE SET
      recipient_name = excluded.recipient_name,
      address = excluded.address,
      latitude = excluded.latitude,
      longitude = excluded.longitude,
      updated_at = excluded.updated_at
  `).run(
    ownerEmail,
    input.recipientId,
    input.recipientName,
    input.address,
    input.latitude,
    input.longitude,
    new Date().toISOString(),
  )
}

export function resolveRecipientLocation(ownerEmail: string, recipientName = '') {
  const rows = database.prepare(`
    SELECT recipient_id, recipient_name, address, latitude, longitude
    FROM care_recipient_locations
    WHERE owner_email = ?
    ORDER BY updated_at DESC, recipient_id
  `).all(ownerEmail) as Array<Record<string, unknown>>
  if (!rows.length) return { location: null, reason: 'No home location is saved for this family.' } as const

  const cleanName = recipientName.trim().toLowerCase()
  if (cleanName) {
    const match = rows.find((row) => String(row.recipient_name).trim().toLowerCase() === cleanName)
    return match
      ? { location: toLocation(match), reason: null } as const
      : { location: null, reason: `No saved home location matches ${recipientName.trim()}.` } as const
  }

  if (rows.length === 1) return { location: toLocation(rows[0]!), reason: null } as const
  return {
    location: null,
    reason: `More than one home location is saved. Ask which person they mean: ${rows.map((row) => row.recipient_name).join(', ')}.`,
  } as const
}

type PlacesResponse = {
  places?: Array<{
    displayName?: { text?: string }
    formattedAddress?: string
    googleMapsUri?: string
    location?: { latitude?: number; longitude?: number }
  }>
  error?: { message?: string }
}

export async function searchNearbyPlaces(
  ownerEmail: string,
  query: string,
  recipientName = '',
  fetchPlaces: typeof fetch = fetch,
) {
  const resolved = resolveRecipientLocation(ownerEmail, recipientName)
  if (!resolved.location) return { found: false, reason: resolved.reason, places: [] }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) throw new Error('GOOGLE_MAPS_API_KEY is required for nearby place searches')

  const response = await fetchPlaces('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.googleMapsUri,places.location',
    },
    body: JSON.stringify({
      textQuery: query,
      pageSize: 3,
      locationBias: {
        circle: {
          center: {
            latitude: resolved.location.latitude,
            longitude: resolved.location.longitude,
          },
          radius: 5000,
        },
      },
    }),
    signal: AbortSignal.timeout(6000),
  })
  const body = await response.json().catch(() => null) as PlacesResponse | null
  if (!response.ok) {
    throw new Error(body?.error?.message || `Google Places returned ${response.status}`)
  }

  const places = (body?.places ?? []).slice(0, 3).map((place) => ({
    name: place.displayName?.text || 'Unnamed place',
    address: place.formattedAddress || '',
    googleMapsUri: place.googleMapsUri || '',
    latitude: place.location?.latitude,
    longitude: place.location?.longitude,
  }))
  return {
    found: places.length > 0,
    searchedNear: resolved.location.address,
    recipientName: resolved.location.recipientName,
    reason: places.length ? null : 'No nearby matching places were found.',
    places,
  }
}
