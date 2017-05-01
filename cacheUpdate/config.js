function loadConfiguration (environmentName) {
  return require('./env/' + environmentName)
}

module.exports = {
  loadConfiguration: loadConfiguration
}
