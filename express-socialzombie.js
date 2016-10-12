const R                   = require('ramda')
const Request             = require('request')
const PluginFactory       = require('./lib/plugin-factory.js')
const SocialZombieClient  = require('./lib/socialzombie/client.js')


const DEFAULT_SZ_CONFIG = ({ url: 'http://127.0.0.1:3199' })
const DEFAULT_NAMESPACE = 'socialzombie'


const Plugin = PluginFactory((config = DEFAULT_SZ_CONFIG) => {

  const namespace     = R.propOr(DEFAULT_NAMESPACE, 'namespace', config)
  const client        = Request.defaults({ baseUrl : config.url })
  const socialzombie  = SocialZombieClient(client)

  return (req, res, next) => {

    if (!req[namespace]) req[namespace] = socialzombie

    return next()
  }
})


module.exports = Plugin
