'use strict'

const ocremix = require('./fetchOCReMix')
const configuration = process.env.NODE_ENV

module.exports.fetchOCReMixAndUpdateCache = (event, context, callback) => {
    const response = ocremix.readOCReMix()
              .then((val) => {
                  return callback(null, val)
              })
              .catch((err) => {
                  return callback(err)
              })
}
