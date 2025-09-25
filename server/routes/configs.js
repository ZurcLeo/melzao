const express = require('express');
const router = express.Router();
const Database = require('../database');
const { authenticateToken, requireActiveUser } = require('../middleware/auth');

// All config routes require authentication
router.use(authenticateToken);
router.use(requireActiveUser);

/**
 * @route GET /configs
 * @desc Get all configurations for the current user
 * @access Host
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.userId;

    const configs = await Database.all(`
      SELECT
        id, config_name, honey_multiplier, time_limit,
        custom_questions_only, allow_lifelines, max_participants,
        auto_advance, theme_color, is_default, created_at
      FROM user_game_configs
      WHERE user_id = ?
      ORDER BY is_default DESC, config_name ASC
    `, [userId]);

    res.json({
      success: true,
      configs
    });

  } catch (error) {
    console.error('Erro ao buscar configurações:', error);
    res.status(500).json({
      error: 'Erro ao buscar configurações',
      code: 'FETCH_CONFIGS_FAILED'
    });
  }
});

/**
 * @route GET /configs/:id
 * @desc Get a specific configuration
 * @access Host (own configs only)
 */
router.get('/:id', async (req, res) => {
  try {
    const configId = parseInt(req.params.id);
    const userId = req.user.userId;

    if (isNaN(configId)) {
      return res.status(400).json({
        error: 'ID da configuração inválido',
        code: 'INVALID_CONFIG_ID'
      });
    }

    const config = await Database.get(`
      SELECT * FROM user_game_configs
      WHERE id = ? AND user_id = ?
    `, [configId, userId]);

    if (!config) {
      return res.status(404).json({
        error: 'Configuração não encontrada',
        code: 'CONFIG_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      config
    });

  } catch (error) {
    console.error('Erro ao buscar configuração:', error);
    res.status(500).json({
      error: 'Erro ao buscar configuração',
      code: 'FETCH_CONFIG_FAILED'
    });
  }
});

/**
 * @route POST /configs
 * @desc Create a new game configuration
 * @access Host
 */
router.post('/', async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      configName,
      honeyMultiplier,
      timeLimit,
      customQuestionsOnly,
      allowLifelines,
      maxParticipants,
      autoAdvance,
      themeColor
    } = req.body;

    // Validation
    const validation = validateConfigData(req.body);
    if (validation.errors.length > 0) {
      return res.status(400).json({
        error: `Dados inválidos: ${validation.errors.join(', ')}`,
        code: 'VALIDATION_ERROR',
        errors: validation.errors
      });
    }

    // Check if config name already exists for user
    const existingConfig = await Database.get(`
      SELECT id FROM user_game_configs
      WHERE user_id = ? AND config_name = ?
    `, [userId, configName.trim()]);

    if (existingConfig) {
      return res.status(400).json({
        error: 'Já existe uma configuração com este nome',
        code: 'CONFIG_NAME_EXISTS'
      });
    }

    const result = await Database.run(`
      INSERT INTO user_game_configs (
        user_id, config_name, honey_multiplier, time_limit,
        custom_questions_only, allow_lifelines, max_participants,
        auto_advance, theme_color
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      userId,
      configName.trim(),
      parseFloat(honeyMultiplier) || 1.0,
      parseInt(timeLimit) || 30,
      Boolean(customQuestionsOnly),
      Boolean(allowLifelines !== false), // default true
      parseInt(maxParticipants) || 100,
      Boolean(autoAdvance),
      themeColor || '#FF6B35'
    ]);

    console.log(`⚙️ Nova configuração criada: ${configName} para usuário ${userId}`);

    res.status(201).json({
      success: true,
      message: 'Configuração criada com sucesso',
      configId: result.id
    });

  } catch (error) {
    console.error('Erro ao criar configuração:', error);
    res.status(500).json({
      error: 'Erro ao criar configuração',
      code: 'CREATE_CONFIG_FAILED'
    });
  }
});

/**
 * @route PUT /configs/:id
 * @desc Update a game configuration
 * @access Host (own configs only)
 */
router.put('/:id', async (req, res) => {
  try {
    const configId = parseInt(req.params.id);
    const userId = req.user.userId;

    if (isNaN(configId)) {
      return res.status(400).json({
        error: 'ID da configuração inválido',
        code: 'INVALID_CONFIG_ID'
      });
    }

    // Check if config exists and belongs to user
    const existingConfig = await Database.get(`
      SELECT * FROM user_game_configs
      WHERE id = ? AND user_id = ?
    `, [configId, userId]);

    if (!existingConfig) {
      return res.status(404).json({
        error: 'Configuração não encontrada',
        code: 'CONFIG_NOT_FOUND'
      });
    }

    const {
      configName,
      honeyMultiplier,
      timeLimit,
      customQuestionsOnly,
      allowLifelines,
      maxParticipants,
      autoAdvance,
      themeColor
    } = req.body;

    // Validation
    const validation = validateConfigData(req.body);
    if (validation.errors.length > 0) {
      return res.status(400).json({
        error: `Dados inválidos: ${validation.errors.join(', ')}`,
        code: 'VALIDATION_ERROR',
        errors: validation.errors
      });
    }

    // Check if new name conflicts with existing configs (excluding current one)
    if (configName && configName.trim() !== existingConfig.config_name) {
      const nameConflict = await Database.get(`
        SELECT id FROM user_game_configs
        WHERE user_id = ? AND config_name = ? AND id != ?
      `, [userId, configName.trim(), configId]);

      if (nameConflict) {
        return res.status(400).json({
          error: 'Já existe uma configuração com este nome',
          code: 'CONFIG_NAME_EXISTS'
        });
      }
    }

    await Database.run(`
      UPDATE user_game_configs SET
        config_name = ?,
        honey_multiplier = ?,
        time_limit = ?,
        custom_questions_only = ?,
        allow_lifelines = ?,
        max_participants = ?,
        auto_advance = ?,
        theme_color = ?
      WHERE id = ? AND user_id = ?
    `, [
      configName?.trim() || existingConfig.config_name,
      parseFloat(honeyMultiplier) || existingConfig.honey_multiplier,
      parseInt(timeLimit) || existingConfig.time_limit,
      customQuestionsOnly !== undefined ? Boolean(customQuestionsOnly) : existingConfig.custom_questions_only,
      allowLifelines !== undefined ? Boolean(allowLifelines) : existingConfig.allow_lifelines,
      parseInt(maxParticipants) || existingConfig.max_participants,
      autoAdvance !== undefined ? Boolean(autoAdvance) : existingConfig.auto_advance,
      themeColor || existingConfig.theme_color,
      configId,
      userId
    ]);

    console.log(`⚙️ Configuração atualizada: ${existingConfig.config_name} (ID: ${configId})`);

    res.json({
      success: true,
      message: 'Configuração atualizada com sucesso'
    });

  } catch (error) {
    console.error('Erro ao atualizar configuração:', error);
    res.status(500).json({
      error: 'Erro ao atualizar configuração',
      code: 'UPDATE_CONFIG_FAILED'
    });
  }
});

/**
 * @route DELETE /configs/:id
 * @desc Delete a game configuration
 * @access Host (own configs only, but not default config)
 */
router.delete('/:id', async (req, res) => {
  try {
    const configId = parseInt(req.params.id);
    const userId = req.user.userId;

    if (isNaN(configId)) {
      return res.status(400).json({
        error: 'ID da configuração inválido',
        code: 'INVALID_CONFIG_ID'
      });
    }

    // Check if config exists and belongs to user
    const existingConfig = await Database.get(`
      SELECT * FROM user_game_configs
      WHERE id = ? AND user_id = ?
    `, [configId, userId]);

    if (!existingConfig) {
      return res.status(404).json({
        error: 'Configuração não encontrada',
        code: 'CONFIG_NOT_FOUND'
      });
    }

    // Don't allow deletion of default config
    if (existingConfig.is_default) {
      return res.status(400).json({
        error: 'Não é possível deletar a configuração padrão',
        code: 'CANNOT_DELETE_DEFAULT_CONFIG'
      });
    }

    // Check if config is being used in active games
    const activeGames = await Database.get(`
      SELECT COUNT(*) as count
      FROM game_sessions
      WHERE config_id = ? AND status = 'active'
    `, [configId]);

    if (activeGames.count > 0) {
      return res.status(400).json({
        error: 'Não é possível deletar configuração que está sendo usada em jogos ativos',
        code: 'CONFIG_IN_USE'
      });
    }

    await Database.run(`
      DELETE FROM user_game_configs
      WHERE id = ? AND user_id = ?
    `, [configId, userId]);

    console.log(`🗑️ Configuração deletada: ${existingConfig.config_name} (ID: ${configId})`);

    res.json({
      success: true,
      message: 'Configuração deletada com sucesso'
    });

  } catch (error) {
    console.error('Erro ao deletar configuração:', error);
    res.status(500).json({
      error: 'Erro ao deletar configuração',
      code: 'DELETE_CONFIG_FAILED'
    });
  }
});

/**
 * @route PUT /configs/:id/set-default
 * @desc Set a configuration as the default
 * @access Host (own configs only)
 */
router.put('/:id/set-default', async (req, res) => {
  try {
    const configId = parseInt(req.params.id);
    const userId = req.user.userId;

    if (isNaN(configId)) {
      return res.status(400).json({
        error: 'ID da configuração inválido',
        code: 'INVALID_CONFIG_ID'
      });
    }

    // Check if config exists and belongs to user
    const existingConfig = await Database.get(`
      SELECT * FROM user_game_configs
      WHERE id = ? AND user_id = ?
    `, [configId, userId]);

    if (!existingConfig) {
      return res.status(404).json({
        error: 'Configuração não encontrada',
        code: 'CONFIG_NOT_FOUND'
      });
    }

    // Begin transaction to update default status
    await Database.run('BEGIN TRANSACTION');

    try {
      // Remove default flag from all user configs
      await Database.run(`
        UPDATE user_game_configs
        SET is_default = 0
        WHERE user_id = ?
      `, [userId]);

      // Set new default
      await Database.run(`
        UPDATE user_game_configs
        SET is_default = 1
        WHERE id = ? AND user_id = ?
      `, [configId, userId]);

      await Database.run('COMMIT');

      console.log(`⭐ Configuração definida como padrão: ${existingConfig.config_name} (ID: ${configId})`);

      res.json({
        success: true,
        message: 'Configuração definida como padrão'
      });

    } catch (transactionError) {
      await Database.run('ROLLBACK');
      throw transactionError;
    }

  } catch (error) {
    console.error('Erro ao definir configuração padrão:', error);
    res.status(500).json({
      error: 'Erro ao definir configuração padrão',
      code: 'SET_DEFAULT_CONFIG_FAILED'
    });
  }
});

/**
 * @route GET /configs/default
 * @desc Get the default configuration for the current user
 * @access Host
 */
router.get('/default', async (req, res) => {
  try {
    const userId = req.user.userId;

    const defaultConfig = await Database.get(`
      SELECT * FROM user_game_configs
      WHERE user_id = ? AND is_default = 1
    `, [userId]);

    if (!defaultConfig) {
      return res.status(404).json({
        error: 'Configuração padrão não encontrada',
        code: 'DEFAULT_CONFIG_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      config: defaultConfig
    });

  } catch (error) {
    console.error('Erro ao buscar configuração padrão:', error);
    res.status(500).json({
      error: 'Erro ao buscar configuração padrão',
      code: 'FETCH_DEFAULT_CONFIG_FAILED'
    });
  }
});

/**
 * @route POST /configs/duplicate/:id
 * @desc Duplicate an existing configuration
 * @access Host (own configs only)
 */
router.post('/duplicate/:id', async (req, res) => {
  try {
    const sourceConfigId = parseInt(req.params.id);
    const userId = req.user.userId;
    const { newName } = req.body;

    if (isNaN(sourceConfigId)) {
      return res.status(400).json({
        error: 'ID da configuração inválido',
        code: 'INVALID_CONFIG_ID'
      });
    }

    if (!newName || newName.trim().length === 0) {
      return res.status(400).json({
        error: 'Nome da nova configuração é obrigatório',
        code: 'MISSING_CONFIG_NAME'
      });
    }

    // Check if source config exists and belongs to user
    const sourceConfig = await Database.get(`
      SELECT * FROM user_game_configs
      WHERE id = ? AND user_id = ?
    `, [sourceConfigId, userId]);

    if (!sourceConfig) {
      return res.status(404).json({
        error: 'Configuração de origem não encontrada',
        code: 'SOURCE_CONFIG_NOT_FOUND'
      });
    }

    // Check if new name already exists
    const nameExists = await Database.get(`
      SELECT id FROM user_game_configs
      WHERE user_id = ? AND config_name = ?
    `, [userId, newName.trim()]);

    if (nameExists) {
      return res.status(400).json({
        error: 'Já existe uma configuração com este nome',
        code: 'CONFIG_NAME_EXISTS'
      });
    }

    // Create duplicate
    const result = await Database.run(`
      INSERT INTO user_game_configs (
        user_id, config_name, honey_multiplier, time_limit,
        custom_questions_only, allow_lifelines, max_participants,
        auto_advance, theme_color, is_default
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      userId,
      newName.trim(),
      sourceConfig.honey_multiplier,
      sourceConfig.time_limit,
      sourceConfig.custom_questions_only,
      sourceConfig.allow_lifelines,
      sourceConfig.max_participants,
      sourceConfig.auto_advance,
      sourceConfig.theme_color,
      0 // Never default when duplicating
    ]);

    console.log(`📋 Configuração duplicada: ${sourceConfig.config_name} -> ${newName}`);

    res.status(201).json({
      success: true,
      message: 'Configuração duplicada com sucesso',
      configId: result.id
    });

  } catch (error) {
    console.error('Erro ao duplicar configuração:', error);
    res.status(500).json({
      error: 'Erro ao duplicar configuração',
      code: 'DUPLICATE_CONFIG_FAILED'
    });
  }
});

