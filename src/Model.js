import _ from 'lodash';
import r from 'rethinkdb';
import assert from 'assert';
import Table from './Table';
import Link from './Link';


export const HAS_ONE = Symbol('hasOne');
export const BELONGS_TO = Symbol('belongsTo');
export const HAS_MANY = Symbol('hasMany');
export const BELONGS_TO_MANY = Symbol('belongsToMany');


export default class Model extends Table {
  static schema = () => ({
    ...Table.schema(),
  });
  static relations = () => ({});

  static hasOne(link) {
    assert.equal(link.constructor, Link);
    assert.equal(link.right.Table, this);
    return { link, type: HAS_ONE };
  }

  static belongsTo(link) {
    assert.equal(link.constructor, Link);
    assert.equal(link.left.Table, this);
    return { link, type: BELONGS_TO };
  }

  static hasMany(link) {
    assert.equal(link.constructor, Link);
    assert.equal(link.right.Table, this);
    return { link, type: HAS_MANY };
  }

  static belongsToMany(link) {
    assert.equal(link.length, 2);
    assert.equal(link[0].constructor, Link);
    assert.equal(link[1].constructor, Link);
    assert.equal(link[0].right.Table, this);
    assert.equal(link[0].left.Table, link[1].left.Table);
    return { link, type: BELONGS_TO_MANY };
  }

  static async sync(connection) {
    await super.sync(connection);
    await this.ensureForeignKeys(connection);
  }

  static async ensureForeignKeys(connection) {
    await Promise.all(
      _.map(this.relations(), relation => {
        const links = [].concat(relation.link);
        return Promise.all(links.map(link => link.sync(connection)));
      })
    );
  }

  queryRelation(as) {
    const { link, type } = this.constructor.relations()[as];
    if (type === HAS_ONE) {
      const { left, right } = link;
      if (this.data[right.field] === null) return null;

      const query = left.Table.query().getAll(this.data[right.field], { index: left.field });
      return r.branch(
        query.count().gt(0),
        query.nth(0),
        {}
      );
    }
    else if (type === BELONGS_TO) {
      const { left, right } = link;
      if (this.data[left.field] === null) return null;

      const query = right.Table.query().getAll(this.data[left.field], { index: right.field });
      return r.branch(
        query.count().gt(0),
        query.nth(0),
        {}
      );
    }
    else if (type === HAS_MANY) {
      const { left, right } = link;
      if (this.data[left.field] === null) return r.expr([]);

      const query = left.Table.query()
        .getAll(this.data[right.field], { index: left.field });
      return query.coerceTo('array');
    }
    else if (type === BELONGS_TO_MANY) {
      if (this.data[link[0].left.field] === null) return r.expr([]);

      const query = link[0].left.Table.query()
        .getAll(this.data[link[0].right.field], { index: link[0].left.field }).coerceTo('array')
        .concatMap(function(row) {
          return link[1].right.Table.query()
            .getAll(row(link[1].left.field), { index: link[1].right.field }).coerceTo('array');
        });
      return query;
    }
    return null;
  }

  constructor(data = {}, isSynced = false) {
    super(data);
    this.isSynced = isSynced;
  }
}
