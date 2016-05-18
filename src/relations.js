/* eslint no-shadow: 0 */
import r from 'rethinkdb';
import _ from 'lodash';
import assert from 'assert';
import Link from './Link';

function parseOptions(options) {
  return _.chain(options)
    .omitBy((value, key) => !_.startsWith(key, '_'))
    .reduce((memo, value, key) => {
      return { [key.slice(1)]: value };
    }, {})
    .value();
}

export function hasOne(link) {
  assert.equal(link.constructor, Link);
  const { left, right } = link;

  function query(row, options) {
    const {
      apply = query => query,
    } = parseOptions(options);

    let query = left.table.query();
    query = query.getAll(row(right.field), { index: left.field });
    query = apply(query);

    return r.branch(
      row(right.field),
      query,
      r.expr([]),
    );
  }

  function coerceType(query) {
    return query.coerceTo('array')
      .do(query => r.branch(query.count().gt(0), query.nth(0), null));
  }

  function create(onePk, otherPk) {
    const { left, right } = link;
    return right.table.get(onePk).do(function(rightRow) {
      return left.table.update(otherPk, { [left.field]: rightRow(right.field) });
    });
  }

  function remove(onePk, otherPk) {
    const { left } = link;
    return left.table.update(otherPk, { [left.field]: null });
  }

  function has(onePk, otherPk) {
    return right.table.get(onePk).do(rightRow => {
      return left.table.get(otherPk).do(leftRow => {
        return leftRow.hasFields(left.field).and(
          leftRow(left.field).eq(rightRow(right.field))
        );
      });
    });
  }

  return {
    query,
    coerceType,
    create,
    remove,
    has,
    link,
    targetTable: left.table,
    type: 'hasOne',
  };
}

export function belongsTo(link) {
  assert.equal(link.constructor, Link);
  const { left, right } = link;

  function query(row, options = {}) {
    const {
      apply = query => query,
    } = parseOptions(options);

    let query = right.table.query();
    query = query.getAll(row(left.field), { index: right.field });
    query = apply(query);
    return r.branch(
      row(left.field),
      query,
      r.expr([]),
    );
  }

  function coerceType(query) {
    return query.coerceTo('array').do(
      rows => r.branch(rows.count().gt(0), rows.nth(0), null)
    );
  }

  function create(onePk, otherPk) {
    const { left, right } = link;
    return right.table.get(otherPk).do(function(rightRow) {
      return left.table.update(onePk, { [left.field]: rightRow(right.field) });
    });
  }

  function remove(onePk, /* otherPk */) {
    const { left } = link;
    return left.table.update(onePk, { [left.field]: null });
  }

  function has(onePk, otherPk) {
    return right.table.get(otherPk).do(rightRow => {
      return left.table.get(onePk).do(leftRow => {
        return leftRow.hasFields(left.field).and(
          leftRow(left.field).eq(rightRow(right.field))
        );
      });
    });
  }

  return {
    query,
    coerceType,
    create,
    remove,
    has,
    link,
    targetTable: right.table,
    type: 'belongsTo',
  };
}

export function hasMany(link) {
  assert.equal(link.constructor, Link);
  const { left, right } = link;

  function query(row, options = {}) {
    const {
      apply = query => query,
    } = parseOptions(options);

    let query = left.table.query();
    query = query.getAll(row(right.field), { index: left.field });
    query = apply(query);

    return r.branch(
      row(right.field),
      query,
      r.expr([]),
    );
  }

  function coerceType(query) {
    return query.coerceTo('array');
  }

  function create(onePk, otherPk) {
    const { left, right } = link;
    return right.table.get(onePk).do(function(rightRow) {
      return left.table.update(otherPk, { [left.field]: rightRow(right.field) });
    });
  }

  function remove(onePk, otherPk) {
    const { left } = link;
    return left.table.update(otherPk, { [left.field]: null });
  }

  function has(onePk, otherPk) {
    return right.table.get(onePk).do(rightRow => {
      return left.table.get(otherPk).do(leftRow => {
        return leftRow.hasFields(left.field).and(
          leftRow(left.field).eq(rightRow(right.field))
        );
      });
    });
  }

  return {
    query,
    coerceType,
    create,
    remove,
    has,
    link,
    targetTable: left.table,
    type: 'hasMany',
  };
}

export function belongsToMany(link, options = {}) {
  assert.equal(link.length, 2);
  const [link1, link2] = link;
  assert.equal(link1.constructor, Link);
  assert.equal(link2.constructor, Link);
  assert.equal(link1.left.table, link2.left.table, 'link table must be same.');
  const { index } = options;
  const relationTable = link[0].left.table;

  function query(row, options = {}) {
    const {
      apply = query => query,
    } = parseOptions(options);

    let targetIdsQuery = relationTable.query()
      .getAll(row(link1.right.field), { index: link1.left.field })
      .hasFields(link2.left.field);

    // filter, orderBy, etc...
    targetIdsQuery = apply(targetIdsQuery);
    targetIdsQuery = targetIdsQuery.map(row => row(link2.left.field))
      .coerceTo('array');

    const relatedRowsQuery = link2.right.table.query()
      .getAll(r.args(targetIdsQuery), { index: link2.right.field });

    return r.branch(
      row(link1.right.field),
      relatedRowsQuery,
      r.expr([]),
    );
  }

  function coerceType(query) {
    return query.coerceTo('array');
  }

  function create(onePk, otherPk) {
    let relation;
    if (_.isArray(otherPk)) {
      relation = otherPk.map(otherPk =>
        relationTable.create({
          [link1.left.field]: onePk,
          [link2.left.field]: otherPk,
        })
      );
    } else {
      relation = relationTable.create({
        [link1.left.field]: onePk,
        [link2.left.field]: otherPk,
      });
    }
    return relationTable.insert(relation, { conflict: 'replace' });
  }

  function queryRelation(onePk, otherPk) {
    let query = relationTable.query();

    if (index) {
      if (_.isArray(otherPk)) {
        query = query.getAll(r.args(otherPk.map(otherPk => [onePk, otherPk])), { index });
      } else {
        query = query.getAll([onePk, otherPk], { index });
      }
    } else {
      query = query.getAll(onePk, { index: link1.left.field });

      if (_.isArray(otherPk)) {
        query = query.filter(row => r.expr(otherPk).contains(row(link2.left.field)));
      } else {
        query = query.filter({ [link2.left.field]: otherPk });
      }
    }

    return query;
  }

  function remove(onePk, otherPk) {
    return queryRelation(onePk, otherPk).delete();
  }

  function has(onePk, otherPk) {
    return queryRelation(onePk, otherPk).count().gt(0);
  }

  return {
    query,
    coerceType,
    create,
    remove,
    has,
    link,
    targetTable: link2.right.table,
    type: 'belongsToMany',
  };
}
