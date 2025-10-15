const Database = require('../database');

/**
 * Migration 001: Multi-User Schema
 * Adds tables for users, custom questions, user configurations, and question categories
 * Also updates existing tables to support multi-user functionality
 */
class Migration001MultiUserSchema {

  static async up() {
    console.log('🔄 Executando migração 001: Multi-User Schema...');

    try {
      // 1. Criar tabela de usuários
      await Database.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          name TEXT NOT NULL,
          role TEXT DEFAULT 'host' CHECK (role IN ('admin', 'host')),
          status TEXT DEFAULT 'pending' CHECK (status IN ('active', 'inactive', 'pending')),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          approved_at DATETIME,
          approved_by INTEGER,
          last_login DATETIME,
          profile_image TEXT,

          FOREIGN KEY (approved_by) REFERENCES users(id)
        )
      `);

      // Índices para users
      await Database.run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
      await Database.run(`CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)`);
      await Database.run(`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`);

      console.log('✅ Tabela users criada');

      // 2. Criar tabela de categorias de questões
      await Database.run(`
        CREATE TABLE IF NOT EXISTS question_categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL,
          description TEXT,
          color_hex TEXT DEFAULT '#FF6B35',
          icon_name TEXT,
          is_active BOOLEAN DEFAULT 1,
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

