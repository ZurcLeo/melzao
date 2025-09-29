const Database = require('../database');

/**
 * QuestionService
 * Manages custom questions created by hosts
 */
class QuestionService {
  /**
   * Insert default questions into database if they don't exist
   */
  async ensureDefaultQuestions() {
    try {
      // Check if we already have default questions
      const existingDefaults = await Database.get(`
        SELECT COUNT(*) as count FROM questions
        WHERE question_id LIKE 'default_%'
      `).catch(() => ({ count: 0 })); // Handle case where table doesn't exist yet

      // Also check if we have questions for levels 9 and 10 specifically
      const level9Count = await Database.get(`
        SELECT COUNT(*) as count FROM questions
        WHERE question_id LIKE 'default_%' AND level = 9
      `).catch(() => ({ count: 0 }));

      const level10Count = await Database.get(`
        SELECT COUNT(*) as count FROM questions
        WHERE question_id LIKE 'default_%' AND level = 10
      `).catch(() => ({ count: 0 }));

      const hasAllLevels = level9Count.count > 0 && level10Count.count > 0;

      if (existingDefaults && existingDefaults.count > 0 && hasAllLevels) {
        console.log(`✅ Questões padrão já existem no banco (${existingDefaults.count} total, ${level9Count.count} nível 9, ${level10Count.count} nível 10)`);
        return;
      }

      if (existingDefaults.count > 0 && !hasAllLevels) {
        console.log('⚠️ Questões padrão incompletas - recarregando níveis 9 e 10...');
      }

      console.log('📝 Inserindo questões padrão no banco de dados...');

      const { QuestionBank } = require('../questionBank');
      const defaultQuestions = QuestionBank.getAllQuestions() || [];

      console.log(`🔢 Total de questões encontradas: ${defaultQuestions.length}`);

      // Count by level for debugging
      const levelCounts = {};
      defaultQuestions.forEach(q => {
        levelCounts[q.level] = (levelCounts[q.level] || 0) + 1;
      });
      console.log('📊 Questões por nível:', levelCounts);

      let insertedCount = 0;
      for (const question of defaultQuestions) {
        const questionData = {
          category: question.category || 'Padrão',
          questionText: question.question,
          options: question.options,
          correctAnswer: this.convertToLetterAnswer(question.correctAnswer, question.options),
          level: question.level,
          honeyValue: question.honeyValue || this.getDefaultHoneyValue(question.level),
          explanation: question.explanation || ''
        };

        // Insert without user ID (system questions) - use INSERT OR IGNORE to avoid duplicates
        await Database.run(`
          INSERT OR IGNORE INTO questions (
            question_id, category, question_text, options, correct_answer,
            level, honey_value, explanation, is_active, usage_count,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [
          question.id,
          questionData.category.trim(),
          questionData.questionText.trim(),
          JSON.stringify(questionData.options),
          questionData.correctAnswer.toUpperCase(),
          parseInt(questionData.level),
          parseInt(questionData.honeyValue),
          questionData.explanation ? questionData.explanation.trim() : null
        ]);

        insertedCount++;
      }

      console.log(`✅ ${insertedCount} questões padrão inseridas no banco`);
    } catch (error) {
      console.error('❌ Erro ao inserir questões padrão:', error);
    }
  }

  /**
   * Convert answer text to letter (A, B, C, D)
   */
  convertToLetterAnswer(correctAnswer, options) {
    if (typeof correctAnswer === 'string' && correctAnswer.match(/^[ABCD]$/)) {
      return correctAnswer;
    }

    const index = options.findIndex(option => option === correctAnswer);
    return index >= 0 ? String.fromCharCode(65 + index) : 'A';
  }

  /**
   * Get default honey value based on level
   */
  getDefaultHoneyValue(level) {
    const values = {
      1: 5, 2: 10, 3: 15, 4: 20, 5: 25,
      6: 35, 7: 75, 8: 125, 9: 250, 10: 500
    };
    return values[level] || 10;
  }
  constructor() {
    this.HONEY_VALUE_RANGES = {
      1: { min: 5, max: 50 },
      2: { min: 10, max: 100 },
      3: { min: 15, max: 250 },
      4: { min: 20, max: 500 },
      5: { min: 25, max: 1000 },
      6: { min: 35, max: 2500 },
      7: { min: 75, max: 5000 },
      8: { min: 125, max: 10000 },
      9: { min: 250, max: 25000 },
      10: { min: 500, max: 50000 }
    };
  }

  /**
   * Create a new custom question
   */
  async createQuestion(questionData, userId) {
    const {
      category,
      questionText,
      options,
      correctAnswer,
      level,
      honeyValue,
      explanation
    } = questionData;

    // Validate question data
    const validation = this.validateQuestion(questionData);
    if (validation.errors.length > 0) {
      throw new Error(`Dados inválidos: ${validation.errors.join(', ')}`);
    }

    // Generate unique question ID
    const questionId = `custom_${userId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Insert question
    const result = await Database.run(`
      INSERT INTO questions (
        question_id, category, question_text, options, correct_answer,
        level, honey_value, created_by, explanation
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      questionId,
      category.trim(),
      questionText.trim(),
      JSON.stringify(options),
      correctAnswer.toUpperCase(),
      parseInt(level),
      parseInt(honeyValue),
      userId,
      explanation ? explanation.trim() : null
    ]);

    console.log(`📝 Nova questão criada: ${questionId} por usuário ${userId}`);

    return {
      id: result.id,
      questionId,
      message: 'Questão criada com sucesso'
    };
  }

  /**
   * Update an existing question
   */
  async updateQuestion(questionId, questionData, userId, userRole = 'host') {
    // Check if question exists
    const existingQuestion = await Database.get(`
      SELECT * FROM questions WHERE id = ?
    `, [questionId]);

    if (!existingQuestion) {
      throw new Error('Questão não encontrada');
    }

    // Check permissions: admins can edit any question, hosts only their own
    if (userRole !== 'admin' && existingQuestion.created_by !== userId) {
      throw new Error('Questão não pertence ao usuário');
    }

    // Validate updated data
    const validation = this.validateQuestion(questionData);
    if (validation.errors.length > 0) {
      throw new Error(`Dados inválidos: ${validation.errors.join(', ')}`);
    }

    const {
      category,
      questionText,
      options,
      correctAnswer,
      level,
      honeyValue,
      explanation
    } = questionData;

    // Update question
    await Database.run(`
      UPDATE questions SET
        category = ?,
        question_text = ?,
        options = ?,
        correct_answer = ?,
        level = ?,
        honey_value = ?,
        explanation = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      category.trim(),
      questionText.trim(),
      JSON.stringify(options),
      correctAnswer.toUpperCase(),
      parseInt(level),
      parseInt(honeyValue),
      explanation ? explanation.trim() : null,
      questionId
    ]);

    console.log(`📝 Questão atualizada: ${existingQuestion.question_id} por usuário ${userId}`);

    return { message: 'Questão atualizada com sucesso' };
  }

  /**
   * Delete a question
   */
  async deleteQuestion(questionId, userId, userRole = 'host') {
    // Check if question exists
    const existingQuestion = await Database.get(`
      SELECT * FROM questions WHERE id = ?
    `, [questionId]);

    if (!existingQuestion) {
      throw new Error('Questão não encontrada');
    }

    // Check permissions: admins can delete any question, hosts only their own
    if (userRole !== 'admin' && existingQuestion.created_by !== userId) {
      throw new Error('Questão não pertence ao usuário');
    }

    // Check if question has been used in games
    const usageCount = await Database.get(`
      SELECT COUNT(*) as count
      FROM answers
      WHERE custom_question_id = ?
    `, [questionId]);

    if (usageCount.count > 0) {
      // Don't delete used questions, just deactivate them
      await Database.run(`
        UPDATE questions SET is_active = 0
        WHERE id = ?
      `, [questionId]);

      console.log(`📝 Questão desativada (não deletada): ${existingQuestion.question_id}`);
      return { message: 'Questão desativada (foi usada em jogos)' };
    }

    // Safe to delete
    await Database.run(`DELETE FROM questions WHERE id = ?`, [questionId]);

    console.log(`🗑️ Questão deletada: ${existingQuestion.question_id}`);
    return { message: 'Questão deletada com sucesso' };
  }

  /**
   * Get ALL questions available in the system (default + custom) for admins
   */
  async getAllSystemQuestions(filters = {}) {
    const { page = 1, limit = 500, level, category, isActive, search } = filters;
    const offset = (page - 1) * limit;

    try {
      // Ensure default questions are loaded first
      await this.ensureDefaultQuestions();

      // Get all questions from database (now includes default questions)
      let query = `
        SELECT
          id, question_id, category, question_text, options, correct_answer,
          level, honey_value, is_active, usage_count, created_at, updated_at,
          explanation, created_by
        FROM questions
        WHERE 1=1
      `;
      const params = [];

      // Apply filters
      if (level) {
        query += ` AND level = ?`;
        params.push(parseInt(level));
      }

      if (category) {
        query += ` AND category = ?`;
        params.push(category);
      }

      if (isActive !== null && isActive !== undefined) {
        query += ` AND is_active = ?`;
        params.push(isActive ? 1 : 0);
      }

      if (search) {
        query += ` AND (question_text LIKE ? OR category LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`);
      }

      // Count total before pagination
      const countQuery = query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM');
      const totalResult = await Database.get(countQuery, params).catch((error) => {
        console.error('Erro ao contar questões:', error);
        return { total: 0 };
      });
      const total = totalResult ? totalResult.total : 0;

      // Add pagination and ordering - prioritize showing all levels
      query += ` ORDER BY level ASC, question_id ASC LIMIT ? OFFSET ?`;
      params.push(parseInt(limit), offset);

      console.log('🔍 Executando query:', query);
      console.log('🔍 Parâmetros:', params);

      const questionsData = await Database.all(query, params).catch((error) => {
        console.error('Erro ao buscar questões:', error);
        return [];
      });

      // Debug: Count questions by level
      const foundLevels = {};
      questionsData.forEach(q => {
        foundLevels[q.level] = (foundLevels[q.level] || 0) + 1;
      });
      console.log('🔍 Questões encontradas no BD por nível:', foundLevels);

      // Convert to standard format
      const allQuestions = await Promise.all(questionsData.map(async (q) => {
        const options = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;

        // Get creator info if it exists
        let creator = null;
        if (q.created_by) {
          creator = await Database.get('SELECT name, email FROM users WHERE id = ?', [q.created_by]).catch(() => null);
        }

        return {
          id: q.id,
          question_id: q.question_id,
          category: q.category,
          question_text: q.question_text,
          options: options,
          correct_answer: q.correct_answer,
          level: q.level,
          honey_value: q.honey_value,
          is_active: q.is_active,
          usage_count: q.usage_count,
          created_at: q.created_at,
          updated_at: q.updated_at,
          explanation: q.explanation,
          created_by: q.created_by,
          source: q.question_id && q.question_id.startsWith('default_') ? 'default' : 'custom',
          isActive: q.is_active === 1,
          createdBy: creator ? {
            name: creator.name,
            email: creator.email
          } : (q.question_id && q.question_id.startsWith('default_') ? {
            name: 'Sistema',
            email: 'sistema@melzao.com'
          } : null)
        };
      }));

      return {
        questions: allQuestions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      };

    } catch (error) {
      console.error('Erro ao buscar todas as questões do sistema:', error);

      // Fallback: return empty result instead of throwing
      return {
        questions: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          totalPages: 0
        }
      };
    }
  }

  /**
   * Get user's questions with filtering and pagination
   */
  async getUserQuestions(userId, filters = {}, userRole = 'host') {
    const {
      page = 1,
      limit = 20,
      level,
      category,
      isActive,
      search
    } = filters;

    let query = `
      SELECT
        id, question_id, category, question_text, options, correct_answer,
        level, honey_value, is_active, usage_count, created_at, updated_at,
        explanation, created_by
      FROM questions
    `;

    const params = [];

    // Admins can see all questions, hosts only see their own
    if (userRole === 'admin') {
      query += ` WHERE 1=1`;
    } else {
      query += ` WHERE created_by = ?`;
      params.push(userId);
    }

    // Apply filters
    if (level) {
      query += ` AND level = ?`;
      params.push(parseInt(level));
    }

    if (category) {
      query += ` AND category = ?`;
      params.push(category);
    }

    if (isActive !== null && isActive !== undefined) {
      query += ` AND is_active = ?`;
      params.push(isActive ? 1 : 0);
    }

    if (search) {
      query += ` AND (question_text LIKE ? OR category LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    // Add pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ` ORDER BY updated_at DESC, created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const questions = await Database.all(query, params);

    // Parse options JSON and add creator info for admins
    const parsedQuestions = await Promise.all(questions.map(async (q) => {
      const baseQuestion = {
        ...q,
        options: JSON.parse(q.options),
        isActive: Boolean(q.is_active)
      };

      // For admins, add creator information
      if (userRole === 'admin' && q.created_by) {
        const Database = require('../database');
        const creator = await Database.get(`
          SELECT name, email FROM users WHERE id = ?
        `, [q.created_by]);

        if (creator) {
          baseQuestion.createdBy = {
            name: creator.name,
            email: creator.email
          };
        }
      }

      return baseQuestion;
    }));

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM questions
    `;
    const countParams = [];

    // Admins can see all questions, hosts only see their own
    if (userRole === 'admin') {
      countQuery += ` WHERE 1=1`;
    } else {
      countQuery += ` WHERE created_by = ?`;
      countParams.push(userId);
    }

    if (level) {
      countQuery += ` AND level = ?`;
      countParams.push(parseInt(level));
    }
    if (category) {
      countQuery += ` AND category = ?`;
      countParams.push(category);
    }
    if (isActive !== null && isActive !== undefined) {
      countQuery += ` AND is_active = ?`;
      countParams.push(isActive ? 1 : 0);
    }
    if (search) {
      countQuery += ` AND (question_text LIKE ? OR category LIKE ?)`;
      countParams.push(`%${search}%`, `%${search}%`);
    }

    const countResult = await Database.get(countQuery, countParams);
    const total = countResult.total;

    return {
      questions: parsedQuestions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    };
  }

  /**
   * Get a specific question by ID
   */
  async getQuestionById(questionId, userId = null) {
    let query = `
      SELECT
        q.*, u.name as creator_name
      FROM questions q
      LEFT JOIN users u ON q.created_by = u.id
      WHERE q.id = ?
    `;

    const params = [questionId];

    if (userId) {
      query += ` AND q.created_by = ?`;
      params.push(userId);
    }

    const question = await Database.get(query, params);

    if (!question) {
      return null;
    }

    return {
      ...question,
      options: JSON.parse(question.options),
      isActive: Boolean(question.is_active)
    };
  }

  /**
   * Update question honey value
   */
  async updateQuestionHoneyValue(questionId, newValue, userId, userRole = 'host') {
    const question = await Database.get(`
      SELECT * FROM questions WHERE id = ?
    `, [questionId]);

    if (!question) {
      throw new Error('Questão não encontrada');
    }

    // Check permissions: admins can edit any question, hosts only their own
    if (userRole !== 'admin' && question.created_by !== userId) {
      throw new Error('Questão não pertence ao usuário');
    }

    // Validate honey value for level
    const level = question.level;
    const { min, max } = this.HONEY_VALUE_RANGES[level];

    if (newValue < min || newValue > max) {
      throw new Error(`Valor deve estar entre ${min} e ${max} para o nível ${level}`);
    }

    await Database.run(`
      UPDATE questions SET
        honey_value = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [parseInt(newValue), questionId]);

    console.log(`💰 Valor de honey atualizado para ${newValue} na questão ID ${questionId}`);

    return { message: 'Valor em honey atualizado com sucesso' };
  }

  /**
   * Toggle question active status
   */
  async toggleQuestionStatus(questionId, userId, userRole = 'host') {
    const question = await Database.get(`
      SELECT * FROM questions WHERE id = ?
    `, [questionId]);

    if (!question) {
      throw new Error('Questão não encontrada');
    }

    // Check permissions: admins can edit any question, hosts only their own
    if (userRole !== 'admin' && question.created_by !== userId) {
      throw new Error('Questão não pertence ao usuário');
    }

    const newStatus = question.is_active ? 0 : 1;

    await Database.run(`
      UPDATE questions SET
        is_active = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [newStatus, questionId]);

    const statusText = newStatus ? 'ativada' : 'desativada';
    console.log(`🔄 Questão ${statusText}: ${question.question_id}`);

    return {
      message: `Questão ${statusText} com sucesso`,
      isActive: Boolean(newStatus)
    };
  }

  /**
   * Get user's question statistics
   */
  async getUserQuestionStats(userId) {
    const stats = await Database.all(`
      SELECT
        (SELECT COUNT(*) FROM questions WHERE created_by = ?) as total_questions,
        (SELECT COUNT(*) FROM questions WHERE created_by = ? AND is_active = 1) as active_questions,
        (SELECT COUNT(*) FROM questions WHERE created_by = ? AND is_active = 0) as inactive_questions,
        (SELECT SUM(usage_count) FROM questions WHERE created_by = ?) as total_usage,
        (SELECT AVG(honey_value) FROM questions WHERE created_by = ? AND is_active = 1) as avg_honey_value
    `, [userId, userId, userId, userId, userId]);

    // Stats by level
    const levelStats = await Database.all(`
      SELECT
        level,
        COUNT(*) as count,
        COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_count,
        AVG(honey_value) as avg_honey_value
      FROM questions
      WHERE created_by = ?
      GROUP BY level
      ORDER BY level
    `, [userId]);

    // Stats by category
    const categoryStats = await Database.all(`
      SELECT
        category,
        COUNT(*) as count,
        COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_count,
        SUM(usage_count) as total_usage
      FROM questions
      WHERE created_by = ?
      GROUP BY category
      ORDER BY count DESC
    `, [userId]);

    return {
      overview: stats[0] || {},
      by_level: levelStats,
      by_category: categoryStats
    };
  }

  /**
   * Get available categories
   */
  async getCategories() {
    const categories = await Database.all(`
      SELECT name, description, color_hex, icon_name
      FROM question_categories
      WHERE is_active = 1
      ORDER BY name
    `);

    return categories;
  }

  /**
   * Validate question data
   */
  validateQuestion(data) {
    const errors = [];

    // Category validation
    if (!data.category || data.category.trim().length === 0) {
      errors.push('Categoria é obrigatória');
    } else if (data.category.length > 100) {
      errors.push('Categoria deve ter no máximo 100 caracteres');
    }

    // Question text validation
    if (!data.questionText || data.questionText.trim().length === 0) {
      errors.push('Pergunta é obrigatória');
    } else if (data.questionText.length < 10) {
      errors.push('Pergunta deve ter pelo menos 10 caracteres');
    } else if (data.questionText.length > 1000) {
      errors.push('Pergunta deve ter no máximo 1000 caracteres');
    }

    // Options validation
    if (!Array.isArray(data.options) || data.options.length !== 4) {
      errors.push('Deve ter exatamente 4 opções');
    } else {
      data.options.forEach((option, index) => {
        if (!option || option.trim().length === 0) {
          errors.push(`Opção ${String.fromCharCode(65 + index)} é obrigatória`);
        } else if (option.length > 200) {
          errors.push(`Opção ${String.fromCharCode(65 + index)} deve ter no máximo 200 caracteres`);
        }
      });

      // Check for duplicate options
      const uniqueOptions = [...new Set(data.options.map(opt => opt.trim().toLowerCase()))];
      if (uniqueOptions.length !== 4) {
        errors.push('Todas as opções devem ser diferentes');
      }
    }

    // Correct answer validation
    if (!data.correctAnswer || !['A', 'B', 'C', 'D'].includes(data.correctAnswer.toUpperCase())) {
      errors.push('Resposta correta deve ser A, B, C ou D');
    }

    // Level validation
    const level = parseInt(data.level);
    if (!level || level < 1 || level > 10) {
      errors.push('Nível deve estar entre 1 e 10');
    }

    // Honey value validation
    const honeyValue = parseInt(data.honeyValue);
    if (!honeyValue || honeyValue < 5 || honeyValue > 50000) {
      errors.push('Valor em honey deve estar entre 5 e 50.000');
    } else if (level && this.HONEY_VALUE_RANGES[level]) {
      const { min, max } = this.HONEY_VALUE_RANGES[level];
      if (honeyValue < min || honeyValue > max) {
        errors.push(`Para o nível ${level}, valor deve estar entre ${min} e ${max}`);
      }
    }

    // Explanation validation (optional)
    if (data.explanation && data.explanation.length > 500) {
      errors.push('Explicação deve ter no máximo 500 caracteres');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get random questions for game (mix of default and custom)
   */
  async getQuestionsForGame(userId, level, includeCustom = true) {
    const questions = [];

    // Get custom questions if enabled
    if (includeCustom && userId) {
      const customQuestions = await Database.all(`
        SELECT
          id, question_id, question_text, options, correct_answer,
          honey_value, explanation
        FROM questions
        WHERE created_by = ? AND level = ? AND is_active = 1
        ORDER BY RANDOM()
      `, [userId, level]);

      questions.push(...customQuestions.map(q => ({
        ...q,
        options: JSON.parse(q.options),
        source: 'custom'
      })));
    }

    // TODO: Add default questions from existing system
    // This would integrate with the existing questionBank.js

    return questions;
  }

  /**
   * Increment usage count when question is used in a game
   */
  async incrementUsageCount(questionId) {
    await Database.run(`
      UPDATE questions SET
        usage_count = usage_count + 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [questionId]);
  }
}

module.exports = new QuestionService();