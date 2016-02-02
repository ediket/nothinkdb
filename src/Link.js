import assert from 'assert';


export default class Link {
  static validateLinkData(linkData) {
    return !!(linkData && linkData.Table && linkData.key);
  }

  static assertLinkData(linkData) {
    assert.ok(this.validateLinkData(linkData));
  }

  constructor(options = {}) {
    const { linker, linkee } = options;
    Link.assertLinkData(linker);
    Link.assertLinkData(linkee);
    linker.Table.assertColumn(linker.key);
    linkee.Table.assertColumn(linkee.key);
  }
}
