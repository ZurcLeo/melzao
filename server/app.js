const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const database = require('./database');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: [
      "https://zurcleo.github.io",
      "https://zurcleo.github.io/",
      "https://zurcleo.github.io/melzao",
      "https://zurcleo.github.io/melzao/",
      "http://localhost:3001"
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true
  },
  transports: ['polling', 'websocket'],
  allowEIO3: true
});

app.use(cors({
  origin: [
    "https://zurcleo.github.io",
    "https://zurcleo.github.io/",
    "https://zurcleo.github.io/melzao",
    "https://zurcleo.github.io/melzao/",
    "http://localhost:3001"
  ],
  methods: ["GET", "POST"],
  credentials: true
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

// Use API routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/configs', configRoutes);
app.use('/api/game', gameRoutes);

// Import multi-user socket handler
require('./multiUserGameSocket')(io);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Show do Melzão MVP Server'
  });
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