
const R                        = require('ramda')
const Bluebird                 = require('bluebird')
const { Factory:QueueFactory } = require('./interface.js')


const QueueLoader = R.mapObjIndexed((queue_config, name) =>
  QueueFactory(R.assoc('name', name, queue_config))
)


const GetQueue = R.curry((container, {name}) => R.ifElse(
  R.has(name)
, R.prop(name)
, () => { throw new Error(`Invalid Queue: ${name}`) }
)(container))


const Factory = (config) => {

  const queue_container = QueueLoader(config)
  const getQueue = GetQueue(queue_container)

  return {

    send: (name, msg) =>
      Bluebird.resolve(getQueue(name))
      .get('send')
      .then(R.apply(R.__, [name, msg]))

  , listen: (name, handler, options = {}) =>
      Bluebird.resolve(getQueue(name))
      .get('listen')
      .then(R.apply(R.__, [options, handler]))

  , addQueue: (name, queue_config) => {
      queue_container[name] = QueueFactory(queue_config)
      return queue_container
    }
  }

}


Factory.QueueLoader = QueueLoader
Factory.GetQueue    = GetQueue


module.exports = Factory
