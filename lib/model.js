'use strict'

const mongoose = require('mongoose')
const timestamps = require('mongoose-timestamp')
const brainCollection = process.env.BRAIN_COLLECTION || 'brain'

const BrainSchema = mongoose.Schema({
  key: { type: String, lowercase: true },
  type: { type: String, default: '_private' },
  value: { type: mongoose.Schema.Types.Mixed }
})
BrainSchema.pre('find', function () {
  if (this._conditions.key) {
    this._conditions.key = this._conditions.key.toLowerCase()
  }
  return this
})
BrainSchema.plugin(timestamps)

const BrainModel = mongoose.model(brainCollection, BrainSchema)

module.exports = BrainModel
