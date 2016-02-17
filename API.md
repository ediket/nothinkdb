# API Reference

- [Table](#table)
  - [`constructor(options)`](#constructoroptions)
  - [`validate(data)`](#validatedata)
  - [`create(data)` - aliases: `attempt`](#createdata---aliases-attempt)
  - [`hasField(fieldName)`](#hasfieldfieldname)
  - [`assertField(fieldName)`](#assertfieldfieldname)
  - [`getField(fieldName)`](#getfieldfieldname)
  - [`getForeignKey([options])`](#getforeignkeyoptions)
  - [`linkTo(targetTable, leftField, [options])`](#linktotargettable-leftfield-options)
  - [`linkedBy(targetTable, leftField, [options])`](#linkedbytargettable-leftfield-options)
  - [`sync(connection)`](#syncconnection)
  - [`query()`](#query)
  - [`insert(data)`](#insertdata)
  - [`get(pk)`](#getpk)
  - [`update(pk, data)`](#updatepk-data)
  - [`delete(pk)`](#deletepk)
  - [`getRelation(relationName)`](#getrelationrelationname)
  - [`createRelation(relationName, onePk, otherPk)`](#createrelationrelationname-onepk-otherpk)
  - [`removeRelation(relationName, onePk, otherPk)`](#removerelationrelationname-onepk-otherpk)
  - [`withJoin(query, relations)`](#withjoinquery-relations)
  - [`getRelated(pk, relationName)`](#getrelatedpk-relationname)
- [schema](#schema)
- [relations](#relations)
  - [`hasOne(link)`](#hasonelink)
  - [`belongsTo(link)`](#belongstolink)
  - [`hasMany(link)`](#hasmanylink)
  - [`belongsToMany(links)`](#belongstomanylink)

## Table

### `constructor(options)`

- `options`
  - `table` - `string` - the rethinkdb table name.
  - `schema` - `function` - the table schema. It should returns [joi](https://github.com/hapijs/joi) schema.
  - [`pk`] - `string` - the custom primary key field. Defaults to `'id'`.
  - [`relations`] - `function` - the table relations.

```js
import { Table } from 'nothinkdb';
import Joi from 'joi';

const fooTable = new Table({
  table: 'foo',
  schema: () => ({
    name: Joi.string().default('hello'),
  }),
})
```

### `validate(data)`

```js
import { Table } from 'nothinkdb';
import Joi from 'joi';

const fooTable = new Table({
  table: 'foo',
  schema: () => ({
    name: Joi.string().required(),
  }),
});

const result = fooTable.validate({ name: 'foo' });  // returns true
```

### `create(data)` - aliases: `attempt`

```js
import { Table } from 'nothinkdb';
import Joi from 'joi';

const fooTable = new Table({
  table: 'foo',
  schema: () => ({
    foo: Joi.string().default('foo'),
    bar: Joi.string().required(),
  }),
});

fooTable.create({ bar: 'bar' });  // returns { foo: 'foo', bar: 'bar' }
fooTable.create({})).to.throw(Error);  // throws error
```

### `hasField(fieldName)`

```js
import { Table } from 'nothinkdb';
import Joi from 'joi';

const fooTable = new Table({
  table: 'foo',
  schema: () => ({
    name: Joi.string(),
  }),
});

fooTable.hasField('name');  // returns true
```

### `assertField(fieldName)`

```js
import { Table } from 'nothinkdb';
import Joi from 'joi';

const fooTable = new Table({
  table: 'foo',
  schema: () => ({
    foo: Joi.string(),
  }),
});

fooTable.assertField('foo');
fooTable.assertField('bar');  // throws error
```

### `getField(fieldName)`

```js
import { Table } from 'nothinkdb';
import Joi from 'joi';

const fooTable = new Table({
  table: 'foo',
  schema: () => ({
    foo: Joi.string(),
  }),
});

fooTable.getField('foo');  // returns Joi.string()
```

### `getForeignKey([options])`

- `options`
  - `fieldName` - `string` - Defaults to `this.pk`.
  - `isManyToMany` - `function` - Defaults to `false`.

### `linkTo(targetTable, leftField, [options])`

- `options`
  - `index` - `string` - Defaults to `targetTable.pk`.

### `linkedBy(targetTable, leftField, [options])`

- `options`
  - `index` - `string` - Defaults to `this.pk`.

### `sync(connection)`

```js
import { Table, schema, belongsTo } from 'nothinkdb';
import Joi from 'joi';

const fooTable = new Table({
  table: 'foo',
  schema: () => ({
    ...schema,
    barId: barTable.getForeignKey(),
  }),
  relations: () => ({
    bar: belongsTo(fooTable.linkTo(barTable, 'barId')),
  }),
});
const barTable = new Table({
  table: 'bar',
  schema: () => ({
    ...schema,
  }),
});

await fooTable.sync(connection);
// ensure table 'foo', ensure secondary index 'foo.barId'
await barTable.sync(connection);
// ensure table 'bar'
```

### `query()`

```js
import { Table, schema } from 'nothinkdb';
import Joi from 'joi';

const fooTable = new Table({
  table: 'foo',
  schema: () => ({
    ...schema,
  }),
});

const config = await fooTable.query().config().run(connection);
// config.name -> 'foo'

const foo1 = await fooTable.query().get('some foo1 id').run(connection);
```

### `insert(data)`
### `get(pk)`
### `update(pk, data)`
### `delete(pk)`

```js
import { Table } from 'nothinkdb';
import Joi from 'joi';

const fooTable = new Table({
  table: 'foo',
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

### `getRelation(relationName)`

### `createRelation(relationName, onePk, otherPk)`

### `removeRelation(relationName, onePk, otherPk)`

### `withJoin(query, relations)`
### `getRelated(pk, relationName)`

```js
import { Table, hasOne } from 'nothinkdb';
import Joi from 'joi';

const fooTable = new Table({
  table: 'foo',
  schema: () => ({
    id: Joi.string().required(),
    name: Joi.string().required(),
  }),
  relations: () => ({
    bar: hasOne(fooTable.linkedBy(barTable, 'fooId')),
  }),
});
const barTable = new Table({
  table: 'bar',
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

await fooTable.createRelation('bar', foo.id, bar.id).run(connection);

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

## schema

The default table schema contains `id`, `createdAt`, `updatedAt`.

```js
import { Table, schema } from 'nothinkdb';

const table = new Table({
  table: 'foo',
  schema: () => ({
    id: schema.id,
    createdAt: schema.createdAt,
    updatedAt: schema.updatedAt,
    name: Joi.string().default('hello'),
  }),
});

// Same
const table = new Table({
  table: 'foo',
  schema: () => ({
    ...schema,
    name: Joi.string().default('hello'),
  }),
});
```

## relations

- one-to-one: hasOne
- one-to-many: hasMany
- many-to-one: belongsTo
- many-to-many: belongsToMany

### `hasOne(link)`

```js
import { Table, schema, hasOne } from 'nothinkdb';

const fooTable = new Table({
  table: 'foo',
  schema: () => ({
    ...schema,
  }),
  relations: () => ({
    bar: hasOne(fooTable.linkedBy(barTable, 'fooId')),
  }),
});
const barTable = new Table({
  table: 'bar',
  schema: () => ({
    ...schema,
    fooId: fooTable.getForeignKey(),
  }),
});
```

### `hasMany(link)`

```js
import { Table, schema, hasOne } from 'nothinkdb';

const fooTable = new Table({
  table: 'foo',
  schema: () => ({
    ...schema,
  }),
  relations: () => ({
    bars: hasMany(fooTable.linkedBy(barTable, 'fooId')),
  }),
});
const barTable = new Table({
  table: 'bar',
  schema: () => ({
    ...schema,
    fooId: fooTable.getForeignKey(),
  }),
});
```

### `belongsTo(link)`

```js
import { Table, schema, hasOne } from 'nothinkdb';

const fooTable = new Table({
  table: 'foo',
  schema: () => ({
    ...schema,
    barId: barTable.getForeignKey(),
  }),
  relations: () => ({
    bar: belongsTo(fooTable.linkTo(barTable, 'barId')),
  }),
});
const barTable = new Table({
  table: 'bar',
  schema: () => ({
    ...schema,
  }),
});
```

### `belongsToMany(link)`

```js
import { Table, schema, hasOne } from 'nothinkdb';

const fooTable = new Table({
  table: 'foo',
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
  table: 'bar',
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
  table: 'foobar',
  schema: () => ({
    ...schema,
    fooId: fooTable.getForeignKey({ isManyToMany: true }),
    barId: barTable.getForeignKey({ isManyToMany: true }),
  }),
});
```
