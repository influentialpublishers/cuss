
const debug        = require('debug')('kuss:couchdb:wrapper')
const R            = require('ramda')
const GotCouch     = require('got-couch')
const Response     = require('./response.js')
const CouchDBError = require('./error.js')


const DEFAULT_OPTIONS = {}


const handler = R.compose(
  R.tap((x) => debug('RESPONSE: %o', x))
, R.ifElse(
    Response.isOk
  , Response.getBody
  , CouchDBError.throw
  )
)


const wrapper = (fn) => R.curryN(
  fn.length
, (...args) => fn.apply(fn, args).then(handler)
)


const find = wrapper((couch, bucket, query) =>
  couch.query(bucket, query, DEFAULT_OPTIONS)
)


const insert = wrapper((couch, bucket, doc) =>
  couch.insert(bucket, doc)
)


const create = wrapper((couch, bucket, id, doc) =>
  couch.create(bucket, id, doc)
)


const bulk_upsert = wrapper((couch, bucket, docs) =>
  couch.bulk_upsert(bucket, docs)
)


const get = wrapper((couch, bucket, id) =>
  couch.get(bucket, id)
)


const list = wrapper((couch, bucket, params) =>
  couch.list(bucket, params)
)


module.exports = (config) => GotCouch(config).then((couch) => ({
  query       : find(couch)
, insert      : insert(couch)
, create      : create(couch)
, bulk_upsert : bulk_upsert(couch)
, get         : get(couch)
, list        : list(couch)
}))
