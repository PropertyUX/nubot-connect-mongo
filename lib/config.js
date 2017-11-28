module.exports = {
  url: process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017/nubot-brain',
  connection: {
    keepAlive: true,
    reconnectTries: Number.MAX_VALUE,
    useMongoClient: true
  }
}
