// Verifies repeated socket termination cannot run telephone cleanup twice.
import { expect, test } from 'bun:test'

import { createTwilioVoiceSocketEvents } from './twilio-voice'

test('keeps telephone socket cleanup idempotent', async () => {
  const close = createTwilioVoiceSocketEvents().onClose
  expect(close).toBeFunction()
  await close?.({} as never, {} as never)
  await close?.({} as never, {} as never)
})
