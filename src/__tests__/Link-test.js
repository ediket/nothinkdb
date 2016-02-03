import { expect } from 'chai';
import Joi from 'joi';
import Link from '../Link';
import Table from '../Table';


describe('Link', () => {
  describe('constructor', () => {
    class Foo extends Table {
      static table = 'foo';
      static schema = () => ({
        foo: Joi.string(),
        bar: Joi.string(),
      });
    }

    it('should create link', () => {
      const link = new Link({
        linker: { Table: Foo, key: 'foo' },
        linkee: { Table: Foo, key: 'bar' },
      });
      expect(link.linker).to.deep.equal({ Table: Foo, key: 'foo' });
      expect(link.linkee).to.deep.equal({ Table: Foo, key: 'bar' });
    });

    it('should throw Error when invalid data is given', () => {
      expect(() => new Link({})).to.throw(Error);
      expect(() => new Link({
        linker: {},
        linkee: {},
      })).to.throw(Error);
      expect(() => new Link({
        linker: { Table: {}, key: null },
        linkee: { Table: {}, key: null },
      })).to.throw(Error);
      expect(() => new Link({
        linker: { Table: Foo, key: null },
        linkee: { Table: Foo, key: null },
      })).to.throw(Error);
      expect(() => new Link({
        linker: { Table: Foo, key: 'noop' },
        linkee: { Table: Foo, key: 'noop' },
      })).to.throw(Error);
      expect(() => new Link({
        linker: { Table: Foo, key: 'foo' },
        linkee: { Table: Foo, key: 'noop' },
      })).to.throw(Error);
    });
  });
});
