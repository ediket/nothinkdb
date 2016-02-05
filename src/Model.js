import r from 'rethinkdb';
import Joi from 'joi';
import _ from 'lodash';
import assert from 'assert';
import uuid from 'node-uuid';
import Link from './Link';


export default class Model {
  static table = null;
  static pk = 'id';
  static schema = () => ({
    id: Joi.string().max(36).default(() => uuid.v4(), 'primary key').meta({ index: true }),
    createdAt: Joi.date().default(() => new Date(), 'time of creation'),
    updatedAt: Joi.date().default(() => new Date(), 'time of updated'),
  });
  static relations = () => ({});

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

  static linkTo(RightModel, leftField, options = {}) {
    const { index = RightModel.pk } = options;
    return new Link({
      left: { Model: this, field: leftField },
      right: { Model: RightModel, field: index },
    });
  }

  static linkedBy(LeftModel, leftField, options) {
    return LeftModel.linkTo(this, leftField, options);
  }

  static query() {
    return r.table(this.table);
  }

  static async sync(connection) {
    await this.ensureTable(connection);
    await this.ensureForeignKeys(connection);
  }

  static async ensureTable(connection) {
    await r.branch(
      r.tableList().contains(this.table).not(),
      r.tableCreate(this.table),
      null
    ).run(connection);
  }

  static async ensureForeignKeys(connection) {
    await Promise.all(
      _.map(this.relations(), relation => {
        const links = [].concat(relation.link);
        return Promise.all(links.map(link => link.sync(connection)));
      })
    );
  }

  constructor(data = {}, isSynced = false) {
    assert.ok(this.constructor.table, 'Model should have static property \'table\'.');
    assert.ok(this.constructor.pk, 'Model should have static property \'pk\'.');
    assert.ok(_.isObject(data), 'data should be object type.');
    this.isSynced = isSynced;
    this.data = this.constructor.attempt(data);
  }

  getPk() {
    return this.data[this.constructor.pk];
  }

  queryRelation(as, options = {}) {
    const relation = this.constructor.relations()[as];
    return relation.join(as, r.expr(this.data), options).do(r.row(as));
  }
}
