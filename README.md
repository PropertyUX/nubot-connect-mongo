# nubot-mongodb-brain

[hubot]: http://hubot.github.com
[standard]: https://standardjs.com/
[mongoose]: http://mongoosejs.com/
[hubot-mongodb-brain]: https://github.com/shokai/hubot-mongodb-brain

Robot brain storage handler for MongoDB.
Adapted from [hubot-mongodb-brain][hubot-mongodb-brain]
with extended features for storing and querying large data sets and models with [Mongoose][mongoose].

Written in es5 Javascript using [StandardJS][standard]

- https://github.com/propertyux/nubot-mongodb-brain
- https://npmjs.com/package/nubot-mongodb-brain

## Setup

1. Install `npm install nubot-mongodb-brain -save`
2. Edit `external-scripts.json` : `[ "nubot-mongodb-brain" ]`
3. Configure `MONGODB_URL` and `BRAIN_COLLECTION` env vars

## Develop
