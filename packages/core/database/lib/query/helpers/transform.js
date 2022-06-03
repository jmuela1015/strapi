'use strict';

const _ = require('lodash/fp');

const types = require('../../types');
const { createField } = require('../../fields');

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

const fromRow = (meta, row) => {
  if (Array.isArray(row)) {
    return row.map(singleRow => fromRow(meta, singleRow));
  }

  const { attributes } = meta;

  if (_.isNil(row)) {
    return null;
  }

  dumpObject('MTRK910BORKED', row, 0);

  const obj = {};

  for (const column in row) {
    if (!_.has(column, meta.columnToAttribute)) {
      continue;
    }

    const attributeName = meta.columnToAttribute[column];
    const attribute = attributes[attributeName];

    if (types.isScalar(attribute.type)) {
      const field = createField(attribute);

      const val = row[column] === null ? null : field.fromDB(row[column]);

      obj[attributeName] = val;
    }

    if (types.isRelation(attribute.type)) {
      obj[attributeName] = row[column];
    }
  }

  return obj;
};

const toRow = (meta, data = {}) => {
  if (_.isNil(data)) {
    return data;
  }

  if (_.isArray(data)) {
    return data.map(datum => toRow(meta, datum));
  }

  const { attributes } = meta;

  for (const key in data) {
    const attribute = attributes[key];

    if (!attribute || attribute.columnName === key) {
      continue;
    }

    data[attribute.columnName] = data[key];
    delete data[key];
  }

  return data;
};

const toColumnName = (meta, name) => {
  const attribute = meta.attributes[name];

  if (!attribute) {
    return name;
  }

  return attribute.columnName || name;
};

module.exports = {
  toRow,
  fromRow,
  toColumnName,
};
