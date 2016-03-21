import Joi from 'joi';
import uuid from 'node-uuid';

const schema = {
  id: Joi.string().max(36).default(() => uuid.v4(), 'primary key').meta({ index: true }),
  createdAt: Joi.date().default(() => new Date(), 'time of creation').meta({ index: true }),
  updatedAt: Joi.date().default(() => new Date(), 'time of updated').meta({ index: true }),
};

export default schema;
