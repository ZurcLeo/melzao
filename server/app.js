require('dotenv').config();

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const database = require('./database');

const app = express();
const server = http.createServer(app);

// Allowed origins for CORS
const allowedOrigins = [
  'https://zurcleo.github.io',
  'http://localhost:3001'
];

const io = socketIo(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const isAllowed = allowedOrigins.some(allowed =>
        origin === allowed || origin.startsWith(allowed + '/')
      );
      callback(null, isAllowed);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true
  },
  transports: ['polling', 'websocket'],
  allowEIO3: true
});

// CORS configuration with origin validation
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    // Check if origin matches exactly or is a path under allowed origins
    const isAllowed = allowedOrigins.some(allowed =>
      origin === allowed || origin.startsWith(allowed + '/')
    );

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  maxAge: 86400 // Cache preflight for 24h
}));

// Security headers with helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "https://zurcleo.github.io"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

app.use(express.json());

// Trust proxy for accurate IP addresses (important for rate limiting)
app.set('trust proxy', true);

// Inicializar banco de dados
database.initialize().catch(console.error);

// Import API routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const questionRoutes = require('./routes/questions');
const configRoutes = require('./routes/configs');
const gameRoutes = require('./routes/game');
const rankingRoutes = require('./routes/ranking');

// Make io available to routes via app.locals
app.locals.io = io;

// Use API routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/configs', configRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/ranking', rankingRoutes);

// Import multi-user socket handler
require('./multiUserGameSocket')(io);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Show do Melzão MVP Server',
    database: database.getDatabaseType()
  });
});

// Setup endpoint - for initial database setup (create admin user)
app.post('/api/setup/init', async (req, res) => {
  try {
    const createAdminUser = require('./scripts/createAdminUser');
    const result = await createAdminUser();

    res.json({
      success: true,
      message: 'Setup concluído com sucesso',
      admin: {
        id: result.id,
        email: result.email,
        name: result.name,
        role: result.role,
        status: result.status
      }
    });
  } catch (error) {
    console.error('Erro no setup:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Status do jogo
app.get('/status', (req, res) => {
  const GameController = require('./gameController');
  res.json(GameController.getGameState());
});

// Rotas para dados persistidos
const { GameController } = require('./gameController');

// Estatísticas gerais
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await GameController.getGameStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

// Top 10 pontuações
app.get('/api/leaderboard', async (req, res) => {
  try {
    const topScores = await GameController.getTopScores();
    res.json(topScores);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar ranking' });
  }
});

// Histórico de sessões
app.get('/api/sessions', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const sessions = await GameController.getGameSessions(limit);
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar sessões' });
  }
});

// Relatório de sessão específica
app.get('/api/sessions/:sessionId', async (req, res) => {
  try {
    const report = await GameController.getSessionReport(req.params.sessionId);
    if (!report) {
      return res.status(404).json({ error: 'Sessão não encontrada' });
    }
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar relatório da sessão' });
  }
});

// Estatísticas de perguntas
app.get('/api/questions/stats', async (req, res) => {
  try {
    const stats = await GameController.getPersistentQuestionStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar estatísticas de perguntas' });
  }
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`🎯 Show do Melzão MVP rodando na porta ${PORT}`);
  console.log(`📡 Socket.io configurado com CORS para localhost:3000,3001`);
  console.log(`🩺 Health check disponível em http://localhost:${PORT}/health`);
});

// Fechar banco de dados quando servidor for finalizado
process.on('SIGINT', async () => {
  console.log('\n📝 Fechando servidor...');
  await database.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n📝 Fechando servidor...');
  await database.close();
  process.exit(0);
});