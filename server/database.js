const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor() {
    this.db = null;
  }

  async initialize() {
    return new Promise((resolve, reject) => {
      const dbPath = path.join(__dirname, 'game.db');
      this.db = new sqlite3.Database(dbPath, async (err) => {
        if (err) {
          console.error('Erro ao abrir o banco de dados:', err);
          reject(err);
        } else {
          console.log('✅ Banco de dados conectado com sucesso');

          try {
            // Criar tabelas básicas primeiro
            await this.createTables();

            // Executar migrations
            const MigrationRunner = require('./migrationRunner');
            const migrationRunner = new MigrationRunner(this);
            await migrationRunner.initialize();
            await migrationRunner.runMigrations();

            resolve();
          } catch (error) {
            reject(error);
          }
        }
      });
    });
  }

  async createTables() {
    const schemas = [
      // Tabela de sessões de jogo
      `CREATE TABLE IF NOT EXISTS game_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT UNIQUE NOT NULL,
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        ended_at DATETIME,
        status TEXT DEFAULT 'active', -- 'active', 'finished'
        total_participants INTEGER DEFAULT 0
      )`,

      // Tabela de participantes
      `CREATE TABLE IF NOT EXISTS participants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        participant_id TEXT UNIQUE NOT NULL,
        session_id TEXT NOT NULL,
        name TEXT NOT NULL,
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        final_status TEXT, -- 'winner', 'eliminated', 'quit'
        final_level INTEGER DEFAULT 0,
        total_earned INTEGER DEFAULT 0,
        FOREIGN KEY (session_id) REFERENCES game_sessions(session_id)
      )`,

      // Tabela de respostas
      `CREATE TABLE IF NOT EXISTS answers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        participant_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        question_id TEXT NOT NULL,
        question_text TEXT NOT NULL,
        level INTEGER NOT NULL,
        selected_answer TEXT NOT NULL,
        correct_answer TEXT NOT NULL,
        is_correct BOOLEAN NOT NULL,
        honey_earned INTEGER DEFAULT 0,
        answered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (participant_id) REFERENCES participants(participant_id),
        FOREIGN KEY (session_id) REFERENCES game_sessions(session_id)
      )`,

      // Índices para melhor performance
      `CREATE INDEX IF NOT EXISTS idx_participants_session ON participants(session_id)`,
      `CREATE INDEX IF NOT EXISTS idx_answers_participant ON answers(participant_id)`,
      `CREATE INDEX IF NOT EXISTS idx_answers_session ON answers(session_id)`,
      `CREATE INDEX IF NOT EXISTS idx_game_sessions_date ON game_sessions(started_at)`
    ];

    for (const schema of schemas) {
      await this.run(schema);
    }

    console.log('✅ Tabelas do banco de dados criadas/verificadas');
  }

  async run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          console.error('Erro ao executar SQL:', err, sql);
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  async get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          console.error('Erro ao buscar dados:', err);
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  async all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          console.error('Erro ao buscar dados:', err);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  getDatabase() {
    return this.db;
  }

  async close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            reject(err);
          } else {
            console.log('📝 Conexão com banco de dados fechada');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }
}

module.exports = new Database();