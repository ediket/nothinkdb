import r from 'rethinkdb';
import Joi from 'joi';
import { Table } from '../';

const userTable = new Table({
  table: 'user',
  schema: () => ({
    ...Table.schema,
    name: Joi.string().required(),
  }),
});

async function run() {
  // open rethinkdb connection
  const connection = await r.connect({ db: 'test' });

  // sycn table with rethinkdb server
  await userTable.sync(connection);

  // create user data (locally)
  const foo = userTable.create({ name: 'foo' });
  const bar = userTable.create({ name: 'bar' });

  // insert user data to rethinkdb server
  await userTable.insert([foo, bar]).run(connection);

  // getAll users with array (default is cursor)
  const users = await userTable.query().coerceTo('array').run(connection);

  // ... do something with users.
  console.log(users);

  // close rethinkdb connection
  await connection.close();
}

run().catch(e => {
  console.log(e);
  process.exit();
});
