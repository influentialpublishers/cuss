
const R            = require('ramda')
const Bluebird     = require('bluebird')
const CouchWrapper = require('./wrapper.js')
const ID           = require('../identifier.js')
const Err          = require('../error.js')
const Util         = require('../util')

const STORE           = 'couchdb'
const DEFAULT_OPTIONS = {}
const ONE             = 1


const hasOnlyOne = R.compose(R.equals(ONE), R.length)


const propValueToPredicate = R.compose(R.objOf('predicates'), R.objOf)


const wrapProjection = R.compose(R.merge, R.objOf('projection'))


const getById = R.curry((couch, bucket, id) =>
  Bluebird.resolve(couch.get(bucket, id))
  .catch({ statusCode : Err.STATUS_CODE.NOT_FOUND }, R.always(undefined))
)


const getAll = R.curry((couch, bucket) =>
  Bluebird.resolve(couch.list(bucket, DEFAULT_OPTIONS))
)


const findWhereEq = R.curry((couch, bucket, query) =>
  Bluebird.resolve(R.compose(
    R.composeP(
        R.propOr([], 'docs')
      , (couch_query) => couch.query(bucket, couch_query, {})
    )
    , R.pickBy(R.compose(R.not, R.isNil))
    , R.applySpec({
        fields: R.prop('projection')
      , selector: R.prop('predicates')
      , skip: R.prop('skip')
      , limit: R.prop('limit')
      , sort: R.prop('sort')
      })

)(query)))


const insert = R.curry((couch, bucket, doc) => Bluebird.resolve(R.composeP(
  ID.prop
, R.ifElse(
    ID.has
  , R.converge(couch.create(bucket), [ ID.prop, ID.omit ])
  , couch.insert(bucket)
  )
)(doc)))


const update = R.curry((couch, bucket, id, params) =>
  Bluebird.resolve(getById(couch, bucket, id))
  .then(R.when(R.isNil, () => Err.NotFound.throw(STORE, bucket, id)))
  .then(R.merge(R.__, params))
  .then(couch.create(bucket, id))
  .then(R.prop('id'))
  .catch(
    { message : 'Response code 409 (Conflict)' }
  , () => Err.StorageConflict.throw(STORE, bucket, id)
  )
)


// The keys array is an array of property names. Internally, this function
// tries to find documents with selected key-value pairs as given document.
// Then it updates the first document from found list, or insert a new
// document.
// :: CouchConnection -> String -> Array<String> -> Document
const upsert = R.curry((couch, bucket, keys, doc) =>
  Bluebird.resolve(
    R.composeP(
      R.ifElse(
        R.isEmpty
      , () => insert(couch, bucket, doc)
      , R.compose(update(couch, bucket, R.__, doc), R.prop('_id'), R.head)
      )
    , R.compose(
        findWhereEq(couch, bucket)
      , R.objOf('predicates')
      , R.pickAll(keys)
      )
    )(doc)
  )
)


const _findOneByIdWhereEq = R.curry((couch, bucket, id, predicates) =>
  getById(couch, bucket, id)
  .then(R.unless(
    R.allPass([Util.notNil, R.whereEq(ID.couchify(predicates))])
  , R.always(null)
  ))
)


const _findOneWhereEq = R.curry((couch, bucket, predicates) =>
  findWhereEq(
    couch
  , bucket
  , R.objOf('predicates', ID.couchify(predicates))
  )
  .then(R.ifElse(
    hasOnlyOne
  , R.head
  , R.compose(Err.TooManyRecords.throw(STORE, bucket, predicates), R.length)
  ))
)


const findOneWhereEq = R.curry((couch, bucket, predicates) =>
  Bluebird.resolve(predicates)
  .then(R.ifElse(
    R.has('id')
  , _findOneByIdWhereEq(couch, bucket, predicates.id)
  , _findOneWhereEq(couch, bucket)
  ))
)


const bulk_upsert = R.curry((couch, bucket, keys, docs) =>
  Bluebird.map(docs, (doc) =>
    Bluebird.resolve(keys)
    .then(R.flip(R.pick)(doc))
    .then(R.ifElse(
      R.isEmpty
    , R.always(doc)
    , findOneWhereEq(couch, bucket)
    ))
    .then(R.ifElse(
      Util.isEmptyOrNil
    , R.always(ID.couchify(doc))
    , R.merge(R.__, ID.couchify(doc))
    ))
  )
  .then(couch.bulk_upsert(bucket))
)


const projectAll = R.curry((couch, bucket, projection) =>
  Bluebird.resolve(R.composeP(
    R.project(projection)
  , R.pluck('doc')
  , R.propOr([], 'rows')
  , getAll
)(couch, bucket)))


const findBy = R.curry((couch, bucket, projection, prop, value) =>
  Bluebird.resolve(R.composeP(
    findWhereEq(couch, bucket)
  , wrapProjection(projection)
  , R.compose(Bluebird.resolve, propValueToPredicate)
)(prop, value)))


const findOneBy = R.curry((couch, bucket, projection, prop, value) =>
  Bluebird.resolve(R.composeP(
    R.ifElse(
      hasOnlyOne
    , R.head
    , R.compose(Err.TooManyRecords.throw(STORE, bucket, prop, value), R.length)
    )
  , findWhereEq(couch, bucket)
  , wrapProjection(projection)
  , R.compose(Bluebird.resolve, propValueToPredicate)
)(prop, value)))


const findById = R.curry((couch, bucket, projection, id) => R.composeP(
  R.pick(projection)
, getById(couch)
)(bucket, id))


// Hard delete record with given identifier from the given bucket.
const deleteById = R.curry((couch, bucket, id) =>
  getById(couch, bucket, id)
  .tap(R.when(R.isNil, () => Err.NotFound.throw(STORE, bucket, id)))
  .then(R.prop('_rev'))
  .then(couch.deleteByIdAndRev(bucket, id))
)


module.exports = (server_config, wrapper = CouchWrapper) =>

  wrapper(server_config)

  .then((couch) => ({
    insert     : insert(couch)
  , deleteById : deleteById(couch)
  , update     : update(couch)
  , upsert     : upsert(couch)
  , bulk_upsert: bulk_upsert(couch)
  , getAll     : getAll(couch)
  , getById    : getById(couch)
  , projectAll : projectAll(couch)
  , findBy     : findBy(couch)
  , findOneBy  : findOneBy(couch)
  , findById   : findById(couch)
  , findWhereEq: findWhereEq(couch)
  }))

