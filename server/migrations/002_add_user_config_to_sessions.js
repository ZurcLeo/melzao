/**
 * Migration: Add foreign key constraints for user_id and config_id in game_sessions
 * Note: Columns user_id and config_id are already added by migration 001
 * This migration only adds PostgreSQL foreign key constraints
 */

const Database = require('../databaseAdapter');

module.exports = {
  name: '002_add_user_config_to_sessions',

  async up() {
    console.log('🔄 Executando migration: 002_add_user_config_to_sessions');

    const dbType = Database.getDatabaseType();

    // Only add foreign key constraints for PostgreSQL
    // (user_id and config_id columns already exist from migration 001)
    if (dbType === 'postgres') {
      try {
        // Check if constraints already exist
        const constraints = await Database.all(`
          SELECT constraint_name
          FROM information_schema.table_constraints
          WHERE table_name = 'game_sessions'
          AND constraint_type = 'FOREIGN KEY'
        `);

        const hasUserFk = constraints.some(c => c.constraint_name === 'fk_game_sessions_user');
        const hasConfigFk = constraints.some(c => c.constraint_name === 'fk_game_sessions_config');

        if (!hasUserFk) {
          await Database.run(`
            ALTER TABLE game_sessions
            ADD CONSTRAINT fk_game_sessions_user
            FOREIGN KEY (user_id) REFERENCES users(id)
          `);
          console.log('✅ Foreign key constraint fk_game_sessions_user adicionada');
        }

        if (!hasConfigFk) {
          await Database.run(`
            ALTER TABLE game_sessions
            ADD CONSTRAINT fk_game_sessions_config
            FOREIGN KEY (config_id) REFERENCES user_game_configs(id)
          `);
          console.log('✅ Foreign key constraint fk_game_sessions_config adicionada');
        }
      } catch (error) {
        console.warn('⚠️ Aviso ao adicionar constraints:', error.message);
        // Don't fail if constraints already exist
      }
    } else {
      console.log('ℹ️ SQLite não requer foreign key constraints adicionais');
    }

    console.log('✅ Migration 002_add_user_config_to_sessions concluída');
  },

  async down() {
    console.log('🔄 Revertendo migration: 002_add_user_config_to_sessions');

    const dbType = Database.getDatabaseType();

    // Only drop foreign key constraints (don't drop columns - they're managed by migration 001)
    if (dbType === 'postgres') {
      await Database.run(`
        ALTER TABLE game_sessions
        DROP CONSTRAINT IF EXISTS fk_game_sessions_user
      `);

      await Database.run(`
        ALTER TABLE game_sessions
        DROP CONSTRAINT IF EXISTS fk_game_sessions_config
      `);

      console.log('✅ Foreign key constraints removidas');
    }

    console.log('✅ Migration 002_add_user_config_to_sessions revertida');
  }
};
