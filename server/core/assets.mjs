import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileExists, httpError, resolveInside } from './util.mjs'
import { resolveSpace } from './spaces.mjs'

/** Extensions we accept, mapped to the MIME type their bytes must match. */
const IMAGE_TYPES = new Map([
  ['png', 'image/png'],
  ['jpg', 'image/jpeg'],
  ['jpeg', 'image/jpeg'],
  ['gif', 'image/gif'],
  ['webp', 'image/webp'],
])

const MAX_BYTES = 16 * 1024 * 1024

/** Magic-number check so a renamed file cannot smuggle another type in. */
function sniff(buffer) {
  if (buffer.length > 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return 'image/png'
  if (buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg'
  if (buffer.length > 6 && buffer.subarray(0, 4).toString('ascii') === 'GIF8') return 'image/gif'
  if (buffer.length > 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp'
  return null
}

/**
 * Store a pasted or dropped image inside the space's `assets/` folder.
 *
 * The browser sends base64 JSON (no multipart parser in this plugin). SVG is
 * intentionally rejected: our asset route serves what it is given, and an SVG
 * can carry script.
 *
 * @returns {Promise<{ path: string, size: number, mime: string }>} Space-relative path.
 */
export async function uploadAsset(client, config, { space, filename, dataBase64 } = {}) {
  const { root } = await resolveSpace(client, space, config)

  const name = String(filename || 'image')
  const ext = path.extname(name).slice(1).toLowerCase()
  const expected = IMAGE_TYPES.get(ext)
  if (!expected) throw httpError('UNSUPPORTED_FORMAT', '只支持 png/jpg/gif/webp 图片')

  const encoded = String(dataBase64 || '')
  if (!encoded) throw httpError('INVALID_ARGUMENT', 'dataBase64 is required')
  const buffer = Buffer.from(encoded, 'base64')
  if (buffer.length === 0) throw httpError('INVALID_ARGUMENT', 'image data is empty')
  if (buffer.length > MAX_BYTES) throw httpError('FILE_TOO_LARGE', '图片不能超过 16 MB', { maxBytes: MAX_BYTES })

  const actual = sniff(buffer)
  if (actual !== expected) throw httpError('UNSUPPORTED_FORMAT', '文件内容与扩展名不符')

  const directory = await resolveInside(root, 'assets')
  await fs.mkdir(directory.full, { recursive: true })

  // Keep CJK names (they are meaningful to the author); strip only characters
  // filesystems reject and anything that could escape `assets/`.
  const base = path.basename(name, path.extname(name))
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '')
    .replace(/^\.+/, '')
    .trim()
    .slice(0, 60) || 'image'
  let rel = `assets/${base}.${ext}`
  for (let index = 2; await fileExists(path.join(root, rel)); index += 1) {
    rel = `assets/${base}-${index}.${ext}`
  }

  await fs.writeFile(path.join(root, rel), buffer)
  return { path: rel, size: buffer.length, mime: expected }
}
