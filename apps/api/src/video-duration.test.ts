import { expect, test } from 'bun:test'

import { assertGuideVideoDuration } from './video-duration'

test('accepts 30-second guide videos and rejects longer recordings', () => {
  expect(assertGuideVideoDuration(30)).toBe(30)
  expect(() => assertGuideVideoDuration(30.001)).toThrow('30 seconds or shorter')
  expect(() => assertGuideVideoDuration(Number.NaN)).toThrow('Could not read')
})
