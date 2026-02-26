/**
 * Migration 004: Level Honey Config
 * Creates level_honey_config table so honey values are controlled per level
 * instead of per individual question.
 */

const Database = require('../databaseAdapter');

module.exports = {
  name: '004_level_honey_config',

  async up() {
    console.log('🔄 Executando migration: 004_level_honey_config');

    const dbType = Database.getDatabaseType();
    const timestampDefault = dbType === 'postgres'
      ? 'TIMESTAMP DEFAULT NOW()'
      : 'DATETIME DEFAULT CURRENT_TIMESTAMP';

    await Database.run(`
      CREATE TABLE IF NOT EXISTS level_honey_config (
        level       INTEGER PRIMARY KEY CHECK (level BETWEEN 1 AND 10),
        honey_value INTEGER NOT NULL DEFAULT 10 CHECK (honey_value >= 1),
        updated_at  ${timestampDefault},
        updated_by  INTEGER
      )
    `);

    // Insert defaults matching the existing questionBank values
    const defaults = [5, 10, 15, 20, 25, 35, 75, 125, 250, 500];
    for (let i = 0; i < defaults.length; i++) {
      const insertIgnore = dbType === 'postgres'
        ? `INSERT INTO level_honey_config (level, honey_value) VALUES ($1, $2) ON CONFLICT (level) DO NOTHING`
        : `INSERT OR IGNORE INTO level_honey_config (level, honey_value) VALUES (?, ?)`;
      await Database.run(insertIgnore, [i + 1, defaults[i]]);
    }

    console.log('✅ Migration 004_level_honey_config concluída');
  },

  async down() {
    await Database.run(`DROP TABLE IF EXISTS level_honey_config`);
  }
};
