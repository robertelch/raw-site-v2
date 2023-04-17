import { array, assert, nullable, number, object, partial, string, type } from "superstruct"
import { getFromProxy } from "../proxy"
import { assertReturn } from "../utils/inlines"
import JSZip from "jszip"
import { ResourceHandler } from "../resources.type"

export const FramesPartialSchema = type({
  data: object({
    result: array(object({
      id: number(),
      meta: type({
        source_url: string(),
        drm_hash: nullable(string())
      })
    }))
  })
})

export default class CommicWalkerHandler implements ResourceHandler {
  url: URL
  id: string
  states: { name: string; percentage: number }[]
  currentStateIndex: number
  zipFile: JSZip
  pagesComplete: number

  constructor(url: string) {
    this.url = new URL(url)

    this.id = assertReturn(
      this.url.searchParams.get('cid') || undefined,
      'Could not find id in the URL.'
    )

    this.states = [
      { name: 'Getting API data.', percentage: 0 },
      { name: 'Downloading & decoding images', percentage: 0 },
    ]
    this.currentStateIndex = 0

    this.zipFile = new JSZip()
    this.pagesComplete = 0
  }

  async execute() {
    const resp = await getFromProxy(`https://comicwalker-api.nicomanga.jp/api/v1/comicwalker/episodes/${this.id}/frames`)
    const frames = await resp.json()

    assert(frames, FramesPartialSchema)

    const totalPages = assertReturn(
      frames.data?.result.length,
      'Could not get the total amount of pages.'
    )

    this.states[this.currentStateIndex].percentage = 1
    this.currentStateIndex += 1

    frames.data?.result.forEach(async (page, index) => {
      const sourceUrl = assertReturn(
        page.meta.source_url,
        `Could not get source URL for page ${index + 1}.`
      )

      const drmHash = assertReturn(
        page.meta.drm_hash,
        `Could not get DRM hash for page ${index + 1}`
      )

      const resp = await getFromProxy(sourceUrl)
      const buffer = await resp.arrayBuffer()

      if (!drmHash) {
        this.zipFile.file(`${(index + 1).toString().padStart(3, '0')}.jpg`, buffer)

        this.pagesComplete += 1
        this.states[this.currentStateIndex].percentage = this.pagesComplete / totalPages

        return
      }

      const key: number[] = []
      for (let i = 0; i < 8; i++) {
        key.push(parseInt(drmHash.slice(i * 2, i * 2 + 2), 16));
      }

      const decodedBuffer = new ArrayBuffer(buffer.byteLength)

      const originalBufferDataView = new DataView(buffer)
      const decodedBufferDataView = new DataView(decodedBuffer)

      for (let i = 0; i < buffer.byteLength; i++) {
        decodedBufferDataView.setUint8(i, originalBufferDataView.getUint8(i) ^ key[i % key.length])
      }

      this.zipFile.file(`${(index + 1).toString().padStart(3, '0')}.jpg`, decodedBuffer)

      this.pagesComplete += 1
      this.states[this.currentStateIndex].percentage = this.pagesComplete / totalPages
    })

    return new Promise<JSZip>((resolve, reject) => {
      const timer = setInterval(() => {
        if (this.pagesComplete === totalPages) {
          clearInterval(timer)
          resolve(this.zipFile)
        }
      }, 500)
    })
  }
}