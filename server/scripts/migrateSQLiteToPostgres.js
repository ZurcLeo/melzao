/**
 * Data Migration Script: SQLite → PostgreSQL
 *
 * This script migrates all existing data from SQLite to PostgreSQL
 *
 * Usage:
 *   1. Set DATABASE_URL in .env to your PostgreSQL connection string
 *   2. Run: node scripts/migrateSQLiteToPostgres.js
 *
 * The script will:
 *   - Read all data from SQLite (game.db)
 *   - Create tables in PostgreSQL
 *   - Insert all records preserving IDs and relationships
 */

require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const path = require('path');

class DataMigration {
  constructor() {
    this.sqliteDb = null;
    this.pgPool = null;
    this.stats = {
      tables: {},
      totalRecords: 0,
      errors: []
    };
  }

  /**
   * Initialize database connections
   */
  async initialize() {
    console.log('🔧 Iniciando migração de dados SQLite → PostgreSQL\n');

    // Connect to SQLite (source)
    const sqlitePath = process.env.SQLITE_PATH || path.join(__dirname, '../game.db');

    this.sqliteDb = await new Promise((resolve, reject) => {
      const db = new sqlite3.Database(sqlitePath, (err) => {
        if (err) {
          reject(new Error(`Erro ao conectar SQLite: ${err.message}`));
        } else {
          console.log(`✅ SQLite conectado: ${sqlitePath}`);
          resolve(db);
        }
      });
    });

    // Connect to PostgreSQL (destination)
    if (!process.env.DATABASE_URL) {
      throw new Error('❌ DATABASE_URL não configurada no .env');
    }

    this.pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    try {
      await this.pgPool.query('SELECT 1');
      console.log('✅ PostgreSQL conectado\n');
    } catch (error) {
      throw new Error(`Erro ao conectar PostgreSQL: ${error.message}`);
    }
  }

