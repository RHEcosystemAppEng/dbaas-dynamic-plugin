import * as _ from 'lodash'

export const cookiePrefix = 'csrf-token='

export const getCSRFToken = () => {
  if (document && document.cookie) {
    return document.cookie
      .split(';')
      .map((c) => _.trim(c))
      .filter((c) => c.startsWith(cookiePrefix))
      .map((c) => c.slice(cookiePrefix.length))
      .pop()
  } else {
    return undefined
  }
}
