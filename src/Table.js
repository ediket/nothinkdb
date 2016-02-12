/* eslint no-shadow: 0, no-param-reassign: 0 */
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
  static relations = () => ({});

  static validate(data = null) {
    return !Joi.validate(data, this.schema()).error;
  }

  static attempt(data = null) {
    return Joi.attempt(data, this.schema());
  }

  static create(data = null) {
    return this.attempt(data);
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
    return field.optional();
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

  static query() {
    assert.ok(this.table, 'Table should have static property \'table\'.');
    return r.table(this.table);
  }

  static insert(data) {
    return this.query().insert(this.attempt(data));
  }

  static get(pk) {
    return this.query().get(pk);
  }

  static update(pk, data) {
    return this.query().get(pk).update(data);
  }

  static delete(pk) {
    return this.query().get(pk).delete();
  }

  static getRelation(relation) {
    const relationObj = this.relations()[relation];
    assert.ok(relationObj, `Relation '${this.table}.${relation}' is not exist.`);
    return relationObj;
  }

  static _withJoinOne(query, key, options) {
    const relation = this.getRelation(key);
    return relation.join(key, query, options);
  }

  static withJoin(query, relations) {
    return _.reduce(relations, (query, value, key) => {
      let options = {};
      if (_.isObject(value)) {
        options = _.chain(value)
          .omitBy((value, key) => !_.startsWith(key, '_'))
          .reduce((memo, value, key) => {
            return { [key.slice(1)]: value };
          }, {})
          .value();
      }

      query = this._withJoinOne(query, key, options);
      if (_.isObject(value)) {
        const relations = _.omitBy(value, (value, key) => _.startsWith(key, '_'));
        const { TargetTable } = this.getRelation(key);
        query = query.merge(function(row) {
          return { [key]: TargetTable.withJoin(row(key), relations) };
        });
      }
      return query;
    }, query);
  }

  static addToRelation(as, pk, otherPk) {
    const relation = this.getRelation(as);
    assert.ok(relation.add, 'unsupported relation.');
    return relation.add(pk, otherPk);
  }

  static removeFromRelation(as, pk, otherPk) {
    const relation = this.getRelation(as);
    assert.ok(relation.remove, 'unsupported relation.');
    return relation.remove(otherPk);
  }

  constructor(data = {}) {
    assert.ok(_.isObject(data), 'data should be object type.');
    Object.assign(this, this.constructor.create(data));
  }
}
