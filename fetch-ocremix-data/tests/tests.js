const test = require('tape')
const fetchModule = require('../fetchOCReMix')

test('Get data from OCReMix', t => {
  t.plan(2)
  fetchModule._.getOCReMixData()
        .then(payload => {
          let jsonPayload = JSON.parse(payload)
          t.true(jsonPayload.length > 0, 'Payload is array of elements')
          t.pass('received payload')
        })
        .catch(e => t.fail(e))
})


let mockPayload = `
[{
    "title": "Radical Dreamers: Thieves of Fate",
    "torrentUri": "http://bt.ocremix.org/torrents/Radical_Dreamers_-_Thieves_of_Fate.torrent",
    "size": "96.7MiB",
    "info": "http://rd.ocremix.org/",
    "added": "2009-03-06",
    "category": "Albums"
},
{
    "title": "Sonic 3 & Knuckles: Project Chaos",
    "torrentUri": "http://bt.ocremix.org/torrents/Sonic_3_and_Knuckles_-_Project_Chaos.torrent",
    "size": "202.7MiB",
    "info": "http://sk3.ocremix.org/",
    "added": "2009-03-06",
    "category": "Albums"
}]
`

test('Test Magnet Links', t => {
  t.plan(1)
  let payloadJson = JSON.parse(mockPayload)
  let promises = payloadJson.map(fetchModule._.getMagnetLink)
  Promise.all(promises)
    .then((magnets) => {
        t.assert(magnets.length === 2, 'All magnets calculated')
    })
    .catch(e => t.fail(e))
})