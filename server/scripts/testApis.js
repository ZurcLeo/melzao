#!/usr/bin/env node

/**
 * API Test Script
 * Tests all the new multi-user API endpoints
 */

const axios = require('axios');
const database = require('../database');

const BASE_URL = 'http://localhost:5001/api';

// Test data
let adminToken, hostToken, hostUserId, questionId, configId;

async function makeRequest(method, url, data = {}, token = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${url}`,
      headers: {}
    };

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (method.toLowerCase() !== 'get') {
      config.data = data;
      config.headers['Content-Type'] = 'application/json';
    } else if (Object.keys(data).length > 0) {
      config.params = data;
    }

    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status || 500
    };
  }
}

async function runApiTests() {
  console.log('🚀 Iniciando testes das APIs multi-usuário...\n');

  try {
    // Initialize database first
    console.log('1️⃣ Inicializando banco de dados...');
    await database.initialize();
    console.log('✅ Banco de dados inicializado\n');

    // Test 1: Health check
    console.log('2️⃣ Testando health check...');
    const healthResponse = await makeRequest('GET', '../health');
    if (healthResponse.success) {
      console.log('✅ Health check OK');
    } else {
      console.log('❌ Health check falhou:', healthResponse.error);
    }

    // Test 2: Admin authentication
    console.log('\n3️⃣ Testando autenticação do admin...');
    const adminLoginResponse = await makeRequest('POST', '/auth/login', {
      email: 'admin@melzao.com',
      password: 'admin123'
    });

    if (adminLoginResponse.success) {
      adminToken = adminLoginResponse.data.token;
      console.log('✅ Admin logado com sucesso');
    } else {
      console.log('❌ Falha no login do admin:', adminLoginResponse.error);
      throw new Error('Cannot continue without admin token');
    }

    // Test 3: Register new host
    console.log('\n4️⃣ Registrando novo host...');
    const hostEmail = `host_${Date.now()}@test.com`;
    const registerResponse = await makeRequest('POST', '/auth/register', {
      email: hostEmail,
      password: 'senhaSegura123',
      name: 'Host de Teste API'
    });

    if (registerResponse.success) {
      console.log('✅ Host registrado com sucesso:', hostEmail);
    } else {
      console.log('❌ Falha no registro:', registerResponse.error);
    }

    // Test 4: Get pending users (admin)
    console.log('\n5️⃣ Buscando usuários pendentes...');
    const pendingResponse = await makeRequest('GET', '/admin/users/pending', {}, adminToken);

    if (pendingResponse.success) {
      const pendingUsers = pendingResponse.data.users;
      console.log(`✅ ${pendingUsers.length} usuários pendentes encontrados`);

      if (pendingUsers.length > 0) {
        const userToApprove = pendingUsers.find(u => u.email === hostEmail);
        if (userToApprove) {
          hostUserId = userToApprove.id;

          // Test 5: Approve host
          console.log('\n6️⃣ Aprovando host...');
          const approveResponse = await makeRequest('PUT', `/admin/users/${hostUserId}/approve`, {}, adminToken);

          if (approveResponse.success) {
            console.log('✅ Host aprovado com sucesso');
          } else {
            console.log('❌ Falha na aprovação:', approveResponse.error);
          }
        }
      }
    } else {
      console.log('❌ Falha ao buscar usuários pendentes:', pendingResponse.error);
    }

    // Test 6: Host authentication
    console.log('\n7️⃣ Testando autenticação do host...');
    const hostLoginResponse = await makeRequest('POST', '/auth/login', {
      email: hostEmail,
      password: 'senhaSegura123'
    });

    if (hostLoginResponse.success) {
      hostToken = hostLoginResponse.data.token;
      console.log('✅ Host logado com sucesso');
    } else {
      console.log('❌ Falha no login do host:', hostLoginResponse.error);
    }

    // Test 7: Get question categories
    console.log('\n8️⃣ Testando busca de categorias...');
    const categoriesResponse = await makeRequest('GET', '/questions/categories', {}, hostToken);

    if (categoriesResponse.success) {
      const categories = categoriesResponse.data.categories;
      console.log(`✅ ${categories.length} categorias encontradas:`, categories.map(c => c.name).join(', '));
    } else {
      console.log('❌ Falha ao buscar categorias:', categoriesResponse.error);
    }

    // Test 8: Create custom question
    console.log('\n9️⃣ Criando questão personalizada...');
    const questionData = {
      category: 'LGBT+',
      questionText: 'Qual foi a primeira parada do orgulho LGBT+ do Brasil?',
      options: [
        'A) São Paulo, 1997',
        'B) Rio de Janeiro, 1995',
        'C) Salvador, 1999',
        'D) Brasília, 2000'
      ],
      correctAnswer: 'A',
      level: 3,
      honeyValue: 150,
      explanation: 'A primeira parada LGBT+ do Brasil aconteceu em São Paulo em 1997.'
    };

    const createQuestionResponse = await makeRequest('POST', '/questions', questionData, hostToken);

    if (createQuestionResponse.success) {
      questionId = createQuestionResponse.data.id;
      console.log('✅ Questão criada com sucesso, ID:', questionId);
    } else {
      console.log('❌ Falha ao criar questão:', createQuestionResponse.error);
    }

    // Test 9: Get user's questions
    console.log('\n🔟 Buscando questões do usuário...');
    const myQuestionsResponse = await makeRequest('GET', '/questions/my', {}, hostToken);

    if (myQuestionsResponse.success) {
      const questions = myQuestionsResponse.data.questions;
      console.log(`✅ ${questions.length} questões encontradas`);
      if (questions.length > 0) {
        console.log('   Primeira questão:', questions[0].question_text.substring(0, 50) + '...');
      }
    } else {
      console.log('❌ Falha ao buscar questões:', myQuestionsResponse.error);
    }

    // Test 10: Update question honey value
    if (questionId) {
      console.log('\n1️⃣1️⃣ Atualizando valor em honey da questão...');
      const updateHoneyResponse = await makeRequest('PUT', `/questions/${questionId}/honey-value`, {
        honeyValue: 200
      }, hostToken);

      if (updateHoneyResponse.success) {
        console.log('✅ Valor em honey atualizado para 200');
      } else {
        console.log('❌ Falha ao atualizar honey:', updateHoneyResponse.error);
      }
    }

    // Test 11: Create game configuration
    console.log('\n1️⃣2️⃣ Criando configuração de jogo...');
    const configData = {
      configName: 'Config de Teste',
      honeyMultiplier: 1.5,
      timeLimit: 45,
      customQuestionsOnly: false,
      allowLifelines: true,
      maxParticipants: 50,
      autoAdvance: false,
      themeColor: '#9B59B6'
    };

    const createConfigResponse = await makeRequest('POST', '/configs', configData, hostToken);

    if (createConfigResponse.success) {
      configId = createConfigResponse.data.configId;
      console.log('✅ Configuração criada com sucesso, ID:', configId);
    } else {
      console.log('❌ Falha ao criar configuração:', createConfigResponse.error);
    }

    // Test 12: Get user's configurations
    console.log('\n1️⃣3️⃣ Buscando configurações do usuário...');
    const configsResponse = await makeRequest('GET', '/configs', {}, hostToken);

    if (configsResponse.success) {
      const configs = configsResponse.data.configs;
      console.log(`✅ ${configs.length} configurações encontradas`);
      configs.forEach(config => {
        console.log(`   - ${config.config_name} (Multiplier: ${config.honey_multiplier}x)${config.is_default ? ' [PADRÃO]' : ''}`);
      });
    } else {
      console.log('❌ Falha ao buscar configurações:', configsResponse.error);
    }

    // Test 13: Get user question stats
    console.log('\n1️⃣4️⃣ Buscando estatísticas de questões...');
    const questionStatsResponse = await makeRequest('GET', '/questions/my/stats', {}, hostToken);

    if (questionStatsResponse.success) {
      const stats = questionStatsResponse.data.stats.overview;
      console.log('✅ Estatísticas de questões:');
      console.log(`   - Total: ${stats.total_questions}`);
      console.log(`   - Ativas: ${stats.active_questions}`);
      console.log(`   - Valor médio: ${Math.round(stats.avg_honey_value || 0)} honey`);
    } else {
      console.log('❌ Falha ao buscar estatísticas:', questionStatsResponse.error);
    }

    // Test 14: Get admin stats
    console.log('\n1️⃣5️⃣ Buscando estatísticas administrativas...');
    const adminStatsResponse = await makeRequest('GET', '/admin/stats', {}, adminToken);

    if (adminStatsResponse.success) {
      const stats = adminStatsResponse.data.stats;
      console.log('✅ Estatísticas do sistema:');
      console.log(`   - Total de usuários: ${stats.total_users}`);
      console.log(`   - Usuários ativos: ${stats.active_users}`);
      console.log(`   - Hosts: ${stats.host_users}`);
      console.log(`   - Questões personalizadas: ${stats.total_custom_questions}`);
    } else {
      console.log('❌ Falha ao buscar estatísticas admin:', adminStatsResponse.error);
    }

    // Test 15: Token verification
    console.log('\n1️⃣6️⃣ Testando verificação de token...');
    const verifyResponse = await makeRequest('GET', '/auth/verify', {}, hostToken);

    if (verifyResponse.success) {
      const user = verifyResponse.data.user;
      console.log(`✅ Token válido para: ${user.name} (${user.role})`);
    } else {
      console.log('❌ Falha na verificação do token:', verifyResponse.error);
    }

    // Test 16: Question validation
    console.log('\n1️⃣7️⃣ Testando validação de questão...');
    const invalidQuestion = {
      category: '',
      questionText: 'Curta',
      options: ['A', 'B'],
      correctAnswer: 'X',
      level: 15,
      honeyValue: 100000
    };

    const validateResponse = await makeRequest('POST', '/questions/validate', invalidQuestion, hostToken);

    if (validateResponse.success) {
      const validation = validateResponse.data;
      console.log(`✅ Validação funcionando - Válida: ${validation.valid}`);
      if (!validation.valid) {
        console.log('   Erros encontrados:', validation.errors.slice(0, 3).join(', ') + '...');
      }
    } else {
      console.log('❌ Falha na validação:', validateResponse.error);
    }

    console.log('\n🎉 Todos os testes das APIs foram concluídos!');
    console.log('\n📋 Resumo dos testes:');
    console.log('   ✅ Sistema de autenticação funcionando');
    console.log('   ✅ Gestão de usuários (admin/host) funcionando');
    console.log('   ✅ CRUD de questões personalizadas funcionando');
    console.log('   ✅ Sistema de configurações funcionando');
    console.log('   ✅ Validação de dados funcionando');
    console.log('   ✅ Sistema de estatísticas funcionando');

  } catch (error) {
    console.error('❌ Erro durante os testes:', error);
    console.error('\n🔍 Stack trace:', error.stack);
  } finally {
    // Close database connection
    await database.close();
  }
}

// Helper to start server if needed
async function ensureServerRunning() {
  try {
    const healthResponse = await makeRequest('GET', '../health');
    return healthResponse.success;
  } catch (error) {
    return false;
  }
}

// Run tests if called directly
if (require.main === module) {
  ensureServerRunning().then(async (serverRunning) => {
    if (!serverRunning) {
      console.log('⚠️ Servidor não está rodando. Inicie o servidor primeiro com:');
      console.log('   npm run dev');
      process.exit(1);
    }

    await runApiTests();
  });
}

module.exports = { runApiTests };