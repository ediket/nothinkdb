/* eslint no-shadow: 0, no-param-reassign: 0 */
import r from 'rethinkdb';
import Joi from 'joi';
import _ from 'lodash';
import assert from 'assert';
import Link from './Link';
const debug = require('debug')('nothinkdb');


export default class Table {
  static pk = 'id';

  constructor(options = {}) {
    const { tableName, pk, schema, relations } = Joi.attempt(options, {
      tableName: Joi.string().required(),
      pk: Joi.string().default(this.constructor.pk),
      schema: Joi.func().required(),
      relations: Joi.func().default(() => () => ({}), 'relation'),
    });
    // assert.equal(_.has(schema(), pk), true, `'${pk}' is not specified in schema`);

    this.tableName = tableName;
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
    return assert.ok(this.hasField(fieldName), `Field '${fieldName}' is unspecified in table '${this.tableName}'.`);
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
    debug(`[sync] ${connection.db}.${this.tableName}`);
  }

  async ensureTable(connection) {
    await r.branch(
      r.tableList().contains(this.tableName).not(),
      r.tableCreate(this.tableName),
      null
    ).run(connection);
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
  }

  query() {
    return r.table(this.tableName);
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
    assert.ok(relationObj, `Relation '${this.tableName}.${relation}' is not exist.`);
    return relationObj;
  }

  _withJoinOne(query, relationName, options) {
    const relation = this.getRelation(relationName);
    return query.merge(function(row) {
      return {
        [relationName]: relation.coerceType(
          relation.query(row, options)
        ),
      };
    });
  }

  withJoin(query, relations) {
    return _.reduce(relations, (query, relations, key) => {
      const options = _.isObject(relations) ? relations : {};

      query = this._withJoinOne(query, key, options);
      if (_.isObject(relations)) {
        const relations = _.omitBy(relations, (relations, key) => _.startsWith(key, '_'));
        const { targetTable } = this.getRelation(key);
        query = query.merge(function(row) {
          return { [key]: targetTable.withJoin(row(key), relations) };
        });
      }
      return query;
    }, query);
  }

  getRelated(pk, relationName, options = {}) {
    const relation = this.getRelation(relationName);
    const query = this.queryRelated(pk, relationName, options);

    if (options.noCoerce) { return query; }

    return relation.coerceType(query);
  }

  queryRelated(pk, relationName, options = {}) {
    const relation = this.getRelation(relationName);
    return relation.query(this.get(pk), options);
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
