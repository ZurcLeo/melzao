/**
 * Migration: Add user_id and config_id to game_sessions table
 * This allows tracking which user created each session and which config was used
 */

module.exports = {
  name: '002_add_user_config_to_sessions',

  async up(Database) {
    console.log('🔄 Executando migration: 002_add_user_config_to_sessions');

    const dbType = Database.getDatabaseType();

    // Add user_id column
    await Database.run(`
      ALTER TABLE game_sessions
      ADD COLUMN user_id INTEGER
    `);

    // Add config_id column
    await Database.run(`
      ALTER TABLE game_sessions
      ADD COLUMN config_id INTEGER
    `);

    // Add foreign key constraints if PostgreSQL
    if (dbType === 'postgres') {
      await Database.run(`
        ALTER TABLE game_sessions
        ADD CONSTRAINT fk_game_sessions_user
        FOREIGN KEY (user_id) REFERENCES users(id)
      `);

      await Database.run(`
        ALTER TABLE game_sessions
        ADD CONSTRAINT fk_game_sessions_config
        FOREIGN KEY (config_id) REFERENCES user_game_configs(id)
      `);
    }

    console.log('✅ Migration 002_add_user_config_to_sessions concluída');
  },

  async down(Database) {
    console.log('🔄 Revertendo migration: 002_add_user_config_to_sessions');

    const dbType = Database.getDatabaseType();

    // Drop foreign keys first if PostgreSQL
    if (dbType === 'postgres') {
      await Database.run(`
        ALTER TABLE game_sessions
        DROP CONSTRAINT IF EXISTS fk_game_sessions_user
      `);

      await Database.run(`
        ALTER TABLE game_sessions
        DROP CONSTRAINT IF EXISTS fk_game_sessions_config
      `);
    }

    // Drop columns
    await Database.run(`
      ALTER TABLE game_sessions
      DROP COLUMN IF EXISTS user_id
    `);

    await Database.run(`
      ALTER TABLE game_sessions
      DROP COLUMN IF EXISTS config_id
    `);

    console.log('✅ Migration 002_add_user_config_to_sessions revertida');
  }
};
