
const R                   = require('ramda')

const NETWORKS = [
  'instagram'
]


// _isValidNetwork :: String -> Bool
const isValidNetwork = R.contains(R.__, NETWORKS)


// throwInvalidNetworkError :: Network -> Void : throws TypeError
const throwInvalidNetworkError = (network) => {
  throw new TypeError(`${network} is not a valid SocialZombie Network`)
}


// getTimelinePage :: Client -> String, String, String
// -> Promise ZombieTimeline
const getTimelinePage = (client) => (network, username, cursor) => {

  if (R.not(isValidNetwork(network)))
    throwInvalidNetworkError(network)

  let url = `/user/${network}/username/${username}/timeline`
  url += ( (cursor) ? `/${cursor}` : '' )

  return client.get(url)
}


// init :: Client -> SocialZombie
const init = R.applySpec({ getTimelinePage : getTimelinePage })


module.exports = {
  NETWORKS
, init
}
