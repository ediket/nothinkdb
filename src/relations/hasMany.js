/* eslint no-shadow: 0 */
import r from 'rethinkdb';
import _ from 'lodash';
import assert from 'assert';
import Link from '../Link';


export default function hasMany(link) {
  assert.equal(link.constructor, Link);
  const { left, right } = link;

  function getIndex(rowOrPk) {
    let index;
    if (_.isFunction(rowOrPk)) {
      index = r.branch(
        rowOrPk.typeOf().eq('STRING'),
        rowOrPk,
        rowOrPk(right.field)
      );
    }
    else {
      const pk = rowOrPk;
      if (right.field === right.table.pk) {
        index = pk;
      } else {
        index = right.table.get(pk)(right.field);
      }
    }
    return index;
  }

  function query(index, options = {}) {
    const {
      apply = query => query,
    } = options;

    let query = left.table.query();
    query = query.getAll(index, { index: left.field });
    query = apply(query);

    return r.branch(
      index,
      query,
      r.expr([]),
    );
  }

  function coerceType(query) {
    return query.coerceTo('array');
  }

  function create(onePk, otherPk) {
    const { left, right } = link;
    return right.table.get(onePk).do((rightRow) =>
      left.table.update(otherPk, { [left.field]: rightRow(right.field) })
    );
  }

  function remove(onePk, otherPk) {
    const { left } = link;
    return left.table.update(otherPk, { [left.field]: null });
  }

  function has(onePk, otherPk) {
    return right.table.get(onePk).do(rightRow =>
      left.table.get(otherPk).do(leftRow =>
        leftRow.hasFields(left.field).and(
          leftRow(left.field).eq(rightRow(right.field))
        )
      )
    );
  }

  return {
    query,
    coerceType,
    create,
    remove,
    has,
    index: getIndex,
    link,
    targetTable: left.table,
    type: 'hasMany',
  };
}
