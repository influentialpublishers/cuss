
const Bluebird = require('bluebird')
const R        = require('ramda')

// type alias Mapping =
//   { String : { type : String } }

// type alias ESResponse =
//   { acknowledged : Boolean }

// type alias Definition =
//   { settings :
//       index :
//       { number_of_shards : Int
//       , number_of_shards : Int
//       , number_of_replicas : Int
//       }
//   }

// type alias Factory =
//   { up : ElasticsearchClient -> ( String, Definition ) -> Promise ESResponse
//   , down : ElasticsearchClient -> String -> Promise ESResponse
//   }

// type alias ESMappingOption =
//   { String : { String : a } }


// getIndexList :: ElasticsearchClient -> Promise List String
const getIndexList = (client) => client.indices.stats({ index: '_all' })
  .then(R.compose(
    R.keys
  , R.prop('indices')
  ))


// hasIndex :: ElasticsearchClient -> String -> Promise Boolean
const hasIndex = R.curry((client, name) => getIndexList(client)
  .then(R.contains(name)))


// addIndex :: ElasticsearchClient -> ( String, Definition )
//   -> Promise ESResponse | Promise null
const addIndex = R.curry((client, name, definition) => hasIndex(client)(name)
  .then((has_index) => {
    if (has_index) {
      return null
    }

    return client.indices.create({
      index : name
    , body  : definition
    })
  }))


// dropIndex ::
//   ElasticsearchClient -> String -> Promise ESResponse | Promise null
const dropIndex = R.curry((client, name) => hasIndex(client)(name)
  .then((has_index) => {
    if (!has_index) {
      return null
    }

    return client.indices.delete({
      index: name
    })
  }))


// addIndexFactory ::
//   ElasticsearchClient -> ( String, Definition ) -> Promise Factory
const addIndexFactory = R.curry((client, name, definition) => ({
  up: (next) =>
    addIndex(client)(name, definition)
    .then(() => next())
    .catch(next)

, down: (next) =>
    dropIndex(client)(name)
    .then(() => next())
    .catch(next)
}))


// addMappingsToIndex ::
//   ElasticsearchClient -> ( String, String, Mapping, ESMappingOption )
//   -> Promise ESResponse
const _addMappingsToIndex = R.curry((client, index, type, mappings, options) =>
  Bluebird.props({
    index: index
  , type: type
  , body: { properties: mappings }
  })
  .then(R.ifElse(
    () => R.is(Object, options)
  , R.mergeWith(R.merge, R.__, { body: options })
  , R.identity
  ))
  .then(client.indices.putMapping)
)

/* eslint-disable max-len */
// getMappings :: ElasticsearchClient
//   -> ( String -> String ) -> Promise Mapping | Promise null
const getMappings = R.curry((client, index, type) => client.indices.getMapping({ "index": index })
  .then(R.pathOr(null, [index, 'mappings', type, 'properties']))
  .catch(() => null))

// updateMappings :: ElasticsearchClient -> String
//   -> ( String, Mapping, ESMappingOption ) -> Promise ESResponse
const updateMappings = R.curry((client, index, type, mappings, options) => addIndex(client)(index, null)
  .then(() => _addMappingsToIndex(client)(index, type, mappings, options)))


// canMigrate :: String -> String -> Promise Boolean
const canMigrate = R.curry((client, index, type) => getMappings(client)(index, type)
  .then(R.compose(R.not, R.isNil)))


module.exports  = (client) => ({
  getIndexList    : getIndexList(client)
, hasIndex        : hasIndex(client)
, addIndex        : addIndex(client)
, dropIndex       : dropIndex(client)

, addIndexFactory : addIndexFactory(client)

, getMappings     : getMappings(client)
, updateMappings  : updateMappings(client)
, canMigrate      : canMigrate(client)
})
