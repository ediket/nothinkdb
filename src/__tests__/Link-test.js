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
        left: { Table: Foo, field: 'foo' },
        right: { Table: Foo, field: 'bar' },
      });
      expect(link.left).to.deep.equal({ Table: Foo, field: 'foo' });
      expect(link.right).to.deep.equal({ Table: Foo, field: 'bar' });
    });

    it('should throw Error when invalid data is given', () => {
      expect(() => new Link({})).to.throw(Error);
      expect(() => new Link({
        left: {},
        right: {},
      })).to.throw(Error);
      expect(() => new Link({
        left: { Table: {}, field: null },
        right: { Table: {}, field: null },
      })).to.throw(Error);
      expect(() => new Link({
        left: { Table: Foo, field: null },
        right: { Table: Foo, field: null },
      })).to.throw(Error);
      expect(() => new Link({
        left: { Table: Foo, field: 'noop' },
        right: { Table: Foo, field: 'noop' },
      })).to.throw(Error);
      expect(() => new Link({
        left: { Table: Foo, field: 'foo' },
        right: { Table: Foo, field: 'noop' },
      })).to.throw(Error);
    });
  });
});
