/* eslint no-shadow: 0, no-param-reassign: 0 */
import r from 'rethinkdb';
import Joi from 'joi';
import _ from 'lodash';
import assert from 'assert';
import uuid from 'node-uuid';
import Link from './Link';


export default class Table {
  static pk = 'id';
  static schema = {
    id: Joi.string().max(36).default(() => uuid.v4(), 'primary key').meta({ index: true }),
    createdAt: Joi.date().default(() => new Date(), 'time of creation'),
    updatedAt: Joi.date().default(() => new Date(), 'time of updated'),
  };

  constructor(options = {}) {
    const { table, pk, schema, relations } = Joi.attempt(options, {
      table: Joi.string().required(),
      pk: Joi.string().default(Table.pk),
      schema: Joi.func().required(),
      relations: Joi.func().default(() => () => ({}), 'relation'),
    });
    // assert.equal(_.has(schema(), pk), true, `'${pk}' is not specified in schema`);

    this.table = table;
    this.pk = pk;
    this.schema = schema;
    this.relations = relations;
  }

  validate(data = null) {
    return !Joi.validate(data, this.schema()).error;
  }

  attempt(data = null) {
    return Joi.attempt(data, this.schema());
  }

  create(data = null) {
    return this.attempt(data);
  }

  hasField(fieldName) {
    return _.has(this.schema(), fieldName);
  }

  assertField(fieldName) {
    return assert.ok(this.hasField(fieldName), `Field '${fieldName}' is unspecified in table '${this.table}'.`);
  }

  getField(fieldName) {
    this.assertField(fieldName);
    return this.schema()[fieldName];
  }

  getForeignKey(options = {}) {
    const { fieldName = this.pk, isManyToMany = false } = options;
    const field = this.getField(fieldName);

    if (isManyToMany) {
      return field.required();
    }
    return field.allow(null).default(null);
  }

  linkTo(rightTable, leftField, options = {}) {
    const { index = rightTable.pk } = options;
    return new Link({
      left: { table: this, field: leftField },
      right: { table: rightTable, field: index },
    });
  }

  linkedBy(leftTable, leftField, options) {
    return leftTable.linkTo(this, leftField, options);
  }

  async sync(connection) {
    await this.ensureTable(connection);
    await this.syncRelations(connection);
  }

  async ensureTable(connection) {
    await r.branch(
      r.tableList().contains(this.table).not(),
      r.tableCreate(this.table),
      null
    ).run(connection);
  }

  async ensureIndex(connection, field) {
    if (this.pk === field) return;
    await r.branch(
      this.query().indexList().contains(field).not(),
      this.query().indexCreate(field),
      null
    ).run(connection);
    await this.query().indexWait(field).run(connection);
  }

  async syncRelations(connection) {
    await _.reduce(this.relations(), (promise, relation) => {
      return promise.then(() => relation.sync(connection));
    }, Promise.resolve());
  }

  query() {
    assert.ok(this.table, 'Table should have property \'table\'.');
    return r.table(this.table);
  }

  insert(data) {
    return this.query().insert(this.attempt(data));
  }

  get(pk) {
    return this.query().get(pk);
  }

  update(pk, data) {
    return this.query().get(pk).update(data);
  }

  delete(pk) {
    return this.query().get(pk).delete();
  }

  getRelation(relation) {
    const relationObj = this.relations()[relation];
    assert.ok(relationObj, `Relation '${this.table}.${relation}' is not exist.`);
    return relationObj;
  }

  _withJoinOne(query, key, options) {
    const relation = this.getRelation(key);
    return relation.join(key, query, options);
  }

  withJoin(query, relations) {
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
        const { targetTable } = this.getRelation(key);
        query = query.merge(function(row) {
          return { [key]: targetTable.withJoin(row(key), relations) };
        });
      }
      return query;
    }, query);
  }

  createRelation(as, onePk, otherPk) {
    const relation = this.getRelation(as);
    assert.ok(relation.create, 'unsupported relation.');
    return relation.create(onePk, otherPk);
  }

  removeRelation(as, onePk, otherPk) {
    const relation = this.getRelation(as);
    assert.ok(relation.remove, 'unsupported relation.');
    return relation.remove(onePk, otherPk);
  }
}
