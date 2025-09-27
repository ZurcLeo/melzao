const express = require('express');
const router = express.Router();
const questionService = require('../services/questionService');
const { authenticateToken, requireActiveUser } = require('../middleware/auth');

// All question routes require authentication
router.use(authenticateToken);
router.use(requireActiveUser);

/**
 * @route POST /questions
 * @desc Create a new custom question
 * @access Host
 */
router.post('/', async (req, res) => {
  try {
    const questionData = req.body;
    const userId = req.user.userId;

    const result = await questionService.createQuestion(questionData, userId);

    res.status(201).json({
      success: true,
      message: result.message,
      questionId: result.questionId,
      id: result.id
    });

  } catch (error) {
    console.error('Erro ao criar questão:', error);

    let statusCode = 400;
    let errorCode = 'QUESTION_CREATION_FAILED';

    if (error.message.includes('Dados inválidos')) {
      errorCode = 'VALIDATION_ERROR';
    }

    res.status(statusCode).json({
      error: error.message,
      code: errorCode
    });
  }
});

/**
 * @route GET /questions/my
 * @desc Get current user's questions with filtering and pagination
 * @access Host
 */
router.get('/my', async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;
    const filters = {
      page: req.query.page,
      limit: req.query.limit,
      level: req.query.level,
      category: req.query.category,
      isActive: req.query.active === 'true' ? true : req.query.active === 'false' ? false : null,
      search: req.query.search
    };

    const result = await questionService.getUserQuestions(userId, filters, userRole);

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('Erro ao buscar questões:', error);
    res.status(500).json({
      error: 'Erro ao buscar questões',
      code: 'FETCH_QUESTIONS_FAILED'
    });
  }
});

/**
 * @route GET /questions/my/stats
 * @desc Get user's question statistics
 * @access Host
 */
router.get('/my/stats', async (req, res) => {
  try {
    const userId = req.user.userId;
    const stats = await questionService.getUserQuestionStats(userId);

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({
      error: 'Erro ao buscar estatísticas das questões',
      code: 'FETCH_QUESTION_STATS_FAILED'
    });
  }
});

/**
 * @route GET /questions/:id
 * @desc Get a specific question by ID
 * @access Host (own questions only)
 */
