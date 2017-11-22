'use strict'

const mongoose = require('mongoose')
const timestamps = require('mongoose-timestamp')
const brainCollection = process.env.BRAIN_COLLECTION || 'brain'

const BrainSchema = mongoose.Schema({
  key: { type: String, lowercase: true },
  type: { type: String, default: '_private' },
  value: mongoose.Schema.Types.Mixed
})
BrainSchema.plugin(timestamps)

const BrainModel = mongoose.model(brainCollection, BrainSchema)

module.exports = BrainModel
