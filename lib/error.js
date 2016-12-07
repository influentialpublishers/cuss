
//eslint-disable-next-line max-len
//@see http://stackoverflow.com/questions/31089801/extending-error-in-javascript-with-es6-syntax

const R = require('ramda')

const STATUS_CODE = {
  NOT_FOUND             : 404
, INTERNAL_SERVER_ERROR : 500
, NOT_IMPLEMENTED       : 501
}

class CussError extends Error {
  constructor(message, status=STATUS_CODE.INTERNAL_SERVER_ERROR) {
    super(message)

    this.name    = this.constructor.name
    this.message = message
    this.status  = status

    Error.captureStackTrace(this, this.constructor)
  }
}


class TooManyRecords extends CussError {
  constructor(store, table, field, constraint, count) {
    const message = 'Too many records. '
      + `Found ${count} records in \`${store}\`.\`${table}\` `
      + `where \`${field}\` = "${constraint}"`

    super(message, STATUS_CODE.INTERNAL_SERVER_ERROR)
  }
}

TooManyRecords.throw = R.curry((store, table, field, constraint, count) => {
  throw new TooManyRecords(store, table, field, constraint, count)
})


class NotFound extends CussError {
  constructor(store, table, id) {
    const message = `Not Found - STORE: ${store} TABLE: ${table} ID: ${id}`
    super(message, STATUS_CODE.NOT_FOUND)
  }
}

NotFound.throw = R.curry((store, table, id) => {
  throw new NotFound(store, table, id)
})


class UnsupportedSocialZombieNetwork extends CussError {
  constructor(network) {
    const message = `Unsupported SocialZombie network: ${network}`

    super(message, STATUS_CODE.NOT_IMPLEMENTED)
  }
}

UnsupportedSocialZombieNetwork.throw = (network) => {
  throw new UnsupportedSocialZombieNetwork(network)
}

module.exports = {
  STATUS_CODE
, CussError
, TooManyRecords
, NotFound
, UnsupportedSocialZombieNetwork
}
