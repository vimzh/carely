import { expect, test } from 'bun:test'

import { pcmSampleRate, pcmToTwilioMuLaw8k, twilioMuLawToPcm16k } from './telephony-audio'

test('converts a 20ms Twilio frame into Gemini PCM and back', () => {
  const twilioSilence = Buffer.alloc(160, 0xff).toString('base64')
  const pcm = twilioMuLawToPcm16k(twilioSilence)

  expect(pcm.byteLength).toBe(640)
  expect(Buffer.from(pcm).every((value) => value === 0)).toBe(true)
  expect(Buffer.from(pcmToTwilioMuLaw8k(pcm, 16_000), 'base64')).toEqual(Buffer.alloc(160, 0xff))
})

test('reads Gemini PCM sample rates and rejects unsupported resampling', () => {
  expect(pcmSampleRate('audio/pcm;rate=24000')).toBe(24_000)
  expect(pcmSampleRate('audio/pcm')).toBe(24_000)
  expect(() => pcmToTwilioMuLaw8k(new Uint8Array(2), 22_050)).toThrow('Unsupported Gemini audio rate')
})
