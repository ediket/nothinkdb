# What?

Functional toolkit for [rethinkdb](https://www.rethinkdb.com/api/javascript/).

# Feature

- __table__
  - schema: handle schema with [joi](https://github.com/hapijs/joi)
    - validate
    - generate default value
- __relations__
  - types
    - one-to-one: hasOne
    - one-to-many: hasMany
    - many-to-one: belongsTo
    - many-to-many: belongsToMany
  - join
  - create
  - remove
- __sync__: create table, secondary index...
- __query__: handle table data with rethinkdb.

# API

See the [API Reference](https://github.com/ironhee/nothinkdb/blob/master/API.md).

# Example

See the [Examples](https://github.com/ironhee/nothinkdb/tree/master/examples)
