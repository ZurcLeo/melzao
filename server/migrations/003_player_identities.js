/**
 * Migration 003: Player Identities
 * Creates the player_identities table for persistent cross-session ranking
 * and adds player_identity_id to participants table.
 */

const Database = require('../databaseAdapter');

module.exports = {
  name: '003_player_identities',

  async up() {
    console.log('🔄 Executando migration: 003_player_identities');

    const dbType = Database.getDatabaseType();
    const pkColumn = dbType === 'postgres' ? 'id SERIAL PRIMARY KEY' : 'id INTEGER PRIMARY KEY AUTOINCREMENT';
    const timestampDefault = dbType === 'postgres' ? 'TIMESTAMP DEFAULT NOW()' : 'DATETIME DEFAULT CURRENT_TIMESTAMP';

    // Create player_identities table
    await Database.run(`
      CREATE TABLE IF NOT EXISTS player_identities (
        ${pkColumn},
        handle          TEXT UNIQUE NOT NULL,
        display_name    TEXT NOT NULL,
        total_honey     BIGINT DEFAULT 0,
        sessions_played INTEGER DEFAULT 0,
        best_level      INTEGER DEFAULT 0,
        win_count       INTEGER DEFAULT 0,
        total_answers   INTEGER DEFAULT 0,
        correct_answers INTEGER DEFAULT 0,
        created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
        first_seen      ${timestampDefault},
        last_seen       ${timestampDefault}
      )
    `);
    console.log('✅ Tabela player_identities criada');

    // Add player_identity_id to participants (nullable — anonymous participants still work)
    if (dbType === 'postgres') {
      const cols = await Database.all(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'participants' AND column_name = 'player_identity_id'
      `);
      if (cols.length === 0) {
        await Database.run(`
          ALTER TABLE participants
          ADD COLUMN player_identity_id INTEGER REFERENCES player_identities(id) ON DELETE SET NULL
        `);
        console.log('✅ Coluna player_identity_id adicionada em participants');
      }
    } else {
      // SQLite: recreate not needed, just add column
      try {
        await Database.run(`ALTER TABLE participants ADD COLUMN player_identity_id INTEGER`);
        console.log('✅ Coluna player_identity_id adicionada em participants (SQLite)');
      } catch (e) {
        if (!e.message.includes('duplicate column')) throw e;
      }
    }

    // Indexes
    await Database.run(`CREATE INDEX IF NOT EXISTS idx_player_identities_handle ON player_identities(handle)`);
    await Database.run(`CREATE INDEX IF NOT EXISTS idx_participants_identity ON participants(player_identity_id)`);

    console.log('✅ Migration 003_player_identities concluída');
  },

  async down() {
    console.log('🔄 Revertendo migration: 003_player_identities');

    const dbType = Database.getDatabaseType();

    if (dbType === 'postgres') {
      await Database.run(`ALTER TABLE participants DROP COLUMN IF EXISTS player_identity_id`);
    }

    await Database.run(`DROP TABLE IF EXISTS player_identities`);

    console.log('✅ Migration 003_player_identities revertida');
  }
};
