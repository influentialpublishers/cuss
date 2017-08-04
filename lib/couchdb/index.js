const R            = require('ramda')
const Bluebird     = require('bluebird')
const CouchWrapper = require('./wrapper.js')
const ID           = require('../identifier.js')
const Err          = require('../error.js')
const Util         = require('../util')

const STORE           = 'couchdb'
const DEFAULT_OPTIONS = {include_docs: true}
const ONE             = 1


/**
  * type alias QueryObject =
  * { projection: http://docs.couchdb.org/
        en/latest/api/database/find.html?highlight=_find#find-filter
  * , predicates: http://docs.couchdb.org/
        en/latest/api/database/find.html?highlight=_find#find-selectors
  * , skip: Int
  * , limit: Int
  * , sort: http://docs.couchdb.org/
        en/latest/api/database/find.html?highlight=_find#sort-syntax
  * , include_docs: Boolean
  * }
  */

/**
  * type alias Projection = Array<String>
  */


// Array<a> -> Boolena
const hasOnlyOne = R.compose(R.equals(ONE), R.length)


// String, a -> Promise<{predicates: {String: a}}>
const propValueToPredicate = R.compose(
  Bluebird.resolve
, R.objOf('predicates')
, R.objOf
)


// Array<String> -> {projection: Array<String>}
const wrapProjection = R.compose(R.merge, R.objOf('projection'))


// :: WrappedCouchDb -> String -> String -> Promise<Document>
const getById = R.curry((couch, bucket, id) =>
  couch.get(bucket, id)
)


// :: WrappedCouchDb -> String -> Promise<Array<Document>>
const getAll = R.curry((couch, bucket) => couch.list(bucket, DEFAULT_OPTIONS))


// :: WrappedCouchDb -> String -> QueryObject -> Promise<Array<Document>>
const findWhereEq = R.curry((couch, bucket, query) =>
  R.compose(
    R.composeP(
      R.propOr([], 'docs')
    , couch.query(bucket)
    )
  , R.pickBy(R.compose(R.not, R.isNil))
  , R.applySpec({
      fields: R.prop('projection')
    , limit: R.prop('limit')
    , selector: R.propOr({}, 'predicates')
    , skip: R.prop('skip')
    , sort: R.prop('sort')
    })
  )(query)
)

// Insert a document into a database. Include `_id` property in the document to
// define a custom identifier. If `_id` is missing, then CouchDb generates
// an identifier for the doc.
// CouchDbConnection -> String -> Document -> Promise<String>
const insert = R.curry((couch, bucket, doc) =>
  R.composeP(
    ID.prop
  , R.ifElse(
      R.has('id')
    , R.compose(couch.insert(bucket), ID.couchify)
    , couch.insert(bucket)
    )
  )(doc)
)


// CouchDbConnection -> String -> String -> Document -> Promise<String>
const update = R.curry((couch, bucket, id, params) =>
  getById(couch, bucket, id)
  .then(R.when(R.isNil, () => Err.NotFound.throw(STORE, bucket, id)))
  .then(R.merge(R.__, params))
  .then(couch.insert(bucket))
  .then(R.prop('id'))
  .catch(
    {status: 409, message: 'conflict'}
  , () => Err.StorageConflict.throw(STORE, bucket, id)
  )
  .catch(
    {status: 404, message: 'not_found'}
  , () => Err.NotFound.throw(STORE, bucket, id)
  )
)


// The keys array is an array of property names. Internally, this function
// tries to find documents with selected key-value pairs as given document.
// Then it updates the first document from found list, or insert a new
// document.
// :: CouchDbConnection -> String -> Array<String> -> Document
const upsert = R.curry((couch, bucket, keys, doc) =>
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


// Find a document with given identifier and fields matching predicates.
// :: CouchDbConnection -> String -> String -> {k:v,..}
// -> Promise<Maybe Document>
const _findOneByIdWhereEq = R.curry((couch, bucket, id, predicates) =>
  getById(couch, bucket, id)
  .then(R.unless(
    R.allPass([Util.notNil, R.whereEq(ID.couchify(predicates))])
  , R.always(null)
  ))
  .catch({message:'not_found'}, R.always(null)))


// :: CouchDbConnection -> String -> {k:v,..} -> Promise<Maybe Document>
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


// :: CouchDbConnection -> String -> {k:v,..} -> Promise<Maybe Document>
const findOneWhereEq = R.curry((couch, bucket, predicates) =>
  R.ifElse(
    R.has('id')
  , _findOneByIdWhereEq(couch, bucket, predicates.id)
  , _findOneWhereEq(couch, bucket)
  )(predicates)
)


// :: CouchDbConnection -> String -> Array<String> -> Array<Document>
// -> Promise<Array<String>>
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


// :: CouchDbConnection -> String -> Projection -> Promise<Array<Document>>
const projectAll = R.curry((couch, bucket, projection) =>
  getAll(couch, bucket)
  .then(R.compose(
    R.project(projection)
  , R.pluck('doc')
  , R.propOr([], 'rows')
  ))
)


// :: CouchDbConnection -> String -> Projection -> String -> a
// -> Promise<Array<Docuent>>
const findBy = R.curry((couch, bucket, projection, prop, value) =>
  propValueToPredicate(prop, value)
  .then(wrapProjection(projection))
  .then(findWhereEq(couch, bucket))
)


// :: CouchDbConnection -> String -> Projection -> String -> a
// -> Promise<Docuent>
const findOneBy = R.curry((couch, bucket, projection, prop, value) =>
  propValueToPredicate(prop, value)
  .then(wrapProjection(projection))
  .then(findWhereEq(couch, bucket))
  .then(R.ifElse(
    hasOnlyOne
  , R.head
  , R.compose(Err.TooManyRecords.throw(STORE, bucket, prop, value), R.length)
  ))
)


// :: CouchDbConnection -> String -> Projection -> String -> Promise<Document>
const findById = R.curry((couch, bucket, projection, id) =>
  R.composeP(
    R.pick(projection)
  , getById(couch)
  )(bucket, id)
)


// Hard delete record with given identifier from the given bucket.
// :: CouchDbConnection -> String -> String
// -> Promise<{ok:Boolean, id: String, rev: String}>
const deleteById = R.curry((couch, bucket, id) =>
  getById(couch, bucket, id)
  .tap(R.when(R.isNil, () => Err.NotFound.throw(STORE, bucket, id)))
  .then(R.prop('_rev'))
  .then(couch.deleteByIdAndRev(bucket, id))
)


module.exports = (config, wrapper = CouchWrapper) =>
  wrapper(config)
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
  })
)
