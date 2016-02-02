import r from 'rethinkdb';
import Joi from 'joi';
import _ from 'lodash';
import assert from 'assert';
import uuid from 'node-uuid';


export default class Table {
  static table = null;
  static pk = 'id';

  static schema = () => ({
    id: Joi.string().max(32).default(() => uuid.v4(), 'primary key'),
    createdAt: Joi.date().default(() => new Date(), 'time of creation'),
    updatedAt: Joi.date().default(() => new Date(), 'time of updated'),
  });

  static hasColumn(column) {
    return this.schema()[column];
  }

  static assertColumn(column) {
    return assert.ok(this.hasColumn(column), `Column '${column}' is unspecified in table '${this.table}'.`);
  }

  static getForeignKey(targetKey = this.pk, options = {}) {
    this.assertColumn(targetKey);
    const { isManyToMany = false } = options;

    if (isManyToMany) {
      return this.schema()[this.pk].required();
    }
    return this.schema()[this.pk].default(null);
  }

  static async sync(connection) {
    await this.ensureTable(connection);
  }

  static async ensureTable(connection) {
    return await r.branch(
      r.tableList().contains(this.table).not(),
      r.tableCreate(this.table),
      null
    ).run(connection);
  }

  constructor(data = {}) {
    assert.ok(this.constructor.table, 'Table should have static property \'table\'.');
    assert.ok(this.constructor.pk, 'Table should have static property \'pk\'.');
    assert.ok(_.isObject(data), 'data should be object type.');
    this.data = data;
  }

  validate() {
    this.data = Joi.validate(this.data, this.constructor.schema());
  }
}
