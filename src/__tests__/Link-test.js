import { expect } from 'chai';
import Joi from 'joi';
import Link from '../Link';
import Model from '../Model';


describe('Link', () => {
  describe('constructor', () => {
    class Foo extends Model {
      static table = 'foo';
      static schema = () => ({
        foo: Joi.string(),
        bar: Joi.string(),
      });
    }

    it('should create link', () => {
      const link = new Link({
        left: { Model: Foo, field: 'foo' },
        right: { Model: Foo, field: 'bar' },
      });
      expect(link.left).to.deep.equal({ Model: Foo, field: 'foo' });
      expect(link.right).to.deep.equal({ Model: Foo, field: 'bar' });
    });

    it('should throw Error when invalid data is given', () => {
      expect(() => new Link({})).to.throw(Error);
      expect(() => new Link({
        left: {},
        right: {},
      })).to.throw(Error);
      expect(() => new Link({
        left: { Model: {}, field: null },
        right: { Model: {}, field: null },
      })).to.throw(Error);
      expect(() => new Link({
        left: { Model: Foo, field: null },
        right: { Model: Foo, field: null },
      })).to.throw(Error);
      expect(() => new Link({
        left: { Model: Foo, field: 'noop' },
        right: { Model: Foo, field: 'noop' },
      })).to.throw(Error);
      expect(() => new Link({
        left: { Model: Foo, field: 'foo' },
        right: { Model: Foo, field: 'noop' },
      })).to.throw(Error);
    });
  });
});
