/**
 * Database Adapter
 * Provides a unified interface for both SQLite (development) and PostgreSQL (production)
 * Automatically selects the appropriate driver based on DATABASE_URL environment variable
 */

class DatabaseAdapter {
  constructor() {
    this.db = null;
    this.dbType = null; // 'sqlite' or 'postgres'
  }

  /**
   * Initialize database connection
   * Detects database type from environment and connects accordingly
   */
  async initialize() {
    const databaseUrl = process.env.DATABASE_URL;

    // Determine database type
    if (databaseUrl && (databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://'))) {
      this.dbType = 'postgres';
      await this.initializePostgreSQL();
    } else {
      this.dbType = 'sqlite';
      await this.initializeSQLite();
    }

    console.log(`✅ Conectado ao banco de dados: ${this.dbType.toUpperCase()}`);

    // Run migrations and setup
    try {
      await this.createTables();

      const MigrationRunner = require('./migrationRunner');
      const migrationRunner = new MigrationRunner(this);
      await migrationRunner.initialize();
      await migrationRunner.runMigrations();

      const questionService = require('./services/questionService');
      await questionService.ensureDefaultQuestions();
    } catch (error) {
      console.error('❌ Erro durante inicialização do banco:', error);
      throw error;
    }
  }

  /**
   * Initialize SQLite connection (for local development)
   */
  async initializeSQLite() {
    return new Promise((resolve, reject) => {
      const sqlite3 = require('sqlite3').verbose();
      const path = require('path');

      const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'game.db');

      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('Erro ao conectar SQLite:', err);
          reject(err);
        } else {
          console.log('📁 SQLite conectado:', dbPath);
          resolve();
        }
      });
    });
  }

  /**
   * Initialize PostgreSQL connection (for production)
   */
  async initializePostgreSQL() {
    const { Pool } = require('pg');

    // Parse DATABASE_URL or use individual components
    const config = process.env.DATABASE_URL
      ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
      : {
          host: process.env.DB_HOST,
          port: process.env.DB_PORT || 5432,
          database: process.env.DB_NAME,
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
          max: 20, // connection pool size
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
        };

    this.db = new Pool(config);

    // Test connection
    try {
      const client = await this.db.connect();
      console.log('🐘 PostgreSQL conectado');
      client.release();
    } catch (error) {
      console.error('Erro ao conectar PostgreSQL:', error);
      throw error;
    }
  }

  /**
   * Execute a SQL statement (INSERT, UPDATE, DELETE, CREATE, etc.)
   * Returns { id, changes } for compatibility with SQLite
   */
  async run(sql, params = []) {
    if (this.dbType === 'sqlite') {
      return new Promise((resolve, reject) => {
        this.db.run(sql, params, function(err) {
          if (err) {
            console.error('Erro ao executar SQL (SQLite):', err.message);
            console.error('SQL:', sql);
            console.error('Params:', params);
            reject(err);
          } else {
            resolve({ id: this.lastID, changes: this.changes, lastID: this.lastID });
          }
        });
      });
    } else {
      // PostgreSQL
      try {
        // Convert SQL for PostgreSQL if needed
        const pgSql = this.convertSQLToPostgreSQL(sql);
        const result = await this.db.query(pgSql, params);

        // Extract inserted ID if available (from RETURNING clause)
        const id = result.rows[0]?.id || null;

        return {
          id,
          lastID: id,
          changes: result.rowCount,
          rows: result.rows
        };
      } catch (error) {
        console.error('Erro ao executar SQL (PostgreSQL):', error.message);
        console.error('SQL:', sql);
        console.error('Params:', params);
        throw error;
      }
    }
  }

  /**
   * Get a single row
   */
  async get(sql, params = []) {
    if (this.dbType === 'sqlite') {
      return new Promise((resolve, reject) => {
        this.db.get(sql, params, (err, row) => {
          if (err) {
            console.error('Erro ao buscar dado (SQLite):', err.message);
            reject(err);
          } else {
            resolve(row);
          }
        });
      });
    } else {
      // PostgreSQL
      try {
        const pgSql = this.convertSQLToPostgreSQL(sql);
        const result = await this.db.query(pgSql, params);
        return result.rows[0] || undefined;
      } catch (error) {
        console.error('Erro ao buscar dado (PostgreSQL):', error.message);
        throw error;
      }
    }
  }

  /**
   * Get multiple rows
   */
  async all(sql, params = []) {
    if (this.dbType === 'sqlite') {
      return new Promise((resolve, reject) => {
        this.db.all(sql, params, (err, rows) => {
          if (err) {
            console.error('Erro ao buscar dados (SQLite):', err.message);
            reject(err);
          } else {
            resolve(rows || []);
          }
        });
      });
    } else {
      // PostgreSQL
      try {
        const pgSql = this.convertSQLToPostgreSQL(sql);
        const result = await this.db.query(pgSql, params);
        return result.rows || [];
      } catch (error) {
        console.error('Erro ao buscar dados (PostgreSQL):', error.message);
        throw error;
      }
    }
  }

  /**
   * Convert SQLite-specific SQL to PostgreSQL-compatible SQL
   */
  convertSQLToPostgreSQL(sql) {
    if (this.dbType !== 'postgres') return sql;

    let converted = sql;

    // Replace AUTOINCREMENT with SERIAL (for CREATE TABLE)
    converted = converted.replace(/INTEGER PRIMARY KEY AUTOINCREMENT/gi, 'SERIAL PRIMARY KEY');

    // Replace DATETIME with TIMESTAMP
    converted = converted.replace(/DATETIME/gi, 'TIMESTAMP');

    // Replace CURRENT_TIMESTAMP with NOW()
    converted = converted.replace(/DEFAULT CURRENT_TIMESTAMP/gi, 'DEFAULT NOW()');

    // Replace BOOLEAN 0/1 with TRUE/FALSE
    converted = converted.replace(/BOOLEAN DEFAULT 1/gi, 'BOOLEAN DEFAULT TRUE');
    converted = converted.replace(/BOOLEAN DEFAULT 0/gi, 'BOOLEAN DEFAULT FALSE');

    // Add RETURNING id to INSERT statements for getting lastID
    if (converted.match(/^\s*INSERT\s+INTO/i) && !converted.match(/RETURNING/i)) {
      converted = converted.replace(/;?\s*$/, ' RETURNING id;');
    }

    return converted;
  }

  /**
   * Get raw database connection
   */
  getDatabase() {
    return this.db;
  }

  /**
   * Get database type
   */
  getDatabaseType() {
    return this.dbType;
  }

  /**
   * Execute raw SQL (for migrations)
   */
  async exec(sql) {
    if (this.dbType === 'sqlite') {
      return new Promise((resolve, reject) => {
        this.db.exec(sql, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    } else {
      // PostgreSQL doesn't have exec, use query
      try {
        await this.db.query(sql);
      } catch (error) {
        throw error;
      }
    }
  }

  /**
   * Create base tables (called during initialization)
   */
  async createTables() {
    const schemas = [
      // Game sessions table
      `CREATE TABLE IF NOT EXISTS game_sessions (
        ${this.dbType === 'postgres' ? 'id SERIAL PRIMARY KEY' : 'id INTEGER PRIMARY KEY AUTOINCREMENT'},
        session_id TEXT UNIQUE NOT NULL,
        started_at ${this.dbType === 'postgres' ? 'TIMESTAMP DEFAULT NOW()' : 'DATETIME DEFAULT CURRENT_TIMESTAMP'},
        ended_at ${this.dbType === 'postgres' ? 'TIMESTAMP' : 'DATETIME'},
        status TEXT DEFAULT 'active',
        total_participants INTEGER DEFAULT 0
      )`,

      // Participants table
      `CREATE TABLE IF NOT EXISTS participants (
        ${this.dbType === 'postgres' ? 'id SERIAL PRIMARY KEY' : 'id INTEGER PRIMARY KEY AUTOINCREMENT'},
        participant_id TEXT UNIQUE NOT NULL,
        session_id TEXT NOT NULL,
        name TEXT NOT NULL,
        joined_at ${this.dbType === 'postgres' ? 'TIMESTAMP DEFAULT NOW()' : 'DATETIME DEFAULT CURRENT_TIMESTAMP'},
        final_status TEXT,
        final_level INTEGER DEFAULT 0,
        total_earned INTEGER DEFAULT 0,
        FOREIGN KEY (session_id) REFERENCES game_sessions(session_id)
      )`,

      // Answers table
      `CREATE TABLE IF NOT EXISTS answers (
        ${this.dbType === 'postgres' ? 'id SERIAL PRIMARY KEY' : 'id INTEGER PRIMARY KEY AUTOINCREMENT'},
        participant_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        question_id TEXT NOT NULL,
        question_text TEXT NOT NULL,
        level INTEGER NOT NULL,
        selected_answer TEXT NOT NULL,
        correct_answer TEXT NOT NULL,
        is_correct ${this.dbType === 'postgres' ? 'BOOLEAN NOT NULL' : 'BOOLEAN NOT NULL'},
        honey_earned INTEGER DEFAULT 0,
        answered_at ${this.dbType === 'postgres' ? 'TIMESTAMP DEFAULT NOW()' : 'DATETIME DEFAULT CURRENT_TIMESTAMP'},
        FOREIGN KEY (participant_id) REFERENCES participants(participant_id),
        FOREIGN KEY (session_id) REFERENCES game_sessions(session_id)
      )`,

      // Indexes
      `CREATE INDEX IF NOT EXISTS idx_participants_session ON participants(session_id)`,
      `CREATE INDEX IF NOT EXISTS idx_answers_participant ON answers(participant_id)`,
      `CREATE INDEX IF NOT EXISTS idx_answers_session ON answers(session_id)`,
      `CREATE INDEX IF NOT EXISTS idx_game_sessions_date ON game_sessions(started_at)`
    ];

    for (const schema of schemas) {
      try {
        await this.run(schema);
      } catch (error) {
        // Ignore if table already exists
        if (!error.message.includes('already exists')) {
          throw error;
        }
      }
    }

    console.log('✅ Tabelas base criadas/verificadas');
  }

  /**
   * Close database connection
   */
  async close() {
    if (this.dbType === 'sqlite') {
      return new Promise((resolve, reject) => {
        if (this.db) {
          this.db.close((err) => {
            if (err) reject(err);
            else {
              console.log('📝 SQLite desconectado');
              resolve();
            }
          });
        } else {
          resolve();
        }
      });
    } else {
      // PostgreSQL
      if (this.db) {
        await this.db.end();
        console.log('📝 PostgreSQL desconectado');
      }
    }
  }
}

module.exports = new DatabaseAdapter();
