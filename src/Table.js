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
    const { tableName, pk, schema, relations, index } = Joi.attempt(options, {
      tableName: Joi.string().required(),
      pk: Joi.string().default(this.constructor.pk),
      schema: Joi.func().required(),
      relations: Joi.func().default(() => () => ({}), 'relation'),
      index: Joi.object().default({}, 'index'),
    });
    // assert.equal(_.has(schema(), pk), true, `'${pk}' is not specified in schema`);

    this.tableName = tableName;
    this.pk = pk;
    this.schema = schema;
    this.relations = relations;
    this.index = index;
  }

  metaFields(metaKey) {
    return _.chain(this.schema())
      .omitBy(schema => !_.find(schema._meta, meta => _.has(meta, metaKey)))
      .keys()
      .value();
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
    const indexFields = [
      ...this.metaFields('index'),
      ...this.metaFields('unique'),
    ];

    await indexFields.reduce((promise, indexName) => {
      return promise.then(() => this.ensureIndex(connection, indexName));
    }, Promise.resolve());

    await _.reduce(this.index, (promise, option, indexName) => {
      return promise.then(() => option === true ?
        this.ensureIndex(connection, indexName) :
        this.ensureIndex(connection, indexName, option)
      );
    }, Promise.resolve());
  }

  async ensureIndex(connection, indexName, option) {
    if (this.pk === indexName) return;
    await r.branch(
      this.query().indexList().contains(indexName).not(),
      this.query().indexCreate(indexName, option),
      null
    ).run(connection);
    await this.query().indexWait(indexName).run(connection);
  }

  query() {
    return r.table(this.tableName);
  }

  insert(data, ...options) {
    const insertData = { ...data };
    if (this.hasField('createdAt')) {
      insertData.createdAt = r.now();
    }
    return this.assertIntegrate(data)
    .do(() => this.query().insert(data, ...options));
  }

  get(pk) {
    return this.query().get(pk);
  }

  update(pk, data, ...options) {
    const updateData = { ...data };
    if (this.hasField('updatedAt')) {
      updateData.updatedAt = r.now();
    }
    return this.assertIntegrate(data)
    .do(() => {
      const selectionQuery = _.isArray(pk) ?
        this.query().getAll(...pk) :
        this.query().get(pk);
      return selectionQuery.update(updateData, ...options);
    });
  }

  assertIntegrate(data) {
    const uniqueFields = this.metaFields('unique');
    if (_.isEmpty(uniqueFields)) return r.expr(true);

    const uniqueData = _.pick(data, uniqueFields);
    if (_.isEmpty(uniqueData)) return r.expr(true);

    return _.reduce(uniqueData, (expr, val, key) => {
      return expr.do(() => {
        if (_.isUndefined(val) || _.isNull(val)) return r.expr(null);

        return r.branch(
          this.query().getAll(val, {index: key}).count().gt(0),
          r.error(`"${key}" field is unique in "${this.tableName}" table. { "${key}": "${val}" } already exist.`),
          null
        );
      });
    }, r.expr({}));
  }

  delete(pk, ...options) {
    return this.query().get(pk).delete(...options);
  }

  getRelation(relation) {
    const relationObj = this.relations()[relation];
    assert.ok(relationObj, `Relation '${this.tableName}.${relation}' is not exist.`);
    return relationObj;
  }

  withJoin(query, relations) {
    const joinedQuery = _.reduce(relations, (query, relations, key) => {
      if (_.startsWith(key, '_')) return query;

      const relation = this.getRelation(key);
      query = query.merge(row => {
        let relatedQuery = relation.coerceType(relation.query(row, relations));

        if (_.isObject(relations)) {
          const { targetTable } = this.getRelation(key);
          relatedQuery = r.branch(
            relatedQuery,
            targetTable.withJoin(relatedQuery, relations),
            relatedQuery,
          );
        }

        return { [key]: relatedQuery };
      });

      return query;
    }, query);

    return r.branch(
      query.eq(null).not(),
      joinedQuery,
      query
    );
  }

  getRelated(pk, relationName, options = {}) {
    const relation = this.getRelation(relationName);
    const query = this.queryRelated(pk, relationName, options);

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

  hasRelation(relationName, onePk, otherPk) {
    const relation = this.getRelation(relationName);
    return relation.has(onePk, otherPk);
  }
}
