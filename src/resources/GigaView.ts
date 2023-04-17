import JSZip from "jszip";
import { ResourceHandler } from "../resources.type";
import { assertReturn } from "../utils/inlines";
import { getFromProxy } from "../proxy";
import { array, assert, optional, string, type } from "superstruct";

export const ChapterDataSchema = type({
  readableProduct: type({
    pageStructure: type({
      pages: array(type({
        type: string(),
        src: optional(string())
      }))
    })
  })
})

export default class GigaViewHandler implements ResourceHandler {
  url: URL;
  states: { name: string; percentage: number; }[];
  currentStateIndex: number;
  zipFile: JSZip;
  pagesComplete: number;

  constructor(url: string) {
    this.url = new URL(url)

    this.states = [
      { name: 'Getting API data.', percentage: 0 },
      { name: 'Downloading', percentage: 0 },
    ]
    this.currentStateIndex = 0

    this.zipFile = new JSZip()
    this.pagesComplete = 0
  }

  async execute(): Promise<JSZip> {
    const resp = await getFromProxy(`${this.url.href}.json`, {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 9; Pixel) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4026.0 Mobile Safari/537.36'
    })
    const body = await resp.json()

    assert(body, ChapterDataSchema)

    const totalPages = body.readableProduct.pageStructure.pages.filter(page => page.type === 'main').length

    this.states[this.currentStateIndex].percentage = 1
    this.currentStateIndex += 1

    body.readableProduct.pageStructure.pages.filter(page => page.type === 'main').forEach(async (page, index) => {
      const resp = await getFromProxy(page.src!)
      const buffer = await resp.arrayBuffer()

      this.zipFile.file(`${(index + 1).toString().padStart(3, '0')}.jpg`, buffer)

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