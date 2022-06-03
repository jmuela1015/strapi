'use strict';

const debug2 = require('debug')('metrik'); // MTRK
const dumpObject = (prefix, obj, indent) => {
  const indentStr = new Array(indent + 1).join(' ');
  if (!obj) {
    debug2(prefix + ' ' + indentStr + 'NULL/UNDEFINED');
    return;
  }
  Object.keys(obj).forEach(function (key) {
    const value = obj[key];

    if (typeof value === 'object') {
      debug2(prefix + ' ' + indentStr + key);
      dumpObject(prefix, value, indent + 2);
    } else {
      debug2(prefix + ' ' + indentStr + key + '=' + value);
    }
  });
}

const SQL_QUERIES = {
  TABLE_LIST: /* sql */ `
    SELECT
      t.table_name as table_name
    FROM information_schema.tables t
    WHERE table_type = 'BASE TABLE'
      AND table_schema = SCHEMA_NAME();
  `
  ,
  //TODO: we need to solve to Type and Key
  LIST_COLUMNS: /* sql */ `
    SELECT
      c.data_type as data_type,
      c.column_name as column_name,
      c.character_maximum_length as character_maximum_length,
      c.column_default as column_default,
      c.is_nullable as is_nullable
    FROM information_schema.columns c
    WHERE table_schema = SCHEMA_NAME()
      AND table_name = ?;
  `
  ,
  INDEX_LIST: /* sql */ `
    EXEC SP_HELPINDEX ?;
  `
  /*
    show index from ??;
   */
  ,
  FOREIGN_KEY_LIST: /* sql */ `
    DROP TABLE IF EXISTS #fkeys
    CREATE TABLE #fkeys
    (
      PKTABLE_QUALIFIER varchar(128),
      PKTABLE_OWNER  varchar(128),
      PKTABLE_NAME  varchar(128),
      PKCOLUMN_NAME   varchar(128),
      FKTABLE_QUALIFIER  varchar(128),
      FKTABLE_OWNER  varchar(128),
      FKTABLE_NAME  varchar(128),
      FKCOLUMN_NAME  varchar(128),
      KEY_SEQ  smallint,
      UPDATE_RULE  smallint,
      DELETE_RULE  smallint,
      FK_NAME  varchar(128),
      PK_NAME  varchar(128),
      DEFERRABILITY  smallint
    )
      INSERT INTO #fkeys EXEC sp_fkeys @pktable_name = ?
    SELECT
      FK_NAME as constraint_name,
      FKCOLUMN_NAME as column_name,
      PKTABLE_NAME as referenced_table_name,
      PKCOLUMN_NAME as referenced_column_name,
      UPDATE_RULE as on_update,
      DELETE_RULE as on_delete
    FROM #fkeys
    DROP TABLE #fkeys;
  `
  ,
};

const toStrapiType = column => {
  const rootType = column.data_type.toLowerCase().match(/[^(), ]+/)[0];

  switch (rootType) {
    case 'int': {
      return { type: 'integer' };
    }
    case 'decimal': {
      return { type: 'decimal', args: [10, 2] };
    }
    case 'float': {
      return { type: 'double' };
    }
    case 'bigint': {
      return { type: 'bigInteger' };
    }
    case 'tinyint': {
      return { type: 'boolean' };
    }
    case 'text': {
      return { type: 'text', args: ['longtext'] };
    }
    case 'varchar': {
      return { type: 'string', args: [column.character_maximum_length] };
    }
    case 'nvarchar': {
      return { type: 'string', args: [column.character_maximum_length] };
    }
    case 'datetime': {
      return { type: 'datetime', args: [{ useTz: false, precision: 6 }] };
    }
    case 'datetime2': {
      return { type: 'datetime', args: [{ useTz: false, precision: 6 }] };
    }
    case 'date': {
      return { type: 'date' };
    }
    case 'time': {
      return { type: 'time', args: [{ precision: 3 }] };
    }
    case 'rowversion': {
      return { type: 'timestamp', args: [{ useTz: false, precision: 6 }] };
    }
    default: {
      return { type: 'specificType', args: [column.data_type] };
    }
  }
};

class MssqlSchemaInspector {
  constructor(db) {
    this.db = db;
  }

  async getSchema() {
    const schema = { tables: [] };

    const tables = await this.getTables();

    schema.tables = await Promise.all(
      tables.map(async tableName => {
        const columns = await this.getColumns(tableName);
        const indexes = await this.getIndexes(tableName);
        const foreignKeys = await this.getForeignKeys(tableName);

        return {
          name: tableName,
          columns,
          indexes,
          foreignKeys,
        };
      })
    );

    return schema;
  }

  async getTables() {
    const rows = await this.db.connection.raw(SQL_QUERIES.TABLE_LIST);
    dumpObject('MTRK909tables', rows, 0);

    return rows.map(row => row.table_name);
  }

  async getColumns(tableName) {
    const rows = await this.db.connection.raw(SQL_QUERIES.LIST_COLUMNS, [tableName]);
    dumpObject('MTRK909columns', rows, 0);

    return rows.map(row => {
      const { type, args = [], ...rest } = toStrapiType(row);

      return {
        type,
        args,
        defaultTo: row.column_default,
        name: row.column_name,
        notNullable: row.is_nullable === 0,
        unsigned: false,
        ...rest,
      };
    });
  }

  async getIndexes(tableName) {
    const rows = await this.db.connection.raw(SQL_QUERIES.INDEX_LIST, [tableName]);
    dumpObject('MTRK909indexes', rows, 0);

    const ret = {};

    for (const index of rows) {
      if (index.Column_name === 'id') {
        continue;
      }

      if (!ret[index.Key_name]) {
        ret[index.Key_name] = {
          columns: [index.Column_name],
          name: index.Key_name,
          type: !index.Non_unique ? 'unique' : null,
        };
      } else {
        ret[index.Key_name].columns.push(index.Column_name);
      }
    }

    return Object.values(ret);
  }

  async getForeignKeys(tableName) {
    const rows = await this.db.connection.raw(SQL_QUERIES.FOREIGN_KEY_LIST, [tableName]);
    dumpObject('MTRK909fk', rows, 0);

    const ret = {};

    for (const fk of rows) {
      if (!ret[fk.constraint_name]) {
        ret[fk.constraint_name] = {
          name: fk.constraint_name,
          columns: [fk.column_name],
          referencedColumns: [fk.referenced_column_name],
          referencedTable: fk.referenced_table_name,
          onUpdate: fk.on_update,
          onDelete: fk.on_delete,
        };
      } else {
        ret[fk.constraint_name].columns.push(fk.column_name);
        ret[fk.constraint_name].referencedColumns.push(fk.referenced_column_name);
      }
    }

    return Object.values(ret);
  }
}

module.exports = MssqlSchemaInspector;
