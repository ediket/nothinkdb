import r from 'rethinkdb';
import { expect } from 'chai';
import Table from '../../src/Table';
import schema from '../../src/schema';
import belongsTo from '../../src/relations/belongsTo';


describe('relation - belongsTo', () => {
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
        barId: barTable.getForeignKey(),
      }),
      relations: () => ({
        bar: belongsTo(fooTable.linkTo(barTable, 'barId')),
      }),
    });
    barTable = new Table({
      tableName: 'bar',
      schema: () => ({
        ...schema,
      }),
    });
    await fooTable.sync(connection);
    await barTable.sync(connection);
  });

  after(async () => {
    await connection.close();
  });

  describe('withJoin & getRelated', () => {
    it('should query relation', async () => {
      const bar = barTable.create({});
      const foo = fooTable.create({ barId: bar.id });

      await fooTable.insert(foo).run(connection);
      await barTable.insert(bar).run(connection);

      let query = fooTable.get(foo.id);
      query = fooTable.withJoin(query, { bar: true });
      const fetchedfoo = await query.run(connection);
      expect(bar).to.deep.equal(fetchedfoo.bar);

      const fetchedBar = await fooTable.getRelated(foo.id, 'bar').run(connection);
      expect(bar).to.deep.equal(fetchedBar);
    });
  });

  describe('createRelation', () => {
    it('should add relation', async () => {
      const bar = barTable.create({});
      const foo = fooTable.create({});

      await fooTable.insert(foo).run(connection);
      await barTable.insert(bar).run(connection);

      await fooTable.createRelation('bar', foo.id, bar.id).run(connection);

      const fetchedBar = await fooTable.getRelated(foo.id, 'bar').run(connection);
      expect(fetchedBar.id).to.equal(bar.id);
    });
  });

  describe('removeRelation', () => {
    it('should remove relation', async () => {
      const bar = barTable.create({});
      const foo = fooTable.create({});

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
