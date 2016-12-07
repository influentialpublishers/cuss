
const R        = require('ramda')
const Err      = require('../error.js')

const NETWORKS = [
  'instagram'
]


// _isValidNetwork :: String -> Bool
const isValidNetwork = R.contains(R.__, NETWORKS)


// getAccountByUsername :: Client -> String -> String -> Promise Account
const getAccountByUsername = (client) => (network, username) => {
  if (R.not(isValidNetwork(network)))
    Err.UnsupportedSocialZombieNetwork.throw(network)

  return client.get(`/user/${network}/username/${username}`)

}


// getTimelinePage :: Client -> String -> String -> String
// -> Promise ZombieTimeline
const getTimelinePage = (client) => (network, username, cursor) => {
  if (R.not(isValidNetwork(network)))
    Err.UnsupportedSocialZombieNetwork.throw(network)

  let url = `/user/${network}/username/${username}/timeline`
  url += ( (cursor) ? `/${cursor}` : '' )

  return client.get(url)
}


// init :: Client -> SocialZombie
const init = R.applySpec({
  getAccountByUsername : getAccountByUsername
, getTimelinePage      : getTimelinePage
})


module.exports = {
  NETWORKS
, init
}
