import assert from 'assert';
import Table from './Table';
import Link from './Link';


export const HAS_ONE = Symbol('hasOne');
export const BELONGS_TO = Symbol('belongsTo');
export const HAS_MANY = Symbol('hasMany');
export const BELONGS_TO_MANY = Symbol('belongsToMany');


export default class Model extends Table {
  static relations = {};
  static schema = () => ({
    ...Table.schema(),
  });

  static addRelation(as, relation) {
    assert.ok(as);
    assert.ok(relation);
    this.relations[as] = relation;
  }

  static hasOne(as, link) {
    assert.equal(link.constructor, Link);
    assert.equal(link.linkee.Table, this);
    this.addRelation(as, { link, type: HAS_ONE });
  }

  static belongsTo(as, link) {
    assert.equal(link.constructor, Link);
    assert.equal(link.linker.Table, this);
    this.addRelation(as, { link, type: BELONGS_TO });
  }

  static hasMany(as, link) {
    assert.equal(link.constructor, Link);
    assert.equal(link.linkee.Table, this);
    this.addRelation(as, { link, type: HAS_MANY });
  }

  static belongsToMany(as, link) {
    assert.equal(link.length, 2);
    assert.equal(link[0].constructor, Link);
    assert.equal(link[1].constructor, Link);
    assert.equal(link[0].linkee.Table, this);
    assert.equal(link[0].linker.Table, link[1].linker.Table);
    this.addRelation(as, { link, type: BELONGS_TO_MANY });
  }

  constructor(data = {}, isSynced = false) {
    super(data);
    this.isSynced = isSynced;
  }
}
