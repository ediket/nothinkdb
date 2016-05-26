import r from 'rethinkdb';
import Joi from 'joi';
import { Table, schema } from '../';

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

  // delete all users
  await userTable.query().delete().run(connection);

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

run().catch(e => {
  console.log(e);
  process.exit();
});
