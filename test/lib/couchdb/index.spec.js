/*eslint-env node, mocha*/
/*eslint max-nested-callbacks: ["error", 5]*/
/*eslint-disable  no-magic-numbers*/

const R        = require('ramda')
const Bluebird = require('bluebird')
const demand   = require('must')
const GotCouch = require('got-couch')
const CouchDB  = require('../../../lib/couchdb/index.js')

const DB_NAME  = 'kuss-test-db'
const DB_CONN  = {
  url: 'http://localhost'
, port: 5984
, username: 'root'
, password: 'password'
}

const TEST_DOCS = [
  { username: 'superman'
  , name_first: 'Clark'
  , name_last: 'Kent'
  , side: 'hero'
  }
, { username: 'atom'
  , name_first: 'Ray'
  , name_last: 'Palmer'
  , side: 'hero'
  }
, { username: 'green_lantern'
  , name_first: 'Hal'
  , name_last: 'Jordan'
  , side: 'hero'
  }
, { username: 'lex_luthor'
  , name_first: 'Lex'
  , name_last: 'Luthor'
  , side: 'villain'
  }
, { username: 'anarky'
  , name_first: 'Lonnie'
  , name_last: 'Machin'
  , side: 'both'
  }
, { username: 'constantine'
  , name_first: 'John'
  , name_last: 'Constantine'
  , side: 'hero'
  }
, { username: 'damien_darhk'
  , name_first: 'Damien'
  , name_last: 'Darhk'
  , side: 'villain'
  }
]


function insertAllTestDocs(couchdb) {
  return Bluebird.all(
    TEST_DOCS.map(doc => couchdb.insert(DB_NAME, doc))
  )
}


describe('lib/couchdb', function() {

  let connection = null
  let couchdb    = null

  before(function() {

    return Bluebird.resolve(GotCouch(DB_CONN))

    .tap((conn) => { connection = conn })

  })


  before(function() {

    return Bluebird.resolve(CouchDB({ db_config: DB_CONN }))

    .tap((client) => { couchdb = client })
  })


  after(function() {

    return connection.db.delete(DB_NAME)

  })


  beforeEach(function() {

    return Bluebird.resolve(connection.db.delete(DB_NAME))

    .finally(() => connection.db.create(DB_NAME))

    // don't care about the deletion error.
    // we will know about the failed created from the failed tests.
    .catch(() => null)

  })

  describe('::insert', function() {

    it('should insert a document into the given bucket and return a unique ' +
    'identifier for that new document', function() {

      return couchdb.insert(DB_NAME, TEST_DOCS[0])

      .then((id) => demand(id).is.a.string())

    })

  })


  describe('::findWhereEq', function() {

    it('should find documents with the matching keys', function() {

      return insertAllTestDocs(couchdb)

      .then(() => couchdb.findWhereEq(DB_NAME, {
        projection: [ 'username' ]
      , predicates: { 'side': 'villain' }
      }))

      .map(doc => doc.username)

      .then((list) => {
        demand(list).contain('lex_luthor')
        demand(list).contain('damien_darhk')
      })

    })

  })


  describe('::upsert', function() {


    it('should both insert and update a document into the given bucket',
    function() {
      const test_doc = {
        username: 'batman'
      , name_first: 'Bruce'
      , name_last: 'Wayne'
      }

      return couchdb.upsert(DB_NAME, ['username'], test_doc)

      .tap((id) => demand(id).is.a.string())

      .then(() => couchdb.upsert(DB_NAME, ['username'], R.merge(test_doc, {
        nickname: 'The Black Knight'
      })))

      .then(couchdb.getById(DB_NAME))

      .then((batman) => {
        demand(batman.username).eql(test_doc.username)
        demand(batman.name_first).eql(test_doc.name_first)
        demand(batman.name_last).eql(test_doc.name_last)
        demand(batman.nickname).eql('The Black Knight')
      })

    })


  })


  describe('::update', function() {

    it('should update an existing document',
    function() {

      return insertAllTestDocs(couchdb)

      .then(() => couchdb.findWhereEq(DB_NAME, {
        predicates: { 'username': 'superman' }
      }))

      .then(R.compose(R.prop('_id'), R.head))

      .then(id => couchdb.update(DB_NAME, id, { has_cape: true }))

      .then(couchdb.getById(DB_NAME))

      .then(doc => demand(doc.has_cape).eql(true))

    })


    it('should throw an error if you try to update a non-existant document',
    function() {

      return insertAllTestDocs(couchdb)

      .then(() => couchdb.update(DB_NAME, 'dne', { has_cape: 'uhh, what?' }))

      .then(() => { throw new Error('Update a non-existant doc succeeded!') })

      .catch((e) => {

        demand(e.statusCode).eql(404)
        demand(e.statusMessage).eql('Not Found')

      })

    })


    it('should throw a driver error if the database does not exist',
    function() {

      return couchdb.update('DNE', 'dne', { important: false })

      .then(() => { throw new Error('Update to a non-existant bucket!') })

      .catch ((e) => {

        demand(e.path).eql('/DNE/dne')
        demand(e.statusCode).eql(404)
        demand(e.statusMessage).eql('Not Found')

      })

    })


  })


  describe('::projectAll', function() {


    it('should return all of the documents with the selected fields',
    function() {

      const PROJECTION = [ 'username', 'side' ]

      return insertAllTestDocs(couchdb)

      .then(() => couchdb.projectAll(DB_NAME, PROJECTION))

      .then(list => {

        demand(list.length).eql(TEST_DOCS.length)
        list.map(x => demand(x).have.keys(PROJECTION))

        const test_names = R.pluck('username', TEST_DOCS).sort()
        const db_names   = R.pluck('username', list).sort()

        demand(db_names).eql(test_names)

      })

    })


  })


  describe('::findBy', function() {

    it('should not be implemented yet',
    function() {

      demand(couchdb.findBy).throw('Not Implemented')

    })

  })


  describe('::findOneBy', function() {

    it('should not be implemented yet',
    function() {

      demand(couchdb.findOneBy).throw('Not Implemented')

    })

  })


  describe('::findById', function() {

    it('should not be implemented yet',
    function() {

      demand(couchdb.findById).throw('Not Implemented')

    })

  })


})
