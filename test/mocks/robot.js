'use strict'

const sinon = require('sinon')
const EventEmitter = require('events')

class MockBrain extends EventEmitter {
  constructor () {
    super()
    this.data = { users: { }, _private: { } }
    this.resetSaveInterval = sinon.stub()
    this.setAutoSave = sinon.stub()
  }
  mergeData (data) {
    for (let k in data || { }) {
      this.data[k] = data[k]
    }
    this.emit('loaded', this.data)
  }
  save () {
    this.emit('save', this.data)
  }
  get (key) {
    return this.data._private[key] != null ? this.data._private[key] : null
  }
  set (key, value) {
    let pair
    if (key === Object(key)) {
      pair = key
    } else {
      pair = { }
      pair[key] = value
    }

    Object.keys(pair).forEach((key) => {
      this.data._private[key] = pair[key]
    })

    this.emit('loaded', this.data)

    return this
  }
}

class MockRobot {
  constructor () {
    this.log = []
    this.brain = new MockBrain()
    this.logger = {
      debug: (text) => this.log.push(['debug', text]),
      info: (text) => this.log.push(['info', text]),
      error: (text) => this.log.push(['error', text])
    }
  }
}

module.exports = MockRobot