          FOREIGN KEY (created_by) REFERENCES users(id)
        )
      `);

      console.log('✅ Tabela question_categories criada');

      // 3. Criar tabela de questões personalizadas
      await Database.run(`
        CREATE TABLE IF NOT EXISTS questions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          question_id TEXT UNIQUE NOT NULL,
          category TEXT NOT NULL,
          question_text TEXT NOT NULL,
          options TEXT NOT NULL, -- JSON: ["A) Opção 1", "B) Opção 2", ...]
          correct_answer TEXT NOT NULL, -- 'A', 'B', 'C', 'D'
          level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 10),
          honey_value INTEGER NOT NULL CHECK (honey_value >= 5),
          created_by INTEGER,
          is_active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          usage_count INTEGER DEFAULT 0,
          difficulty_rating DECIMAL(3,2),
          explanation TEXT,

          FOREIGN KEY (created_by) REFERENCES users(id)
        )
      `);

      // Índices para questions
      await Database.run(`CREATE INDEX IF NOT EXISTS idx_questions_level ON questions(level)`);
      await Database.run(`CREATE INDEX IF NOT EXISTS idx_questions_category ON questions(category)`);
      await Database.run(`CREATE INDEX IF NOT EXISTS idx_questions_creator ON questions(created_by)`);
      await Database.run(`CREATE INDEX IF NOT EXISTS idx_questions_active ON questions(is_active)`);

      console.log('✅ Tabela questions criada');

      // 4. Criar tabela de configurações por usuário
      await Database.run(`
        CREATE TABLE IF NOT EXISTS user_game_configs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          config_name TEXT NOT NULL DEFAULT 'Padrão',
          honey_multiplier DECIMAL(3,2) DEFAULT 1.0 CHECK (honey_multiplier BETWEEN 0.1 AND 5.0),
          time_limit INTEGER DEFAULT 30 CHECK (time_limit BETWEEN 10 AND 120),
          custom_questions_only BOOLEAN DEFAULT 0,
          allow_lifelines BOOLEAN DEFAULT 1,
          max_participants INTEGER DEFAULT 100,
          auto_advance BOOLEAN DEFAULT 0,
          theme_color TEXT DEFAULT '#FF6B35',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          is_default BOOLEAN DEFAULT 0,

          FOREIGN KEY (user_id) REFERENCES users(id),
          UNIQUE(user_id, config_name)
        )
      `);

      console.log('✅ Tabela user_game_configs criada');

      // 5. Verificar se as colunas já existem nas tabelas existentes antes de adicionar
      const gameSessionsInfo = await Database.all(`PRAGMA table_info(game_sessions)`);
      const hasUserId = gameSessionsInfo.some(col => col.name === 'user_id');
      const hasConfigId = gameSessionsInfo.some(col => col.name === 'config_id');

      if (!hasUserId) {
        await Database.run(`ALTER TABLE game_sessions ADD COLUMN user_id INTEGER`);
        await Database.run(`CREATE INDEX IF NOT EXISTS idx_game_sessions_user ON game_sessions(user_id)`);
        console.log('✅ Coluna user_id adicionada em game_sessions');
      }

      if (!hasConfigId) {
        await Database.run(`ALTER TABLE game_sessions ADD COLUMN config_id INTEGER`);
        console.log('✅ Coluna config_id adicionada em game_sessions');
      }

      // 6. Verificar e adicionar colunas em answers
      const answersInfo = await Database.all(`PRAGMA table_info(answers)`);
      const hasQuestionSource = answersInfo.some(col => col.name === 'question_source');
      const hasCustomQuestionId = answersInfo.some(col => col.name === 'custom_question_id');

      if (!hasQuestionSource) {
        await Database.run(`ALTER TABLE answers ADD COLUMN question_source TEXT DEFAULT 'default'`);
        console.log('✅ Coluna question_source adicionada em answers');
      }

      if (!hasCustomQuestionId) {
        await Database.run(`ALTER TABLE answers ADD COLUMN custom_question_id INTEGER`);
        console.log('✅ Coluna custom_question_id adicionada em answers');
      }

      // 7. Inserir categorias padrão
      const existingCategories = await Database.all(`SELECT COUNT(*) as count FROM question_categories`);
      if (existingCategories[0].count === 0) {
        const defaultCategories = [
          {
            name: 'LGBT+',
            description: 'Questões sobre diversidade e inclusão LGBT+',
            color_hex: '#FF6B35',
            icon_name: 'rainbow'
          },
          {
            name: 'História Queer',
            description: 'Marcos históricos do movimento LGBT+',
            color_hex: '#9B59B6',
            icon_name: 'history'
          },
          {
            name: 'Cultura Pop',
            description: 'Representatividade na mídia e entretenimento',
            color_hex: '#E74C3C',
            icon_name: 'tv'
          },
          {
            name: 'Direitos e Legislação',
            description: 'Conquistas legais e direitos LGBT+',
            color_hex: '#27AE60',
            icon_name: 'scale'
          },
          {
            name: 'Personalidades',
            description: 'Figuras importantes da comunidade LGBT+',
            color_hex: '#F39C12',
            icon_name: 'star'
          }
        ];

        for (const category of defaultCategories) {
          await Database.run(`
            INSERT INTO question_categories (name, description, color_hex, icon_name)
            VALUES (?, ?, ?, ?)
          `, [category.name, category.description, category.color_hex, category.icon_name]);
        }

        console.log('✅ Categorias padrão inseridas');
      }

      // 8. Criar usuário admin padrão (senha: admin123)
      const existingAdmins = await Database.all(`SELECT COUNT(*) as count FROM users WHERE role = 'admin'`);
      if (existingAdmins[0].count === 0) {
        const bcrypt = require('bcrypt');
        const adminPasswordHash = await bcrypt.hash('admin123', 12);

        await Database.run(`
          INSERT INTO users (email, password_hash, name, role, status, approved_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [
          'admin@melzao.com',
          adminPasswordHash,
          'Administrador',
          'admin',
          'active',
          new Date().toISOString()
        ]);

        console.log('✅ Usuário admin padrão criado (email: admin@melzao.com, senha: admin123)');
      }

      console.log('✅ Migração 001 concluída com sucesso!');

    } catch (error) {
      console.error('❌ Erro durante a migração 001:', error);
      throw error;
    }
  }

  static async down() {
    console.log('🔄 Revertendo migração 001: Multi-User Schema...');

    try {
      // Remover colunas adicionadas (SQLite não suporta DROP COLUMN, então recriamos as tabelas)
      await Database.run(`DROP TABLE IF EXISTS user_game_configs`);
      await Database.run(`DROP TABLE IF EXISTS questions`);
      await Database.run(`DROP TABLE IF EXISTS question_categories`);
      await Database.run(`DROP TABLE IF EXISTS users`);

      console.log('✅ Migração 001 revertida');

    } catch (error) {
      console.error('❌ Erro ao reverter migração 001:', error);
      throw error;
    }
  }

  static async isApplied() {
    try {
      // Verificar se a tabela users existe
      const tables = await Database.all(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name='users'
      `);

      return tables.length > 0;
    } catch (error) {
      return false;
    }
  }
}

module.exports = Migration001MultiUserSchema;