/* eslint no-shadow: 0 */
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
    await Promise.all(
      _.map(this.tables, async table => {
        if (_.isFunction(connection)) {
          await connection().then(async connection => {
            await table.sync(connection);
            await connection.close();
          });
        } else {
          await table.sync(connection);
        }
      })
    );
  }
}
