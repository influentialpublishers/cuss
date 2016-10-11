
const R        = require('ramda');
const Bluebird = require('bluebird');
const uuid     = require('uuid');
const Err      = require('../error.js');
//const QueryRouter = require('../query-router.js')


const throwInvalidBucket = (bucket) => {
  throw new Error(`Invalid Bucket: ${bucket}`);
};


const throwItemNotFound  = (bucket, id) => {
  throw new Error(`Item ID#${id} Not Found in bucket: ${bucket}`);
};


const missingBucket = R.curryN(2, R.compose(R.not, R.flip(R.has)));


const assertBucket = R.curry((store, bucket) => 
    R.when(missingBucket(store), throwInvalidBucket)(bucket)
);


module.exports = function MemoryStore(data_set) {

  const store = R.defaultTo({}, data_set);

  const getBucket = (bucket) => {
    assertBucket(store, bucket);

    return R.prop(bucket, store);
  };


  const getById = R.curry((bucket, id) => {
    assertBucket(store, bucket);

    return Bluebird.resolve(store[bucket][id]);
  });


  const insert = R.curry((bucket, data) => {
    data.id = uuid.v4();

    if (!R.has(bucket, store)) store[bucket] = {};

    store[bucket][data.id] = data;

    return Bluebird.resolve(data.id);
  });


  const update = R.curry((bucket, id, data) =>

      getById(bucket, id)

    .tap(R.when(R.isNil, () => throwItemNotFound(bucket, id)))

    .then(() => { store[bucket][id] = data })

    .return(id)

  );


  const findWhere = R.curry((bucket, predicates) => R.composeP(
    R.unless(R.isNil, R.compose(
      R.find(R.whereEq(predicates))
      , R.values
    ))
    , R.compose(Bluebird.resolve, R.prop(R.__, store))
  )(bucket));


  const upsert = R.curry((bucket, keys, data) =>

      findWhere(bucket, R.pick(keys,  data))

    .then((found) => found ?
      update(bucket, found.id, R.merge(found, data)) :
      insert(bucket, data)
    )

  );


  const getAll = R.compose(Bluebird.resolve, R.values, getBucket);


  /** @TODO Query Routing
   * const query = QueryRouter(config.query_route_file)(store)
   */


  const projectAll = R.curry((bucket, projection) =>
      getAll(bucket).map(R.pick(projection)));


  const findBy = R.curry((bucket, projection, prop, value) =>
      projectAll(bucket, projection).filter(R.propEq(prop, value)));


  const findOneBy = R.curry((bucket, projection, prop, value) =>
      findBy(bucket, projection, prop, value)

    .tap((results) => {
      if (results.length > 1)
        throw new Err.TooManyRecords(
          bucket, prop, value, results.length
        );
    })

    .then(R.head));


  const findById = R.curry((bucket, projection, id) => {
    
    return getById(bucket, id)
      .then(R.pick(projection))

  });


  const getState = R.always(store)

  return {
    insert
    , upsert
    , getById
    , getAll
    , projectAll
    , findBy
    , findOneBy
    , findById
    , findWhere
    , getState
  };

}


