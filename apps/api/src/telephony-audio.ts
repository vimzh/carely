// Converts between Twilio's G.711 mu-law phone audio and Gemini Live PCM audio.
const MU_LAW_BIAS = 0x84
const MU_LAW_CLIP = 32635

function decodeMuLawSample(value: number) {
  const sample = (~value) & 0xff
  const magnitude = (((sample & 0x0f) << 3) + MU_LAW_BIAS) << ((sample & 0x70) >> 4)
  return (sample & 0x80) ? MU_LAW_BIAS - magnitude : magnitude - MU_LAW_BIAS
}

function encodeMuLawSample(input: number) {
  let sample = Math.max(-MU_LAW_CLIP, Math.min(MU_LAW_CLIP, input))
  const sign = sample < 0 ? 0x80 : 0
  if (sample < 0) sample = -sample
  sample += MU_LAW_BIAS

  let exponent = 7
  for (let mask = 0x4000; exponent > 0 && (sample & mask) === 0; mask >>= 1) exponent -= 1
  const mantissa = (sample >> (exponent + 3)) & 0x0f
  return (~(sign | (exponent << 4) | mantissa)) & 0xff
}

export function twilioMuLawToPcm16k(payload: string) {
  const muLaw = Buffer.from(payload, 'base64')
  const pcm = Buffer.allocUnsafe(muLaw.length * 4)
  for (let index = 0; index < muLaw.length; index += 1) {
    const current = decodeMuLawSample(muLaw[index]!)
    const next = decodeMuLawSample(muLaw[index + 1] ?? muLaw[index]!)
    pcm.writeInt16LE(current, index * 4)
    pcm.writeInt16LE(Math.round((current + next) / 2), index * 4 + 2)
  }
  return pcm
}

export function pcmToTwilioMuLaw8k(pcm: Uint8Array, sourceRate = 24_000) {
  if (sourceRate < 8_000 || sourceRate % 8_000 !== 0) {
    throw new Error(`Unsupported Gemini audio rate: ${sourceRate}`)
  }

  const input = Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength - (pcm.byteLength % 2))
  const stride = sourceRate / 8_000
  const output = Buffer.allocUnsafe(Math.ceil(input.length / 2 / stride))
  let outputIndex = 0
  for (let sampleIndex = 0; sampleIndex < input.length / 2; sampleIndex += stride) {
    let sum = 0
    let count = 0
    for (let offset = 0; offset < stride && sampleIndex + offset < input.length / 2; offset += 1) {
      sum += input.readInt16LE((sampleIndex + offset) * 2)
      count += 1
    }
    output[outputIndex] = encodeMuLawSample(Math.round(sum / count))
    outputIndex += 1
  }
  return output.subarray(0, outputIndex).toString('base64')
}

export function pcmSampleRate(mimeType: string) {
  const rate = /(?:^|;)\s*rate=(\d+)/i.exec(mimeType)?.[1]
  return rate ? Number(rate) : 24_000
}
