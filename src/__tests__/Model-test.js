import r from 'rethinkdb';
import Joi from 'joi';
import uuid from 'node-uuid';
import { expect } from 'chai';
import Model from '../Model';
import Link from '../Link';
import { hasOne, belongsTo, hasMany, belongsToMany } from '../relations';


describe('Model', () => {
  let connection;
  before(async () => {
    connection = await r.connect({});
  });

  beforeEach(async () => {
    await r.branch(r.tableList().contains('foo').not(), r.tableCreate('foo'), null).run(connection);
    await r.branch(r.tableList().contains('bar').not(), r.tableCreate('bar'), null).run(connection);
    await r.branch(r.tableList().contains('foobar').not(), r.tableCreate('foobar'), null).run(connection);
  });

  after(async () => {
    await connection.close();
  });

  describe('constructor', () => {
    it('should throw Error if \'table\' is not overrided', () => {
      expect(() => new Model()).to.throw(Error);
    });

    it('should not throw Error if \'table\' is overrided', () => {
      class Foo extends Model {
        static table = 'foo';
      }
      expect(() => new Foo()).to.not.throw(Error);
    });
  });

  describe('static', () => {
    describe('schema', () => {
      it('has default property', () => {
        class Base extends Model {
          static table = 'base';
          static schema = () => ({
            ...Model.schema(),
            name: Joi.string().default('hello'),
          });
        }
        expect(Base.schema()).to.have.property('id');
        expect(Base.schema()).to.have.property('createdAt');
        expect(Base.schema()).to.have.property('updatedAt');
        expect(Base.schema()).to.have.property('name');
      });

      it('could be extended', () => {
        class Base extends Model {
          static table = 'base';
          static schema = () => ({
            ...Model.schema(),
            name: Joi.string().default('hello'),
          });
        }
        expect(Base.schema()).to.have.property('id');
        expect(Base.schema()).to.have.property('createdAt');
        expect(Base.schema()).to.have.property('updatedAt');
        expect(Base.schema()).to.have.property('name');
      });
    });

    describe('validate', () => {
      class Foo extends Model {
        static table = 'foo';
        static schema = () => ({
          name: Joi.string().required(),
        });
      }

      it('should return true when data is valid', () => {
        expect(Foo.validate({ name: 'foo' })).to.be.true;
      });

      it('should throw error when invalid', () => {
        expect(Foo.validate({})).to.be.false;
      });
    });

    describe('attempt', () => {
      class Foo extends Model {
        static table = 'foo';
        static schema = () => ({
          foo: Joi.string().default('foo'),
          bar: Joi.string().required(),
        });
      }

      it('should update default properties', () => {
        const result = Foo.attempt({ bar: 'bar' });
        expect(result).to.have.property('foo', 'foo');
        expect(result).to.have.property('bar', 'bar');
      });

      it('should throw error when invalid', () => {
        expect(() => Foo.attempt({})).to.throw(Error);
      });
    });

    describe('hasField', () => {
      it('should return true when specified fieldName is given', () => {
        class Foo extends Model {
          static table = 'foo';
          static schema = () => ({
            name: Joi.string(),
          });
        }
        expect(Foo.hasField('name')).to.be.true;
      });

      it('should return false when unspecified fieldName is given', () => {
        class Foo extends Model {
          static table = 'foo';
          static schema = () => ({});
        }
        expect(Foo.hasField('name')).to.be.false;
      });
    });

    describe('assertField', () => {
      it('should not throw error when specified fieldName is given', () => {
        class Foo extends Model {
          static table = 'foo';
          static schema = () => ({
            name: Joi.string(),
          });
        }
        expect(() => Foo.assertField('name')).to.not.throw(Error);
      });

      it('should throw error when unspecified fieldName is given', () => {
        class Foo extends Model {
          static table = 'foo';
          static schema = () => ({});
        }
        expect(() => Foo.assertField('name')).to.throw(Error);
      });
    });

    describe('getField', () => {
      it('should return field schema when specified fieldName is given', () => {
        class Foo extends Model {
          static table = 'foo';
          static schema = () => ({
            name: Joi.string(),
          });
        }

        const field = Foo.getField('name');
        expect(field).to.be.ok;
        expect(() => Joi.assert('string', field)).to.not.throw(Error);
      });

      it('should throw error when unspecified fieldName is given', () => {
        class Foo extends Model {
          static table = 'foo';
          static schema = () => ({});
        }
        expect(() => Foo.getField('name')).to.throw(Error);
      });
    });

    describe('getForeignKey', () => {
      it('should return primary key schema when any argument is not given', () => {
        class Foo extends Model {
          static table = 'foo';
          static pk = 'name';
          static schema = () => ({
            name: Joi.string().default(() => uuid.v4(), 'pk'),
          });
        }

        const field = Foo.getForeignKey();
        expect(field).to.be.ok;
        expect(() => Joi.assert('string', field)).to.not.throw(Error);
      });

      it('should return field schema when options.fieldName is given', () => {
        class Foo extends Model {
          static table = 'foo';
          static schema = () => ({
            name: Joi.string().default(() => uuid.v4(), 'pk'),
          });
        }

        const field = Foo.getForeignKey({ fieldName: 'name' });
        expect(field).to.be.ok;
        expect(() => Joi.assert('string', field)).to.not.throw(Error);
      });

      it('should return default(null) schema when options.isManyToMany is not given', () => {
        class Foo extends Model {
          static table = 'foo';
          static schema = () => ({
            ...Model.schema(),
          });
        }

        const field = Foo.getForeignKey();
        expect(Joi.attempt(undefined, field)).to.be.null;
      });

      it('should return required() field schema when options.isManyToMany is given', () => {
        class Foo extends Model {
          static table = 'foo';
          static schema = () => ({
            ...Model.schema(),
          });
        }

        const field = Foo.getForeignKey({ isManyToMany: true });
        expect(field).to.be.ok;
        expect(() => Joi.assert(undefined, field)).to.throw(Error);
      });
    });

    describe('linkTo', () => {
      it('should return link', () => {
        class Foo extends Model {
          static table = 'foo';
          static schema = () => ({
            ...Model.schema(),
            barId: Bar.getForeignKey(),
          });
        }
        class Bar extends Model {
          static table = 'bar';
          static schema = () => ({
            ...Model.schema(),
          });
        }
        const foo2bar = Foo.linkTo(Bar, 'barId');
        expect(foo2bar).to.be.ok;
        expect(foo2bar.constructor).to.equal(Link);
        expect(foo2bar.left).to.deep.equal({
          Model: Foo, field: 'barId',
        });
        expect(foo2bar.right).to.deep.equal({
          Model: Bar, field: 'id',
        });
      });
    });

    describe('linkedBy', () => {
      it('should return reverse link', () => {
        class Foo extends Model {
          static table = 'foo';
          static schema = () => ({
            ...Model.schema(),
          });
        }
        class Bar extends Model {
          static table = 'bar';
          static schema = () => ({
            ...Model.schema(),
            fooId: Foo.getForeignKey(),
          });
        }
        const foo2bar = Foo.linkedBy(Bar, 'fooId');
        expect(foo2bar).to.be.ok;
        expect(foo2bar.constructor).to.equal(Link);
        expect(foo2bar.left).to.deep.equal({
          Model: Bar, field: 'fooId',
        });
        expect(foo2bar.right).to.deep.equal({
          Model: Foo, field: 'id',
        });
      });
    });
  });

  describe('join', () => {
    it('should query hasOne relation', async () => {
      class Foo extends Model {
        static table = 'foo';
        static schema = () => ({
          ...Model.schema(),
        });
        static relations = () => ({
          bar: hasOne(Foo.linkedBy(Bar, 'fooId')),
        });
      }
      class Bar extends Model {
        static table = 'bar';
        static schema = () => ({
          ...Model.schema(),
          fooId: Foo.getForeignKey(),
        });
      }
      await Foo.sync(connection);
      await Bar.sync(connection);

      const foo = new Foo({});
      const bar = new Bar({
        fooId: foo.getPk(),
      });

      await Foo.query().insert(foo.data).run(connection);
      await Bar.query().insert(bar.data).run(connection);

      const fetchedBar = await foo.join('bar').run(connection);
      expect(bar.data).to.deep.equal(fetchedBar);
    });

    it('should query belongsTo relation', async () => {
      class Foo extends Model {
        static table = 'foo';
        static schema = () => ({
          ...Model.schema(),
          barId: Bar.getForeignKey(),
        });
        static relations = () => ({
          bar: belongsTo(Foo.linkTo(Bar, 'barId')),
        });
      }
      class Bar extends Model {
        static table = 'bar';
        static schema = () => ({
          ...Model.schema(),
        });
      }
      await Foo.sync(connection);
      await Bar.sync(connection);

      const bar = new Bar({});
      const foo = new Foo({
        barId: bar.getPk(),
      });

      await Foo.query().insert(foo.data).run(connection);
      await Bar.query().insert(bar.data).run(connection);

      const fetchedBar = await foo.join('bar').run(connection);
      expect(bar.data).to.deep.equal(fetchedBar);
    });

    it('should query hasMany relation', async () => {
      class Foo extends Model {
        static table = 'foo';
        static schema = () => ({
          ...Model.schema(),
        });
        static relations = () => ({
          bars: hasMany(Foo.linkedBy(Bar, 'fooId')),
        });
      }
      class Bar extends Model {
        static table = 'bar';
        static schema = () => ({
          ...Model.schema(),
          fooId: Foo.getForeignKey(),
        });
      }
      await Foo.sync(connection);
      await Bar.sync(connection);

      const foo = new Foo({});
      const bar = new Bar({
        fooId: foo.getPk(),
      });

      await Foo.query().insert(foo.data).run(connection);
      await Bar.query().insert(bar.data).run(connection);

      const fetchedBars = await foo.join('bars').run(connection);
      expect(fetchedBars).to.have.length(1);
      expect(bar.data).to.deep.equal(fetchedBars[0]);
    });

    it('should query belongsToMany relation', async () => {
      class Foo extends Model {
        static table = 'foo';
        static schema = () => ({
          ...Model.schema(),
        });
        static relations = () => ({
          bars: belongsToMany([Foo.linkedBy(FooBar, 'fooId'), FooBar.linkTo(Bar, 'barId')]),
        });
      }
      class Bar extends Model {
        static table = 'bar';
        static schema = () => ({
          ...Model.schema(),
        });
        static relations = () => ({
          foos: belongsToMany([Bar.linkedBy(FooBar, 'barId'), FooBar.linkTo(Foo, 'fooId')]),
        });
      }
      class FooBar extends Model {
        static table = 'foobar';
        static schema = () => ({
          ...Model.schema(),
          fooId: Foo.getForeignKey({ isManyToMany: true }),
          barId: Bar.getForeignKey({ isManyToMany: true }),
        });
      }
      await Foo.sync(connection);
      await Bar.sync(connection);
      await FooBar.sync(connection);

      const foo = new Foo({});
      const bar = new Bar({});
      const foobar = new FooBar({
        fooId: foo.getPk(),
        barId: bar.getPk(),
      });

      await Foo.query().insert(foo.data).run(connection);
      await Bar.query().insert(bar.data).run(connection);
      await FooBar.query().insert(foobar.data).run(connection);

      const fetchedBars = await foo.join('bars').run(connection);
      expect(fetchedBars).to.have.length(1);
      expect(bar.data).to.deep.equal(fetchedBars[0]);
      const fetchedFoos = await bar.join('foos').run(connection);
      expect(fetchedFoos).to.have.length(1);
      expect(foo.data).to.deep.equal(fetchedFoos[0]);
    });
  });

  describe('addToRelation', () => {
    it('should add hasMany relation', async () => {
      class Foo extends Model {
        static table = 'foo';
        static schema = () => ({
          ...Model.schema(),
        });
        static relations = () => ({
          bars: hasMany(Foo.linkedBy(Bar, 'fooId')),
        });
      }
      class Bar extends Model {
        static table = 'bar';
        static schema = () => ({
          ...Model.schema(),
          fooId: Foo.getForeignKey(),
        });
      }
      await Foo.sync(connection);
      await Bar.sync(connection);

      const foo = new Foo({});
      const bar = new Bar({});
      await Foo.query().insert(foo.data).run(connection);
      await Bar.query().insert(bar.data).run(connection);
      await foo.addToRelation('bars', bar.getPk()).run(connection);

      const foos = await foo.join('bars').run(connection);
      expect(foos).to.have.length(1);
      expect(foos[0]).to.have.property('fooId', foo.getPk());
    });

    it('should remove belongsToMany relation', async () => {
      class Foo extends Model {
        static table = 'foo';
        static schema = () => ({
          ...Model.schema(),
        });
        static relations = () => ({
          bars: belongsToMany([Foo.linkedBy(FooBar, 'fooId'), FooBar.linkTo(Bar, 'barId')]),
        });
      }
      class Bar extends Model {
        static table = 'bar';
        static schema = () => ({
          ...Model.schema(),
        });
        static relations = () => ({
          foos: belongsToMany([Bar.linkedBy(FooBar, 'barId'), FooBar.linkTo(Foo, 'fooId')]),
        });
      }
      class FooBar extends Model {
        static table = 'foobar';
        static schema = () => ({
          ...Model.schema(),
          fooId: Foo.getForeignKey({ isManyToMany: true }),
          barId: Bar.getForeignKey({ isManyToMany: true }),
        });
      }
      await Foo.sync(connection);
      await Bar.sync(connection);
      await FooBar.sync(connection);

      const foo = new Foo({});
      const bar = new Bar({});
      await Foo.query().insert(foo.data).run(connection);
      await Bar.query().insert(bar.data).run(connection);
      await foo.addToRelation('bars', bar.getPk()).run(connection);

      const bars = await foo.join('bars').run(connection);
      expect(bar.data).to.deep.equal(bars[0]);
      const foos = await bar.join('foos').run(connection);
      expect(foo.data).to.deep.equal(foos[0]);
    });
  });

  describe('removeFromRelation', () => {
    it('should remove hasMany relation', async () => {
      class Foo extends Model {
        static table = 'foo';
        static schema = () => ({
          ...Model.schema(),
        });
        static relations = () => ({
          bars: hasMany(Foo.linkedBy(Bar, 'fooId')),
        });
      }
      class Bar extends Model {
        static table = 'bar';
        static schema = () => ({
          ...Model.schema(),
          fooId: Foo.getForeignKey(),
        });
      }
      await Foo.sync(connection);
      await Bar.sync(connection);

      const foo = new Foo({});
      const bar = new Bar({
        fooId: foo.getPk(),
      });
      await Foo.query().insert(foo.data).run(connection);
      await Bar.query().insert(bar.data).run(connection);
      await foo.removeFromRelation('bars', bar.getPk()).run(connection);

      const bars = await foo.join('bars').run(connection);
      expect(bars).to.have.length(0);
    });

    it('should remove belongsToMany relation', async () => {
      class Foo extends Model {
        static table = 'foo';
        static schema = () => ({
          ...Model.schema(),
        });
        static relations = () => ({
          bars: belongsToMany([Foo.linkedBy(FooBar, 'fooId'), FooBar.linkTo(Bar, 'barId')]),
        });
      }
      class Bar extends Model {
        static table = 'bar';
        static schema = () => ({
          ...Model.schema(),
        });
        static relations = () => ({
          foos: belongsToMany([Bar.linkedBy(FooBar, 'barId'), FooBar.linkTo(Foo, 'fooId')]),
        });
      }
      class FooBar extends Model {
        static table = 'foobar';
        static schema = () => ({
          ...Model.schema(),
          fooId: Foo.getForeignKey({ isManyToMany: true }),
          barId: Bar.getForeignKey({ isManyToMany: true }),
        });
      }
      await Foo.sync(connection);
      await Bar.sync(connection);
      await FooBar.sync(connection);

      const foo = new Foo({});
      const bar = new Bar({});
      const foobar = new FooBar({
        fooId: foo.getPk(),
        barId: bar.getPk(),
      });
      await Foo.query().insert(foo.data).run(connection);
      await Bar.query().insert(bar.data).run(connection);
      await FooBar.query().insert(foobar.data).run(connection);
      await foo.removeFromRelation('bars', bar.getPk()).run(connection);

      const bars = await foo.join('bars').run(connection);
      expect(bars).to.have.length(0);
      const foos = await bar.join('foos').run(connection);
      expect(foos).to.have.length(0);
    });
  });
});
