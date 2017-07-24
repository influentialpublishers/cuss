
const PluginFactory = require('./lib/plugin-factory.js')
const MemoryStore = require('./lib/memory')


const Plugin = PluginFactory(({ namespace='DAO', data={} }) =>
  (req, res, next) => {
    if (!req[namespace]) req[namespace] = MemoryStore(data)

    return next()
  }
)


module.exports = Plugin
