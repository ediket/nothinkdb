import r from 'rethinkdb';
import { expect } from 'chai';
import Table from '../../Table';
import schema from '../../schema';
import hasOne from '../hasOne';


describe('relation - hasOne', () => {
  let connection;
  let fooTable;
  let barTable;

  before(async () => {
    connection = await r.connect({});
    await r.branch(r.dbList().contains('test').not(), r.dbCreate('test'), null).run(connection);

    fooTable = new Table({
      tableName: 'foo',
      schema: () => ({
        ...schema,
      }),
      relations: () => ({
        bar: hasOne(fooTable.linkedBy(barTable, 'fooId')),
      }),
    });
    barTable = new Table({
      tableName: 'bar',
      schema: () => ({
        ...schema,
        fooId: fooTable.getForeignKey(),
      }),
    });
    await fooTable.sync(connection);
    await barTable.sync(connection);
  });

  after(async () => {
    await connection.close();
  });

  describe('withJoin & getRelated', async () => {
    it('should query relation', async () => {
      const foo = fooTable.create({});
      const bar = barTable.create({ fooId: foo.id });

      await fooTable.insert(foo).run(connection);
      await barTable.insert(bar).run(connection);

      let query = fooTable.get(foo.id);
      query = await fooTable.withJoin(query, { bar: true });
      const fetchedfoo = await query.run(connection);
      expect(bar).to.deep.equal(fetchedfoo.bar);

      const fetchedBar = await fooTable.getRelated(foo.id, 'bar').run(connection);
      expect(bar).to.deep.equal(fetchedBar);
    });
  });

  describe('createRelation', async () => {
    it('should add relation', async () => {
      const foo = fooTable.create({});
      const bar = barTable.create({});

      await fooTable.insert(foo).run(connection);
      await barTable.insert(bar).run(connection);

      await fooTable.createRelation('bar', foo.id, bar.id).run(connection);

      const fetchedBar = await fooTable.getRelated(foo.id, 'bar').run(connection);
      expect(fetchedBar.id).to.equal(bar.id);
    });
  });

  describe('removeRelation', async () => {
    it('should remove relation', async () => {
      const foo = fooTable.create({});
      const bar = barTable.create({});

      await fooTable.insert(foo).run(connection);
      await barTable.insert(bar).run(connection);

      await fooTable.createRelation('bar', foo.id, bar.id).run(connection);
      await fooTable.removeRelation('bar', foo.id, bar.id).run(connection);

      const fetchedBar = await fooTable.getRelated(foo.id, 'bar').run(connection);
      expect(fetchedBar).to.be.null;
    });
  });

  describe('hasRelation', () => {
    it('should check relation', async () => {
      const foo = fooTable.create({});
      const bar = barTable.create({});

      await fooTable.insert(foo).run(connection);
      await barTable.insert(bar).run(connection);

      expect(
        await fooTable.hasRelation('bar', foo.id, bar.id).run(connection)
      ).to.be.false;

      await fooTable.createRelation('bar', foo.id, bar.id).run(connection);

      expect(
        await fooTable.hasRelation('bar', foo.id, bar.id).run(connection)
      ).to.be.true;
    });
  });
});
