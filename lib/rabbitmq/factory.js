
const R                        = require('ramda')
const { Factory:QueueFactory } = require('./interface.js')


const QueueLoader = R.mapObjIndexed((queue_config, name) =>
  QueueFactory(R.assoc('name', name, queue_config))
)


const GetQueue = R.curry((container, name) => R.ifElse(
  R.has(name)
, R.prop(name)
, () => { throw new Error(`Invalid Queue: ${name}`) }
)(container))


const Factory = (config) => {

  const queue_container = QueueLoader(config.QUEUE)
  const getQueue = GetQueue(queue_container)

  return {

    send: (name, msg) =>
      getQueue(name).then(q => q.send(name, msg))

  , listen: (name, handler, options = {}) =>
      getQueue(name).then(q => q.listen(options, handler))

  , addQueue: (name, queue_config) => {
      queue_container[name] = QueueFactory(queue_config)
      return queue_container
    }
  }

}


Factory.QueueLoader = QueueLoader
Factory.GetQueue    = GetQueue


module.exports = Factory
