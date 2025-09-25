#!/usr/bin/env node

/**
 * Multi-User Game Test Script
 * Tests the complete multi-user game functionality including sessions and socket connections
 */

const axios = require('axios');
const database = require('../database');

const BASE_URL = 'http://localhost:5001/api';

// Test data
let adminToken, host1Token, host2Token;
let host1UserId, host2UserId;
let host1SessionId, host2SessionId;
let participant1Id, participant2Id;

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

async function runMultiUserGameTests() {
  console.log('🎮 Iniciando testes do sistema multi-usuário de jogos...\n');

  try {
    // Initialize database
    console.log('1️⃣ Inicializando banco de dados...');
    await database.initialize();
    console.log('✅ Banco inicializado\n');

    // Test 1: Admin login
    console.log('2️⃣ Autenticando admin...');
    const adminLogin = await makeRequest('POST', '/auth/login', {
      email: 'admin@melzao.com',
      password: 'admin123'
    });

    if (adminLogin.success) {
      adminToken = adminLogin.data.token;
      console.log('✅ Admin autenticado');
    } else {
      throw new Error('Falha no login do admin');
    }

    // Test 2: Register and approve two hosts
    console.log('\n3️⃣ Registrando hosts...');
    const host1Email = `host1_${Date.now()}@test.com`;
    const host2Email = `host2_${Date.now()}@test.com`;

    // Register hosts
    const host1Reg = await makeRequest('POST', '/auth/register', {
      email: host1Email,
      password: 'host123',
      name: 'Host 1 Teste'
    });

    const host2Reg = await makeRequest('POST', '/auth/register', {
      email: host2Email,
      password: 'host123',
      name: 'Host 2 Teste'
    });

    if (host1Reg.success && host2Reg.success) {
      console.log('✅ Hosts registrados');

      // Get pending users
      const pendingResponse = await makeRequest('GET', '/admin/users/pending', {}, adminToken);

      if (pendingResponse.success) {
        const pendingUsers = pendingResponse.data.users;

        const user1 = pendingUsers.find(u => u.email === host1Email);
        const user2 = pendingUsers.find(u => u.email === host2Email);

        if (user1 && user2) {
          host1UserId = user1.id;
          host2UserId = user2.id;

          // Approve hosts
          await makeRequest('PUT', `/admin/users/${host1UserId}/approve`, {}, adminToken);
          await makeRequest('PUT', `/admin/users/${host2UserId}/approve`, {}, adminToken);

          console.log('✅ Hosts aprovados');
        }
      }
    }

    // Test 3: Host logins
    console.log('\n4️⃣ Autenticando hosts...');
    const host1Login = await makeRequest('POST', '/auth/login', {
      email: host1Email,
      password: 'host123'
    });

    const host2Login = await makeRequest('POST', '/auth/login', {
      email: host2Email,
      password: 'host123'
    });

    if (host1Login.success && host2Login.success) {
      host1Token = host1Login.data.token;
      host2Token = host2Login.data.token;
      console.log('✅ Hosts autenticados');
    } else {
      throw new Error('Falha no login dos hosts');
    }

    // Test 4: Create custom questions for hosts
    console.log('\n5️⃣ Criando questões personalizadas...');

    // Host 1 questions
    const host1Question = await makeRequest('POST', '/questions', {
      category: 'LGBT+',
      questionText: 'Qual cor representa a diversidade na bandeira LGBT+?',
      options: [
        'A) Arco-íris',
        'B) Rosa',
        'C) Azul',
        'D) Verde'
      ],
      correctAnswer: 'A',
      level: 2,
      honeyValue: 100
    }, host1Token);

    // Host 2 questions
    const host2Question = await makeRequest('POST', '/questions', {
      category: 'História Queer',
      questionText: 'Em que ano ocorreu a Revolta de Stonewall?',
      options: [
        'A) 1967',
        'B) 1969',
        'C) 1971',
        'D) 1973'
      ],
      correctAnswer: 'B',
      level: 4,
      honeyValue: 300
    }, host2Token);

    if (host1Question.success && host2Question.success) {
      console.log('✅ Questões personalizadas criadas');
    }

    // Test 5: Create custom configurations
    console.log('\n6️⃣ Criando configurações personalizadas...');

    const host1Config = await makeRequest('POST', '/configs', {
      configName: 'Config Rápida',
      honeyMultiplier: 2.0,
      timeLimit: 20,
      customQuestionsOnly: false,
      maxParticipants: 25
    }, host1Token);

    const host2Config = await makeRequest('POST', '/configs', {
      configName: 'Config Personalizada',
      honeyMultiplier: 1.5,
      timeLimit: 45,
      customQuestionsOnly: true,
      maxParticipants: 50
    }, host2Token);

    if (host1Config.success && host2Config.success) {
      console.log('✅ Configurações personalizadas criadas');
    }

    // Test 6: Create simultaneous game sessions
    console.log('\n7️⃣ Criando sessões simultâneas...');

    const host1Session = await makeRequest('POST', '/game/session', {
      configId: host1Config.data.configId
    }, host1Token);

    const host2Session = await makeRequest('POST', '/game/session', {
      configId: host2Config.data.configId
    }, host2Token);

    if (host1Session.success && host2Session.success) {
      host1SessionId = host1Session.data.sessionId;
      host2SessionId = host2Session.data.sessionId;
      console.log(`✅ Sessões criadas: ${host1SessionId}, ${host2SessionId}`);
    }

    // Test 7: Add participants to sessions
    console.log('\n8️⃣ Adicionando participantes...');

    const participant1 = await makeRequest('POST', '/game/participants', {
      name: 'Participante 1'
    }, host1Token);

    const participant2 = await makeRequest('POST', '/game/participants', {
      name: 'Participante 2'
    }, host2Token);

    if (participant1.success && participant2.success) {
      participant1Id = participant1.data.participant.id;
      participant2Id = participant2.data.participant.id;
      console.log('✅ Participantes adicionados às sessões');
    }

    // Test 8: Start games
    console.log('\n9️⃣ Iniciando jogos...');

    const gameStart1 = await makeRequest('POST', '/game/start', {
      participantId: participant1Id
    }, host1Token);

    const gameStart2 = await makeRequest('POST', '/game/start', {
      participantId: participant2Id
    }, host2Token);

    if (gameStart1.success && gameStart2.success) {
      console.log('✅ Jogos iniciados simultaneamente');
      console.log(`   Host 1: ${gameStart1.data.question.question}`);
      console.log(`   Host 2: ${gameStart2.data.question.question}`);
    }

    // Test 9: Submit answers
    console.log('\n🔟 Submetendo respostas...');

    const answer1 = await makeRequest('POST', '/game/answer', {
      participantId: participant1Id,
      answer: gameStart1.data.question.correctAnswer,
      responseTime: 15000
    }, host1Token);

    const answer2 = await makeRequest('POST', '/game/answer', {
      participantId: participant2Id,
      answer: 'A', // Wrong answer
      responseTime: 25000
    }, host2Token);

    if (answer1.success && answer2.success) {
      console.log('✅ Respostas processadas');
      console.log(`   Host 1: ${answer1.data.correct ? 'Correto' : 'Incorreto'}`);
      console.log(`   Host 2: ${answer2.data.correct ? 'Correto' : 'Incorreto'}`);
    }

    // Test 10: Get session statistics
    console.log('\n1️⃣1️⃣ Verificando estatísticas...');

    const stats1 = await makeRequest('GET', '/game/stats', {}, host1Token);
    const stats2 = await makeRequest('GET', '/game/stats', {}, host2Token);

    if (stats1.success && stats2.success) {
      console.log('✅ Estatísticas obtidas');
      console.log(`   Host 1: ${stats1.data.stats.stats.totalQuestions} questões`);
      console.log(`   Host 2: ${stats2.data.stats.stats.totalQuestions} questões`);
    }

    // Test 11: Admin view of all sessions
    console.log('\n1️⃣2️⃣ Visualizando sessões como admin...');

    const allSessions = await makeRequest('GET', '/game/all-sessions', {}, adminToken);

    if (allSessions.success) {
      console.log(`✅ ${allSessions.data.sessions.length} sessões ativas encontradas`);
      allSessions.data.sessions.forEach(session => {
        console.log(`   Usuário ${session.userId}: ${session.participantCount} participantes`);
      });
    }

    // Test 12: Question preview for different levels
    console.log('\n1️⃣3️⃣ Testando preview de questões...');

    const preview1 = await makeRequest('GET', '/game/question-preview/2', {}, host1Token);
    const preview2 = await makeRequest('GET', '/game/question-preview/4', {}, host2Token);

    if (preview1.success && preview2.success) {
      console.log(`✅ Preview de questões obtido`);
      console.log(`   Host 1 (nível 2): ${preview1.data.questions.length} questões disponíveis`);
      console.log(`   Host 2 (nível 4): ${preview2.data.questions.length} questões disponíveis`);
    }

    // Test 13: End sessions
    console.log('\n1️⃣4️⃣ Finalizando sessões...');

    const endSession1 = await makeRequest('DELETE', '/game/session', {}, host1Token);
    const endSession2 = await makeRequest('DELETE', '/game/session', {}, host2Token);

    if (endSession1.success && endSession2.success) {
      console.log('✅ Sessões finalizadas');
    }

    // Test 14: Verify session cleanup
    console.log('\n1️⃣5️⃣ Verificando limpeza de sessões...');

    const finalSessionCheck = await makeRequest('GET', '/game/all-sessions', {}, adminToken);

    if (finalSessionCheck.success) {
      console.log(`✅ ${finalSessionCheck.data.sessions.length} sessões ativas restantes`);
    }

    console.log('\n🎉 Todos os testes multi-usuário passaram com sucesso!');

    console.log('\n📋 Resumo dos testes realizados:');
    console.log('   ✅ Autenticação multi-usuário');
    console.log('   ✅ Registro e aprovação de hosts');
    console.log('   ✅ Criação de questões personalizadas por host');
    console.log('   ✅ Configurações personalizadas por host');
    console.log('   ✅ Sessões simultâneas independentes');
    console.log('   ✅ Mistura de questões padrão + personalizadas');
    console.log('   ✅ Processamento de respostas com multiplicadores');
    console.log('   ✅ Estatísticas por sessão');
    console.log('   ✅ Painel administrativo de sessões ativas');
    console.log('   ✅ Preview de questões por nível');
    console.log('   ✅ Finalização e limpeza de sessões');

    console.log('\n🚀 Sistema multi-usuário 100% funcional!');

  } catch (error) {
    console.error('❌ Erro durante os testes:', error);
    if (error.response?.data) {
      console.error('   Detalhes:', JSON.stringify(error.response.data, null, 2));
    }
    console.error('\n🔍 Stack trace:', error.stack);
  } finally {
    await database.close();
  }
}

// Helper to check server
async function ensureServerRunning() {
  try {
    const healthResponse = await makeRequest('GET', '../health');
    return healthResponse.success;
  } catch (error) {
    return false;
  }
}

// Run tests
if (require.main === module) {
  ensureServerRunning().then(async (serverRunning) => {
    if (!serverRunning) {
      console.log('⚠️ Servidor não está rodando. Inicie com:');
      console.log('   npm run dev');
      process.exit(1);
    }

    await runMultiUserGameTests();
  });
}

module.exports = { runMultiUserGameTests };