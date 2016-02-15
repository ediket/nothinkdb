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
      let joinQuery = before(left.Table.query());
      joinQuery = joinQuery.getAll(row(right.field), { index: left.field });
      joinQuery = r.branch(joinQuery.count().gt(0), joinQuery.nth(0), null);
      return { [as]: joinQuery };
    });
  }
  return { join, link, TargetTable: left.Table, type: 'hasOne' };
}

export function belongsTo(link) {
  assert.equal(link.constructor, Link);
  const { left, right } = link;

  function join(as, query, options = {}) {
    const { before = query => query } = options;
    return query.merge(function(row) {
      let joinQuery = before(right.Table.query());
      joinQuery = joinQuery.getAll(row(left.field), { index: right.field });
      joinQuery = r.branch(joinQuery.count().gt(0), joinQuery.nth(0), null);
      return { [as]: joinQuery };
    });
  }

  return { join, link, TargetTable: right.Table, type: 'belongsTo' };
}

export function hasMany(link) {
  assert.equal(link.constructor, Link);
  const { left, right } = link;

  function join(as, query, options = {}) {
    const { before = query => query } = options;
    return query.merge(function(row) {
      let joinQuery = before(left.Table.query());
      joinQuery = joinQuery.getAll(row(right.field), { index: left.field });
      joinQuery = joinQuery.coerceTo('array');
      return { [as]: joinQuery };
    });
  }
  function create(onePk, otherPk) {
    const { left, right } = link;
    return r.table(right.Table.table).get(onePk).do(function(rightRow) {
      return r.table(left.Table.table).get(otherPk).update({ [left.field]: rightRow(right.field) });
    });
  }
  function remove(onePk, leftPk) {
    const { left } = link;
    return r.table(left.Table.table).get(leftPk).update({ [left.field]: null });
  }

  return { join, create, remove, link, TargetTable: left.Table, type: 'hasMany' };
}

export function belongsToMany(link) {
  assert.equal(link.length, 2);
  assert.equal(link[0].constructor, Link);
  assert.equal(link[1].constructor, Link);
  assert.equal(link[0].left.Table, link[1].left.Table);
  const [link1, link2] = link;

  function join(as, query, options = {}) {
    const { before = query => query } = options;
    return query.merge(function(row) {
      let joinQuery = before(link1.left.Table.query());
      joinQuery = joinQuery.getAll(row(link1.right.field), { index: link1.left.field }).coerceTo('array');
      joinQuery = joinQuery.concatMap(function(row) {
        return link2.right.Table.query().getAll(row(link2.left.field), { index: link2.right.field }).coerceTo('array');
      });
      return { [as]: joinQuery };
    });
  }
  function create(onePk, otherPk) {
    const [link1, link2] = link;
    const Relation = link1.left.Table;
    const relation = Relation.create({
      [link1.left.field]: onePk,
      [link2.left.field]: otherPk,
    });
    return r.table(Relation.table).insert(relation, { conflict: 'replace' });
  }
  function remove(onePk, otherPk) {
    const [link1, link2] = link;
    const Relation = link1.left.Table;
    return r.table(Relation.table)
      .getAll(onePk, { index: link1.left.field })
      .filter({ [link2.left.field]: otherPk })
      // .getAll(otherPk, { index: link2.left.field })
      .delete();
  }
  return { join, create, remove, link, TargetTable: link2.right.Table, type: 'belongsToMany' };
}
