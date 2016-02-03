import { expect } from 'chai';
import uuid from 'node-uuid';
import Joi from 'joi';
import Table from '../Table';
import Link from '../Link';


describe('Table', () => {
  describe('constructor', () => {
    it('should throw Error if \'table\' is not overrided', () => {
      expect(() => new Table()).to.throw(Error);
    });

    it('should not throw Error if \'table\' is overrided', () => {
      class Foo extends Table {
        static table = 'foo';
      }
      expect(() => new Foo()).to.not.throw(Error);
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

      it('should update default properties', () => {
        const result = Foo.attempt({ bar: 'bar' });
        expect(result).to.have.property('foo', 'foo');
        expect(result).to.have.property('bar', 'bar');
      });

      it('should throw error when invalid', () => {
        expect(() => Foo.attempt({})).to.throw(Error);
      });
    });

    describe('hasColumn', () => {
      it('should return true when specified columnName is given', () => {
        class Foo extends Table {
          static table = 'foo';
          static schema = () => ({
            name: Joi.string(),
          });
        }
        expect(Foo.hasColumn('name')).to.be.true;
      });

      it('should return false when unspecified columnName is given', () => {
        class Foo extends Table {
          static table = 'foo';
          static schema = () => ({});
        }
        expect(Foo.hasColumn('name')).to.be.false;
      });
    });

    describe('assertColumn', () => {
      it('should not throw error when specified columnName is given', () => {
        class Foo extends Table {
          static table = 'foo';
          static schema = () => ({
            name: Joi.string(),
          });
        }
        expect(() => Foo.assertColumn('name')).to.not.throw(Error);
      });

      it('should throw error when unspecified columnName is given', () => {
        class Foo extends Table {
          static table = 'foo';
          static schema = () => ({});
        }
        expect(() => Foo.assertColumn('name')).to.throw(Error);
      });
    });

    describe('getColumn', () => {
      it('should return column schema when specified columnName is given', () => {
        class Foo extends Table {
          static table = 'foo';
          static schema = () => ({
            name: Joi.string(),
          });
        }

        const column = Foo.getColumn('name');
        expect(column).to.be.ok;
        expect(() => Joi.assert('string', column)).to.not.throw(Error);
      });

      it('should throw error when unspecified columnName is given', () => {
        class Foo extends Table {
          static table = 'foo';
          static schema = () => ({});
        }
        expect(() => Foo.getColumn('name')).to.throw(Error);
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

        const column = Foo.getForeignKey();
        expect(column).to.be.ok;
        expect(() => Joi.assert('string', column)).to.not.throw(Error);
      });

      it('should return column schema when options.columnName is given', () => {
        class Foo extends Table {
          static table = 'foo';
          static schema = () => ({
            name: Joi.string().default(() => uuid.v4(), 'pk'),
          });
        }

        const column = Foo.getForeignKey({ columnName: 'name' });
        expect(column).to.be.ok;
        expect(() => Joi.assert('string', column)).to.not.throw(Error);
      });

      it('should return default(null) schema when options.isManyToMany is not given', () => {
        class Foo extends Table {
          static table = 'foo';
          static schema = () => ({
            ...Table.schema(),
          });
        }

        const column = Foo.getForeignKey();
        expect(Joi.attempt(undefined, column)).to.be.null;
      });

      it('should return required() column schema when options.isManyToMany is given', () => {
        class Foo extends Table {
          static table = 'foo';
          static schema = () => ({
            ...Table.schema(),
          });
        }

        const column = Foo.getForeignKey({ isManyToMany: true });
        expect(column).to.be.ok;
        expect(() => Joi.assert(undefined, column)).to.throw(Error);
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
        expect(foo2bar.linker).to.deep.equal({
          Table: Foo, key: 'barId',
        });
        expect(foo2bar.linkee).to.deep.equal({
          Table: Bar, key: 'id',
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
        expect(foo2bar.linker).to.deep.equal({
          Table: Bar, key: 'fooId',
        });
        expect(foo2bar.linkee).to.deep.equal({
          Table: Foo, key: 'id',
        });
      });
    });
  });

  describe('isValid', () => {
    class Foo extends Table {
      static table = 'foo';
      static schema = () => ({
        name: Joi.string().required(),
      });
    }

    it('should return true when data is valid', () => {
      const foo = new Foo({ name: 'foo' });
      expect(foo.isValid()).to.be.true;
    });

    it('should throw error when invalid', () => {
      const foo = new Foo({});
      expect(foo.isValid()).to.be.false;
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

    it('should update default properties', () => {
      const foo = new Foo({ bar: 'bar' });
      foo.attempt();
      expect(foo.data).to.have.property('foo', 'foo');
      expect(foo.data).to.have.property('bar', 'bar');
    });

    it('should throw error when invalid', () => {
      const foo = new Foo({});
      expect(() => foo.attempt()).to.throw(Error);
    });
  });
});
