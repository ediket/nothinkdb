import r from 'rethinkdb';
import { expect } from 'chai';
import Table from '../../Table';
import schema from '../../schema';
import belongsToMany from '../belongsToMany';


describe('relation - belongsToMany', () => {
  let connection;
  let fooTable;
  let barTable;
  let foobarTable;
  let followingTable;

  before(async () => {
    connection = await r.connect({});
    await r.branch(r.dbList().contains('test').not(), r.dbCreate('test'), null).run(connection);

    fooTable = new Table({
      tableName: 'foo',
      schema: () => ({
        ...schema,
      }),
      relations: () => ({
        bars: belongsToMany([
          fooTable.linkedBy(foobarTable, 'fooId'),
          foobarTable.linkTo(barTable, 'barId'),
        ], { index: 'foobar' }),
        following: belongsToMany([
          fooTable.linkedBy(followingTable, 'followerId'),
          followingTable.linkTo(fooTable, 'followeeId'),
        ], { index: 'following' }),
        followers: belongsToMany([
          fooTable.linkedBy(followingTable, 'followeeId'),
          followingTable.linkTo(fooTable, 'followerId'),
        ], { index: 'followers' }),
      }),
    });
    barTable = new Table({
      tableName: 'bar',
      schema: () => ({
        ...schema,
      }),
      relations: () => ({
        foos: belongsToMany([
          barTable.linkedBy(foobarTable, 'barId'),
          foobarTable.linkTo(fooTable, 'fooId'),
        ], { index: 'foobar' }),
      }),
    });
    foobarTable = new Table({
      tableName: 'foobar',
      schema: () => ({
        ...schema,
        fooId: fooTable.getForeignKey({ isManyToMany: true }),
        barId: barTable.getForeignKey({ isManyToMany: true }),
      }),
      index: {
        foobar: [r.row('fooId'), r.row('barId')],
      },
    });
    followingTable = new Table({
      tableName: 'following',
      schema: () => ({
        ...schema,
        followerId: fooTable.getForeignKey({ isManyToMany: true }),
        followeeId: fooTable.getForeignKey({ isManyToMany: true }),
      }),
      index: {
        following: [r.row('followerId'), r.row('followeeId')],
        followers: [r.row('followeeId'), r.row('followerId')],
      },
    });
    await fooTable.sync(connection);
    await barTable.sync(connection);
    await foobarTable.sync(connection);
    await followingTable.sync(connection);
  });

  beforeEach(async () => {
    await fooTable.query().delete().run(connection);
    await barTable.query().delete().run(connection);
    await foobarTable.query().delete().run(connection);
    await followingTable.query().delete().run(connection);
  });

  after(async () => {
    await connection.close();
  });

  describe('withJoin & getRelated', () => {
    it('should query relation', async () => {
      const foo = fooTable.create({});
      const bar = barTable.create({});
      const foobar = foobarTable.create({ fooId: foo.id, barId: bar.id });

      await fooTable.insert(foo).run(connection);
      await barTable.insert(bar).run(connection);
      await foobarTable.insert(foobar).run(connection);

      let query = fooTable.get(foo.id);
      query = fooTable.withJoin(query, { bars: true });
      const fetchedfoo = await query.run(connection);
      expect(fetchedfoo.bars).to.have.length(1);

      expect(bar).to.deep.equal(fetchedfoo.bars[0]);
      const fetchedBars = await fooTable.getRelated(foo.id, 'bars').run(connection);
      expect(fetchedBars).to.have.length(1);
      expect(bar).to.deep.equal(fetchedBars[0]);

      query = barTable.get(bar.id);
      query = barTable.withJoin(query, { foos: true });
      const fetchedbarTable = await query.run(connection);
      expect(fetchedbarTable.foos).to.have.length(1);
      expect(foo).to.deep.equal(fetchedbarTable.foos[0]);

      const fetchedFoos = await barTable.getRelated(bar.id, 'foos').run(connection);
      expect(fetchedFoos).to.have.length(1);
      expect(foo).to.deep.equal(fetchedFoos[0]);
    });

    it('should join SELECTION type query', async () => {
      const foo = fooTable.create({});
      const bar = barTable.create({});
      const foobar = foobarTable.create({ fooId: foo.id, barId: bar.id });

      await fooTable.insert(foo).run(connection);
      await barTable.insert(bar).run(connection);
      await foobarTable.insert(foobar).run(connection);

      let query = fooTable.query().getAll(foo.id);
      query = fooTable.withJoin(query, { bars: true });
      const fetchedfoos = await query.coerceTo('array').run(connection);
      expect(fetchedfoos[0].bars).to.have.length(1);
    });

    it('should join Empty relation', async () => {
      const foo = fooTable.create({});
      await fooTable.insert(foo).run(connection);

      let query = fooTable.query().getAll(foo.id);
      query = fooTable.withJoin(query, { bars: true });
      const fetchedfoos = await query.coerceTo('array').run(connection);
      expect(fetchedfoos[0].bars).to.have.length(0);
    });

    it('should use apply option', async () => {
      const foo = fooTable.create({});
      const bar1 = barTable.create({ id: 'bar1' });
      const bar2 = barTable.create({ id: 'bar2' });

      await fooTable.insert(foo).run(connection);
      await barTable.insert([bar1, bar2]).run(connection);
      await foobarTable.insert(foobarTable.create({ id: '1', fooId: foo.id, barId: bar1.id })).run(connection);
      await foobarTable.insert(foobarTable.create({ id: '2', fooId: foo.id, barId: bar2.id })).run(connection);

      const fetchedBars1 = await fooTable.getRelated(foo.id, 'bars', {
        _apply: query => query.filter({ barId: bar1.id }),
      }).run(connection);
      expect(fetchedBars1).to.have.length(1);
      expect(fetchedBars1[0]).to.deep.equal(bar1);

      const fetchedBars2 = await fooTable.getRelated(foo.id, 'bars', {
        _apply: query => query.filter({ barId: bar2.id }),
      }).run(connection);
      expect(fetchedBars2).to.have.length(1);
      expect(fetchedBars2[0]).to.deep.equal(bar2);

      const fetchedBars3 = await fooTable.getRelated(foo.id, 'bars', {
        _apply: query => query.orderBy(r.asc('id')),
      }).run(connection);
      expect(fetchedBars3).to.have.length(2);
      expect(fetchedBars3[0]).to.deep.equal(bar1);

      const fetchedBars4 = await fooTable.getRelated(foo.id, 'bars', {
        _apply: query => query.orderBy(r.desc('id')),
      }).run(connection);
      expect(fetchedBars4).to.have.length(2);
      expect(fetchedBars4[0]).to.deep.equal(bar1);
    });
  });

  describe('createRelation', () => {
    it('should add relation', async () => {
      const foo = fooTable.create({});
      const bar = barTable.create({});
      await fooTable.insert(foo).run(connection);
      await barTable.insert(bar).run(connection);

      const result = await fooTable.createRelation('bars', foo.id, bar.id).run(connection);
      expect(result.inserted).to.equal(1);

      const fetchedBars = await fooTable.getRelated(foo.id, 'bars').run(connection);
      expect(fetchedBars).to.have.length(1);
      expect(fetchedBars[0]).to.have.property('id', bar.id);

      const fetchedFoos = await barTable.getRelated(bar.id, 'foos').run(connection);
      expect(fetchedFoos).to.have.length(1);
      expect(fetchedFoos[0]).to.have.property('id', foo.id);
    });

    it('should not create duplicated row', async () => {
      const foo = fooTable.create({});
      const bar = barTable.create({});
      await fooTable.insert(foo).run(connection);
      await barTable.insert(bar).run(connection);

      const result1 = await fooTable.createRelation('bars', foo.id, bar.id).run(connection);
      expect(result1.inserted).to.equal(1);
      const result2 = await fooTable.createRelation('bars', foo.id, bar.id).run(connection);
      expect(result2.inserted).to.equal(0);

      const fetchedBars = await fooTable.getRelated(foo.id, 'bars').run(connection);
      expect(fetchedBars).to.have.length(1);
      expect(fetchedBars[0]).to.have.property('id', bar.id);

      const fetchedFoos = await barTable.getRelated(bar.id, 'foos').run(connection);
      expect(fetchedFoos).to.have.length(1);
      expect(fetchedFoos[0]).to.have.property('id', foo.id);
    });

    it('should add relations with array', async () => {
      const foo = fooTable.create({});
      const bar = barTable.create({});
      await fooTable.insert(foo).run(connection);
      await barTable.insert(bar).run(connection);

      await fooTable.createRelation('bars', foo.id, [bar.id]).run(connection);

      const fetchedBars = await fooTable.getRelated(foo.id, 'bars').run(connection);
      expect(fetchedBars).to.have.length(1);
      expect(fetchedBars[0]).to.have.property('id', bar.id);

      const fetchedFoos = await barTable.getRelated(bar.id, 'foos').run(connection);
      expect(fetchedFoos).to.have.length(1);
      expect(fetchedFoos[0]).to.have.property('id', foo.id);
    });
  });

  describe('removeRelation', () => {
    it('should remove relation', async () => {
      const foo = fooTable.create({});
      const bar1 = barTable.create({});
      const bar2 = barTable.create({});
      await fooTable.insert(foo).run(connection);
      await barTable.insert(bar1).run(connection);
      await barTable.insert(bar2).run(connection);
      await fooTable.createRelation('bars', foo.id, bar1.id).run(connection);
      await fooTable.createRelation('bars', foo.id, bar2.id).run(connection);

      await fooTable.removeRelation('bars', foo.id, bar1.id).run(connection);

      const fetchedBars = await fooTable.getRelated(foo.id, 'bars').run(connection);
      expect(fetchedBars).to.have.length(1);
      expect(fetchedBars[0].id).to.equal(bar2.id);

      const fetchedFoos = await barTable.getRelated(bar2.id, 'foos').run(connection);
      expect(fetchedFoos).to.have.length(1);
      expect(fetchedFoos[0].id).to.equal(foo.id);
    });

    it('should remove relations with array', async () => {
      const foo = fooTable.create({});
      const bar1 = barTable.create({});
      const bar2 = barTable.create({});
      await fooTable.insert(foo).run(connection);
      await barTable.insert(bar1).run(connection);
      await barTable.insert(bar2).run(connection);
      await fooTable.createRelation('bars', foo.id, bar1.id).run(connection);
      await fooTable.createRelation('bars', foo.id, bar2.id).run(connection);

      await fooTable.removeRelation('bars', foo.id, [bar1.id]).run(connection);

      const fetchedBars = await fooTable.getRelated(foo.id, 'bars').run(connection);
      expect(fetchedBars).to.have.length(1);
      expect(fetchedBars[0].id).to.equal(bar2.id);

      const fetchedFoos = await barTable.getRelated(bar2.id, 'foos').run(connection);
      expect(fetchedFoos).to.have.length(1);
      expect(fetchedFoos[0].id).to.equal(foo.id);
    });
  });

  describe('hasRelation', () => {
    it('should check relation', async () => {
      const foo = fooTable.create({});
      const bar = barTable.create({});
      await fooTable.insert(foo).run(connection);
      await barTable.insert(bar).run(connection);

      expect(
        await fooTable.hasRelation('bars', foo.id, bar.id).run(connection)
      ).to.be.false;

      await fooTable.createRelation('bars', foo.id, bar.id).run(connection);

      expect(
        await fooTable.hasRelation('bars', foo.id, bar.id).run(connection)
      ).to.be.true;
    });

    it('should check relations with array', async () => {
      const foo = fooTable.create({});
      const bar = barTable.create({});
      await fooTable.insert(foo).run(connection);
      await barTable.insert(bar).run(connection);

      expect(
        await fooTable.hasRelation('bars', foo.id, [bar.id]).run(connection)
      ).to.be.false;

      await fooTable.createRelation('bars', foo.id, bar.id).run(connection);

      expect(
        await fooTable.hasRelation('bars', foo.id, [bar.id]).run(connection)
      ).to.be.true;
    });

    it('should check relations with same table', async () => {
      const follower = fooTable.create({});
      const followee = fooTable.create({});
      await fooTable.insert([follower, followee]).run(connection);

      expect(
        await fooTable.hasRelation('following', follower.id, followee.id).run(connection)
      ).to.be.false;

      await fooTable.createRelation('following', follower.id, followee.id).run(connection);

      expect(
        await fooTable.hasRelation('following', follower.id, followee.id).run(connection)
      ).to.be.true;
      expect(
        await fooTable.hasRelation('followers', follower.id, follower.id).run(connection)
      ).to.be.false;

      expect(
        await fooTable.hasRelation('followers', followee.id, follower.id).run(connection)
      ).to.be.true;
      expect(
        await fooTable.hasRelation('following', followee.id, follower.id).run(connection)
      ).to.be.false;
    });
  });
});
