import JSZip from "jszip";
import { ResourceHandler } from "../resources.type";
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

  constructor(url: string) {
    this.url = new URL(url)

    this.states = [
      { name: 'Getting API data.', percentage: 0 },
      { name: 'Downloading', percentage: 0 },
    ]
    this.currentStateIndex = 0

    this.zipFile = new JSZip()
  }

  async execute(): Promise<JSZip> {
    const body = await getEpisodeBody(this.url)

    const totalPages = body.readableProduct.pageStructure.pages.filter(page => page.type === 'main').length
    let pagesComplete = 0

    this.states[this.currentStateIndex].percentage = 1
    this.currentStateIndex += 1

    const process = async (page: typeof body.readableProduct.pageStructure.pages[0], index: number) => {
      const resp = await getFromProxy(page.src!)
      const buffer = await resp.arrayBuffer()

      this.zipFile.file(`${(index + 1).toString().padStart(3, '0')}.jpg`, buffer)

      pagesComplete += 1
      this.states[this.currentStateIndex].percentage = pagesComplete / totalPages
    }

    await Promise.all(body.readableProduct.pageStructure.pages.filter(page => page.type === 'main').map((page, index) => process(page, index)))

    return this.zipFile
  }
}

async function getEpisodeBody(url: URL) {
  const resp = await getFromProxy(`${url.href}.json`, {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 9; Pixel) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4026.0 Mobile Safari/537.36'
  })

  if (resp.status !== 200) {
    const resp2 = await getFromProxy(url.href, {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 9; Pixel) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4026.0 Mobile Safari/537.36'
    })
    const htmlString = await resp2.text()
    const html = new DOMParser().parseFromString(htmlString, 'text/html')
    const script = html.querySelector<HTMLScriptElement>('#episode-json')
    const body = JSON.parse(script?.dataset.value ?? "")
    assert(body, ChapterDataSchema)
    return body
  }

  const body = await resp.json()
  assert(body, ChapterDataSchema)
  return body
}