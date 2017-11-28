# nubot-connect-mongo

[hubot]: http://hubot.github.com
[standard]: https://standardjs.com/
[mongoose]: http://mongoosejs.com/
[hubot-mongodb-brain]: https://github.com/shokai/hubot-mongodb-brain

Robot brain storage handler for MongoDB.
Adapted from [hubot-mongodb-brain][hubot-mongodb-brain]
with extended features for storing and querying large data sets and models with [Mongoose][mongoose].

Written in es5 Javascript using [StandardJS][standard]

- https://github.com/propertyux/nubot-connect-mongo
- https://npmjs.com/package/nubot-connect-mongo

Compatible with Nubot 0.4.0+

## Setup

1. Install `npm install nubot-connect-mongo -save`
2. Pass into Nubot as second param 'nubot-connect-mongo'
3. Configure `MONGODB_URL` and `BRAIN_COLLECTION` env vars
