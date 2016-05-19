/* eslint no-console: 0 */
import r from 'rethinkdb';
import { Table, schema, belongsToMany } from '../';
import Joi from 'joi';

const userTable = new Table({
  tableName: 'user',
  schema: () => ({
    ...schema,
    name: Joi.string().required(),
  }),
  relations: () => ({
    followers: belongsToMany([userTable.linkedBy(followingTable, 'followerId'), followingTable.linkTo(userTable, 'followeeId')]),
    following: belongsToMany([userTable.linkedBy(followingTable, 'followeeId'), followingTable.linkTo(userTable, 'followerId')]),
  }),
});
const followingTable = new Table({
  tableName: 'following',
  schema: () => ({
    ...Table.schema,
    followerId: userTable.getForeignKey({ isManyToMany: true }),
    followeeId: userTable.getForeignKey({ isManyToMany: true }),
  }),
});

async function run() {
  const connection = await r.connect({
    db: 'test',
  });

  await userTable.sync(connection);
  await followingTable.sync(connection);
  userTable.query().delete().run(connection);
  followingTable.query().delete().run(connection);

  async function loadUsersWithJoin() {
    let userQuery = userTable.query().coerceTo('array');
    userQuery = userTable.withJoin(userQuery, { followers: true, following: true });
    const users = await userQuery.run(connection);
    return users;
  }

  const followee = userTable.create({ name: 'foo' });
  const follower1 = userTable.create({ name: 'foo' });
  const follower2 = userTable.create({ name: 'foo' });
  await userTable.insert(followee).run(connection);
  await userTable.insert(follower1).run(connection);
  await userTable.insert(follower2).run(connection);

  await userTable.createRelation('followers', followee.id, follower1.id).run(connection);
  await userTable.createRelation('followers', followee.id, follower2.id).run(connection);
  console.log('after create:');
  console.log(await loadUsersWithJoin());
  await userTable.removeRelation('followers', followee.id, follower1.id).run(connection);
  console.log('after remove:');
  console.log(await loadUsersWithJoin());

  await connection.close();
}

run().catch(e => {
  console.log(e);
  process.exit();
});
