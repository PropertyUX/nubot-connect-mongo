'use strict'

const chai = require('chai')

const testCollection = 'brain-testing'
process.env.BRAIN_COLLECTION = testCollection

const mongoose = require('mongoose')
chai.use(require('chai-subset'))
chai.use(require('sinon-chai'))
const should = chai.should()
const connectMongo = require('../lib')
const config = require('../lib/config')
const model = require('../lib/model')
const MockRobot = require('./mocks/robot')

const delay = (ms) => new Promise((resolve, reject) => setTimeout(resolve, ms))

let robot, connection, testPrivateData, testCollectionData

// TODO: update tests to use promise returns instead of manual delay, when
// brain is extended instead of listened to

describe('Connect Mongo', () => {
  beforeEach(() => {
    robot = new MockRobot()
    testPrivateData = {
      doors: [{ 'door 1': 'dead end' }, { 'door 2': 'win a prize' }],
      favorites: [{ username: 'tim' }, { username: 'jento' }]
    }
    testCollectionData = [
      {
        key: 'doors',
        type: '_private',
        value: testPrivateData.doors
      }, {
        key: 'favorites',
        type: '_private',
        value: testPrivateData.favorites
      }
    ]
  })
  afterEach(() => {
    try {
      connection.close() // close any created connections
    } catch (err) {}
  })

  describe('constructor', () => {
    it('returns a Mongoose connection', async () => {
      connection = await connectMongo(robot)
      connection.should.have.property('db')
    })
    it('resolves when connected', (done) => {
      connectMongo(robot)
        .then(() => done())
        .catch((err) => {
          throw err
        })
    })
  })

  describe('.save', () => {
    beforeEach(async () => {
      await mongoose.connect(config.url, config.connection)
      await connectMongo(robot)
    })
    afterEach(() => {
      model.collection.drop().catch(() => null)
    })
    it('brain.save() stores in MongoDB', async () => {
      robot.brain.data._private = Object.assign({ }, testPrivateData)
      robot.brain.save()
      await delay(100)
      let results = await model.find({ }).lean().exec()
      results.should.containSubset(testCollectionData)
    })
    it('brain.save() only updates modified', async () => {
      robot.brain.data._private = Object.assign({ }, testPrivateData)
      robot.brain.save()
      await delay(100)
      robot.brain.data._private.doors.push({ 'door 3': 'you fall down' })
      robot.brain.save()
      await delay(100)
      let results = await model.find({ }).lean().exec()
      let difference = results[0].updatedAt - results[1].updatedAt
      difference.should.be.gt(100)
    })
  })

  describe('.get', () => {
    beforeEach(async () => {
      await mongoose.connect(config.url, config.connection)
      await model.create(...testCollectionData)
    })
    afterEach(() => {
      model.collection.drop().catch(() => null)
    })
    it('brain has data from DB', async () => {
      await connectMongo(robot)
      robot.brain.get('doors').should.eql(testPrivateData.doors)
    })
    // TODO: Reinstate test when nubot brain.mergeData is recursive
    // it('brain merged DB data with existing', async () => {
    //   robot.brain.data._private['doors'] = [{ 'door 3': 'you fall down' }]
    //   await connectMongo(robot)
    //   testPrivateData.doors.push({ 'door 3': 'you fall down' })
    //   robot.brain.get('doors').should.eql(testPrivateData.doors)
    // })
  })

  describe('.set', () => {
    afterEach(() => {
      model.collection.drop().catch(() => null)
    })
    it('should set data in MongoDB', async () => {
      await connectMongo(robot)
      let testKey = 'test_key'
      let testValue = 'test_value'
      robot.brain.set(testKey, testValue)
      robot.brain.save()
      await delay(100)
      let search = { key: testKey }
      let results = await model.findOne(search).lean().exec()
      results.should.containSubset({ 'value': testValue })
    })
  })

  describe('.store', () => {
    beforeEach(async () => {
      await mongoose.connect(config.url, config.connection)
      await connectMongo(robot)
    })
    afterEach(() => {
      model.collection.drop().catch(() => null)
    })
    it('creates collection and value array if none exists', async () => {
      let testKey = 'test_key'
      let testValue = 'test_value'
      robot.brain.store(testKey, testValue)
      await delay(100)
      let results = await model.findOne({
        key: testKey,
        type: '_stored'
      }).lean().exec()
      results.should.containSubset({
        key: testKey,
        type: '_stored',
        value: [ testValue ]
      })
    })
    it('pushes to end of array if collection exists', async () => {
      let testKey = 'test_key'
      let testValue = 'test_value'
      await model.create({
        key: testKey,
        type: '_stored',
        value: [ 'one', 'two' ]
      })
      robot.brain.store(testKey, testValue)
      await delay(200)
      let results = await model.findOne({
        key: testKey,
        type: '_stored'
      }).lean().exec()
      results.should.containSubset({
        key: testKey,
        type: '_stored',
        value: [ 'one', 'two', testValue ]
      })
    })
  })

  describe('.retrieve', () => {
    beforeEach(async () => {
      await mongoose.connect(config.url, config.connection)
      await connectMongo(robot)
    })
    it('returns null if nothing', async () => {
      let result = await robot.brain.retrieve('test_key')
      should.not.exist(result)
    })
    it('returns value from existing collection', async () => {
      let testKey = 'test_key'
      let testValue = [ 'one', 'two' ]
      await model.create({
        key: testKey,
        type: '_stored',
        value: testValue
      })
      let result = await robot.brain.retrieve(testKey)
      result.should.eql(testValue)
    })
  })

  describe('.find', () => {
    beforeEach(async () => {
      await mongoose.connect(config.url, config.connection)
      await connectMongo(robot)
    })
    it('returns null if nothing', async () => {
      let result = await robot.brain.find('test_key', { test: 'test' })
      should.not.exist(result)
    })
    it('returns matching subset from existing collection', async () => {
      let testKey = 'test_key'
      let testValue = [{ foo: 'bar' }, { baz: 'qux' }]
      await model.create({
        key: testKey,
        type: '_stored',
        value: testValue
      })
      let result = await robot.brain.find(testKey, testValue[0])
      result.should.eql(testValue[0])
    })
    it('returns full elemenent on partial match', async () => {
      let testKey = 'test_key'
      let testValue = [{ test: 'test', foo: 'bar', baz: 'qux' }]
      await model.create({
        key: testKey,
        type: '_stored',
        value: testValue
      })
      let result = await robot.brain.find(testKey, { test: 'test' })
      result.should.eql(testValue[0])
    })
  })

  describe('robot.close', () => {
    it('closes DB connection', (done) => {
      robot.brain.on('close', () => done())
      robot.brain.emit('close')
    })
  })
})
