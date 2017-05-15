const test = require('tape')
const helpers = require('ocremix-helpers')
const mod = require('../obtainOCReMix')

let configuration = helpers.config.load('testing')

test('Get data from Redis Labs', t => {
    t.plan(1)
    mod._.getCachedData(configuration.redis)
        .then(payload => {
            console.log(payload)
            t.pass('received payload')
        })
        .catch(e => t.fail(e))
})

test('Create Dynamo Table', t => {
    t.plan(1)
    mod._.createDynamoTable(configuration.aws)
        .then(payload => {
            console.log(payload)
            t.pass('Table Created')
        })
        .catch(e => t.fail(e))
})

test('Add Items to Dynamo Table', t => {
    t.plan(1)
    mod._.fromCacheToTable(configuration)
        .then(payload => {
            console.log(payload)
            t.pass('Items Processed')
        })
        .catch(e => t.fail(e))
})
