/* eslint no-shadow: 0 */
import r from 'rethinkdb';
import assert from 'assert';
import Link from './Link';


export function hasOne(link) {
  assert.equal(link.constructor, Link);
  const { left, right } = link;

  function join(as, query, options = {}) {
    const { before = query => query } = options;
    return query.merge(function(row) {
      let joinQuery = before(left.table.query());
      joinQuery = r.branch(
        row(right.field),
        joinQuery.getAll(row(right.field), { index: left.field }),
        r.expr([]),
      );
      joinQuery = r.branch(joinQuery.count().gt(0), joinQuery.nth(0), null);
      return { [as]: joinQuery };
    });
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
    join,
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

  function join(as, query, options = {}) {
    const { before = query => query } = options;
    return query.merge(function(row) {
      let joinQuery = before(right.table.query());
      joinQuery = r.branch(
        row(left.field),
        joinQuery.getAll(row(left.field), { index: right.field }),
        r.expr([]),
      );
      joinQuery = r.branch(joinQuery.count().gt(0), joinQuery.nth(0), null);
      return { [as]: joinQuery };
    });
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
    join,
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

  function join(as, query, options = {}) {
    const { before = query => query } = options;
    return query.merge(function(row) {
      let joinQuery = before(left.table.query());
      joinQuery = r.branch(
        row(right.field),
        joinQuery.getAll(row(right.field), { index: left.field }),
        r.expr([]),
      );
      joinQuery = joinQuery.coerceTo('array');
      return { [as]: joinQuery };
    });
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
    join,
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

  function join(as, query, options = {}) {
    const { before = query => query } = options;
    return query.merge(function(row) {
      let joinQuery = before(link1.left.table.query());
      joinQuery = r.branch(
        row(link1.right.field),
        joinQuery.getAll(row(link1.right.field), { index: link1.left.field }).coerceTo('array'),
        r.expr([]),
      );
      joinQuery = joinQuery.concatMap(function(row) {
        return r.branch(
          row(link2.left.field),
          link2.right.table.query().getAll(row(link2.left.field), { index: link2.right.field }).coerceTo('array'),
          r.expr([]),
        );
      });
      return { [as]: joinQuery };
    });
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
    join,
    create,
    remove,
    link,
    targetTable: link2.right.table,
    type: 'belongsToMany',
  };
}
