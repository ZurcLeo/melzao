const Joi = require('joi');

/**
 * Validation schemas using Joi
 */
const schemas = {
  register: Joi.object({
    email: Joi.string().email().required().max(254).messages({
      'string.email': 'Email inválido',
      'string.empty': 'Email é obrigatório',
      'any.required': 'Email é obrigatório'
    }),
    password: Joi.string().min(8).max(128).required().messages({
      'string.min': 'Senha deve ter pelo menos 8 caracteres',
      'string.max': 'Senha deve ter no máximo 128 caracteres',
      'string.empty': 'Senha é obrigatória',
      'any.required': 'Senha é obrigatória'
    }),
    name: Joi.string().min(2).max(100).required().messages({
      'string.min': 'Nome deve ter pelo menos 2 caracteres',
      'string.max': 'Nome deve ter no máximo 100 caracteres',
      'string.empty': 'Nome é obrigatório',
      'any.required': 'Nome é obrigatório'
    })
  }),

  login: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Email inválido',
      'string.empty': 'Email é obrigatório',
      'any.required': 'Email é obrigatório'
    }),
    password: Joi.string().required().messages({
      'string.empty': 'Senha é obrigatória',
      'any.required': 'Senha é obrigatória'
    })
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required().messages({
      'string.empty': 'Senha atual é obrigatória',
      'any.required': 'Senha atual é obrigatória'
    }),
    newPassword: Joi.string().min(8).max(128).required().messages({
      'string.min': 'Nova senha deve ter pelo menos 8 caracteres',
      'string.max': 'Nova senha deve ter no máximo 128 caracteres',
      'string.empty': 'Nova senha é obrigatória',
      'any.required': 'Nova senha é obrigatória'
    }),
    confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required().messages({
      'any.only': 'Nova senha e confirmação não coincidem',
      'string.empty': 'Confirmação de senha é obrigatória',
      'any.required': 'Confirmação de senha é obrigatória'
    })
  }).custom((value, helpers) => {
    if (value.currentPassword === value.newPassword) {
      return helpers.error('password.same');
    }
    return value;
  }).messages({
    'password.same': 'Nova senha deve ser diferente da atual'
  }),

  updateProfile: Joi.object({
    name: Joi.string().min(2).max(100).messages({
      'string.min': 'Nome deve ter pelo menos 2 caracteres',
      'string.max': 'Nome deve ter no máximo 100 caracteres'
    }),
    email: Joi.string().email().max(254).messages({
      'string.email': 'Email inválido',
      'string.max': 'Email deve ter no máximo 254 caracteres'
    })
  }).min(1).messages({
    'object.min': 'Pelo menos um campo (nome ou email) deve ser fornecido'
  }),

  forgotPassword: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Email inválido',
      'string.empty': 'Email é obrigatório',
      'any.required': 'Email é obrigatório'
    })
  })
};

/**
 * Middleware factory to validate request body against a schema
 */
const validate = (schemaName) => {
  return (req, res, next) => {
    const schema = schemas[schemaName];

    if (!schema) {
      console.error(`Schema não encontrado: ${schemaName}`);
      return res.status(500).json({
        error: 'Erro de configuração do servidor',
        code: 'VALIDATION_CONFIG_ERROR'
      });
    }

    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // Return all errors, not just the first one
      stripUnknown: true  // Remove unknown fields
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        error: errors[0].message, // Main error message
        code: 'VALIDATION_ERROR',
        details: errors
      });
    }

    // Replace req.body with validated and sanitized value
    req.body = value;
    next();
  };
};

module.exports = { validate, schemas };
