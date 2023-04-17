import JSZip from "jszip"
import { ResourceHandler } from "../resources.type"
import { array, assert, string } from "superstruct"
import { getFromProxy } from "../proxy"

export const PagesSchema = array(string())

export default class YauWntHandler implements ResourceHandler {
  url: URL
  states: { name: string; percentage: number }[]
  currentStateIndex: number
  zipFile: JSZip
  pagesComplete: number

  constructor(url: string) {
    this.url = new URL(url)

    this.states = [
      { name: 'Getting API data.', percentage: 0 },
      { name: 'Downloading images.', percentage: 0 },
    ]
    this.currentStateIndex = 0

    this.zipFile = new JSZip()
    this.pagesComplete = 0
  }

  async execute() {
    const resp = await getFromProxy(`${this.url}/json`)
    const pages = await resp.json()

    assert(pages, PagesSchema)

    const totalPages = pages.length

    this.states[this.currentStateIndex].percentage = 1
    this.currentStateIndex += 1

    pages.forEach(async (page, index) => {
      const resp = await getFromProxy(`https://${this.url.hostname}/${page}`)
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