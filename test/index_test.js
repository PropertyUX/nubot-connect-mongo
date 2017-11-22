'use strict'

const chai = require('chai')

const testCollection = 'brain-testing'
process.env.BRAIN_COLLECTION = testCollection

const mongoose = require('mongoose')
chai.use(require('chai-subset'))
chai.use(require('sinon-chai'))
chai.should()
const mongoBrain = require('../lib')
const config = require('../lib/config')
const model = require('../lib/model')
const MockRobot = require('./mocks/robot')

const deepClone = (obj) => JSON.parse(JSON.stringify(obj))
const delay = (ms) => new Promise((resolve, reject) => setTimeout(resolve, ms))

const testPrivateData = {
  doors: [ { 'door 1': 'dead end' }, { 'door 2': 'win a prize' } ],
  favorites: [ { username: 'tim' }, { username: 'jento' } ]
}
const testCollectionData = [{
  key: 'doors',
  type: '_private',
  value: testPrivateData.doors
}, {
  key: 'favorites',
  type: '_private',
  value: testPrivateData.favorites
}]

let robot, connection

describe('MongoDB Brain', () => {
  beforeEach(() => {
    robot = new MockRobot()
  })
  afterEach(() => {
    // close any created connections
    try { connection.close() } catch (e) {}
  })
  describe('Require', () => {
    it('returns a Mongoose connection', async () => {
      connection = await mongoBrain(robot)
      connection.should.have.property('db')
    })
    it('resolves when connected', (done) => {
      mongoBrain(robot)
        .then(() => done())
        .catch((err) => { throw err })
    })
  })
  describe('Save private data', () => {
    beforeEach(async () => {
      await mongoose.connect(config.url, config.connection)
      connection = await mongoBrain(robot)
    })
    afterEach(() => {
      model.collection.drop().catch(() => null)
    })
    it('brain.save() stores in MongoDB', async () => {
      robot.brain.data._private = testPrivateData
      robot.brain.save()
      await delay(100)
      let results = await model.find({}).lean().exec()
      deepClone(results).should.containSubset(testCollectionData)
    })
    it('brain.save() only updates modified', async () => {
      robot.brain.data._private = testPrivateData
      robot.brain.save()
      await delay(100)
      robot.brain.data._private.doors.push({ 'door 3': 'you fall down' })
      robot.brain.save()
      await delay(100)
      let results = await model.find({}).lean().exec()
      let difference = results[0].updatedAt - results[1].updatedAt
      difference.should.be.gt(100)
    })
  })
  // describe('Loads private data from DB', () => {
  //   beforeEach(async () => {
  //     await mongoose.connect(config.url, config.connection)
  //     connection = await mongoBrain(robot)
  //     await model.create(...testCollectionData)
  //   })
  //   afterEach(() => {
  //     model.collection.drop().catch(() => null)
  //   })
  // })
})
