import r from 'rethinkdb';
import Joi from 'joi';
import _ from 'lodash';
import assert from 'assert';
import uuid from 'node-uuid';
import Link from './Link';


export default class Table {
  static table = null;
  static pk = 'id';

  static schema = () => ({
    id: Joi.string().max(36).default(() => uuid.v4(), 'primary key').meta({ index: true }),
    createdAt: Joi.date().default(() => new Date(), 'time of creation'),
    updatedAt: Joi.date().default(() => new Date(), 'time of updated'),
  });

  static validate(data = null) {
    return !Joi.validate(data, this.schema()).error;
  }

  static attempt(data = null) {
    return Joi.attempt(data, this.schema());
  }

  static hasField(fieldName) {
    return _.has(this.schema(), fieldName);
  }

  static assertField(fieldName) {
    return assert.ok(this.hasField(fieldName), `Field '${fieldName}' is unspecified in table '${this.table}'.`);
  }

  static getField(fieldName) {
    this.assertField(fieldName);
    return this.schema()[fieldName];
  }

  static getForeignKey(options = {}) {
    const { fieldName = this.pk, isManyToMany = false } = options;
    const field = this.getField(fieldName);

    if (isManyToMany) {
      return field.required();
    }
    return field.default(null);
  }

  static linkTo(RightTable, leftField, options = {}) {
    const { index = RightTable.pk } = options;
    return new Link({
      left: { Table: this, field: leftField },
      right: { Table: RightTable, field: index },
    });
  }

  static linkedBy(LeftTable, leftField, options) {
    return LeftTable.linkTo(this, leftField, options);
  }

  static query() {
    return r.table(this.table);
  }

  static async sync(connection) {
    await this.ensureTable(connection);
  }

  static async ensureTable(connection) {
    await r.branch(
      r.tableList().contains(this.table).not(),
      r.tableCreate(this.table),
      null
    ).run(connection);
  }

  constructor(data = {}) {
    assert.ok(this.constructor.table, 'Table should have static property \'table\'.');
    assert.ok(this.constructor.pk, 'Table should have static property \'pk\'.');
    assert.ok(_.isObject(data), 'data should be object type.');
    this.data = this.constructor.attempt(data);
  }

  getPk() {
    return this.data[this.constructor.pk];
  }
}
