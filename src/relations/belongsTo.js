/* eslint no-shadow: 0 */
import r from 'rethinkdb';
import _ from 'lodash';
import assert from 'assert';
import Link from '../Link';


export default function belongsTo(link) {
  assert.equal(link.constructor, Link);
  const { left, right } = link;

  function getIndex(rowOrPk) {
    let index;
    if (_.isFunction(rowOrPk)) {
      index = r.branch(
        rowOrPk.typeOf().eq('STRING'),
        rowOrPk,
        rowOrPk(left.field)
      );
    }
    else {
      const pk = rowOrPk;
      if (left.field === left.table.pk) {
        index = pk;
      } else {
        index = left.table.get(pk)(left.field);
      }
    }
    return index;
  }

  function query(index, options = {}) {
    const {
      apply = query => query,
    } = options;

    let query = right.table.query().getAll(index, { index: right.field });
    query = apply(query);
    return r.branch(
      index,
      query,
      r.expr([]),
    );
  }

  function coerceType(query) {
    return query.nth(0).default(null);
  }

  function create(onePk, otherPk) {
    const { left, right } = link;
    return right.table.get(otherPk).do((rightRow) =>
      left.table.update(onePk, { [left.field]: rightRow(right.field) })
    );
  }

  function remove(onePk, /* otherPk */) {
    const { left } = link;
    return left.table.update(onePk, { [left.field]: null });
  }

  function has(onePk, otherPk) {
    return right.table.get(otherPk).do(rightRow =>
      left.table.get(onePk).do(leftRow =>
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
    targetTable: right.table,
    type: 'belongsTo',
  };
}
