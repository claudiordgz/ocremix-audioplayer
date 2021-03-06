'use strict'
const helpers = require('ocremix-helpers')
const Xray = require('x-ray')
const magnetLink = require('magnet-link')
const redis = require('redis')

function getMagnetLink (item) {
  return new Promise((resolve, reject) => {
    magnetLink(item.torrentUri, (err, link) => {
      if (err) {
        console.log('error', 'couldn\'t get magnet link')
        reject(err)
      }
      resolve(link)
    })
  })
}

function mergeMagnetArrayToResults (magnetArray, results) {
  let lResults = results
  magnetArray.forEach((magnetUri, index) => {
    lResults[index].magnetUri = magnetUri
  })
  return lResults
}

function getOCReMixData () {
  return new Promise((resolve, reject) => {
    const xray = new Xray()
    xray('http://bt.ocremix.org/index.php?order=date&sort=descending', '.trkInner tr:not(:first-child)',
      [{
        title: '.colName a',
        torrentUri: '.colName a@href',
        size: '.colSize',
        info: '.colName .torrentTag:last-child a@href',
        added: '.colAdded',
        category: '.colCategory'
      }])((err, results) => {
        if (err) {
          console.log('no results from ocremix', err)
        }

        results = results
          .filter((item) => item.torrentUri.length !== 0)
        let promises = results
            .map(getMagnetLink)

        Promise.all(promises)
          .then((magnets) => {
            const resJSON = mergeMagnetArrayToResults(magnets, results)
            const resString = JSON.stringify(resJSON, null, '\t')
            resolve(resString)
          })
          .catch((err) => {
            reject(err)
          })
      })
  })
}

function getCache (redisClient, key) {
  return new Promise((resolve, reject) => {
    redisClient.get(key, (err, reply) => {
      if (err) {
        reject(err)
      } else {
        resolve(reply)
      }
    })
  })
}

function readOCReMix (environmentName) {
  return new Promise((resolve, reject) => {
    let configuration = helpers.config.load(environmentName || 'development')
    let redisClient = redis.createClient(configuration.redis.PORT, configuration.redis.HOSTNAME)
    redisClient.auth(configuration.redis.PASSWORD, (err) => {
      if (err) {
        reject(err)
      }
    })
    getOCReMixData()
            .then((payload) => {
              getCache(redisClient, configuration.redis.KEY)
                    .then((cachedData) => {
                      let returnValue = true
                      if (cachedData === null || cachedData !== payload) {
                        console.log('info', 'New OCReMix Payload')
                        redisClient.set(configuration.redis.KEY, payload)
                      } else {
                        returnValue = false
                        console.log('warning', 'No New OCReMix Payload')
                      }
                      redisClient.quit()
                      resolve(returnValue)
                    })
            })
            .catch((err) => {
              reject(err)
            })
  })
}

module.exports = {
  readOCReMix: readOCReMix,
  _: {
    getCache: getCache,
    getOCReMixData: getOCReMixData,
    getMagnetLink: getMagnetLink,
    mergeMagnetArrayToResults: mergeMagnetArrayToResults
  }
}
