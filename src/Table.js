/* eslint no-shadow: 0, no-param-reassign: 0 */
import r from 'rethinkdb';
import Joi from 'joi';
import _ from 'lodash';
import assert from 'assert';
import Link from './Link';
const debug = require('debug')('nothinkdb:Table');


export default class Table {
  static pk = 'id';

  constructor(options = {}) {
    const { table, pk, schema, relations } = Joi.attempt(options, {
      table: Joi.string().required(),
      pk: Joi.string().default(this.constructor.pk),
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
      return field.required().meta({ index: true });
    }
    return field.allow(null).default(null).meta({ index: true });
  }

  linkTo(targetTable, leftField, options = {}) {
    const { index = targetTable.pk } = options;
    return new Link({
      left: { table: this, field: leftField },
      right: { table: targetTable, field: index },
    });
  }

  linkedBy(targetTable, leftField, options) {
    return targetTable.linkTo(this, leftField, options);
  }

  async sync(connection) {
    await this.ensureTable(connection);
    await this.ensureAllIndexes(connection);
    debug(`[sync] sync ${this.table}`);
  }

  async ensureTable(connection) {
    await r.branch(
      r.tableList().contains(this.table).not(),
      r.tableCreate(this.table),
      null
    ).run(connection);
    debug(`[sync] ensureTable ${this.table}`);
  }

  async ensureAllIndexes(connection) {
    await _.chain(this.schema())
      .omitBy(schema => !_.find(schema._meta, meta => meta.index))
      .reduce((promise, schema, key) => {
        return promise.then(() => this.ensureIndex(connection, key));
      }, Promise.resolve())
      .value();
  }

  async ensureIndex(connection, field) {
    if (this.pk === field) return;
    await r.branch(
      this.query().indexList().contains(field).not(),
      this.query().indexCreate(field),
      null
    ).run(connection);
    await this.query().indexWait(field).run(connection);
    debug(`[sync] ensureIndex ${this.table}.${field}`);
  }

  query() {
    return r.table(this.table);
  }

  insert(data, ...options) {
    return this.query().insert(data, ...options);
  }

  get(pk) {
    return this.query().get(pk);
  }

  update(pk, data, ...options) {
    const updateData = { ...data };
    if (this.hasField('updatedAt')) {
      updateData.updatedAt = r.now();
    }
    return this.query().get(pk).update(updateData, ...options);
  }

  delete(pk, ...options) {
    return this.query().get(pk).delete(...options);
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

  getRelated(pk, relationName, options = {}) {
    return this.withJoin(this.get(pk),
      Object.assign({
        [relationName]: true,
      }, options)
    )
    .do(r.row(relationName));
  }

  createRelation(relationName, onePk, otherPk) {
    const relation = this.getRelation(relationName);
    return relation.create(onePk, otherPk);
  }

  removeRelation(relationName, onePk, otherPk) {
    const relation = this.getRelation(relationName);
    return relation.remove(onePk, otherPk);
  }
}
