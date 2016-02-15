import r from 'rethinkdb';
import Joi from 'joi';
import uuid from 'node-uuid';
import { expect } from 'chai';
import Table from '../Table';
import Link from '../Link';
import { hasOne, belongsTo, hasMany, belongsToMany } from '../relations';


describe('Table', () => {
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
    });
  });

  describe('static', () => {
    describe('schema', () => {
      it('has default property', () => {
        class Base extends Table {
          static table = 'base';
          static schema = () => ({
            ...Table.schema(),
            name: Joi.string().default('hello'),
          });
        }
        expect(Base.schema()).to.have.property('id');
        expect(Base.schema()).to.have.property('createdAt');
        expect(Base.schema()).to.have.property('updatedAt');
        expect(Base.schema()).to.have.property('name');
      });

      it('could be extended', () => {
        class Base extends Table {
          static table = 'base';
          static schema = () => ({
            ...Table.schema(),
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
      class Foo extends Table {
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
      class Foo extends Table {
        static table = 'foo';
        static schema = () => ({
          foo: Joi.string().default('foo'),
          bar: Joi.string().required(),
        });
      }

      it('should return with default properties', () => {
        const result = Foo.attempt({ bar: 'bar' });
        expect(result).to.have.property('foo', 'foo');
        expect(result).to.have.property('bar', 'bar');
      });

      it('should throw error when invalid', () => {
        expect(() => Foo.attempt({})).to.throw(Error);
      });
    });

    describe('create', () => {
      class Foo extends Table {
        static table = 'foo';
        static schema = () => ({
          foo: Joi.string().default('foo'),
          bar: Joi.string().required(),
        });
      }

      it('should return with default properties', () => {
        const result = Foo.create({ bar: 'bar' });
        expect(result).to.have.property('foo', 'foo');
        expect(result).to.have.property('bar', 'bar');
      });

      it('should throw error when invalid', () => {
        expect(() => Foo.create({})).to.throw(Error);
      });
    });

    describe('hasField', () => {
      it('should return true when specified fieldName is given', () => {
        class Foo extends Table {
          static table = 'foo';
          static schema = () => ({
            name: Joi.string(),
          });
        }
        expect(Foo.hasField('name')).to.be.true;
      });

      it('should return false when unspecified fieldName is given', () => {
        class Foo extends Table {
          static table = 'foo';
          static schema = () => ({});
        }
        expect(Foo.hasField('name')).to.be.false;
      });
    });

    describe('assertField', () => {
      it('should not throw error when specified fieldName is given', () => {
        class Foo extends Table {
          static table = 'foo';
          static schema = () => ({
            name: Joi.string(),
          });
        }
        expect(() => Foo.assertField('name')).to.not.throw(Error);
      });

      it('should throw error when unspecified fieldName is given', () => {
        class Foo extends Table {
          static table = 'foo';
          static schema = () => ({});
        }
        expect(() => Foo.assertField('name')).to.throw(Error);
      });
    });

    describe('getField', () => {
      it('should return field schema when specified fieldName is given', () => {
        class Foo extends Table {
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
        class Foo extends Table {
          static table = 'foo';
          static schema = () => ({});
        }
        expect(() => Foo.getField('name')).to.throw(Error);
      });
    });

    describe('getForeignKey', () => {
      it('should return primary key schema when any argument is not given', () => {
        class Foo extends Table {
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
        class Foo extends Table {
          static table = 'foo';
          static schema = () => ({
            name: Joi.string().default(() => uuid.v4(), 'pk'),
          });
        }

        const field = Foo.getForeignKey({ fieldName: 'name' });
        expect(field).to.be.ok;
        expect(() => Joi.assert('string', field)).to.not.throw(Error);
      });

      it('should return and default(null) schema when options.isManyToMany is not given', () => {
        class Foo extends Table {
          static table = 'foo';
          static schema = () => ({
            ...Table.schema(),
          });
        }

        const field = Foo.getForeignKey();
        expect(field).to.be.ok;
        expect(Joi.attempt(undefined, field)).to.be.null;
      });

      it('should return required() field schema when options.isManyToMany is given', () => {
        class Foo extends Table {
          static table = 'foo';
          static schema = () => ({
            ...Table.schema(),
          });
        }

        const field = Foo.getForeignKey({ isManyToMany: true });
        expect(field).to.be.ok;
        expect(() => Joi.assert(undefined, field)).to.throw(Error);
      });
    });

    describe('linkTo', () => {
      it('should return link', () => {
        class Foo extends Table {
          static table = 'foo';
          static schema = () => ({
            ...Table.schema(),
            barId: Bar.getForeignKey(),
          });
        }
        class Bar extends Table {
          static table = 'bar';
          static schema = () => ({
            ...Table.schema(),
          });
        }
        const foo2bar = Foo.linkTo(Bar, 'barId');
        expect(foo2bar).to.be.ok;
        expect(foo2bar.constructor).to.equal(Link);
        expect(foo2bar.left).to.deep.equal({
          Table: Foo, field: 'barId',
        });
        expect(foo2bar.right).to.deep.equal({
          Table: Bar, field: 'id',
        });
      });
    });

    describe('linkedBy', () => {
      it('should return reverse link', () => {
        class Foo extends Table {
          static table = 'foo';
          static schema = () => ({
            ...Table.schema(),
          });
        }
        class Bar extends Table {
          static table = 'bar';
          static schema = () => ({
            ...Table.schema(),
            fooId: Foo.getForeignKey(),
          });
        }
        const foo2bar = Foo.linkedBy(Bar, 'fooId');
        expect(foo2bar).to.be.ok;
        expect(foo2bar.constructor).to.equal(Link);
        expect(foo2bar.left).to.deep.equal({
          Table: Bar, field: 'fooId',
        });
        expect(foo2bar.right).to.deep.equal({
          Table: Foo, field: 'id',
        });
      });
    });

    describe('query', () => {
      it('should return table query', async () => {
        class Foo extends Table {
          static table = 'foo';
          static schema = () => ({
            ...Table.schema(),
          });
        }
        const config = await Foo.query().config().run(connection);
        expect(config).to.have.property('name', 'foo');
      });
    });

    describe('insert', () => {
      it('should insert data into database', async () => {
        class Foo extends Table {
          static table = 'foo';
          static schema = () => ({
            ...Table.schema(),
            name: Joi.string().required(),
          });
        }
        const foo = Foo.attempt({ name: 'foo' });
        await Foo.insert(foo).run(connection);
        const fetchedFoo = await Foo.query().get(foo.id).run(connection);
        expect(foo).to.deep.equal(fetchedFoo);
      });
    });

    describe('get', () => {
      it('should get data from database', async () => {
        class Foo extends Table {
          static table = 'foo';
          static schema = () => ({
            ...Table.schema(),
            name: Joi.string().required(),
          });
        }
        const foo = Foo.attempt({ name: 'foo' });
        await Foo.insert(foo).run(connection);
        const fetchedFoo = await Foo.get(foo.id).run(connection);
        expect(foo).to.deep.equal(fetchedFoo);
      });
    });

    describe('update', () => {
      it('should update data into database', async () => {
        class Foo extends Table {
          static table = 'foo';
          static schema = () => ({
            ...Table.schema(),
            name: Joi.string().required(),
          });
        }
        const foo = Foo.attempt({ name: 'foo' });
        await Foo.insert(foo).run(connection);
        await Foo.update(foo.id, { name: 'bar' }).run(connection);
        const fetchedFoo = await Foo.get(foo.id).run(connection);
        expect(fetchedFoo).to.have.property('name', 'bar');
      });
    });

    describe('delete', () => {
      it('should delete data from database', async () => {
        class Foo extends Table {
          static table = 'foo';
          static schema = () => ({
            ...Table.schema(),
            name: Joi.string().required(),
          });
        }
        const foo = Foo.attempt({ name: 'foo' });
        await Foo.insert(foo).run(connection);
        await Foo.delete(foo.id).run(connection);
        const fetchedFoo = await Foo.query().get(foo.id).run(connection);
        expect(fetchedFoo).to.be.null;
      });
    });

    describe('withJoin', () => {
      it('should query hasOne relation', async () => {
        class Foo extends Table {
          static table = 'foo';
          static schema = () => ({
            ...Table.schema(),
          });
          static relations = () => ({
            bar: hasOne(Foo.linkedBy(Bar, 'fooId')),
          });
        }
        class Bar extends Table {
          static table = 'bar';
          static schema = () => ({
            ...Table.schema(),
            fooId: Foo.getForeignKey(),
          });
        }
        await Foo.sync(connection);
        await Bar.sync(connection);

        const foo = Foo.create({});
        const bar = Bar.create({ fooId: foo.id });

        await Foo.insert(foo).run(connection);
        await Bar.insert(bar).run(connection);

        let query = Foo.get(foo.id);
        query = await Foo.withJoin(query, { bar: true });
        const fetchedFoo = await query.run(connection);
        expect(bar).to.deep.equal(fetchedFoo.bar);
      });
    });

    it('should query belongsTo relation', async () => {
      class Foo extends Table {
        static table = 'foo';
        static schema = () => ({
          ...Table.schema(),
          barId: Bar.getForeignKey(),
        });
        static relations = () => ({
          bar: belongsTo(Foo.linkTo(Bar, 'barId')),
        });
      }
      class Bar extends Table {
        static table = 'bar';
        static schema = () => ({
          ...Table.schema(),
        });
      }
      await Foo.sync(connection);
      await Bar.sync(connection);

      const bar = Bar.create({});
      const foo = Foo.create({ barId: bar.id });

      await Foo.insert(foo).run(connection);
      await Bar.insert(bar).run(connection);

      let query = Foo.get(foo.id);
      query = Foo.withJoin(query, { bar: true });
      const fetchedFoo = await query.run(connection);
      expect(bar).to.deep.equal(fetchedFoo.bar);
    });

    it('should query hasMany relation', async () => {
      class Foo extends Table {
        static table = 'foo';
        static schema = () => ({
          ...Table.schema(),
        });
        static relations = () => ({
          bars: hasMany(Foo.linkedBy(Bar, 'fooId')),
        });
      }
      class Bar extends Table {
        static table = 'bar';
        static schema = () => ({
          ...Table.schema(),
          fooId: Foo.getForeignKey(),
        });
      }
      await Foo.sync(connection);
      await Bar.sync(connection);

      const foo = Foo.create({});
      const bar = Bar.create({ fooId: foo.id });

      await Foo.insert(foo).run(connection);
      await Bar.insert(bar).run(connection);

      let query = Foo.get(foo.id);
      query = Foo.withJoin(query, { bars: true });
      const fetchedFoo = await query.run(connection);
      expect(fetchedFoo.bars).to.have.length(1);
      expect(bar).to.deep.equal(fetchedFoo.bars[0]);
    });

    it('should query belongsToMany relation', async () => {
      class Foo extends Table {
        static table = 'foo';
        static schema = () => ({
          ...Table.schema(),
        });
        static relations = () => ({
          bars: belongsToMany([Foo.linkedBy(FooBar, 'fooId'), FooBar.linkTo(Bar, 'barId')]),
        });
      }
      class Bar extends Table {
        static table = 'bar';
        static schema = () => ({
          ...Table.schema(),
        });
        static relations = () => ({
          foos: belongsToMany([Bar.linkedBy(FooBar, 'barId'), FooBar.linkTo(Foo, 'fooId')]),
        });
      }
      class FooBar extends Table {
        static table = 'foobar';
        static schema = () => ({
          ...Table.schema(),
          fooId: Foo.getForeignKey({ isManyToMany: true }),
          barId: Bar.getForeignKey({ isManyToMany: true }),
        });
      }
      await Foo.sync(connection);
      await Bar.sync(connection);
      await FooBar.sync(connection);

      const foo = Foo.create({});
      const bar = Bar.create({});
      const foobar = FooBar.create({ fooId: foo.id, barId: bar.id });

      await Foo.insert(foo).run(connection);
      await Bar.insert(bar).run(connection);
      await FooBar.insert(foobar).run(connection);

      let query = Foo.get(foo.id);
      query = Foo.withJoin(query, { bars: true });
      const fetchedFoo = await query.run(connection);
      expect(fetchedFoo.bars).to.have.length(1);
      expect(bar).to.deep.equal(fetchedFoo.bars[0]);

      query = Bar.get(bar.id);
      query = Bar.withJoin(query, { foos: true });
      const fetchedBar = await query.run(connection);
      expect(fetchedBar.foos).to.have.length(1);
      expect(foo).to.deep.equal(fetchedBar.foos[0]);
    });

    describe('createRelation', () => {
      it('should add hasMany relation', async () => {
        class Foo extends Table {
          static table = 'foo';
          static schema = () => ({
            ...Table.schema(),
          });
          static relations = () => ({
            bars: hasMany(Foo.linkedBy(Bar, 'fooId')),
          });
        }
        class Bar extends Table {
          static table = 'bar';
          static schema = () => ({
            ...Table.schema(),
            fooId: Foo.getForeignKey(),
          });
        }
        await Foo.sync(connection);
        await Bar.sync(connection);

        const foo = Foo.create({});
        const bar = Bar.create({});
        await Foo.insert(foo).run(connection);
        await Bar.insert(bar).run(connection);
        await Foo.createRelation('bars', foo.id, bar.id).run(connection);

        let fooQuery = Foo.get(foo.id);
        fooQuery = Foo.withJoin(fooQuery, { bars: true });
        const fetchedFoo = await fooQuery.run(connection);
        expect(fetchedFoo.bars).to.have.length(1);
        expect(fetchedFoo.bars[0]).to.have.property('fooId', foo.id);
      });

      it('should add belongsToMany relation', async () => {
        class Foo extends Table {
          static table = 'foo';
          static schema = () => ({
            ...Table.schema(),
          });
          static relations = () => ({
            bars: belongsToMany([Foo.linkedBy(FooBar, 'fooId'), FooBar.linkTo(Bar, 'barId')]),
          });
        }
        class Bar extends Table {
          static table = 'bar';
          static schema = () => ({
            ...Table.schema(),
          });
          static relations = () => ({
            foos: belongsToMany([Bar.linkedBy(FooBar, 'barId'), FooBar.linkTo(Foo, 'fooId')]),
          });
        }
        class FooBar extends Table {
          static table = 'foobar';
          static schema = () => ({
            ...Table.schema(),
            fooId: Foo.getForeignKey({ isManyToMany: true }),
            barId: Bar.getForeignKey({ isManyToMany: true }),
          });
        }
        await Foo.sync(connection);
        await Bar.sync(connection);
        await FooBar.sync(connection);

        const foo = Foo.create({});
        const bar = Bar.create({});
        await Foo.insert(foo).run(connection);
        await Bar.insert(bar).run(connection);
        await Foo.createRelation('bars', foo.id, bar.id).run(connection);

        const fooQuery = Foo.get(foo.id);
        const fetchedFoo = await Foo.withJoin(fooQuery, { bars: true }).run(connection);
        expect(bar.id).to.equal(fetchedFoo.bars[0].id);

        const barQuery = Bar.get(bar.id);
        const fetchedBar = await Bar.withJoin(barQuery, { foos: true }).run(connection);
        expect(foo.id).to.equal(fetchedBar.foos[0].id);
      });
    });

    describe('removeRelation', () => {
      it('should remove hasMany relation', async () => {
        class Foo extends Table {
          static table = 'foo';
          static schema = () => ({
            ...Table.schema(),
          });
          static relations = () => ({
            bars: hasMany(Foo.linkedBy(Bar, 'fooId')),
          });
        }
        class Bar extends Table {
          static table = 'bar';
          static schema = () => ({
            ...Table.schema(),
            fooId: Foo.getForeignKey(),
          });
        }
        await Foo.sync(connection);
        await Bar.sync(connection);

        const foo = Foo.create({});
        const bar1 = Bar.create({});
        const bar2 = Bar.create({});
        await Foo.insert(foo).run(connection);
        await Bar.insert(bar1).run(connection);
        await Bar.insert(bar2).run(connection);
        await Foo.createRelation('bars', foo.id, bar1.id).run(connection);
        await Foo.createRelation('bars', foo.id, bar2.id).run(connection);

        await Foo.removeRelation('bars', foo.id, bar1.id).run(connection);

        let fooQuery = Foo.get(foo.id);
        fooQuery = Foo.withJoin(fooQuery, { bars: true });
        const fetchedFoo = await fooQuery.run(connection);
        expect(fetchedFoo.bars).to.have.length(1);
        expect(bar2.id).to.equal(fetchedFoo.bars[0].id);
      });

      it('should remove belongsToMany relation', async () => {
        class Foo extends Table {
          static table = 'foo';
          static schema = () => ({
            ...Table.schema(),
          });
          static relations = () => ({
            bars: belongsToMany([Foo.linkedBy(FooBar, 'fooId'), FooBar.linkTo(Bar, 'barId')]),
          });
        }
        class Bar extends Table {
          static table = 'bar';
          static schema = () => ({
            ...Table.schema(),
          });
          static relations = () => ({
            foos: belongsToMany([Bar.linkedBy(FooBar, 'barId'), FooBar.linkTo(Foo, 'fooId')]),
          });
        }
        class FooBar extends Table {
          static table = 'foobar';
          static schema = () => ({
            ...Table.schema(),
            fooId: Foo.getForeignKey({ isManyToMany: true }),
            barId: Bar.getForeignKey({ isManyToMany: true }),
          });
        }
        await Foo.sync(connection);
        await Bar.sync(connection);
        await FooBar.sync(connection);

        const foo = Foo.create({});
        const bar1 = Bar.create({});
        const bar2 = Bar.create({});
        await Foo.insert(foo).run(connection);
        await Bar.insert(bar1).run(connection);
        await Bar.insert(bar2).run(connection);
        await Foo.createRelation('bars', foo.id, bar1.id).run(connection);
        await Foo.createRelation('bars', foo.id, bar2.id).run(connection);

        await Foo.removeRelation('bars', foo.id, bar1.id).run(connection);

        const fooQuery = Foo.get(foo.id);
        const fetchedFoo = await Foo.withJoin(fooQuery, { bars: true }).run(connection);
        expect(fetchedFoo.bars).to.have.length(1);
        expect(bar2.id).to.equal(fetchedFoo.bars[0].id);

        const barQuery = Bar.get(bar2.id);
        const fetchedBar = await Bar.withJoin(barQuery, { foos: true }).run(connection);
        expect(fetchedBar.foos).to.have.length(1);
        expect(foo.id).to.equal(fetchedBar.foos[0].id);
      });
    });
  });
});
