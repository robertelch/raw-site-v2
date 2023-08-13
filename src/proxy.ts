import { enums } from "superstruct"

export const ValidProxiedHosts = enums([
  'comic-walker.com',
  'comicwalker-api.nicomanga.jp',
  'www.comicride.jp',
  'michikusacomics.jp',
  'drm.cdn.nicomanga.jp',
  'deliver.cdn.nicomanga.jp',
  'comic.webnewtype.com',
  'web-ace.jp',
  'api.comic-earthstar.jp',
  'storage.comic-earthstar.jp',
  'comic.pixiv.net',
  'img-comic.pximg.net',
  'firecross.jp',
  'shonenjumpplus.com',
  'cdn-ak-img2.shonenjumpplus.com',
  'tonarinoyj.jp',
  'cdn-img.tonarinoyj.jp',
  'pocket.shonenmagazine.com',
  'cdn-img.pocket.shonenmagazine.com',
  'comic-days.com',
  'cdn-img.comic-days.com',
  'kuragebunch.com',
  'cdn-img.kuragebunch.com',
  'viewer.heros-web.com',
  'cdn-img.viewer.heros-web.com',
  'comicborder.com',
  'cdn-img.comicborder.com',
  'comic-gardo.com',
  'cdn-img.comic-gardo.com',
  'comic-zenon.com',
  'cdn-img.comic-zenon.com',
  'magcomi.com',
  'cdn-img.magcomi.com',
  'comic-action.com',
  'cdn-img.comic-action.com',
  'www.sunday-webry.com',
  'cdn-img.www.sunday-webry.com',
  'comic-trail.com',
  'cdn-img.comic-trail.com',
  'www.comic-brise.com',
  'comic-meteor.jp',
  'comic-polaris.jp',
  'manga.zerosumonline.com',
  'gammaplus.takeshobo.co.jp',
  'gaugau.futabanet.jp',
  'www.123hon.com',
  'static.ichijinsha.co.jp',
  'viewer.comic-earthstar.jp',
  'yanmaga.jp',
  'api2-yanmaga.comici.jp',
  'viewer-yanmaga.comici.jp',
  'youngchampion.jp',
  'viewer.youngchampion.jp',
  'bigcomics.jp',
  'viewer.bigcomics.jp',
  'younganimal.com',
  'viewer.younganimal.com'
])

let proxyUrl = ''
let cookieString = ''

export async function getFromProxy(url: string, headers: object = {}) {
  return fetch(getProxiedUrl(url, headers))
}

export function getProxiedUrl(url: string, headers: object = {}) {
  const finalUrl = new URL(url)

  Object.entries(headers).forEach(([key, value]) => {
    finalUrl.searchParams.append('headers[]', `${key}|${value}`)
  })

  finalUrl.searchParams.append('headers[]', `cookie|${cookieString}`)

  return `${proxyUrl}/proxy?url=${encodeURIComponent(finalUrl.href)}`
}

export function setProxyUrl(url: string) {
  if (url.at(-1) === '/') url = url.slice(0, -1)
  proxyUrl = url
}

export function setCookieString(cookie: string) {
  cookieString = cookie
}