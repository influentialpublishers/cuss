/*eslint-env node, mocha*/
/*eslint max-nested-callbacks: ["error", 4]*/
/*eslint-disable  no-magic-numbers*/
const demand       = require('must')
const CouchDBError = require('../../../lib/couchdb/error.js')


describe('lib/couchdb/error.js', function() {

  it('should generate an error from a response object', function() {
    const err = new CouchDBError({
      cause: 'my body'
    , statusCode: 404
    })

    demand(err.status).eql(404)
    demand(err.message).eql('Generic CouchDB Error')
    demand(err.response).eql('my body')
    demand(err.name).eql('CouchDBError')
  })

  describe('::throw', function() {
    it('should throw a CouchDBError object', function() {
      try {
        CouchDBError.throw({
          cause: 'my body'
        , statusCode: 404
        })
      } catch (err) {
        demand(err.status).eql(404)
        demand(err.message).eql('Generic CouchDB Error')
        demand(err.response).eql('my body')
        demand(err.name).eql('CouchDBError')
      }
    })
  })

})
