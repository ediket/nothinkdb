# What?

Functional toolkit for [rethinkdb](https://www.rethinkdb.com/api/javascript/).

# Feature

Table
-----
- __schema__: handle schema with [joi](https://github.com/hapijs/joi)
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


# Usage

see -example/-, -src/\_\_tests__/*
