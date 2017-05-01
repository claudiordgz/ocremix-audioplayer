'use strict'

const ocremix = require('./fetchOCReMix')
const configuration = process.env.NODE_ENV

module.exports.fetchOCReMixAndUpdateCache = (event, context, callback) => {
  ocremix.readOCReMix(configuration)
        .then((val) => {
            let result = "Changed the cache"
            if (val === false) {
                result = "No new data to cache"
            }
            return callback(null, result)
        })
        .catch((err) => {
          return callback(err)
        })
}
