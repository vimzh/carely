// Creates a Gemini SDK client for either local API-key use or Cloud Run's Vertex AI identity.
import { GoogleGenAI } from '@google/genai'

export function createGeminiClient() {
  const useVertex = process.env.GOOGLE_GENAI_USE_ENTERPRISE === 'true'
    || process.env.GOOGLE_GENAI_USE_VERTEXAI === 'true'
  return useVertex
    ? new GoogleGenAI({
        vertexai: true,
        project: process.env.GOOGLE_CLOUD_PROJECT,
        location: process.env.GOOGLE_CLOUD_LOCATION,
        httpOptions: { timeout: 60_000 },
      })
    : new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, httpOptions: { timeout: 60_000 } })
}

export function createGeminiDeveloperClient() {
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is required for Gemini File Search')
  return new GoogleGenAI({ vertexai: false, apiKey: process.env.GEMINI_API_KEY, httpOptions: { timeout: 60_000 } })
}