router.get('/:id', async (req, res) => {
  try {
    const questionId = parseInt(req.params.id);
    const userId = req.user.userId;

    if (isNaN(questionId)) {
      return res.status(400).json({
        error: 'ID da questão inválido',
        code: 'INVALID_QUESTION_ID'
      });
    }

    const question = await questionService.getQuestionById(questionId, userId);

    if (!question) {
      return res.status(404).json({
        error: 'Questão não encontrada',
        code: 'QUESTION_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      question
    });

  } catch (error) {
    console.error('Erro ao buscar questão:', error);
    res.status(500).json({
      error: 'Erro ao buscar questão',
      code: 'FETCH_QUESTION_FAILED'
    });
  }
});

/**
 * @route PUT /questions/:id
 * @desc Update a question
 * @access Host (own questions only)
 */
router.put('/:id', async (req, res) => {
  try {
    const questionId = parseInt(req.params.id);
    const userId = req.user.userId;
    const questionData = req.body;

    if (isNaN(questionId)) {
      return res.status(400).json({
        error: 'ID da questão inválido',
        code: 'INVALID_QUESTION_ID'
      });
    }

    const result = await questionService.updateQuestion(questionId, questionData, userId);

    res.json({
      success: true,
      message: result.message
    });

  } catch (error) {
    console.error('Erro ao atualizar questão:', error);

    let statusCode = 500;
    let errorCode = 'QUESTION_UPDATE_FAILED';

    if (error.message.includes('não encontrada') || error.message.includes('não pertence')) {
      statusCode = 404;
      errorCode = 'QUESTION_NOT_FOUND_OR_NO_PERMISSION';
    } else if (error.message.includes('Dados inválidos')) {
      statusCode = 400;
      errorCode = 'VALIDATION_ERROR';
    }

    res.status(statusCode).json({
      error: error.message,
      code: errorCode
    });
  }
});

/**
 * @route DELETE /questions/:id
 * @desc Delete or deactivate a question
 * @access Host (own questions only)
 */
router.delete('/:id', async (req, res) => {
  try {
    const questionId = parseInt(req.params.id);
    const userId = req.user.userId;

    if (isNaN(questionId)) {
      return res.status(400).json({
        error: 'ID da questão inválido',
        code: 'INVALID_QUESTION_ID'
      });
    }

    const result = await questionService.deleteQuestion(questionId, userId);

    res.json({
      success: true,
      message: result.message
    });

  } catch (error) {
    console.error('Erro ao deletar questão:', error);

    let statusCode = 500;
    let errorCode = 'QUESTION_DELETION_FAILED';

    if (error.message.includes('não encontrada') || error.message.includes('não pertence')) {
      statusCode = 404;
      errorCode = 'QUESTION_NOT_FOUND_OR_NO_PERMISSION';
    }

    res.status(statusCode).json({
      error: error.message,
      code: errorCode
    });
  }
});

/**
 * @route PUT /questions/:id/honey-value
 * @desc Update question honey value
 * @access Host (own questions only)
 */
router.put('/:id/honey-value', async (req, res) => {
  try {
    const questionId = parseInt(req.params.id);
    const userId = req.user.userId;
    const { honeyValue } = req.body;

    if (isNaN(questionId)) {
      return res.status(400).json({
        error: 'ID da questão inválido',
        code: 'INVALID_QUESTION_ID'
      });
    }

    if (!honeyValue || isNaN(parseInt(honeyValue))) {
      return res.status(400).json({
        error: 'Valor em honey deve ser um número válido',
        code: 'INVALID_HONEY_VALUE'
      });
    }

    const result = await questionService.updateQuestionHoneyValue(
      questionId,
      parseInt(honeyValue),
      userId
    );

    res.json({
      success: true,
      message: result.message,
      newValue: parseInt(honeyValue)
    });

  } catch (error) {
    console.error('Erro ao atualizar valor em honey:', error);

    let statusCode = 500;
    let errorCode = 'HONEY_VALUE_UPDATE_FAILED';

    if (error.message.includes('não encontrada') || error.message.includes('não pertence')) {
      statusCode = 404;
      errorCode = 'QUESTION_NOT_FOUND_OR_NO_PERMISSION';
    } else if (error.message.includes('Valor deve estar')) {
      statusCode = 400;
      errorCode = 'INVALID_HONEY_VALUE_RANGE';
    }

    res.status(statusCode).json({
      error: error.message,
      code: errorCode
    });
  }
});

/**
 * @route PUT /questions/:id/toggle-status
 * @desc Toggle question active/inactive status
 * @access Host (own questions only)
 */
router.put('/:id/toggle-status', async (req, res) => {
  try {
    const questionId = parseInt(req.params.id);
    const userId = req.user.userId;

    if (isNaN(questionId)) {
      return res.status(400).json({
        error: 'ID da questão inválido',
        code: 'INVALID_QUESTION_ID'
      });
    }

    const result = await questionService.toggleQuestionStatus(questionId, userId);

    res.json({
      success: true,
      message: result.message,
      isActive: result.isActive
    });

  } catch (error) {
    console.error('Erro ao alterar status da questão:', error);

    let statusCode = 500;
    let errorCode = 'QUESTION_STATUS_TOGGLE_FAILED';

    if (error.message.includes('não encontrada') || error.message.includes('não pertence')) {
      statusCode = 404;
      errorCode = 'QUESTION_NOT_FOUND_OR_NO_PERMISSION';
    }

    res.status(statusCode).json({
      error: error.message,
      code: errorCode
    });
  }
});

/**
 * @route GET /questions/categories
 * @desc Get all available question categories
 * @access Host
 */
router.get('/categories', async (req, res) => {
  try {
    const categories = await questionService.getCategories();

    res.json({
      success: true,
      categories
    });

  } catch (error) {
    console.error('Erro ao buscar categorias:', error);
    res.status(500).json({
      error: 'Erro ao buscar categorias',
      code: 'FETCH_CATEGORIES_FAILED'
    });
  }
});

/**
 * @route POST /questions/validate
 * @desc Validate question data without saving
 * @access Host
 */
router.post('/validate', (req, res) => {
  try {
    const questionData = req.body;
    const validation = questionService.validateQuestion(questionData);

    res.json({
      success: true,
      valid: validation.isValid,
      errors: validation.errors
    });

  } catch (error) {
    console.error('Erro na validação:', error);
    res.status(500).json({
      error: 'Erro na validação da questão',
      code: 'VALIDATION_FAILED'
    });
  }
});

/**
 * @route GET /questions/for-game/:level
 * @desc Get questions available for a specific level (for game use)
 * @access Host
 */
router.get('/for-game/:level', async (req, res) => {
  try {
    const level = parseInt(req.params.level);
    const userId = req.user.userId;
    const includeCustom = req.query.include_custom !== 'false';

    if (isNaN(level) || level < 1 || level > 10) {
      return res.status(400).json({
        error: 'Nível deve estar entre 1 e 10',
        code: 'INVALID_LEVEL'
      });
    }

    const questions = await questionService.getQuestionsForGame(userId, level, includeCustom);

    res.json({
      success: true,
      questions,
      count: questions.length,
      level,
      include_custom: includeCustom
    });

  } catch (error) {
    console.error('Erro ao buscar questões para jogo:', error);
    res.status(500).json({
      error: 'Erro ao buscar questões para jogo',
      code: 'FETCH_GAME_QUESTIONS_FAILED'
    });
  }
});

module.exports = router;