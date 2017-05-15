const test = require('tape')
const mod = require('..')

test('Test Configuration load', t => {
  t.plan(1)
  let configuration = mod.config.load('development')
  t.true(configuration, 'Configuration Loaded')
})
