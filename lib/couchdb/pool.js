
const debug    = require('debug')('kuss:pool:couchdb')
const R        = require('ramda')
const Bluebird = require('bluebird')
const Pool     = require('../pool.js')
const CouchDB  = require('./index.js')

const DEFAULT_CONFIG = {
  server:{
    url: 'localhost'
  , port: 5984
  , username: 'root'
  , password: 'password'
  , counter: 0
  }
}


const factoryFactory = (config = {}) => ({

  create: R.compose(
    CouchDB
  , R.tap((cfg) => debug('couchdb configuration: %o', cfg))
  , R.always(config)
  )

  // couchdb wrapper is just a configured request object.
, destroy: R.always(null)

  // @TODO implement isAlive check.
, validate: R.compose(Bluebird.resolve, R.T)
})


module.exports = Pool.create(factoryFactory, DEFAULT_CONFIG)
