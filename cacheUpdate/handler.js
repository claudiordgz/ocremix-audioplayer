'use strict'

const ocremix = require('./fetchOCReMix')
const configuration = process.env.NODE_ENV

module.exports.fetchOCReMixAndUpdateCache = (event, context, callback) => {
  ocremix.readOCReMix(configuration)
        .then((val) => {
          return callback(null, val)
        })
        .catch((err) => {
          return callback(err)
        })
}
