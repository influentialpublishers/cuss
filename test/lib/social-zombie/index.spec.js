/* eslint-env node, mocha*/
/* eslint no-magic-numbers: 0 */
/* eslint max-nested-callbacks: [ 'error', 5 ] */

const R            = require('ramda')
const Bluebird     = require('bluebird')
const { expect }   = require('chai')
const SocialZombie = require('../../../lib/socialzombie')
const Err          = require('../../../lib/error')


describe('lib/social-zombie/index.js', function() {

  describe('::lib/social-zombie/index.js', function() {

    it('should have NETWORKS and init props', function() {
      expect(SocialZombie.NETWORKS).to.be.an('array')
      expect(SocialZombie.init).to.be.a('function')
    })


    it(`should have io prop that returns an object of functions`, () => {
      const sz = SocialZombie.init({ get : R.T })
      expect(sz.getAccountByUsername).to.be.a('function')
      expect(sz.getTimelinePage).to.be.a('function')
    })

    it(`getAccountByUsername should make http request`, (done) => {

      const regex = /^\/user\/instagram\/username\/jonajonlee/

      const client = {
        get : (url) => { expect(url).to.match(regex) ; done() }
      }

      SocialZombie.init(client).getAccountByUsername('instagram', 'jonajonlee')
    })

    it(`getAccountByUsername should throw error if unsupported network`,
    () => {

      const client = { get : R.identity }

      return Bluebird.resolve(SocialZombie.init(client))
      .then(sz => sz.getAccountByUsername('twitter', 'jonajonlee'))
      .then(() => { throw new Error('should not get here, noob') })
      .catch(Err.UnsupportedSocialZombieNetwork, R.T)
    })

    it(`getTimelinePage should make http request with cursor`, (done) => {

      const regex = /^\/user\/instagram\/username\/jonajonlee\/timeline\/9z/

      const client = {
        get : (url) => { expect(url).to.match(regex) ; done() }
      }

      SocialZombie.init(client).getTimelinePage('instagram', 'jonajonlee', '9z')
    })

    it(`getTimelinePage should make http request without cursor`, (done) => {

      const regex = /^\/user\/instagram\/username\/jonajonlee\/timeline/

      const client = {
        get : (url) => { expect(url).to.match(regex) ; done() }
      }

      SocialZombie.init(client).getTimelinePage('instagram', 'jonajonlee')
    })

    it(`getTimelinePage should throw error if unsupported network`, () => {

      const client = { get : R.identity }

      return Bluebird.resolve(SocialZombie.init(client))
      .then(sz => sz.getTimelinePage('twitter', 'jonajonlee', '9z'))
      .then(() => { throw new Error('should not get here, noob') })
      .catch(Err.UnsupportedSocialZombieNetwork, R.T)
    })

  })

})
