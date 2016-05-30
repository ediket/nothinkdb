import { expect } from 'chai';
import Joi from 'joi';
import Table from '../src/Table';
import Link from '../src/Link';


describe('Link', () => {
  describe('constructor', () => {
    const fooTable = new Table({
      tableName: 'foo',
      schema: () => ({
        foo: Joi.string(),
        bar: Joi.string(),
      }),
    });

    it('should create link', () => {
      const link = new Link({
        left: { table: fooTable, field: 'foo' },
        right: { table: fooTable, field: 'bar' },
      });
      expect(link.left).to.deep.equal({ table: fooTable, field: 'foo' });
      expect(link.right).to.deep.equal({ table: fooTable, field: 'bar' });
    });

    it('should throw Error when invalid data is given', () => {
      expect(() => new Link({})).to.throw(Error);
      expect(() => new Link({
        left: {},
        right: {},
      })).to.throw(Error);
      expect(() => new Link({
        left: { table: {}, field: null },
        right: { table: {}, field: null },
      })).to.throw(Error);
      expect(() => new Link({
        left: { table: fooTable, field: null },
        right: { table: fooTable, field: null },
      })).to.throw(Error);
      expect(() => new Link({
        left: { table: fooTable, field: 'noop' },
        right: { table: fooTable, field: 'noop' },
      })).to.throw(Error);
      expect(() => new Link({
        left: { table: fooTable, field: 'foo' },
        right: { table: fooTable, field: 'noop' },
      })).to.throw(Error);
    });
  });
});
