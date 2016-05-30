import r from 'rethinkdb';
import { expect } from 'chai';
import Table from '../../src/Table';
import schema from '../../src/schema';
import hasMany from '../../src/relations/hasMany';


describe('relation - hasMany', () => {
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
        bars: hasMany(fooTable.linkedBy(barTable, 'fooId')),
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

  describe('withJoin & getRelated', () => {
    it('should query relation', async () => {
      const foo = fooTable.create({});
      const bar = barTable.create({ fooId: foo.id });

      await fooTable.insert(foo).run(connection);
      await barTable.insert(bar).run(connection);

      let query = fooTable.get(foo.id);
      query = fooTable.withJoin(query, { bars: true });
      const fetchedfoo = await query.run(connection);
      expect(fetchedfoo.bars).to.have.length(1);
      expect(bar).to.deep.equal(fetchedfoo.bars[0]);

      const fetchedBars = await fooTable.getRelated(foo.id, 'bars').run(connection);
      expect(fetchedBars).to.have.length(1);
      expect(bar).to.deep.equal(fetchedBars[0]);
    });

    it('should join SELECTION type query', async () => {
      const foo = fooTable.create({});
      const bar = barTable.create({ fooId: foo.id });

      await fooTable.insert(foo).run(connection);
      await barTable.insert(bar).run(connection);

      let query = fooTable.query().getAll(foo.id);
      query = fooTable.withJoin(query, { bars: true });
      const fetchedfoos = await query.coerceTo('array').run(connection);
      expect(fetchedfoos[0].bars).to.have.length(1);
    });
  });

  describe('createRelation', () => {
    it('should add relation', async () => {
      const foo = fooTable.create({});
      const bar = barTable.create({});
      await fooTable.insert(foo).run(connection);
      await barTable.insert(bar).run(connection);

      await fooTable.createRelation('bars', foo.id, bar.id).run(connection);

      const fetchedBars = await fooTable.getRelated(foo.id, 'bars').run(connection);
      expect(fetchedBars).to.have.length(1);
      expect(fetchedBars[0]).to.have.property('id', bar.id);
      expect(fetchedBars[0]).to.have.property('fooId', foo.id);
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
  });
});
