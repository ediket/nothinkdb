# Nothinkdb

Functional toolkit for [rethinkdb](https://www.rethinkdb.com/api/javascript/).

- handle schema validation with [joi](https://github.com/hapijs/joi).
- handle default fields like `id`, `createdAt`, `updatedAt`.
- fully customizable 1-n, 1-1, n-1, n-m relations. (create, remove, join).
- ensure table, secondary index.
- many useful query generator.

## Example

```js
import r from 'rethinkdb';
import Joi from 'joi';
import { Table, schema } from 'nothinkdb';

const userTable = new Table({
  table: 'user',
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

If you want to see more examples, See the [Examples](https://github.com/ironhee/nothinkdb/tree/master/examples)


## API

See the [API Reference](https://github.com/ironhee/nothinkdb/blob/master/API.md).
