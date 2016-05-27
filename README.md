[![npm version](https://badge.fury.io/js/nothinkdb.svg)](https://badge.fury.io/js/nothinkdb) [![Build Status](https://travis-ci.org/ediket/nothinkdb.svg?branch=master)](https://travis-ci.org/ediket/nothinkdb)

# Nothinkdb

Functional toolkit for [rethinkdb](https://www.rethinkdb.com/api/javascript/).

Currently, Compitable with rethinkdb 2.2.x

- define declarative table schema.
- handle schema validation with [joi](https://github.com/hapijs/joi).
- handle default fields like `id`, `createdAt`, `updatedAt`.
- ensure table, secondary index.
- ensure unique field.
- fully customizable 1-n, 1-1, n-1, n-m relations.
- __define__, __create__, __remove__, __check__, __query__, __join__ relations.
- many useful query generator.
- easily implement graphql server with [nothinkdb-graphql](https://github.com/ediket/nothinkdb-graphql)

## Install

```bash
npm install -S nothinkdb
```

## Example

```js
import Joi from 'joi';
import r from 'rethinkdb';
import { Table, schema } from 'nothinkdb';

const userTable = new Table({
  tableName: 'user',
  schema: () => ({
    id: schema.id,
    name: Joi.string().required(),
    isPremium: Joi.boolean().default(false),
  }),
});

async function run() {
  // open rethinkdb connection
  const connection = await r.connect({ db: 'test' });

  // sync table
  await userTable.sync(connection);
  await followingTable.sync(connection);

  // create user data
  const normalUser = userTable.create({ name: 'user1' });
  const premiumUser = userTable.create({ name: 'user2', isPremium: true });

  // insert user data into rethinkdb server
  await userTable.insert([
    normalUser,
    premiumUser,
  ]).run(connection);

  // getAll users
  const users = await userTable.query().coerceTo('array').run(connection);

  console.log(users);

  // close rethinkdb connection
  await connection.close();
}

run();
```

If you want to see more examples, See the [Examples](https://github.com/ediket/nothinkdb/tree/master/examples)


## API

See the [API Reference](https://github.com/ediket/nothinkdb/blob/master/API.md).


Related Links
------------
- [rethinkdb](https://github.com/rethinkdb/rethinkdb)
- [nothinkdb-graphql](https://github.com/ediket/nothinkdb-graphql)
- [graphql-relay-rethinkdb-example](https://github.com/ediket/graphql-relay-rethinkdb-example)
