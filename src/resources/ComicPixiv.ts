import JSZip from "jszip";
import { ResourceHandler } from "../resources.type";
import { assertReturn } from "../utils/inlines";
import crypto from "crypto-js"
import { getFromProxy } from "../proxy";
import { array, assert, number, object, optional, string, type } from "superstruct";

export const ChapterDataSchema = object({
  data: object({
    reading_episode: type({
      pages: array(object({
        gridsize: number(),
        width: number(),
        height: number(),
        url: string(),
        key: optional(string())
      }))
    })
  })
})

export default class ComicPixivHandler implements ResourceHandler {
  url: URL;
  id: string
  states: { name: string; percentage: number; }[];
  currentStateIndex: number;
  zipFile: JSZip;
  pagesComplete: number;

  constructor(url: string) {
    this.url = new URL(url)
    this.id = assertReturn(
      this.url.pathname.split('/').at(-1),
      'Could not find id in URL.'
    )

    this.states = [
      { name: 'Getting API data.', percentage: 0 },
      { name: 'Downloading images', percentage: 0 },
    ]
    this.currentStateIndex = 0

    this.zipFile = new JSZip()
    this.pagesComplete = 0
  }

  async execute(): Promise<JSZip> {
    const date = new Date()
    date.setMilliseconds(0)
    const isoDate = date.toISOString().replace(/\.000Z/, 'Z')
    const preHashString = isoDate + 'mAtW1X8SzGS880fsjEXlM73QpS1i4kUMBhyhdaYySk8nWz533nrEunaSplg63fzT'
    const hash = crypto.MD5(preHashString).toString(crypto.enc.Hex)

    const resp = await getFromProxy(
      `https://comic.pixiv.net/api/app/episodes/${this.id}/read_v2`,
      {
        referer: this.url.href,
        'x-requested-with': 'pixivcomic',
        'x-client-time': isoDate,
        'x-client-hash': hash
      }
    )

    const data = await resp.json()

    assert(data, ChapterDataSchema)

    const totalPages = data.data.reading_episode.pages.length

    this.states[this.currentStateIndex].percentage = 1
    this.currentStateIndex += 1

    data.data.reading_episode.pages.forEach(async (page, index) => {
      const resp = await getFromProxy(page.url, { referer: this.url.href })
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