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
    query = r.branch(
      row(right.field),
      query.getAll(row(right.field), { index: left.field }),
      r.expr([]),
    );
    query = apply(query);
    return query;
  }

  function coerceType(query) {
    return r.branch(query.count().gt(0), query.nth(0), null);
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

  return {
    query,
    coerceType,
    create,
    remove,
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
    query = r.branch(
      row(left.field),
      query.getAll(row(left.field), { index: right.field }),
      r.expr([]),
    );
    query = apply(query);
    return query;
  }

  function coerceType(query) {
    return r.branch(query.count().gt(0), query.nth(0), null);
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

  return {
    query,
    coerceType,
    create,
    remove,
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
    query = r.branch(
      row(right.field),
      query.getAll(row(right.field), { index: left.field }),
      r.expr([]),
    );
    query = apply(query);
    return query;
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

  return {
    query,
    coerceType,
    create,
    remove,
    link,
    targetTable: left.table,
    type: 'hasMany',
  };
}

export function belongsToMany(link) {
  assert.equal(link.length, 2);
  assert.equal(link[0].constructor, Link);
  assert.equal(link[1].constructor, Link);
  assert.equal(link[0].left.table, link[1].left.table, 'link table must be same.');
  const [link1, link2] = link;

  function query(row, options = {}) {
    const {
      apply = query => query,
    } = parseOptions(options);

    let targetIdsQuery = link1.left.table.query();
    targetIdsQuery = r.branch(
      row(link1.right.field),
      targetIdsQuery.getAll(row(link1.right.field), { index: link1.left.field }),
      r.expr([]),
    );
    targetIdsQuery = targetIdsQuery.hasFields(link2.left.field);
    targetIdsQuery = apply(targetIdsQuery);
    targetIdsQuery = targetIdsQuery.map(function(row) { return row(link2.left.field); });
    targetIdsQuery = targetIdsQuery.coerceTo('array');

    const query = r.branch(
      targetIdsQuery.count().gt(0),
      link2.right.table.query().getAll(r.args(targetIdsQuery), { index: link2.right.field }),
      r.expr([]),
    );
    return query;
  }

  function coerceType(query) {
    return query.coerceTo('array');
  }

  function create(onePk, otherPk) {
    const [link1, link2] = link;
    const relationTable = link1.left.table;
    const relation = relationTable.create({
      [link1.left.field]: onePk,
      [link2.left.field]: otherPk,
    });
    return relationTable.insert(relation, { conflict: 'replace' });
  }

  function remove(onePk, otherPk) {
    const [link1, link2] = link;
    const relationTable = link1.left.table;
    return relationTable.query()
      .getAll(onePk, { index: link1.left.field })
      .filter({ [link2.left.field]: otherPk })
      // .getAll(otherPk, { index: link2.left.field })
      .delete();
  }

  return {
    query,
    coerceType,
    create,
    remove,
    link,
    targetTable: link2.right.table,
    type: 'belongsToMany',
  };
}
