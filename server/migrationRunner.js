const fs = require('fs');
const path = require('path');

/**
 * Migration Runner
 * Handles database migrations for the Show do Melzão multi-user upgrade
 */
class MigrationRunner {
  constructor(database) {
    this.database = database;
    this.migrationsDir = path.join(__dirname, 'migrations');
  }

  async initialize() {
    // Criar tabela de migrations se não existir
    const dbType = this.database.getDatabaseType();
    const pkColumn = dbType === 'postgres'
      ? 'id SERIAL PRIMARY KEY'
      : 'id INTEGER PRIMARY KEY AUTOINCREMENT';
    const timestampDefault = dbType === 'postgres'
      ? 'TIMESTAMP DEFAULT NOW()'
      : 'DATETIME DEFAULT CURRENT_TIMESTAMP';

    await this.database.run(`
      CREATE TABLE IF NOT EXISTS migrations (
        ${pkColumn},
        name TEXT UNIQUE NOT NULL,
        applied_at ${timestampDefault}
      )
    `);

    console.log('✅ Sistema de migrations inicializado');
  }

  async getMigrationFiles() {
    if (!fs.existsSync(this.migrationsDir)) {
      fs.mkdirSync(this.migrationsDir, { recursive: true });
      return [];
    }

    const files = fs.readdirSync(this.migrationsDir)
      .filter(file => file.endsWith('.js'))
      .sort();

    return files;
  }

  async getAppliedMigrations() {
    try {
      const rows = await this.database.all(`SELECT name FROM migrations ORDER BY name`);
      return rows.map(row => row.name);
    } catch (error) {
      console.warn('⚠️ Erro ao buscar migrations aplicadas:', error.message);
      return [];
    }
  }

  async runMigrations() {
    console.log('🔄 Iniciando execução de migrations...');

    const migrationFiles = await this.getMigrationFiles();
    const appliedMigrations = await this.getAppliedMigrations();

    const pendingMigrations = migrationFiles.filter(file => {
      const migrationName = path.basename(file, '.js');
      return !appliedMigrations.includes(migrationName);
    });

    if (pendingMigrations.length === 0) {
      console.log('✅ Todas as migrations já foram aplicadas');
      return;
    }

    console.log(`📋 ${pendingMigrations.length} migrations pendentes encontradas`);

    for (const migrationFile of pendingMigrations) {
      const migrationName = path.basename(migrationFile, '.js');
      const migrationPath = path.join(this.migrationsDir, migrationFile);

      try {
        console.log(`🔄 Aplicando migration: ${migrationName}...`);

        // Importar e executar migration
        const Migration = require(migrationPath);
        await Migration.up();

        // Registrar migration como aplicada
        await this.database.run(`
          INSERT INTO migrations (name) VALUES (?)
        `, [migrationName]);

        console.log(`✅ Migration ${migrationName} aplicada com sucesso`);

      } catch (error) {
        console.error(`❌ Erro ao aplicar migration ${migrationName}:`, error);
        throw new Error(`Migration ${migrationName} falhou: ${error.message}`);
      }
    }

    console.log('✅ Todas as migrations foram aplicadas com sucesso!');
  }

  async rollbackMigration(migrationName) {
    console.log(`🔄 Revertendo migration: ${migrationName}...`);

    const migrationPath = path.join(this.migrationsDir, `${migrationName}.js`);

    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration ${migrationName} não encontrada`);
    }

    try {
      // Importar e reverter migration
      const Migration = require(migrationPath);
      await Migration.down();

      // Remover migration da tabela
      await this.database.run(`
        DELETE FROM migrations WHERE name = ?
      `, [migrationName]);

      console.log(`✅ Migration ${migrationName} revertida com sucesso`);

    } catch (error) {
      console.error(`❌ Erro ao reverter migration ${migrationName}:`, error);
      throw error;
    }
  }

  async getMigrationStatus() {
    const migrationFiles = await this.getMigrationFiles();
    const appliedMigrations = await this.getAppliedMigrations();

    const status = migrationFiles.map(file => {
      const name = path.basename(file, '.js');
      return {
        name,
        applied: appliedMigrations.includes(name)
      };
    });

    return status;
  }

  async showStatus() {
    console.log('\n📋 Status das Migrations:');
    console.log('=' .repeat(50));

    const status = await this.getMigrationStatus();

    if (status.length === 0) {
      console.log('📁 Nenhuma migration encontrada');
      return;
    }

    status.forEach(migration => {
      const statusIcon = migration.applied ? '✅' : '⏳';
      const statusText = migration.applied ? 'Aplicada' : 'Pendente';
      console.log(`${statusIcon} ${migration.name} - ${statusText}`);
    });

    const pendingCount = status.filter(m => !m.applied).length;
    console.log('=' .repeat(50));
    console.log(`📊 Total: ${status.length} migrations, ${pendingCount} pendentes\n`);
  }
}

module.exports = MigrationRunner;