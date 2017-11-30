'use strict'

const _ = require('lodash')
const mongoose = require('mongoose')
const config = require('./config')
const Model = require('./model')
mongoose.Promise = global.Promise // supress depreciation warnings

const deepClone = (obj) => JSON.parse(JSON.stringify(obj))

class ConnectMongo {
  constructor (robot) {
    this.robot = robot
    this.privateCache = {}
    return this.connect()
  }

  /**
   * Generic error handling for Mongoose erros.
   * Writes logs and can bubble to promise rejection.
   *
   * @param  {Error}   err Thrown error
   * @param  {Function} cb Function to pass error
   */
  handle (err, cb) {
    console.error(err.stack)
    this.robot.logger.error(err)
    if (cb) cb.call(this, err)
  }

  /**
   * Use handler as bound callback for requests to handle.
   * If no error is given, nothing happens.
   *
   * @param  {Error}   err Thrown error
   */
  handler (err) {
    if (err) this.handle(err)
  }

  /**
   * Connect to MongoDB as per configs.
   * TODO: Refactor event listeners and property overwrites as brain adapter
   * class extensions instead - when brain refactor complete with storageAdapter
   *
   * @return {Promise} Resolves with Mongoose connection class
   */
  connect () {
    return new Promise((resolve, reject) => {
      mongoose.connect(config.url, config.connection)
        .catch((err) => {
          this.robot.logger.error(err)
          reject(err)
        })
        .then((connection) => {
          this.robot.logger.debug(`DB connected at ${config.url}`)
          this.robot.brain.connection = connection
          this.robot.brain.on('save', this.save.bind(this))
          this.robot.brain.on('close', connection.close)
          this.robot.brain.store = this.store.bind(this)
          this.robot.brain.retrieve = this.retrieve.bind(this)
          this.robot.brain.find = this.find.bind(this)
          this.mergePrivateData().then(() => resolve(connection))
        })
    })
  }

  /**
   * Load all the _private collections into brain at their respective keys.
   * Disables autosaving while data is being loaded.
   *
   * @return {Promise} Resolves when complete.
   */
  mergePrivateData () {
    return new Promise((resolve, reject) => {
      this.robot.brain.setAutoSave(false) // disable while reading
      Model.find({ type: '_private' }, (err, docs) => {
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

  /**
   * Save all brain data to collection matching key.
   * Filters only values modified since private data loaded from DB.
   *
   * @param  {Mixed} data               All data for type in brain
   * @param  {String} [type='_private'] The type of brain data to save
   * @return {Promise}                  Resolves with Mongoose update result
   */
  save (data, type = '_private') {
    return Promise.all(_.map(data[type], (value, key) => {
      if (_.isEqual(_.at(this.privateCache, key)[0], value)) return // skip if not modified
      this.robot.logger.debug(`Saving all ${type} data in ${key} to MongoDB`)
      this.privateCache[key] = deepClone(value)
      let update = { type: type, key: key }
      let save = { value: value }
      let options = { upsert: true, lean: true }
      let callback = this.handler.bind(this)
      return Model.findOneAndUpdate(update, save, options, callback)
    }))
  }

  /**
   * Push data object to a given key's value collection.
   * Creates a collection for key with empty array first if required.
   * This data will not be loaded in brain's memory, but can be queried.
   * It will always add the data to the end of an array (created if required).
   *
   * @param  {String} key  Key field value for DB model instance
   * @param  {Mixed}  data The data to push to value array
   * @return {Promise}     Resolves with Mongoose update result
   */
  store (key, data) {
    this.robot.logger.debug(`Storing ${key} data in MongoDB`)
    let update = { type: '_stored', key: key }
    let options = { upsert: true, lean: true }
    let push = { $push: { value: data } }
    let callback = this.handler.bind(this)
    return Model.findOneAndUpdate(update, push, options, callback)
  }

  /**
   * Get an entire stored collection from DB.
   *
   * @param  {String} key  Key field value for DB model instance
   * @return {Promise}     Resolves with found document's value array.
   */
  retrieve (key) {
    this.robot.logger.debug(`Retrieving ${key} data from MongoDB`)
    let query = { type: '_stored', key: key }
    return Model.findOne(query).lean().exec().then((doc) => {
      if (doc) return doc.value
    })
  }

  /**
   * Find a subset of data from a given key's value collection.
   *
   * @param  {String} key        Key field value for DB model instance
   * @param  {Object} conditions Query object to match within value array
   * @return {Promis}            Resolves with Mongoose elemenent match result
   */
  find (key, conditions) {
    this.robot.logger.debug(`Searching DB for ${key}: ${conditions}`)
    let callback = this.handler.bind(this)
    let filter = { _id: 0, 'value.$': 1 }
    let query = { type: '_stored', key: key, value: { $elemMatch: conditions } }
    return Model.findOne(query, filter, callback).lean().exec().then((doc) => {
      if (doc && doc.value.length) return doc.value[0]
    })
  }
}

module.exports = (robot) => new ConnectMongo(robot)
