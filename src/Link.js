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

  constructor(options = {}) {
    const { left, right } = options;
    Link.assertLinkData(left);
    Link.assertLinkData(right);
    this.left = left;
    this.right = right;
  }
}
