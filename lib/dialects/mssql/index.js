'use strict';

const { Dialect } = require('../dialect');
const MssqlSchemaInspector = require('./schema-inspector');

class MssqlDialect extends Dialect {
  constructor(db) {
    super(db);

    this.schemaInspector = new MssqlSchemaInspector(db);
  }

  useReturning() {
    return true;
  }

  configure() {
    this.db.config.connection.connection.supportBigNumbers = true;
    this.db.config.connection.connection.bigNumberStrings = true;
    this.db.config.connection.connection.typeCast = (field, next) => {
      if (field.type == 'DECIMAL' || field.type === 'NEWDECIMAL') {
        var value = field.string();
        return value === null ? null : Number(value);
      }

      if (field.type == 'TINY' && field.length == 1) {
        let value = field.string();
        return value ? value == '1' : null;
      }
      return next();
    };
  }

  getSqlType(type) {
    switch (type) {
      default: {
        return type;
      }
    }
  }

  async startSchemaUpdate() {
    // await this.db.connection.raw(`set foreign_key_checks = 0;`);
  }

  async endSchemaUpdate() {
    // await this.db.connection.raw(`set foreign_key_checks = 1;`);
  }

  supportsUnsigned() {
    return false;
  }

  usesForeignKeys() {
    return true;
  }

  transformErrors(error) {
    super.transformErrors(error);
  }
}

module.exports = MssqlDialect;
