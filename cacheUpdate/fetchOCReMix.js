'use strict'
const config = require('./config')
const Xray = require('x-ray')
const winston = require('winston')
const magnetLink = require('magnet-link')
const redis = require('redis')

function getMagnetLink (item) {
  return new Promise((resolve, reject) => {
    magnetLink(item.torrentUri, (err, link) => {
      if (err) {
        winston.log('error', 'couldn\'t get magnet link')
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
        name: '.colName a',
        torrentUri: '.colName a@href',
        size: '.colSize',
        info: '.colName .torrentTag:last-child a@href',
        added: '.colAdded',
        category: '.colCategory'
      }])((err, results) => {
        if (err) {
          winston.error('no results from ocremix', err)
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

async function readOCReMix (environmentName) {
  let configuration = config.loadConfiguration(environmentName || 'development')
  let payload = await getOCReMixData()
  let redisClient = redis.createClient(configuration.redis.PORT, configuration.redis.HOSTNAME)
  redisClient.auth(configuration.redis.PASSWORD, (err) => {
    if (err) {
      throw err
    }
  })
  let cachedData = await getCache(redisClient, configuration.redis.KEY)
  if (cachedData === null || cachedData !== payload) {
    winston.log('info', 'New OCReMix Payload')
    redisClient.set(configuration.redis.KEY, payload)
  } else {
    winston.log('warning', 'No New OCReMix Payload')
  }
  redisClient.quit()
  return true 
}

module.exports.readOCReMix = readOCReMix
