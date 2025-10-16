/**
 * Script to create or verify admin user in production
 * Usage: node scripts/createAdminUser.js
 */

require('dotenv').config();
const bcrypt = require('bcrypt');
const Database = require('../database');

async function createAdminUser() {
  try {
    console.log('🔄 Conectando ao banco de dados...');
    await Database.initialize();

    const dbType = Database.getDatabaseType();
    console.log(`📊 Tipo de banco: ${dbType}`);

    // Check if admin user already exists
    console.log('🔍 Verificando se usuário admin existe...');
    const existingAdmin = await Database.get(`
      SELECT * FROM users WHERE email = ?
    `, ['admin@melzao.com']);

    if (existingAdmin) {
      console.log('✅ Usuário admin já existe:');
      console.log(`   - ID: ${existingAdmin.id}`);
      console.log(`   - Email: ${existingAdmin.email}`);
      console.log(`   - Nome: ${existingAdmin.name}`);
      console.log(`   - Role: ${existingAdmin.role}`);
      console.log(`   - Status: ${existingAdmin.status}`);
      console.log(`   - Criado em: ${existingAdmin.created_at}`);

      if (existingAdmin.status !== 'active') {
        console.log('⚠️ Status do admin não é "active", corrigindo...');
        await Database.run(`
          UPDATE users SET status = 'active' WHERE id = ?
        `, [existingAdmin.id]);
        console.log('✅ Status do admin atualizado para "active"');
      }

      return existingAdmin;
    }

    // Create admin user
    console.log('📝 Criando usuário admin...');
    const adminPasswordHash = await bcrypt.hash('admin123', 12);

    const timestamp = dbType === 'postgres' ? 'NOW()' : 'CURRENT_TIMESTAMP';
    const result = await Database.run(`
      INSERT INTO users (email, password_hash, name, role, status, approved_at)
      VALUES (?, ?, ?, ?, ?, ${timestamp})
    `, [
      'admin@melzao.com',
      adminPasswordHash,
      'Administrador',
      'admin',
      'active'
    ]);

    console.log('✅ Usuário admin criado com sucesso!');
    console.log(`   - ID: ${result.id}`);
    console.log('   - Email: admin@melzao.com');
    console.log('   - Senha: admin123');
    console.log('   - Role: admin');
    console.log('   - Status: active');

    // Verify creation
    const newAdmin = await Database.get(`
      SELECT * FROM users WHERE email = ?
    `, ['admin@melzao.com']);

    if (newAdmin) {
      console.log('\n✅ Verificação: Admin criado corretamente no banco!');
      return newAdmin;
    } else {
      throw new Error('❌ Erro: Admin não foi encontrado após criação');
    }

  } catch (error) {
    console.error('❌ Erro ao criar/verificar usuário admin:', error);
    throw error;
  } finally {
    await Database.close();
  }
}

// Run if called directly
if (require.main === module) {
  createAdminUser()
    .then(() => {
      console.log('\n✅ Script concluído com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script falhou:', error);
      process.exit(1);
    });
}

module.exports = createAdminUser;