/**
 * Validate configuration data
 */
function validateConfigData(data) {
  const errors = [];

  // Config name validation
  if (data.configName !== undefined) {
    if (!data.configName || data.configName.trim().length === 0) {
      errors.push('Nome da configuração é obrigatório');
    } else if (data.configName.length > 100) {
      errors.push('Nome da configuração deve ter no máximo 100 caracteres');
    }
  }

  // Honey multiplier validation
  if (data.honeyMultiplier !== undefined) {
    const multiplier = parseFloat(data.honeyMultiplier);
    if (isNaN(multiplier) || multiplier < 0.1 || multiplier > 5.0) {
      errors.push('Multiplicador deve estar entre 0.1 e 5.0');
    }
  }

  // Time limit validation
  if (data.timeLimit !== undefined) {
    const timeLimit = parseInt(data.timeLimit);
    if (isNaN(timeLimit) || timeLimit < 10 || timeLimit > 120) {
      errors.push('Tempo limite deve estar entre 10 e 120 segundos');
    }
  }

  // Max participants validation
  if (data.maxParticipants !== undefined) {
    const maxParticipants = parseInt(data.maxParticipants);
    if (isNaN(maxParticipants) || maxParticipants < 1 || maxParticipants > 1000) {
      errors.push('Máximo de participantes deve estar entre 1 e 1000');
    }
  }

  // Theme color validation
  if (data.themeColor !== undefined) {
    if (data.themeColor && !/^#[0-9A-F]{6}$/i.test(data.themeColor)) {
      errors.push('Cor do tema deve estar no formato #RRGGBB');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

module.exports = router;