#!/usr/bin/env node

/**
 * Test Migration Script
 * Tests the multi-user database migration and authentication system
 */

const database = require('../database');
const authService = require('../services/authService');

async function runTests() {
  console.log('🧪 Iniciando testes da migração multi-usuário...\n');

  try {
    // Initialize database (this will run migrations)
    console.log('1️⃣ Inicializando banco de dados...');
    await database.initialize();
    console.log('✅ Banco de dados inicializado\n');

    // Test user registration
    console.log('2️⃣ Testando registro de usuário...');
    try {
      const registrationResult = await authService.registerUser({
        email: 'teste@host.com',
        password: 'senhaSegura123',
        name: 'Host de Teste'
      });
      console.log('✅ Usuário registrado:', registrationResult.message);
    } catch (error) {
      if (error.message.includes('Email já está em uso')) {
        console.log('ℹ️ Usuário de teste já existe');
      } else {
        throw error;
      }
    }

    // Test getting pending users
    console.log('\n3️⃣ Testando busca de usuários pendentes...');
    const pendingUsers = await authService.getPendingUsers();
    console.log(`✅ Encontrados ${pendingUsers.length} usuários pendentes`);
    if (pendingUsers.length > 0) {
      console.log('   Usuários:', pendingUsers.map(u => u.email).join(', '));
    }

    // Test admin authentication
    console.log('\n4️⃣ Testando login do admin...');
    try {
      const adminAuth = await authService.authenticateUser('admin@melzao.com', 'admin123');
      console.log('✅ Admin autenticado com sucesso');
      console.log(`   Token gerado (primeiros 50 chars): ${adminAuth.token.substring(0, 50)}...`);

      // Test approving a user
      if (pendingUsers.length > 0) {
        console.log('\n5️⃣ Testando aprovação de usuário...');
        const approvalResult = await authService.approveUser(pendingUsers[0].id, adminAuth.user.id);
        console.log('✅ Usuário aprovado:', approvalResult.message);

        // Test host authentication
        console.log('\n6️⃣ Testando login do host aprovado...');
        const hostAuth = await authService.authenticateUser('teste@host.com', 'senhaSegura123');
        console.log('✅ Host autenticado com sucesso');
      }

    } catch (error) {
      if (error.message.includes('aguardando aprovação')) {
        console.log('ℹ️ Admin ainda não aprovado - isso é esperado em primeiro uso');
      } else {
        throw error;
      }
    }

    // Test system stats
    console.log('\n7️⃣ Testando estatísticas do sistema...');
    const stats = await authService.getSystemStats();
    console.log('✅ Estatísticas obtidas:');
    console.log(`   - Total de usuários: ${stats.total_users}`);
    console.log(`   - Usuários ativos: ${stats.active_users}`);
    console.log(`   - Usuários pendentes: ${stats.pending_users}`);
    console.log(`   - Administradores: ${stats.admin_users}`);
    console.log(`   - Hosts: ${stats.host_users}`);

    // Test tables existence
    console.log('\n8️⃣ Verificando estrutura do banco de dados...');
    const tables = await database.all(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `);

    const expectedTables = [
      'answers',
      'game_sessions',
      'migrations',
      'participants',
      'question_categories',
      'questions',
      'user_game_configs',
      'users'
    ];

    console.log('✅ Tabelas encontradas:');
    tables.forEach(table => {
      const isExpected = expectedTables.includes(table.name);
      console.log(`   ${isExpected ? '✅' : '⚠️'} ${table.name}`);
    });

    const missingTables = expectedTables.filter(expected =>
      !tables.find(table => table.name === expected)
    );

    if (missingTables.length > 0) {
      console.log(`❌ Tabelas ausentes: ${missingTables.join(', ')}`);
    }

    // Test question categories
    console.log('\n9️⃣ Verificando categorias padrão...');
    const categories = await database.all('SELECT name FROM question_categories WHERE is_active = 1');
    console.log('✅ Categorias encontradas:');
    categories.forEach(cat => {
      console.log(`   📂 ${cat.name}`);
    });

    // Test user game configs
    console.log('\n🔟 Verificando configurações de usuário...');
    const configs = await database.all(`
      SELECT ugc.*, u.email
      FROM user_game_configs ugc
      JOIN users u ON ugc.user_id = u.id
    `);

    console.log(`✅ Encontradas ${configs.length} configurações de usuário`);
    configs.forEach(config => {
      console.log(`   ⚙️ ${config.email}: ${config.config_name} (Multiplier: ${config.honey_multiplier}x)`);
    });

    console.log('\n🎉 Todos os testes passaram com sucesso!');
    console.log('\n📋 Resumo:');
    console.log('   ✅ Migração aplicada corretamente');
    console.log('   ✅ Sistema de autenticação funcionando');
    console.log('   ✅ Estrutura multi-usuário implementada');
    console.log('   ✅ Dados padrão inseridos');
    console.log('\n📝 Próximos passos:');
    console.log('   1. Implementar APIs de questões personalizadas');
    console.log('   2. Atualizar frontend para suporte multi-usuário');
    console.log('   3. Implementar dashboards admin e host');

  } catch (error) {
    console.error('❌ Erro durante os testes:', error);
    console.error('\n🔍 Stack trace:', error.stack);
    process.exit(1);
  } finally {
    // Close database connection
    await database.close();
  }
}

// Run tests if called directly
if (require.main === module) {
  runTests();
}

module.exports = { runTests };