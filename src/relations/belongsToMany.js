/* eslint no-shadow: 0 */
import r from 'rethinkdb';
import _ from 'lodash';
import assert from 'assert';
import Link from '../Link';


export default function belongsToMany(link, options = {}) {
  assert.equal(link.length, 2);
  const [link1, link2] = link;
  assert.equal(link1.constructor, Link);
  assert.equal(link2.constructor, Link);
  assert.equal(link1.left.table, link2.left.table, 'link table must be same.');
  const { index } = options;
  const relationTable = link[0].left.table;

  function getIndex(rowOrPk) {
    let index;
    if (_.isFunction(rowOrPk)) {
      index = r.branch(
        rowOrPk.typeOf().eq('STRING'),
        rowOrPk,
        rowOrPk(link1.right.field)
      );
    }
    else {
      const pk = rowOrPk;
      if (link1.right.field === link1.right.table.pk) {
        index = pk;
      } else {
        index = link1.right.table.get(pk)(link1.right.field);
      }
    }
    return index;
  }

  function query(index, options = {}) {
    const {
      apply = query => query,
    } = options;

    let targetIdsQuery = relationTable.query()
      .getAll(index, { index: link1.left.field })
      .hasFields(link2.left.field);

    // filter, orderBy, etc...
    targetIdsQuery = apply(targetIdsQuery);
    targetIdsQuery = targetIdsQuery.map(row => row(link2.left.field))
      .coerceTo('array');

    const relatedRowsQuery = targetIdsQuery.do(targetIds =>
      r.branch(
        targetIds.count().gt(0),
        link2.right.table.query()
          .getAll(r.args(targetIds), { index: link2.right.field }),
        r.expr([])
      )
    );

    return r.branch(
      index,
      relatedRowsQuery,
      r.expr([]),
    );
  }

  function coerceType(query) {
    return query.coerceTo('array');
  }

  function create(onePk, otherPk) {
    if (_.isArray(otherPk)) {
      return r.expr(
        otherPk.map(otherPk => create(onePk, otherPk))
      );
    }

    return r.branch(
      queryRelation(onePk, otherPk).count().gt(0).not(),
      relationTable.insert(
        relationTable.create({
          [link1.left.field]: onePk,
          [link2.left.field]: otherPk,
        }),
      ),
      r.expr({
        deleted: 0,
        errors: 0,
        inserted: 0,
        replaced: 0,
        skipped: 0,
        unchanged: 0,
      })
    );
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
    index: getIndex,
    link,
    targetTable: link2.right.table,
    type: 'belongsToMany',
  };
}
