import axios from "axios"
import { sendStream } from "h3"
import { is } from "superstruct"
import { assertReturn } from "~/src/utils/inlines"

import { ValidProxiedHosts } from "~/src/proxy"

export default defineEventHandler(async (event) => {
  let statusCode = 500

  try {
    const urlOnQuery = getQuery(event).url

    if (typeof urlOnQuery !== 'string') {
      statusCode = 400
      throw new Error('Invalid URL.')
    }

    const urlToProxy = new URL(decodeURIComponent(assertReturn(
      urlOnQuery,
      'Invalid URL.',
      () => statusCode = 400
    )))

    if (!is(urlToProxy.hostname, ValidProxiedHosts)) {
      statusCode = 400
      throw new Error(`Cannot proxy from host ${urlToProxy.hostname}.`)
    }

    const headers: { [key: string]: string } = {}

    const headersOnQuery = urlToProxy.searchParams.getAll('headers[]')

    if (typeof headersOnQuery === 'object' && typeof headersOnQuery?.length !== 'undefined') {
      headersOnQuery.map((header: string) => {
        header = decodeURIComponent(header)
        headers[header.split('|')[0]] = header.split('|')[1]
      })
    }

    const stream = await axios(urlToProxy.href, { responseType: 'stream', headers })

    return sendStream(event, stream.data)
  } catch (error) {
    throw createError({
      statusCode: statusCode,
      // @ts-expect-error
      statusMessage: error.message
    })
  }
})