import { expect } from 'chai';
import r from 'rethinkdb';
import Table from '../Table';
import schema from '../schema';
import Environment from '../Environment';


describe('Environment', () => {
  let connection;

  class CustomTable extends Table {
    constructor(options) {
      super({
        ...options,
        schema: () => ({
          ...schema,
          ...options.schema(),
        }),
      });
    }
  }

  before(async () => {
    connection = await r.connect({});
    await r.branch(r.dbList().contains('test').not(), r.dbCreate('test'), null).run(connection);
    r.dbCreate('test');
  });

  after(async () => {
    await connection.close();
  });

  describe('constructor', () => {
    it('should return environment', () => {
      const env = new Environment({});
      expect(env).to.be.ok;
    });

    it('should accept Table option', () => {
      const env = new Environment({
        Table: CustomTable,
      });
      expect(env).to.be.ok;
    });
  });

  describe('createTable', () => {
    it('should create table', () => {
      const env = new Environment({});

      const fooTable = env.createTable({
        tableName: 'foo',
        schema: () => ({}),
      });

      expect(fooTable.constructor).to.equal(Table);
    });

    it('should create customized table', () => {
      const env = new Environment({ Table: CustomTable });

      const fooTable = env.createTable({
        tableName: 'foo',
        schema: () => ({}),
      });

      expect(fooTable.constructor).to.equal(CustomTable);
    });

    it('should throw error if tableName already exist', () => {
      const env = new Environment({});

      env.createTable({
        tableName: 'foo',
        schema: () => ({}),
      });

      expect(() =>
        env.createTable({
          tableName: 'foo',
          schema: () => ({}),
        })
      ).to.throw(Error);
    });
  });

  describe('getTable', () => {
    it('should return table', () => {
      const env = new Environment({});

      const fooTable = env.createTable({
        tableName: 'foo',
        schema: () => ({}),
      });

      expect(env.getTable('foo')).to.equal(fooTable);
    });
  });

  describe('hasTable', () => {
    it('should return true if table exist', () => {
      const env = new Environment({});

      env.createTable({
        tableName: 'foo',
        schema: () => ({}),
      });

      expect(env.hasTable('foo')).to.be.true;
      expect(env.hasTable('bar')).to.be.false;
    });
  });

  describe('getAllTables', () => {
    it('should return all tables', () => {
      const env = new Environment({});

      const fooTable = env.createTable({
        tableName: 'foo',
        schema: () => ({}),
      });

      expect(env.getAllTables()).to.deep.equal([fooTable]);
    });
  });

  describe('sync', () => {
    before(async () => {
      await r.branch(r.tableList().contains('foo'), r.tableDrop('foo'), null).run(connection);
    });

    it('should sync tables', async () => {
      const env = new Environment({});

      env.createTable({
        tableName: 'foo',
        schema: () => ({}),
      });

      env.createTable({
        tableName: 'bar',
        schema: () => ({}),
      });

      await env.sync(connection);

      expect(await r.tableList().contains('foo').run(connection)).to.be.true;
      expect(await r.tableList().contains('bar').run(connection)).to.be.true;
    });
  });
});
