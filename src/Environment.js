import _ from 'lodash';
import _Table from './Table';
const debug = require('debug')('nothinkdb:Environment');


export default class Environment {
  constructor(options = {}) {
    const { Table = _Table } = options;
    this.Table = Table;
    this.tables = {};
  }

  createTable(options) {
    const { tableName } = options;

    if (this.hasTable(tableName)) {
      debug(`[createTable] tableName: '${tableName}' is already defined`);
      return this.getTable(tableName);
    }

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
