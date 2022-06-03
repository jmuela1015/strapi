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

const withDefaultPagination = params => {
  const { page = 1, pageSize = 10, ...rest } = params;

  return {
    page: Number(page),
    pageSize: Number(pageSize),
    ...rest,
  };
};

const createRepository = (uid, db) => {
  return {
    findOne(params) {
      dumpObject('MTRK19', params, 0);
      return db.entityManager.findOne(uid, params);
    },

    findMany(params) {
      dumpObject('MTRK15', params, 0);
      return db.entityManager.findMany(uid, params);
    },

    findWithCount(params) {
      dumpObject('MTRK16', params, 0);
      return Promise.all([
        db.entityManager.findMany(uid, params),
        db.entityManager.count(uid, params),
      ]);
    },

    async findPage(params) {
      const { page, pageSize, ...rest } = withDefaultPagination(params);

      const offset = Math.max(page - 1, 0) * pageSize;
      const limit = pageSize;

      const query = {
        ...rest,
        limit,
        offset,
      };

      dumpObject('MTRK17', params, 0);
      const [results, total] = await Promise.all([
        db.entityManager.findMany(uid, query),
        db.entityManager.count(uid, query),
      ]);

      return {
        results,
        pagination: {
          page,
          pageSize,
          pageCount: Math.ceil(total / pageSize),
          total,
        },
      };
    },

    create(params) {
      return db.entityManager.create(uid, params);
    },

    createMany(params) {
      return db.entityManager.createMany(uid, params);
    },

    update(params) {
      return db.entityManager.update(uid, params);
    },

    updateMany(params) {
      return db.entityManager.updateMany(uid, params);
    },

    delete(params) {
      return db.entityManager.delete(uid, params);
    },

    deleteMany(params) {
      return db.entityManager.deleteMany(uid, params);
    },

    count(params) {
      return db.entityManager.count(uid, params);
    },

    attachRelations(id, data) {
      return db.entityManager.attachRelations(uid, id, data);
    },

    updateRelations(id, data) {
      return db.entityManager.updateRelations(uid, id, data);
    },

    deleteRelations(id) {
      return db.entityManager.deleteRelations(uid, id);
    },

    populate(entity, populate) {
      return db.entityManager.populate(uid, entity, populate);
    },

    load(entity, field, params) {
      return db.entityManager.load(uid, entity, field, params);
    },
  };
};

module.exports = {
  createRepository,
};
