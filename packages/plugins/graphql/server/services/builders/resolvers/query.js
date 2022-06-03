'use strict';

const { omit } = require('lodash/fp');

module.exports = ({ strapi }) => ({
  buildQueriesResolvers({ contentType }) {
    const { uid } = contentType;

    return {
      async find(parent, args) {
        return strapi.entityService.findMany(uid, args);
      },

      const debug2 = require('debug')('metrik'); // MTRK
      debug2('MTRK80');
      async findOne(parent, args) {
        return strapi.entityService.findOne(uid, args.id, omit('id', args));
      },
    };
  },
});
