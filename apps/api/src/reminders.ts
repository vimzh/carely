// Sends confirmed reminder actions from the ADK agent to Carely's web database.
export async function createPersonalReminder(input: {
  ownerEmail: string
  recipientName: string
  title: string
  time: string
  context: string
}) {
  const secret = process.env.CARELY_AGENT_SECRET
  if (!secret) throw new Error('CARELY_AGENT_SECRET is required for agent reminder actions')

  const webOrigin = (process.env.CARELY_WEB_ORIGIN ?? 'http://localhost:3004').replace(/\/$/, '')
  const response = await fetch(`${webOrigin}/api/reminders/agent`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${secret}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(input),
  })
  const body = await response.json().catch(() => null) as { error?: unknown; reminder?: unknown } | null
  if (!response.ok) {
    throw new Error(typeof body?.error === 'string' ? body.error : `Reminder service returned ${response.status}`)
  }
  return body?.reminder
}
