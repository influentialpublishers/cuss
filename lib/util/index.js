/* eslint no-magic-numbers: 0 */

const R = require('ramda')


const ascend = R.curry((fn, a, b) => {
  const aa = fn(a)
  const bb = fn(b)
  return aa < bb ? -1 : aa > bb ? 1 : 0
})


const descend = R.curry((fn, a, b) => {
  const aa = fn(a)
  const bb = fn(b)
  return aa > bb ? -1 : aa < bb ? 1 : 0
})


const sortWhere = R.curry((fns, list) =>
  Array.prototype.slice.call(list, 0).sort(function(a, b) {
    let result = 0
    let i      = 0
    while (0 === result && i < fns.length) {
      result = fns[i](a, b)
      i += 1
    }
    return result
  })
)


// renameProp :: String -> String -> { String : * } -> { String : * }
const renameProp = R.curry((from, to, obj) => R.when(
  R.has(from)
, R.compose(R.omit(from), R.assoc(to, R.prop(from, obj)))
)(obj))


// replaceElement :: * -> * -> [ * ] -> [ * ]
const replaceElement = R.curry((from, to, list) => R.when(
  R.contains(from)
, R.over(R.lensIndex(R.indexOf(from, list)), R.always(to))
)(list))


const notNil = R.compose(R.not, R.isNil)


const isEmptyOrNil = R.either(R.isEmpty, R.isNil)


module.exports = {
  ascend
, descend
, sortWhere
, renameProp
, replaceElement
, notNil
, isEmptyOrNil
}
