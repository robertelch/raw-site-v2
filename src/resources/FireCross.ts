import JSZip from "jszip";
import { ResourceHandler } from "../resources.type";
import { assertReturn } from "../utils/inlines";
import { getFromProxy, getProxiedUrl } from "../proxy";
import { array, assert, number, object, type } from "superstruct";

export const InfoBodySchema = object({
  pages: array(type({
    stepRect: type({
      width: number(),
      height: number()
    })
  }))
})

export default class FireCrossHandler implements ResourceHandler {
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
      { name: 'Downloading & descrambling images', percentage: 0 },
    ]
    this.currentStateIndex = 0

    this.zipFile = new JSZip()
    this.pagesComplete = 0
  }

  async execute(): Promise<JSZip> {
    const htmlResp = await getFromProxy(this.url.href)
    const html = await htmlResp.text()

    const parser = new DOMParser()

    const doc = parser.parseFromString(html, 'text/html')

    const param = assertReturn(
      doc.querySelector('input[name="param"]')?.getAttribute('value') ?? undefined,
      'Could not find param in the parsed HTML.'
    )

    const infoUrl = new URL('https://firecross.jp/celsys/diazepam_hybrid.php')
    infoUrl.searchParams.append('mode', '1');
    infoUrl.searchParams.append('file', 'extend_info.json');
    infoUrl.searchParams.append('reqtype', '0');
    infoUrl.searchParams.append('vm', '4');
    infoUrl.searchParams.append('param', param);

    const infoResp = await getFromProxy(infoUrl.href)
    const infoBody = await infoResp.json()

    assert(infoBody, InfoBodySchema)

    const totalPages = infoBody.pages.length

    this.states[this.currentStateIndex].percentage = 1
    this.currentStateIndex += 1

    infoBody.pages.forEach(async (_, index) => {
      const imgUrl = new URL('https://firecross.jp/celsys/diazepam_hybrid.php')
      imgUrl.searchParams.append('mode', '1');
      imgUrl.searchParams.append('file', `${index}`.padStart(4, '0') + '_0000.bin')
      imgUrl.searchParams.append('reqtype', '0');
      imgUrl.searchParams.append('vm', '4');
      imgUrl.searchParams.append('param', param);

      const img = new Image()
      img.crossOrigin = 'Anonymous'
      img.src = getProxiedUrl(imgUrl.href)
      await img.decode()

      const infoUrl = new URL('https://firecross.jp/celsys/diazepam_hybrid.php')
      infoUrl.searchParams.append('mode', '8');
      infoUrl.searchParams.append('file', `${index}`.padStart(4, '0') + '.xml');
      infoUrl.searchParams.append('reqtype', '0');
      infoUrl.searchParams.append('vm', '4');
      infoUrl.searchParams.append('param', param);

      const infoResp = await getFromProxy(infoUrl.href)
      const infoHtml = await infoResp.text()

      const infoXml = parser.parseFromString(infoHtml, 'text/xml')

      const scramble = assertReturn(
        infoXml.getElementsByTagName('Scramble')[0].innerHTML,
        `Could not get scramble table from page ${index + 1}`
      )
      const width = assertReturn(
        infoXml.getElementsByTagName('Width')[0].innerHTML,
        `Could not get scramble table from page ${index + 1}`
      )
      const height = assertReturn(
        infoXml.getElementsByTagName('Height')[0].innerHTML,
        `Could not get scramble table from page ${index + 1}`
      )

      const coords = this.getCoordsFromScramble(scramble, [parseInt(width), parseInt(height)])

      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = assertReturn(
        canvas.getContext('2d') ?? undefined,
        `Could not get canvas context for page ${index + 1}`
      )

      coords.forEach(coord => {
        ctx.drawImage(img, coord.srcX, coord.srcY, coord.width, coord.height, coord.destX, coord.destY, coord.width, coord.height);
      });

      this.zipFile.file(`${(index + 1).toString().padStart(3, '0')}.jpg`, canvasToBuffer(canvas))

      canvas.width = 1
      canvas.height = 1
      ctx.clearRect(0, 0, 1, 1)

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

  getCoordsFromScramble(scramble: string, size: [number, number]) {
    const scrambleArray = scramble.split(',').map(i => parseInt(i));
    const coords = [];

    let srcX: number, srcY: number, destX: number, destY: number, chunk_width: number, chunk_height: number;
    for (var i = 0; i < scrambleArray.length; i++) {
      srcX = scrambleArray[i] % 4;
      srcY = Math.floor(scrambleArray[i] / 4);
      destX = i % 4;
      destY = Math.floor(i / 4);

      chunk_width = Math.floor(size[0] / 4) - 2;
      chunk_height = Math.floor(size[1] / 4) - 3;

      coords.push({
        srcX: srcX * chunk_width,
        srcY: srcY * chunk_height,
        destX: destX * chunk_width,
        destY: destY * chunk_height,
        width: chunk_width,
        height: chunk_height
      });
    };

    return coords;
  }
}