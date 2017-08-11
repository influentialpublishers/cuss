
const debug = require('debug')('kuss:express:couchdb')
const R             = require('ramda')
const onFinished    = require('on-finished')
const PluginFactory = require('./lib/plugin-factory.js')
const CouchDBPool   = require('./lib/couchdb/pool.js')


const PROP_NAMESPACE    = 'namespace'
const DEFAULT_NAMESPACE = 'couchdb'
const SIGNAL_INTERRUPT  = 'SIGINT'


const Plugin = PluginFactory((config) => {
  const namespace     = R.propOr(DEFAULT_NAMESPACE, PROP_NAMESPACE, config)

  debug('CouchDB Plugin - server configuration - %o', config)
  debug('CouchDB Plugin - namespace - %s', namespace)

  const couch_pool    = CouchDBPool(config)

  process.on(SIGNAL_INTERRUPT, couch_pool.shutdown)

  return (req, res, next) => {

    couch_pool.acquire()

    .then(conn => {

      if(!req[namespace]) req[namespace] = conn

      onFinished(res, () => { couch_pool.release(conn) })

      return next()

    })

    .catch(next)

  }

})


module.exports = Plugin
