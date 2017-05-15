const helpers = require('ocremix-helpers')
const mod = require('./obtainOCReMix')
const environmentName = process.env.NODE_ENV

module.exports.updateDatabase = (event, context, callback) => {
  let configuration = helpers.config.load(environmentName || 'development')
  mod.fromCacheToTable(configuration)
      .then(val => {
        return callback(null, result)
      })
      .catch((err) => {
        return callback(err)
      })
}
