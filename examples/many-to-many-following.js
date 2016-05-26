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
    followers: belongsToMany([
      userTable.linkedBy(followingTable, 'followerId'),
      followingTable.linkTo(userTable, 'followeeId'),
    ], { index: 'followers' }),
    following: belongsToMany([
      userTable.linkedBy(followingTable, 'followeeId'),
      followingTable.linkTo(userTable, 'followerId'),
    ], { index: 'following' }),
  }),
});
const followingTable = new Table({
  tableName: 'following',
  schema: () => ({
    ...Table.schema,
    followerId: userTable.getForeignKey({ isManyToMany: true }),
    followeeId: userTable.getForeignKey({ isManyToMany: true }),
  }),
  index: {
    following: [r.row('followerId'), r.row('followeeId')],
    followers: [r.row('followeeId'), r.row('followerId')],
  },
});

async function run() {
  const connection = await r.connect({ db: 'test' });

  await userTable.sync(connection);
  await followingTable.sync(connection);
  userTable.query().delete().run(connection);
  followingTable.query().delete().run(connection);

  async function loadUsersWithJoin() {
    return await userTable
      .withJoin(userTable.query(), { followers: true, following: true })
      .coerceTo('array')
      .run(connection);
  }

  const followee = userTable.create({ name: 'foo' });
  const follower1 = userTable.create({ name: 'foo' });
  const follower2 = userTable.create({ name: 'foo' });
  await userTable.insert([followee, follower1, follower2]).run(connection);

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
