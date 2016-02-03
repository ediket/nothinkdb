import Joi from 'joi';
import _ from 'lodash';
import assert from 'assert';
import uuid from 'node-uuid';
import Link from './Link';


export default class Table {
  static table = null;
  static pk = 'id';

  static schema = () => ({
    id: Joi.string().max(32).default(() => uuid.v4(), 'primary key').meta({ index: true }),
    createdAt: Joi.date().default(() => new Date(), 'time of creation'),
    updatedAt: Joi.date().default(() => new Date(), 'time of updated'),
  });

  static validate(data = null) {
    return !Joi.validate(data, this.schema()).error;
  }

  static attempt(data = null) {
    return Joi.attempt(data, this.schema());
  }

  static hasColumn(columnName) {
    return _.has(this.schema(), columnName);
  }

  static assertColumn(columnName) {
    return assert.ok(this.hasColumn(columnName), `Column '${columnName}' is unspecified in table '${this.table}'.`);
  }

  static getColumn(columnName) {
    this.assertColumn(columnName);
    return this.schema()[columnName];
  }

  static getForeignKey(options = {}) {
    const { columnName = this.pk, isManyToMany = false } = options;
    const column = this.getColumn(columnName);

    if (isManyToMany) {
      return column.required();
    }
    return column.default(null);
  }

  static linkTo(OtherTable, foreignKey, targetKey = OtherTable.pk) {
    return new Link({
      linker: { Table: this, key: foreignKey },
      linkee: { Table: OtherTable, key: targetKey },
    });
  }

  static linkedBy(OtherTable, foreignKey, targetKey = OtherTable.pk) {
    return OtherTable.linkTo(this, foreignKey, targetKey);
  }

  constructor(data = {}) {
    assert.ok(this.constructor.table, 'Table should have static property \'table\'.');
    assert.ok(this.constructor.pk, 'Table should have static property \'pk\'.');
    assert.ok(_.isObject(data), 'data should be object type.');
    this.data = data;
  }

  isValid() {
    return this.constructor.validate(this.data);
  }

  attempt() {
    this.data = this.constructor.attempt(this.data);
  }
}
