module.exports = {
  url: process.env.MONGODB_URL || 'mongodb://localhost/nubot-brain',
  connection: {
    keepAlive: true,
    reconnectTries: Number.MAX_VALUE,
    useMongoClient: true
  }
}
