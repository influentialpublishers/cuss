
const R                        = require('ramda')
const Bluebird                 = require('bluebird')
const { Factory:QueueFactory } = require('./interface.js')


// QueueLoader :: QueueConfig, String -> Promise Queue
const QueueLoader = R.mapObjIndexed((queue_config, name) =>
  QueueFactory(R.assoc('name', name, queue_config))
)


const GetQueue = R.curry((container, name) => R.ifElse(
  R.has(name)
, R.prop(name)
, () => { throw new Error(`Invalid Queue: ${name}`) }
)(container))


const Factory = (config) => {

  Bluebird.resolve(QueueLoader(config.QUEUE))

  .then((queue_container) => {
    GetQueue(queue_container)
    .then((getQueue) => ({
      send: (name, msg) =>
        getQueue(name).get('send').then((send) => send(name, msg))

    , listen: (name, handler, options = {}) =>
        getQueue(name).get('listen').then((listen) => listen(options, handler))

    , addQueue: (name, conf) => {
        queue_container[name] = QueueFactory(conf)
        return queue_container
      }
    }))
  })


}


Factory.QueueLoader = QueueLoader
Factory.GetQueue    = GetQueue


module.exports = Factory
