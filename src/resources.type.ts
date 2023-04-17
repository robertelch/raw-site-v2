import JSZip from "jszip"

export interface ResourceHandler {
  url: URL
  states: {
    name: string
    percentage: number
  }[]
  currentStateIndex: number
  zipFile: JSZip
  pagesComplete: number

  execute(): Promise<JSZip>
}