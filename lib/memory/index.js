
const R        = require('ramda')
const Bluebird = require('bluebird')
const uuid     = require('uuid')
const Err      = require('../error.js')
const Util     = require('../util')

const STORE = 'memory'
const ZERO  = 0
const ONE   = 1
const TWO   = 2


const throwInvalidBucket = (bucket) => {
  throw new Error(`Invalid Bucket: ${bucket}`)
}


const missingBucket = R.curryN(TWO, R.compose(R.not, R.flip(R.has)))


const assertBucket = R.curry((store, bucket) =>
    R.when(missingBucket(store), throwInvalidBucket)(bucket)
)

/*eslint max-statements: ["error", 21]*/
module.exports = function MemoryStore(data_set) {

  const store = R.defaultTo({}, data_set)

  const getBucket = (bucket) => {
    assertBucket(store, bucket)

    return R.prop(bucket, store)
  }


  const getById = R.curry((bucket, id) => {
    assertBucket(store, bucket)

    return Bluebird.resolve(store[bucket][id])
  })


  const insert = R.curry((bucket, data) => {
    data.id = uuid.v4()

    if (!R.has(bucket, store)) store[bucket] = {}

    store[bucket][data.id] = data

    return Bluebird.resolve(data.id)
  })


  const update = R.curry((bucket, id, data) =>

    getById(bucket, id)

    .tap(R.when(R.isNil, () => Err.NotFound.throw(STORE, bucket, id)))

    .then(() => {
      store[bucket][id] = R.merge(store[bucket][id], data)
    })

    .return(id)

  )


  const findWhere = R.curry((bucket, predicates) => R.composeP(
    R.unless(R.isNil, R.compose(
      R.find(R.whereEq(predicates))
      , R.values
    ))
    , R.compose(Bluebird.resolve, R.prop(R.__, store))
  )(bucket))


  const upsert = R.curry((bucket, keys, data) =>

    findWhere(bucket, R.pick(keys, data))

    .then((found) => found ?
      update(bucket, found.id, R.merge(found, data)) :
      insert(bucket, data)
    )

  )


  const bulk_upsert = R.curry((bucket, keys, data_list) =>
    Bluebird.map(data_list, (data) =>
      upsert(bucket, keys, data)
    )
  )


  const getAll = R.compose(Bluebird.resolve, R.values, getBucket)


  // _paginate :: Int -> Int -> [a] -> [a]
  const _paginate = R.curry((skip, limit) => {
    if (!limit) return R.drop(skip)
    return R.compose(R.take(limit), R.drop(skip))
  })


  // _sortToFn :: Sort -> ComparatorFn
  const _sortToFn = ([key, order]) => R.ifElse(
    R.equals('desc')
  , R.always(Util.descend(R.prop(key)))
  , R.always(Util.ascend(R.prop(key)))
  )(order)


  // _sortsToFns :: [Sort] -> [ComparatorFn]
  const _sortsToFns = R.map(R.compose(_sortToFn, R.head, R.toPairs))


  // _sort :: [Sort] -> [a] -> [a]
  const _sort = R.curry((sorts, list) => {
    if (R.either(R.isNil, R.isEmpty)(sorts)) return list
    return Util.sortWhere(_sortsToFns(sorts), list)
  })


  const findWhereEq = R.curry((bucket, request) => {

    const projection = request.projection
    const predicates = R.defaultTo({}, request.predicates)
    const sort       = R.defaultTo({}, request.sort)
    const limit      = R.defaultTo(null, request.limit)
    const skip       = R.defaultTo(ZERO, request.skip)

    return getAll(bucket)
    .then(R.filter(R.whereEq(predicates)))
    .then(_sort(sort))
    .then(_paginate(skip, limit))
    .map(R.pick(projection))

  })


  // updateWhereEq :: Bucket -> Predicate -> Updates -> Promise Int
  const updateWhereEq = R.curry((bucket, predicate, updates) =>
    getAll(bucket)
    .then(R.filter(R.whereEq(predicate)))
    .each(row => {
      store[bucket][row.id] = R.merge(store[bucket][row.id], updates)
    })
    .then(R.length)
  )


  /** @TODO Query Routing
   * const query = QueryRouter(config.query_route_file)(store)
   */


  const projectAll = R.curry((bucket, projection) =>
      getAll(bucket).map(R.pick(projection)))


  const findBy = R.curry((bucket, projection, prop, value) =>
      projectAll(bucket, projection).filter(R.propEq(prop, value)))


  const findOneBy = R.curry((bucket, projection, prop, value) =>
    findBy(bucket, projection, prop, value)
    .tap(R.compose(
      R.when(R.lt(ONE), Err.TooManyRecords.throw(STORE, bucket, prop, value))
    , R.length
    ))
    .then(R.head))


  const findById = R.curry((bucket, projection, id) =>
      getById(bucket, id).then(R.pick(projection))
  )


  // Hard delete record with given identifier from the given bucket.
  const deleteById = R.curry((bucket, id) =>
      getById(bucket, id)
      .tap(R.when(R.isNil, () => Err.NotFound.throw(STORE, bucket, id)))
      .then(() => {
        delete store[bucket][id]
        return true
      })
  )


  return {
    insert
  , update
  , updateWhereEq
  , upsert
  , bulk_upsert
  , deleteById
  , getById
  , getAll
  , projectAll
  , findBy
  , findOneBy
  , findById
  , findWhere
  , findWhereEq
  }

}
