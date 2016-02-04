import r from 'rethinkdb';
import { expect } from 'chai';
import Table from '../Table';
import Model, {
  HAS_ONE, BELONGS_TO,
  HAS_MANY, BELONGS_TO_MANY,
} from '../Model';


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

  describe('static', () => {
    describe('hasOne', () => {
      it('should create hasOne relation', () => {
        class Foo extends Model {
          static table = 'foo';
          static schema = () => ({
            ...Model.schema(),
          });
          static relations = () => ({
            bar: Foo.hasOne(Foo.linkedBy(Bar, 'fooId')),
          });
        }
        class Bar extends Model {
          static table = 'bar';
          static schema = () => ({
            ...Model.schema(),
            fooId: Foo.getForeignKey(),
          });
        }

        expect(Foo.relations().bar.type).to.equal(HAS_ONE);
        expect(Foo.relations().bar.link).to.be.ok;
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
          static relations = () => ({
            bar: Foo.belongsTo(Foo.linkTo(Bar, 'barId')),
          });
        }
        class Bar extends Model {
          static table = 'bar';
          static schema = () => ({
            ...Model.schema(),
          });
        }

        expect(Foo.relations().bar.type).to.equal(BELONGS_TO);
        expect(Foo.relations().bar.link).to.be.ok;
      });
    });

    describe('hasMany', () => {
      it('should create hasMany relation', () => {
        class Foo extends Model {
          static table = 'foo';
          static schema = () => ({
            ...Model.schema(),
          });
          static relations = () => ({
            bar: Foo.hasMany(Foo.linkedBy(Bar, 'fooId')),
          });
        }
        class Bar extends Model {
          static table = 'bar';
          static schema = () => ({
            ...Model.schema(),
            fooId: Foo.getForeignKey(),
          });
        }

        expect(Foo.relations().bar.type).to.equal(HAS_MANY);
        expect(Foo.relations().bar.link).to.be.ok;
      });
    });

    describe('belongsToMany', () => {
      it('should create belongsToMany relation', () => {
        class Foo extends Model {
          static table = 'foo';
          static schema = () => ({
            ...Model.schema(),
          });
          static relations = () => ({
            bars: Foo.belongsToMany([Foo.linkedBy(FooBar, 'fooId'), FooBar.linkTo(Bar, 'barId')]),
          });
        }
        class Bar extends Model {
          static table = 'bar';
          static schema = () => ({
            ...Model.schema(),
          });
          static relations = () => ({
            foos: Bar.belongsToMany([Bar.linkedBy(FooBar, 'barId'), FooBar.linkTo(Foo, 'fooId')]),
          });
        }
        class FooBar extends Table {
          static table = 'foobar';
          static schema = () => ({
            ...Model.schema(),
            fooId: Foo.getForeignKey({ isManyToMany: true }),
            barId: Bar.getForeignKey({ isManyToMany: true }),
          });
        }

        expect(Foo.relations().bars.type).to.equal(BELONGS_TO_MANY);
        expect(Foo.relations().bars.link).to.be.ok;
        expect(Bar.relations().foos.type).to.equal(BELONGS_TO_MANY);
        expect(Bar.relations().foos.link).to.be.ok;
      });
    });
  });

  describe('queryRelation', () => {
    it('should query hasOne relation', async () => {
      class Foo extends Model {
        static table = 'foo';
        static schema = () => ({
          ...Model.schema(),
        });
        static relations = () => ({
          bar: Foo.hasOne(Foo.linkedBy(Bar, 'fooId')),
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

      const result = await foo.queryRelation('bar').run(connection);
      expect(bar.data).to.deep.equal(result);
    });

    it('should query belongsTo relation', async () => {
      class Foo extends Model {
        static table = 'foo';
        static schema = () => ({
          ...Model.schema(),
          barId: Bar.getForeignKey(),
        });
        static relations = () => ({
          bar: Foo.belongsTo(Foo.linkTo(Bar, 'barId')),
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

      const result = await foo.queryRelation('bar').run(connection);
      expect(bar.data).to.deep.equal(result);
    });

    it('should query hasMany relation', async () => {
      class Foo extends Model {
        static table = 'foo';
        static schema = () => ({
          ...Model.schema(),
        });
        static relations = () => ({
          bars: Foo.hasMany(Foo.linkedBy(Bar, 'fooId')),
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

      const result = await foo.queryRelation('bars').run(connection);
      expect(bar.data).to.deep.equal(result[0]);
    });

    it('should query belongsToMany relation', async () => {
      class Foo extends Model {
        static table = 'foo';
        static schema = () => ({
          ...Model.schema(),
        });
        static relations = () => ({
          bars: Foo.belongsToMany([Foo.linkedBy(FooBar, 'fooId'), FooBar.linkTo(Bar, 'barId')]),
        });
      }
      class Bar extends Model {
        static table = 'bar';
        static schema = () => ({
          ...Model.schema(),
        });
        static relations = () => ({
          foos: Bar.belongsToMany([Bar.linkedBy(FooBar, 'barId'), FooBar.linkTo(Foo, 'fooId')]),
        });
      }
      class FooBar extends Table {
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

      const result = await foo.queryRelation('bars').run(connection);
      expect(bar.data).to.deep.equal(result[0]);
    });
  });
});
