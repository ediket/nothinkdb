import { expect } from 'chai';
import Joi from 'joi';
import Table from '../Table';
import Link from '../Link';
import Model, {
  HAS_ONE, BELONGS_TO,
  HAS_MANY, BELONGS_TO_MANY,
} from '../Model';


describe('Model', () => {
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

    describe('hasOne', () => {
      it('should create hasOne relation', () => {
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
        const bar2foo = new Link({
          linker: { Table: Bar, key: 'fooId' },
          linkee: { Table: Foo, key: 'id' },
        });
        Foo.hasOne('bar', bar2foo);

        expect(Foo.relations.bar).to.deep.equal({
          link: bar2foo,
          type: HAS_ONE,
        });
      });
    });

    describe('belongsTo', () => {
      it('should create belongsTo relation', () => {
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
        const foo2bar = new Link({
          linker: { Table: Foo, key: 'barId' },
          linkee: { Table: Bar, key: 'id' },
        });
        Foo.belongsTo('bar', foo2bar);

        expect(Foo.relations.bar).to.deep.equal({
          link: foo2bar,
          type: BELONGS_TO,
        });
      });
    });

    describe('hasMany', () => {
      it('should create hasMany relation', () => {
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
        const bar2foo = new Link({
          linker: { Table: Bar, key: 'fooId' },
          linkee: { Table: Foo, key: 'id' },
        });
        Foo.hasMany('bars', bar2foo);

        expect(Foo.relations.bars).to.deep.equal({
          link: bar2foo,
          type: HAS_MANY,
        });
      });
    });

    describe('belongsToMany', () => {
      it('should create belongsToMany relation', () => {
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
          });
        }
        class FooBar extends Table {
          static table = 'foobar';
          static schema = () => ({
            ...Model.schema(),
            fooId: Foo.getForeignKey(),
            barId: Bar.getForeignKey(),
          });
        }
        const foobarLinks = [
          new Link({
            linker: { Table: FooBar, key: 'fooId' },
            linkee: { Table: Foo, key: 'id' },
          }),
          new Link({
            linker: { Table: FooBar, key: 'barId' },
            linkee: { Table: Bar, key: 'id' },
          }),
        ];
        Foo.belongsToMany('bars', foobarLinks);
        Bar.belongsToMany('foos', foobarLinks);

        expect(Foo.relations.bars).to.deep.equal({
          links: foobarLinks,
          type: BELONGS_TO_MANY,
        });
        expect(Bar.relations.foos).to.deep.equal({
          links: foobarLinks,
          type: BELONGS_TO_MANY,
        });
      });
    });
  });

  describe('attempt', () => {
    it('should update default properties', () => {
      class Bar extends Model {
        static table = 'foo';
        static schema = () => ({
          name: Joi.string().default('bar'),
        });
      }
      const bar = new Bar();
      bar.attempt();
      expect(bar.data).to.have.property('name', 'bar');
    });

    it('should throw error when invalid', () => {
      class Foo extends Model {
        static table = 'foo';
        static schema = {
          name: Joi.string(),
        };
      }
      const foo = new Foo({ name: 1 });
      expect(() => foo.attempt()).to.throw(Error);
    });
  });
});
