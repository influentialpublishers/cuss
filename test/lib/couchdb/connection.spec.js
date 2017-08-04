/*eslint-env node, mocha*/
/*eslint max-nested-callbacks: ["error", 5]*/
/*eslint-disable  no-magic-numbers*/
/*eslint-disable max-len*/

const demand     = require('must')
const R          = require('ramda')
const Connection = require('../../../lib/couchdb/connection.js')


const USERNAME = 'root'
const PASSWORD = '12345678'
const URL      = 'localhost'
const PORT     = 5984
const CONFIG   = {
  server: {
    username: USERNAME,
    password: PASSWORD,
    url: URL
  , port: PORT
  }
}

// From a given object removes given property paths.
// :: Object -> Array<Array<String>> -> Reduced Object
const _reduceConf = R.reduce(R.flip(R.dissocPath))


describe('lib/couchdb/connection.js', function() {

  describe('::isInvalidConfiguration', function() {
    it(`return false on missing server url property`, function() {
      const config = _reduceConf(CONFIG, [['server', 'url']])
      const actual = Connection.isInvalidConfiguration(config)

      demand(actual).to.be.true()
    })
    it(`return true on missing server port property`, function() {
      const config = _reduceConf(CONFIG, [['server', 'port']])
      const actual = Connection.isInvalidConfiguration(config)

      demand(actual).to.be.true()
    })
    it(`return true on missing server url and port property`, function() {
      const actual = Connection.isInvalidConfiguration({})

      demand(actual).to.be.true()
    })
  })

  describe('::open', function() {
    it(`should open a CouchDb connection object using Nano`, function() {
      return Connection.open(CONFIG)
      .then((conn) =>
        demand(conn.config.url)
        .to.be.equal(`http://${USERNAME}:${PASSWORD}@${URL}:${PORT}`)
      )
    })
    it(`upon bad config it should throw InvlaidConfiguration error`, function(){
      demand(Connection.open).throw('InvalidConfiguration')
    })
  })

  describe('::throwInvalidConfig', function() {
    it(`should throw InvalidConfiguration`, function() {
      demand(Connection.throwInvalidConfig).throw('InvalidConfiguration')
    })
  })

  describe('::makeUrl', function() {
    it(`make a URL with authentication`, function() {
      const actual = Connection.makeUrl(CONFIG.server)
      const expected = `http://${USERNAME}:${PASSWORD}@${URL}:${PORT}`

      demand(actual).to.be.eql(expected)
    })
    it(`make a URL withot authentication given only username`, function() {
      const config = _reduceConf(CONFIG, [['server', 'password']])
      const actual = Connection.makeUrl(config.server)
      const expected = `http://${URL}:${PORT}`

      demand(actual).to.be.eql(expected)
    })
    it(`make a URL withot authentication given only password`, function() {
      const config = _reduceConf(CONFIG, [['server', 'username']])
      const actual = Connection.makeUrl(config.server)
      const expected = `http://${URL}:${PORT}`

      demand(actual).to.be.eql(expected)
    })
    it(`make a URL withot authentication given only url and port`, function() {
      const config = _reduceConf(
        CONFIG, [['server', 'username'], ['server', 'password']]
      )
      const actual = Connection.makeUrl(config.server)
      const expected = `http://${URL}:${PORT}`

      demand(actual).to.be.eql(expected)
    })
  })

})
