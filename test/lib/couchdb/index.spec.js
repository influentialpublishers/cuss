/*eslint-env node, mocha*/
/*eslint max-nested-callbacks: ["error", 5]*/
/*eslint-disable  no-magic-numbers*/
/*eslint-disable  no-throw-literal*/
/*eslint-disable max-len*/

const R        = require('ramda')
const Bluebird = require('bluebird')
const demand   = require('must')
const CouchDB  = require('../../../lib/couchdb/index.js')
const Err      = require('../../../lib/error')
const Connection = require('../../../lib/couchdb/connection.js')


const DB_NAME  = 'kuss-test-db'
const DB_CONN  = {
  server: {
    url: 'localhost'
  , port: 5984
  , username: 'root'
  , password: 'password'
  }
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

  let connection = null // Just Nano driver
  let couchdb    = null // Kuss abstraction

  before(function() {
    return Bluebird.resolve(Connection.open(DB_CONN))
    .tap((conn) => { connection = Bluebird.promisifyAll(conn.db) })
  })


  before(function() {
    return Bluebird.resolve(CouchDB(DB_CONN))
    .tap((client) => { couchdb = client })
  })


  after(function() {
    return connection.destroyAsync(DB_NAME)
  })


  beforeEach(function() {

    return connection.destroyAsync(DB_NAME)
    .finally(() => connection.createAsync(DB_NAME))

    // don't care about the deletion error.
    // we will know about the failed created from the failed tests.
    .catch(() => {})

  })

  describe('::insert', function() {

    it('should insert a document into the given bucket and return a unique ' +
    'identifier for that new document', function() {
      return couchdb.insert(DB_NAME, TEST_DOCS[0])
      .then((id) => demand(id).is.a.string())
    })


    it('should allow the user to use the tap function.', function() {

      let expected = null

      return couchdb.insert(DB_NAME, TEST_DOCS[0])

      .tap( id  => { expected = id })

      .then( actual => {
        demand(actual).eql(expected)
        demand(actual).is.a.string()
      })

    })

    it('should insert a document with given identifier', function() {
      const document = {
        id: '123'
      }
      const expected = '123'

      return couchdb.insert(DB_NAME, document)
      .then((actual) => {
        demand(actual).eql(expected)
        demand(actual).is.a.string()
      })
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


  describe('::bulk_upsert', function() {

    it(`should update a list of documents in the given bucket based on the
       _id and _rev keys. If these two keys don't exist, create the document
       in the bucket`, function() {

      return couchdb.insert(DB_NAME, { id: '1', first: 'mat', last: 'chuang' })
      .then(() => couchdb.bulk_upsert(DB_NAME, ['id'], [
        { id: '1', first: 'matt', last: 'chuang' }
      , { id: '2', first: 'jon', last: 'lee' }
      ]))
      .then(() => couchdb.getAll(DB_NAME))
      .then((res) => {
        const map = R.compose(
          R.mergeAll
        , R.map((row) => ({ [row.id] : row.doc }))
        )(res.rows)

        demand(res.rows).have.length(2)
        demand(map['1'].first).equal('matt')
        demand(map['2'].first).equal('jon')
      })

    })


    it(`should update a list of documents in the given bucket based on the
       _id and _rev keys. If these two keys don't exist, create the document
       in the bucket`, function() {

      return couchdb.insert(DB_NAME, { id: '1', first: 'mat', last: 'chuang' })
      .then(() => couchdb.bulk_upsert(DB_NAME, ['last'], [
        { first: 'matt', last: 'chuang' }
      , { first: 'jon', last: 'lee' }
      ]))
      .then(() => couchdb.getAll(DB_NAME))
      .then((res) => {

        const map = R.compose(
          R.mergeAll
        , R.map((row) => ({ [row.doc.last] : row.doc }))
        )(res.rows)

        demand(res.rows).have.length(2)
        demand(map['chuang'].first).equal('matt')
        demand(map['lee'].first).equal('jon')
      })

    })

  })


  describe('::update', function() {

    it('should update an existing document', () =>
      insertAllTestDocs(couchdb)
      .then(() => couchdb.findWhereEq(DB_NAME, {
        predicates: { 'username': 'superman' }
      }))
      .then(R.compose(R.prop('_id'), R.head))
      .then(id => couchdb.update(DB_NAME, id, { has_cape: true }))
      .then(couchdb.getById(DB_NAME))
      .then(doc => demand(doc.has_cape).eql(true))
    )

    it(`should throw a NotFound error if you try to update a non-existant
      document`, () =>
      insertAllTestDocs(couchdb)
      .then(() => couchdb.update(DB_NAME, 'dne', { has_cape: 'uhh, what?' }))
      .then(() => { throw new Error('Update a non-existant doc succeeded!') })
      .catch (Err.NotFound, e => { demand(e.status).eql(404) })
    )

    it(`should throw a StorageConflict if version conflict occurs`, () => {
      let identifier = null
      let revision = null

      return insertAllTestDocs(couchdb)
      .then((inserted) => {
        identifier = inserted[0]
        return couchdb.getById(DB_NAME, identifier)
        .then((doc) => {
          revision = doc._rev
        })
      })
      // The first update generates a new document revision
      .then(() => couchdb.update(
        DB_NAME, identifier, {username: 'The Man of Steel', _rev: revision}
      ))
      // The second update uses the old revision, which generates a conflict
      .then(() => couchdb.update(
        DB_NAME, identifier, {username: 'The Man of Tomorrow', _rev: revision}
      ))
      .catch(Err.StorageConflict, (e) => { demand(e.status).eql(409) })
    })

    it('should throw a driver error if the database does not exist', () =>
      couchdb.update('DNE', 'dne', { important: false })
      .then(() => { throw new Error('Update to a non-existant bucket succeeded!') })
      .catch (Err.NotFound, e => { demand(e.status).eql(404) })
    )

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


    it('should return all of the docs with the given key/value pair',
    function() {
      const PROJECTION = [ 'username', 'side' ]

      return insertAllTestDocs(couchdb)

      .then(() => couchdb.findBy(DB_NAME, PROJECTION, 'side', 'villain'))

      .then(list => {

        list.map(x => {
          demand(x).have.keys(PROJECTION)
          demand(x.side).eql('villain')
        })
        demand(list).have.length(2)

      })
    })


  })


  describe('::findOneBy', function() {

    it('should return a single doc',
    function() {

      const PROJECTION = [ 'username', 'side' ]

      return insertAllTestDocs(couchdb)

      .then(() => couchdb.findOneBy(DB_NAME, PROJECTION, 'username', 'anarky'))

      .then(doc => {

        demand(doc).have.keys(PROJECTION)
        demand(doc.username).eql('anarky')
        demand(doc.side).eql('both')

      })

    })


    it('should throw a TooManyRecords error when more ' +
    'than one row is returned', function() {

      const PROJECTION = [ 'username' ]
      const expected   = 'Too many records. Found 2 records in ' +
                         '`couchdb`.`kuss-test-db` where `side` = "villain"'

      return insertAllTestDocs(couchdb)
      .then(() => couchdb.findOneBy(DB_NAME, PROJECTION, 'side', 'villain'))
      .then(() => { throw new Error('Did not catch invalid response') })
      .catch(Err.TooManyRecords, e => { demand(e.message).eql(expected) })
      .catch(() => { throw new Error('should not get here noob') })

    })

  })


  describe('::findById', function() {

    it('should allow projection on a document selected by identifier',
    function() {

      const PROJECTION = [ 'name_first', 'name_last' ]

      return insertAllTestDocs(couchdb)

      .then(() => couchdb.findWhereEq(DB_NAME, {
        predicates: { username: 'superman' }
      }))

      .then(list => couchdb.findById(DB_NAME, PROJECTION, list[0]._id))

      .then(doc => {

        demand(doc).have.keys(PROJECTION)
        demand(doc.name_first).eql('Clark')
        demand(doc.name_last).eql('Kent')

      })

    })

  })


  describe('::deleteById', function() {

    it(`should delete document by given document\'s identifier`, function() {

      return insertAllTestDocs(couchdb)

      .then(() => couchdb.findWhereEq(DB_NAME, {
        predicates: { username: 'lex_luthor' }
      }))

      .then((list) => couchdb.deleteById(DB_NAME, list[0]._id))

      .then(() => couchdb.findWhereEq(DB_NAME, {
        predicates: { username: 'lex_luthor' }
      }))

      .then((list) => demand(list).to.be.empty())

    })

  })

})