  /**
   * Read all rows from SQLite table
   */
  async readSQLiteTable(tableName) {
    return new Promise((resolve, reject) => {
      this.sqliteDb.all(`SELECT * FROM ${tableName}`, (err, rows) => {
        if (err) {
          // Table might not exist
          if (err.message.includes('no such table')) {
            resolve([]);
          } else {
            reject(err);
          }
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  /**
   * Convert SQLite boolean (0/1) to PostgreSQL boolean (true/false)
   */
  convertBoolean(value) {
    if (value === null || value === undefined) return null;
    return value === 1 || value === true || value === 'true';
  }

  /**
   * Migrate game_sessions table
   */
  async migrateGameSessions() {
    console.log('📊 Migrando game_sessions...');

    const rows = await this.readSQLiteTable('game_sessions');

    if (rows.length === 0) {
      console.log('  ⚠️  Nenhum registro encontrado\n');
      return;
    }

    for (const row of rows) {
      try {
        await this.pgPool.query(`
          INSERT INTO game_sessions (
            id, session_id, started_at, ended_at, status, total_participants, user_id, config_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (session_id) DO NOTHING
        `, [
          row.id,
          row.session_id,
          row.started_at,
          row.ended_at,
          row.status,
          row.total_participants,
          row.user_id || null,
          row.config_id || null
        ]);

        this.stats.totalRecords++;
      } catch (error) {
        this.stats.errors.push({ table: 'game_sessions', row: row.id, error: error.message });
      }
    }

    this.stats.tables.game_sessions = rows.length;
    console.log(`  ✅ ${rows.length} registros migrados\n`);
  }

  /**
   * Migrate participants table
   */
  async migrateParticipants() {
    console.log('👥 Migrando participants...');

    const rows = await this.readSQLiteTable('participants');

    if (rows.length === 0) {
      console.log('  ⚠️  Nenhum registro encontrado\n');
      return;
    }

    for (const row of rows) {
      try {
        await this.pgPool.query(`
          INSERT INTO participants (
            id, participant_id, session_id, name, joined_at, final_status, final_level, total_earned
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (participant_id) DO NOTHING
        `, [
          row.id,
          row.participant_id,
          row.session_id,
          row.name,
          row.joined_at,
          row.final_status,
          row.final_level,
          row.total_earned
        ]);

        this.stats.totalRecords++;
      } catch (error) {
        this.stats.errors.push({ table: 'participants', row: row.id, error: error.message });
      }
    }

    this.stats.tables.participants = rows.length;
    console.log(`  ✅ ${rows.length} registros migrados\n`);
  }

  /**
   * Migrate answers table
   */
  async migrateAnswers() {
    console.log('💬 Migrando answers...');

    const rows = await this.readSQLiteTable('answers');

    if (rows.length === 0) {
      console.log('  ⚠️  Nenhum registro encontrado\n');
      return;
    }

    for (const row of rows) {
      try {
        await this.pgPool.query(`
          INSERT INTO answers (
            id, participant_id, session_id, question_id, question_text, level,
            selected_answer, correct_answer, is_correct, honey_earned, answered_at,
            question_source, custom_question_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (id) DO NOTHING
        `, [
          row.id,
          row.participant_id,
          row.session_id,
          row.question_id,
          row.question_text,
          row.level,
          row.selected_answer,
          row.correct_answer,
          this.convertBoolean(row.is_correct),
          row.honey_earned,
          row.answered_at,
          row.question_source || 'default',
          row.custom_question_id || null
        ]);

        this.stats.totalRecords++;
      } catch (error) {
        this.stats.errors.push({ table: 'answers', row: row.id, error: error.message });
      }
    }

    this.stats.tables.answers = rows.length;
    console.log(`  ✅ ${rows.length} registros migrados\n`);
  }

  /**
   * Migrate users table (if exists)
   */
  async migrateUsers() {
    console.log('👤 Migrando users...');

    const rows = await this.readSQLiteTable('users');

    if (rows.length === 0) {
      console.log('  ⚠️  Nenhum registro encontrado\n');
      return;
    }

    for (const row of rows) {
      try {
        await this.pgPool.query(`
          INSERT INTO users (
            id, email, password_hash, name, role, status, created_at,
            approved_at, approved_by, last_login, profile_image
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (email) DO NOTHING
        `, [
          row.id,
          row.email,
          row.password_hash,
          row.name,
          row.role,
          row.status,
          row.created_at,
          row.approved_at,
          row.approved_by,
          row.last_login,
          row.profile_image
        ]);

        this.stats.totalRecords++;
      } catch (error) {
        this.stats.errors.push({ table: 'users', row: row.id, error: error.message });
      }
    }

    this.stats.tables.users = rows.length;
    console.log(`  ✅ ${rows.length} registros migrados\n`);
  }

  /**
   * Migrate questions table (if exists)
   */
  async migrateQuestions() {
    console.log('❓ Migrando questions...');

    const rows = await this.readSQLiteTable('questions');

    if (rows.length === 0) {
      console.log('  ⚠️  Nenhum registro encontrado\n');
      return;
    }

    for (const row of rows) {
      try {
        // Convert TEXT options to JSONB for PostgreSQL
        const options = typeof row.options === 'string'
          ? JSON.parse(row.options)
          : row.options;

        await this.pgPool.query(`
          INSERT INTO questions (
            id, question_id, category, question_text, options, correct_answer,
            level, honey_value, created_by, is_active, created_at, updated_at,
            usage_count, difficulty_rating, explanation
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          ON CONFLICT (question_id) DO NOTHING
        `, [
          row.id,
          row.question_id,
          row.category,
          row.question_text,
          JSON.stringify(options), // PostgreSQL will convert to JSONB
          row.correct_answer,
          row.level,
          row.honey_value,
          row.created_by,
          this.convertBoolean(row.is_active),
          row.created_at,
          row.updated_at,
          row.usage_count,
          row.difficulty_rating,
          row.explanation
        ]);

        this.stats.totalRecords++;
      } catch (error) {
        this.stats.errors.push({ table: 'questions', row: row.id, error: error.message });
      }
    }

    this.stats.tables.questions = rows.length;
    console.log(`  ✅ ${rows.length} registros migrados\n`);
  }

  /**
   * Update PostgreSQL sequences to match max IDs
   */
  async updateSequences() {
    console.log('🔄 Atualizando sequences do PostgreSQL...\n');

    const tables = ['game_sessions', 'participants', 'answers', 'users', 'questions', 'user_game_configs', 'question_categories'];

    for (const table of tables) {
      try {
        // Get max ID
        const result = await this.pgPool.query(`SELECT MAX(id) as max_id FROM ${table}`);
        const maxId = result.rows[0]?.max_id;

        if (maxId) {
          // Update sequence
          await this.pgPool.query(`
            SELECT setval(pg_get_serial_sequence('${table}', 'id'), $1, true)
          `, [maxId]);

          console.log(`  ✅ ${table}: sequence atualizado para ${maxId}`);
        }
      } catch (error) {
        // Table might not exist or have no records
        console.log(`  ⚠️  ${table}: ${error.message}`);
      }
    }

    console.log('');
  }

  /**
   * Print migration summary
   */
  printSummary() {
    console.log('═══════════════════════════════════════');
    console.log('  RESUMO DA MIGRAÇÃO');
    console.log('═══════════════════════════════════════\n');

    console.log('📊 Registros migrados por tabela:');
    Object.entries(this.stats.tables).forEach(([table, count]) => {
      console.log(`  - ${table}: ${count} registros`);
    });

    console.log(`\n✅ Total de registros migrados: ${this.stats.totalRecords}`);

    if (this.stats.errors.length > 0) {
      console.log(`\n⚠️  Erros encontrados: ${this.stats.errors.length}`);
      this.stats.errors.forEach((err, idx) => {
        console.log(`  ${idx + 1}. ${err.table} (row ${err.row}): ${err.error}`);
      });
    } else {
      console.log('\n🎉 Migração concluída sem erros!');
    }

    console.log('\n═══════════════════════════════════════\n');
  }

  /**
   * Run full migration
   */
  async run() {
    try {
      await this.initialize();

      // Migrate tables in order (respecting foreign keys)
      await this.migrateUsers();
      await this.migrateGameSessions();
      await this.migrateParticipants();
      await this.migrateAnswers();
      await this.migrateQuestions();

      // Update sequences
      await this.updateSequences();

      // Print summary
      this.printSummary();

    } catch (error) {
      console.error('\n❌ Erro fatal durante migração:', error.message);
      process.exit(1);
    } finally {
      // Close connections
      if (this.sqliteDb) {
        this.sqliteDb.close();
      }
      if (this.pgPool) {
        await this.pgPool.end();
      }
    }
  }
}

// Run migration
const migration = new DataMigration();
migration.run().then(() => {
  console.log('✅ Script de migração finalizado');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Erro ao executar migração:', error);
  process.exit(1);
});
