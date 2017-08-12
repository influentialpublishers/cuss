const Bluebird     = require('bluebird')
const R            = require('ramda')
const Nano         = require('nano')
const CouchDBError = require('./error.js')


const EXPECTED_CONFIG = {
  server: {
    url: 'String',
    port: 'Int',
  }
}
const PATH = ['server']


// Verify if the configuration object has necessary url and port for connecting
// to the CouchDb. Username and password are optional.
// :: Config -> Boolean
function isInvalidConfiguration(config) {
  return R.compose(
    R.any(R.either(R.isNil, R.isEmpty))
  , R.values
  , R.pickAll(['url', 'port'])
  , R.propOr({}, 'server')
  )(config)
}


// :: Config -> Error<CouchDBError>
function throwInvalidConfig(config) {
  return CouchDBError.throw({
    error: 'InvalidConfiguration'
  , cause: `Expected Object: {${EXPECTED_CONFIG}}; Actual Object: {${config}}`
  , statusCode: '500'
  })(config)
}


// :: {username: String, password: String, url: String, port: String} -> String
function makeUrl(s) {
  return R.ifElse(
    R.both(R.has('username'), R.has('password'))
  , R.always(`http://${s.username}:${s.password}@${s.url}:${s.port}`)
  , R.always(`http://${s.url}:${s.port}`)
  )(s)
}


// ::Config -> Promise<CouchDbConnection>
function open(config) {
  return R.compose(
    Bluebird.resolve
  , Nano
  , makeUrl
  , R.path(PATH)
  , R.when(isInvalidConfiguration, throwInvalidConfig)
  )(config)
}


module.exports = {
  isInvalidConfiguration
, makeUrl
, open
, throwInvalidConfig
}
