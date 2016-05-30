/* eslint no-shadow: 0 */
import _ from 'lodash';
import _Table from './Table';
import mapSeries from 'promise-map-series';
const debug = require('debug')('nothinkdb:Environment');


export default class Environment {
  constructor(options = {}) {
    const { Table = _Table } = options;
    this.Table = Table;
    this.tables = {};
  }

  init() {
    _.each(this.tables, table => table.init());
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
    await mapSeries(_.values(this.tables), async table => {
      if (_.isFunction(connection)) {
        const connection = await connection();
        await table.sync(connection);
        await connection.close();
      } else {
        await table.sync(connection);
      }
    });
  }
}
