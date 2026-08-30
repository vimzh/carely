// Validates uploaded guide-video duration with ffprobe before any Gemini call.
import { mkdtemp, rmdir, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export const MAX_GUIDE_VIDEO_SECONDS = 30

export function assertGuideVideoDuration(durationSeconds: number) {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new Error('Could not read the guide video duration')
  }
  if (durationSeconds > MAX_GUIDE_VIDEO_SECONDS) {
    throw new Error('Guide videos must be 30 seconds or shorter')
  }
  return durationSeconds
}

export async function probeGuideVideoDuration(content: Blob) {
  const directory = await mkdtemp(join(tmpdir(), 'carely-video-'))
  const videoPath = join(directory, 'upload')

  try {
    await writeFile(videoPath, new Uint8Array(await content.arrayBuffer()))
    const child = Bun.spawn({
      cmd: [
        process.env.FFPROBE_PATH ?? 'ffprobe',
        '-v',
        'error',
        '-show_entries',
        'format=duration',
        '-of',
        'default=noprint_wrappers=1:nokey=1',
        videoPath,
      ],
      stdout: 'pipe',
      stderr: 'pipe',
    })
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ])
    if (exitCode !== 0) throw new Error(stderr.trim() || 'ffprobe could not inspect the guide video')
    return assertGuideVideoDuration(Number(stdout.trim()))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error('ffprobe is required to validate guide videos')
    }
    throw error
  } finally {
    await unlink(videoPath).catch(() => undefined)
    await rmdir(directory).catch(() => undefined)
  }
}
