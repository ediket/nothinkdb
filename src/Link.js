import assert from 'assert';


export default class Link {
  static validateLinkData(linkData) {
    return linkData &&
      linkData.table &&
      linkData.field &&
      linkData.table.hasField(linkData.field);
  }

  static assertLinkData(linkData) {
    assert.ok(this.validateLinkData(linkData), 'invalid link data');
  }

  async sync(connection) {
    await this.syncTable(connection, this.right);
    await this.syncTable(connection, this.left);
  }

  async syncTable(connection, { table, field }) {
    await table.ensureTable(connection);
    await table.ensureIndex(connection, field);
  }

  constructor(options = {}) {
    const { left, right } = options;
    Link.assertLinkData(left);
    Link.assertLinkData(right);
    this.left = left;
    this.right = right;
  }
}
