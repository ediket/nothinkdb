import r from 'rethinkdb';
import assert from 'assert';


export default class Link {
  static validateLinkData(linkData) {
    return linkData &&
      linkData.Table &&
      linkData.field &&
      linkData.Table.hasField(linkData.field);
  }

  static assertLinkData(linkData) {
    assert.ok(this.validateLinkData(linkData));
  }

  async sync(connection) {
    await Promise.all([
      this.ensureIndex(connection, this.right),
      this.ensureIndex(connection, this.left),
    ]);
  }

  async ensureIndex(connection, { Table, field }) {
    if (Table.pk === field) return;
    await r.branch(
      Table.query().indexList().contains(field).not(),
      Table.query().indexCreate(field),
      null
    ).run(connection);
  }

  constructor(options = {}) {
    const { left, right } = options;
    Link.assertLinkData(left);
    Link.assertLinkData(right);
    this.left = left;
    this.right = right;
  }
}
