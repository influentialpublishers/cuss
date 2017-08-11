const R            = require('ramda')
const Bluebird     = require('bluebird')

const Connection   = require('./connection.js')
const CouchDBError = require('./error.js')


const wrapper = (fn) => R.curryN(
  fn.length
, (couch, bucket, ...args) => {
    const conn = couch.use(bucket)
    conn[fn.name] = Bluebird.promisify(conn[fn.name])

    return fn.apply(fn, [conn, bucket].concat(args))
    .catch(CouchDBError.throw)
  }
)


// :: CouchDbConnection -> String -> Document
// -> Promise<Array<{ok: Boolean, id: String, rev: String}>>
function bulk(couch, bucket, docs) {
  return couch.bulk({docs: docs})
}


// :: CouchDbConnection -> String -> String -> Promise<CouchDbResponse>
function destroy(couch, bucket, id, rev) {
  return couch.destroy(id, rev)
}


// :: CouchDbConnection -> String -> Promise<CouchDbResponse>
function get(couch, bucket, id) {
  return couch.get(id)
}


// :: CouchDbConnection -> String -> Document -> Promise<CouchDbResponse>
function insert(couch, bucket, doc) {
  return couch.insert(doc)
}


// :: CouchDbConnection -> String -> ListQuery -> Promise<CouchDbResponse>
function list(couch, bucket, params) {
  return couch.list(params)
}


// This function does not adhere to the wrapper pattern because Nano does not
// encapsulate the CouchDb endpoint /db/_find similarly to other endpoints.
// In order to use this endpoint we need to build a custom request.
// :: CouchDbConnection -> String -> FindQuery -> Promise<CouchDbResponse>
function find(couch, bucket, query) {
  const request = Bluebird.promisify(couch.request)
  const options = {
    selector: {},
    db: bucket,
    method: 'POST',
    doc: '_find',
    body: query
  }

  return request(options)
}


module.exports = (config) =>
  Connection.open(config)
  .then((connection) => ({
    insert          : wrapper(insert)(connection)
  , deleteByIdAndRev: wrapper(destroy)(connection)
  , bulk_upsert     : wrapper(bulk)(connection)
  , get             : wrapper(get)(connection)
  , list            : wrapper(list)(connection)
  , query           : R.curry(find)(connection)
  }))
