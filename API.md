# API Reference

- [Table](#Table)
  - [`constructor(options)`](#Table-constructor)
  - [`validate(data)`](#Table-validate)
  - [`create(data)` - aliases: `attempt`](#Table-create)
  - [`hasField(fieldName)`](#Table-hasField)
  - [`assertField(fieldName)`](#Table-assertField)
  - [`getField(fieldName)`](#Table-getField)
  - [`getForeignKey([options])`](#Table-getForeignKey)
  - [`linkTo(targetTable, leftField, [options])`](#Table-linkTo)
  - [`linkedBy(targetTable, leftField, [options])`](#Table-linkedBy)
  - [`sync(connection)`](#Table-sync)
  - [`query()`](#Table-query)
  - [`insert(data)`](#Table-insert)
  - [`get(pk)`](#Table-get)
  - [`update(pk, data)`](#Table-update)
  - [`delete(pk)`](#Table-delete)
  - [`getRelation(relationName)`](#Table-getRelation)
  - [`createRelation(relationName, onePk, otherPk)`](#Table-createRelation)
  - [`removeRelation(relationName, onePk, otherPk)`](#Table-removeRelation)
  - [`hasRelation(relationName, onePk, otherPk)`](#Table-hasRelation)
  - [`withJoin(query, relations)`](#Table-withJoin)
  - [`getRelated(pk, relationName)`](#Table-getRelated)
- [schema](#schema)
- [relations](#relations)
  - [`hasOne(link)`](#relations-hasOne)
  - [`belongsTo(link)`](#relations-belongsTo)
  - [`hasMany(link)`](#relations-hasMany)
  - [`belongsToMany(links)`](#relations-belongsToMany)
- [Environment](#Environment)
  - [`constructor(options)`](#Environment-constructor)
  - [`createTable(options)`](#Environment-createTable)
  - [`getTable(tableName)`](#Environment-getTable)
  - [`hasTable(tableName)`](#Environment-hasTable)
  - [`getAllTables()`](#Environment-getAllTables)
  - [`sync(connection)`](#Environment-sync)

## Table <a name="Table"></a>

### `constructor(options)` <a name="Table-constructor"></a>

- `options`
  - `tableName` - `string` - the rethinkdb table name.
  - `schema` - `function` - the table schema. It should returns [joi](https://github.com/hapijs/joi) schema.
  - [`pk`] - `string` - the custom primary key field. Defaults to `'id'`.
  - [`relations`] - `function` - the table relations.

```js
import { Table } from 'nothinkdb';
import Joi from 'joi';

const fooTable = new Table({
  tableName: 'foo',
  schema: () => ({
    id: Joi.string().max(36).default(() => uuid.v4(), 'primary key').meta({ index: true }),
    name: Joi.string().required().meta({ unique: true }),
    foo: Joi.string().default('bar'),
  }),
})
```

### `validate(data)` <a name="Table-validate"></a>

```js
import { Table } from 'nothinkdb';
import Joi from 'joi';

const fooTable = new Table({
  tableName: 'foo',
  schema: () => ({
    name: Joi.string().required(),
  }),
});

const result = fooTable.validate({ name: 'foo' });  // returns true
```

### `create(data)` - aliases: `attempt` <a name="Table-create"></a>

```js
import { Table } from 'nothinkdb';
import Joi from 'joi';

const fooTable = new Table({
  tableName: 'foo',
  schema: () => ({
    foo: Joi.string().default('foo'),
    bar: Joi.string().required(),
  }),
});

fooTable.create({ bar: 'bar' });  // returns { foo: 'foo', bar: 'bar' }
fooTable.create({})).to.throw(Error);  // throws error
```

### `hasField(fieldName)` <a name="Table-hasField"></a>

```js
import { Table } from 'nothinkdb';
import Joi from 'joi';

const fooTable = new Table({
  tableName: 'foo',
  schema: () => ({
    name: Joi.string(),
  }),
});

fooTable.hasField('name');  // returns true
```

### `assertField(fieldName)` <a name="Table-assertField"></a>

```js
import { Table } from 'nothinkdb';
import Joi from 'joi';

const fooTable = new Table({
  tableName: 'foo',
  schema: () => ({
    foo: Joi.string(),
  }),
});

fooTable.assertField('foo');
fooTable.assertField('bar');  // throws error
```

### `getField(fieldName)` <a name="Table-getField"></a>

```js
import { Table } from 'nothinkdb';
import Joi from 'joi';

const fooTable = new Table({
  tableName: 'foo',
  schema: () => ({
    foo: Joi.string(),
  }),
});

fooTable.getField('foo');  // returns Joi.string()
```

### `getForeignKey([options])` <a name="Table-getForeignKey"></a>

- `options`
  - `fieldName` - `string` - Defaults to `this.pk`.
  - `isManyToMany` - `function` - Defaults to `false`.

### `linkTo(targetTable, leftField, [options])` <a name="Table-linkTo"></a>

- `options`
  - `index` - `string` - Defaults to `targetTable.pk`.

### `linkedBy(targetTable, leftField, [options])` <a name="Table-linkedBy"></a>

- `options`
  - `index` - `string` - Defaults to `this.pk`.

### `sync(connection)` <a name="Table-sync"></a>

```js
import r from 'rethinkdb';
import { Table, schema, belongsTo } from 'nothinkdb';
import Joi from 'joi';

const fooTable = new Table({
  tableName: 'foo',
  schema: () => ({
    ...schema,
    uniqueField: Joi.string().required().meta({ unique: true }),
    indexedField: Joi.string().required().meta({ index: true }),
    foo: Joi.string().required(),
    bar: Joi.string().required(),
    barId: barTable.getForeignKey(),
  }),
  relations: () => ({
    bar: belongsTo(fooTable.linkTo(barTable, 'barId')),
  }),
  index: {
    foobar: [r.row('foo'), r.row('bar')],
  },
});
const barTable = new Table({
  tableName: 'bar',
  schema: () => ({
    ...schema,
  }),
});

await fooTable.sync(connection);
// ensure table 'foo', ensure secondary index 'foo.barId', 'foo.createdAt', 'foo.updatedAt', 'foo.uniqueField', 'foo.indexedField', 'foo.foobar'
await barTable.sync(connection);
// ensure table 'bar'
```

### `query()` <a name="Table-query"></a>

```js
import { Table, schema } from 'nothinkdb';
import Joi from 'joi';

const fooTable = new Table({
  tableName: 'foo',
  schema: () => ({
    ...schema,
  }),
});

const config = await fooTable.query().config().run(connection);
// config.name -> 'foo'

const foo1 = await fooTable.query().get('some foo1 id').run(connection);
```

### `insert(data)` <a name="Table-insert"></a>
### `get(pk)` <a name="Table-get"></a>
### `update(pk, data)` <a name="Table-update"></a>
### `delete(pk)` <a name="Table-delete"></a>

```js
import { Table } from 'nothinkdb';
import Joi from 'joi';

const fooTable = new Table({
  tableName: 'foo',
  schema: () => ({
    id: Joi.string().required(),
    name: Joi.string().required(),
  }),
});
fooTable.sync();

const foo = fooTable.create({ id: 'fooId', name: 'foo' });

await fooTable.insert(foo).run(connection);
await fooTable.get(foo.id).run(connection);  // returns { id: 'fooId', name: 'foo' }

await fooTable.update(foo.id, { name: 'bar' }).run(connection);
await fooTable.get(foo.id).run(connection);  // returns { id: 'fooId', name: 'bar' }

await fooTable.delete(foo.id).run(connection);
await fooTable.get(foo.id).run(connection);  // returns null
```

### `getRelation(relationName)` <a name="Table-getRelation"></a>

### `createRelation(relationName, onePk, otherPk)` <a name="Table-createRelation"></a>

### `removeRelation(relationName, onePk, otherPk)` <a name="Table-removeRelation"></a>

### `hasRelation(relationName, onePk, otherPk)` <a name="Table-hasRelation"></a>

### `withJoin(query, relations)` <a name="Table-withJoin"></a>
### `getRelated(pk, relationName)` <a name="Table-getRelated"></a>

```js
import { Table, hasOne } from 'nothinkdb';
import Joi from 'joi';

const fooTable = new Table({
  tableName: 'foo',
  schema: () => ({
    id: Joi.string().required(),
    name: Joi.string().required(),
  }),
  relations: () => ({
    bar: hasOne(fooTable.linkedBy(barTable, 'fooId')),
  }),
});
const barTable = new Table({
  tableName: 'bar',
  schema: () => ({
    id: Joi.string().required(),
    name: Joi.string().required(),
    fooId: fooTable.getForeignKey(),
  }),
});
await fooTable.sync(connection);
await barTable.sync(connection);

const foo = fooTable.create({ id: 'fooId', name: 'foo' });
const bar = barTable.create({ id: 'barId', name: 'bar' });

await fooTable.insert(foo).run(connection);
await barTable.insert(bar).run(connection);

await fooTable.hasRelation('bar', foo.id, bar.id).run(connection);  // false

await fooTable.createRelation('bar', foo.id, bar.id).run(connection);

await fooTable.hasRelation('bar', foo.id, bar.id).run(connection);  // true

let query = fooTable.get(foo.id);
query = await fooTable.withJoin(query, { bar: true });
await query.run(connection);  
/*
  returns {
    id: 'fooId',
    name: 'foo',
    bar: {
      id: 'barId',
      name: 'bar',
    }
  }
*/

await fooTable.getRelated(foo.id, 'bar').run(connection);
/*
  returns {
    id: 'barId',
    name: 'bar',
  }
*/

await fooTable.removeRelation('bar', foo.id, bar.id).run(connection);

await fooTable.hasRelation('bar', foo.id, bar.id).run(connection);  // false

let query = fooTable.get(foo.id);
query = await fooTable.withJoin(query, { bar: true });
await query.run(connection);  
/*
  returns {
    id: 'fooId',
    name: 'foo',
    bar: null,
  }
*/

await fooTable.getRelated(foo.id, 'bar').run(connection);
/*
  returns null
*/
```

## schema <a name="schema"></a>

The default table schema contains `id`, `createdAt`, `updatedAt`.

```js
import { Table, schema } from 'nothinkdb';

const table = new Table({
  tableName: 'foo',
  schema: () => ({
    id: schema.id,
    createdAt: schema.createdAt,
    updatedAt: schema.updatedAt,
    name: Joi.string().default('hello'),
  }),
});

// Same
const table = new Table({
  tableName: 'foo',
  schema: () => ({
    ...schema,
    name: Joi.string().default('hello'),
  }),
});
```

## relations <a name="relations"></a>

- one-to-one: hasOne
- one-to-many: hasMany
- many-to-one: belongsTo
- many-to-many: belongsToMany

### `hasOne(link)` <a name="relations-hasOne"></a>

```js
import { Table, schema, hasOne } from 'nothinkdb';

const fooTable = new Table({
  tableName: 'foo',
  schema: () => ({
    ...schema,
  }),
  relations: () => ({
    bar: hasOne(fooTable.linkedBy(barTable, 'fooId')),
  }),
});
const barTable = new Table({
  tableName: 'bar',
  schema: () => ({
    ...schema,
    fooId: fooTable.getForeignKey(),
  }),
});
```

### `hasMany(link)` <a name="relations-hasMany"></a>

```js
import { Table, schema, hasOne } from 'nothinkdb';

const fooTable = new Table({
  tableName: 'foo',
  schema: () => ({
    ...schema,
  }),
  relations: () => ({
    bars: hasMany(fooTable.linkedBy(barTable, 'fooId')),
  }),
});
const barTable = new Table({
  tableName: 'bar',
  schema: () => ({
    ...schema,
    fooId: fooTable.getForeignKey(),
  }),
});
```

### `belongsTo(link)` <a name="relations-belongsTo"></a>

```js
import { Table, schema, hasOne } from 'nothinkdb';

const fooTable = new Table({
  tableName: 'foo',
  schema: () => ({
    ...schema,
    barId: barTable.getForeignKey(),
  }),
  relations: () => ({
    bar: belongsTo(fooTable.linkTo(barTable, 'barId')),
  }),
});
const barTable = new Table({
  tableName: 'bar',
  schema: () => ({
    ...schema,
  }),
});
```

### `belongsToMany(link)` <a name="relations-belongsToMany"></a>

```js
import r from 'rethinkdb';
import { Table, schema, hasOne } from 'nothinkdb';

const fooTable = new Table({
  tableName: 'foo',
  schema: () => ({
    ...schema,
  }),
  relations: () => ({
    bars: belongsToMany([
      fooTable.linkedBy(foobarTable, 'fooId'),
      foobarTable.linkTo(barTable, 'barId')
    ]),
  }),
});
const barTable = new Table({
  tableName: 'bar',
  schema: () => ({
    ...schema,
  }),
  relations: () => ({
    foos: belongsToMany([
      barTable.linkedBy(foobarTable, 'barId'),
      foobarTable.linkTo(fooTable, 'fooId')
    ]),
  }),
});
const foobarTable = new Table({
  tableName: 'foobar',
  schema: () => ({
    ...schema,
    fooId: fooTable.getForeignKey({ isManyToMany: true }),
    barId: barTable.getForeignKey({ isManyToMany: true }),
  }),
  index: {
    bars: [r.row('fooId'), r.row('barId')],
    foos: [r.row('barId'), r.row('fooId')],
  }
});
```

## Environment <a name="Environment"></a>

### `constructor(options)` <a name="Environment-constructor"></a>

- `options`
  - `Table` - `Table` - the nothinkdb `Table` class.

### `createTable(options)` <a name="Environment-createTable"></a>

- `options` - `object` - same as [Table constructor](#Table-constructor) options.

### `getTable(tableName)` <a name="Environment-getTable"></a>
### `hasTable(tableName)` <a name="Environment-hasTable"></a>
### `getAllTables()` <a name="Environment-getAllTables"></a>
### `sync(connection)` <a name="Environment-sync"></a>

```js
import r from 'rethinkdb';
import { Environment, Table } from 'nothinkdb';

class BaseTable extends Table {
  constructor(options) {
    super({
      ...options,
      schema: () => ({
        ...schema,
        ...options.schema(),
      }),
    });
  }
}

const env = new Environment({
  Table: BaseTable,
});

const fooTable = env.createTable({
  tableName: 'foo',
  schema: () => ({}),
});

fooTable.constructor === BaseTable;  // true

fooTable === env.getTable('foo');  // true

env.hasTable('foo');  // true

env.getAllTables();  // [fooTable]

r.connect().then(async connection => {
  await env.sync(connection);  // sync all tables in environment
});
```
