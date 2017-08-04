/*eslint-env node, mocha*/
const demand = require('must')
const CouchDBPlugin = require('../express-couchdb.js')


/*eslint-disable max-nested-callbacks*/
describe('express-couchdb.js', function() {

  it('it should connect on middleware activation', function(done) {
    const req    = {}
    const res    = {}
    const plugin = CouchDBPlugin()

    plugin(req, res, (err) => {

      if (err) return done(err)

      req.couchdb.getAll('_users')
      .then((response) => {
        demand(response).have.keys([ 'rows', 'total_rows', 'offset' ])
        done()
      })
      .catch(done)

    })

  })

})
