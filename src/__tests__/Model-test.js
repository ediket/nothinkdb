import { expect } from 'chai';
import Table from '../Table';
import Model, {
  HAS_ONE, BELONGS_TO,
  HAS_MANY, BELONGS_TO_MANY,
} from '../Model';


describe('Model', () => {
  describe('static', () => {
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
        const bar2foo = Foo.linkedBy(Bar, 'fooId');
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
        const foo2bar = Foo.linkTo(Bar, 'barId');
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
        const bar2foo = Foo.linkedBy(Bar, 'fooId');
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
            fooId: Foo.getForeignKey({ isManyToMany: true }),
            barId: Bar.getForeignKey({ isManyToMany: true }),
          });
        }
        const foo2foobar2bar = [Foo.linkedBy(FooBar, 'fooId'), FooBar.linkTo(Bar, 'barId')];
        const bar2foobar2foo = [Bar.linkedBy(FooBar, 'barId'), FooBar.linkTo(Foo, 'fooId')];
        Foo.belongsToMany('bars', foo2foobar2bar);
        Bar.belongsToMany('foos', bar2foobar2foo);

        expect(Foo.relations.bars).to.deep.equal({
          link: foo2foobar2bar,
          type: BELONGS_TO_MANY,
        });
        expect(Bar.relations.foos).to.deep.equal({
          link: bar2foobar2foo,
          type: BELONGS_TO_MANY,
        });
      });
    });
  });
});
