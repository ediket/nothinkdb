import r from 'rethinkdb';
import { expect } from 'chai';
import Table from '../../Table';
import schema from '../../schema';
import hasOne from '../hasOne';


describe('relation - complex', () => {
  let connection;
  let fooTable;
  let barTable;
  let bazTable;

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
      relations: () => ({
        baz: hasOne(barTable.linkedBy(bazTable, 'barId')),
      }),
    });
    bazTable = new Table({
      tableName: 'baz',
      schema: () => ({
        ...schema,
        barId: barTable.getForeignKey(),
      }),
    });
    await fooTable.sync(connection);
    await barTable.sync(connection);
    await bazTable.sync(connection);
  });

  after(async () => {
    await connection.close();
  });

  describe('withJoin & getRelated', () => {
    it('should query nested relation', async () => {
      const foo = fooTable.create({});
      const bar = barTable.create({ fooId: foo.id });
      const baz = bazTable.create({ barId: bar.id });

      await fooTable.insert(foo).run(connection);
      await barTable.insert(bar).run(connection);
      await bazTable.insert(baz).run(connection);

      let query = fooTable.get(foo.id);
      query = await fooTable.withJoin(query, { bar: { baz: true } });
      const result = await query.run(connection);
      expect(result).to.deep.equal({
        ...foo,
        bar: {
          ...bar,
          baz,
        },
      });
    });

    it('should handle null query', async () => {
      let query = r.expr(null);
      query = await fooTable.withJoin(query, { bar: { baz: true } });
      const result = await query.run(connection);
      expect(result).to.be.null;
    });

    it('should query nested relation with empty part', async () => {
      const foo = fooTable.create({});

      await fooTable.insert(foo).run(connection);

      let query = fooTable.get(foo.id);
      query = await fooTable.withJoin(query, { bar: { baz: true } });
      const result = await query.run(connection);
      expect(result).to.deep.equal({
        ...foo,
        bar: null,
      });
    });
  });
});
