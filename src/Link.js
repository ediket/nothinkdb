import assert from 'assert';


export default class Link {
  static validateLinkData(linkData) {
    return linkData &&
      linkData.Table &&
      linkData.key &&
      linkData.Table.hasColumn(linkData.key);
  }

  static assertLinkData(linkData) {
    assert.ok(this.validateLinkData(linkData));
  }

  constructor(options = {}) {
    const { linker, linkee } = options;
    Link.assertLinkData(linker);
    Link.assertLinkData(linkee);
    this.linker = linker;
    this.linkee = linkee;
  }
}
