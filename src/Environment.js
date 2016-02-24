import _ from 'lodash';
import assert from 'assert';
import _Table from './Table';


export default class Environment {
  constructor(options = {}) {
    const { Table = _Table } = options;
    this.Table = Table;
    this.tables = {};
  }

  createTable(options) {
    const { tableName } = options;
    assert.equal(this.hasTable(tableName), false, `tableName: '${tableName}' is already defined`);

    const table = new this.Table(options);
    this.tables[tableName] = table;
    return table;
  }

  getTable(tableName) {
    return this.tables[tableName];
  }

  hasTable(tableName) {
    return _.has(this.tables, tableName);
  }

  getAllTables() {
    return _.values(this.tables);
  }

  async sync(connection) {
    await _.reduce(this.tables, (promise, table) => {
      return promise.then(() => table.sync(connection));
    }, Promise.resolve());
  }
}
