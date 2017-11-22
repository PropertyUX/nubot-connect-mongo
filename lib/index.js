'use strict'

const _ = require('lodash')
const mongoose = require('mongoose')
const config = require('./config')
const model = require('./model')
mongoose.Promise = global.Promise // supress depreciation warnings

const deepClone = (obj) => JSON.parse(JSON.stringify(obj))

class MongoBrain {
  constructor (robot) {
    this.robot = robot
    this.privateCache = {}
    return this.connect()
  }

  handle (err, cb) {
    console.error(err.stack)
    this.robot.logger.error(err)
    cb.call(this, err)
  }

  connect () {
    return new Promise((resolve, reject) => {
      mongoose.connect(config.url, config.connection) // connect to DB
      mongoose.connection.on('error', (err) => {
        this.robot.logger.error(err)
        reject(err)
      })
      mongoose.connection.once('connected', async () => {
        this.robot.logger.debug(`DB connected at ${config.url}`)
        await this.mergePrivateData()
        this.robot.brain.on('save', this.save.bind(this))
        resolve(mongoose.connection)
      })
    })
  }

  mergePrivateData () {
    return new Promise((resolve, reject) => {
      this.robot.brain.on('close', () => mongoose.close())
      this.robot.brain.setAutoSave(false) // disable while reading
      model.find({ type: '_private' }, (err, docs) => {
        if (err) return this.handle(err, reject)
        let _private = {}
        for (let doc of docs) _private[doc.key] = doc.value
        this.privateCache = deepClone(_private)
        this.robot.brain.mergeData({ _private: _private })
        this.robot.brain.resetSaveInterval(10)
        this.robot.brain.setAutoSave(true) // enable when done
        resolve()
      })
    })
  }

  save (data, type = '_private') {
    _.forEach(data[type], (value, key) => {
      if (_.isEqual(_.at(this.privateCache, key)[0], value)) return // skip if not modified
      this.robot.logger.debug(`Saving ${type} data in ${key} to Mongo`)
      this.privateCache[key] = deepClone(value)
      let update = { type: type, key: key }
      let options = { upsert: true }
      let callback = (err, doc) => {
        if (err) this.handle(err)
      }
      model.findOneAndUpdate(update, { value: value }, options, callback)
    })
  }
}

module.exports = (robot) => new MongoBrain(robot)
