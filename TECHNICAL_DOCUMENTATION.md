# Show do Melzão MVP - Documentação Técnica

## Visão Geral do Projeto

O "Show do Melzão MVP" é um quiz educativo LGBT+ em tempo real inspirado no "Show do Milhão", construído com tecnologias web modernas e focado em conteúdo educativo sobre diversidade e inclusão.

### Arquitetura Geral
- **Frontend**: React + TypeScript (GitHub Pages)
- **Backend**: Node.js/Express + Socket.IO (Render)
- **Banco de Dados**: SQLite
- **Comunicação**: WebSocket bidirecionaal em tempo real
- **Deploy**: CI/CD automatizado via GitHub Actions

---

## Estrutura do Backend

### Localização: `/server/`

### 1. **Aplicação Principal (`app.js`)**
```javascript
// Servidor Express com Socket.IO
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
```

**Responsabilidades:**
- Configuração do servidor Express com CORS
- Integração Socket.IO com suporte cross-origin
- Endpoint de health check (`/health`)
- APIs RESTful para dados persistentes
- Gerenciamento graceful de shutdown

### 2. **Camada de Banco de Dados (`database.js`)**
```javascript
class Database {
  constructor() { this.db = null; }
  async initialize() { /* SQLite setup */ }
  async createTables() { /* Schema management */ }
}
```

**Esquema do Banco:**
```sql
-- Sessões de jogo
CREATE TABLE game_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT UNIQUE NOT NULL,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  ended_at DATETIME,
  status TEXT DEFAULT 'active',
  total_participants INTEGER DEFAULT 0
);

-- Participantes
CREATE TABLE participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  participant_id TEXT UNIQUE NOT NULL,
  session_id TEXT NOT NULL,
  name TEXT NOT NULL,
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  final_status TEXT, -- 'winner', 'eliminated', 'quit'
  final_level INTEGER DEFAULT 0,
  total_earned INTEGER DEFAULT 0,
  FOREIGN KEY (session_id) REFERENCES game_sessions(session_id)
);

-- Respostas
CREATE TABLE answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  participant_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  question_text TEXT NOT NULL,
  level INTEGER NOT NULL,
  selected_answer TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  honey_earned INTEGER DEFAULT 0,
  answered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (participant_id) REFERENCES participants(participant_id)
);
```

### 3. **Controlador do Jogo (`gameController.js`)**
```javascript
class GameController {
  // Estado em memória do jogo
  gameState = {
    sessionId: null,
    participants: [],
    currentParticipant: null,
    currentQuestion: null,
    gameStatus: 'waiting'
  }
}
```

**Funcionalidades:**
- Gerenciamento de estado do jogo em memória
- Lógica de seleção de perguntas sem repetição
- Sistema de timer (30 segundos por pergunta)
- Cálculo de pontuação progressiva
- Persistência em banco de dados

### 4. **Handler WebSocket (`gameSocket.js`)**

**Eventos Client → Server:**
- `join-game` - Entrar na sala do jogo
- `add-participant(name)` - Adicionar jogador
- `start-game(participantId)` - Iniciar quiz
- `submit-answer({participantId, answer})` - Enviar resposta
- `quit-game(participantId)` - Sair voluntariamente
- `reset-game()` - Reset administrativo

**Eventos Server → Client:**
- `game-state(state)` - Atualização do estado
- `participant-added(participant)` - Novo jogador
- `game-started({participant, question})` - Quiz iniciado
- `answer-result(result)` - Resultado da resposta
- `game-ended(result)` - Sessão finalizada
- `time-up()` - Tempo esgotado
- `error(message)` - Notificação de erro

### 5. **Banco de Perguntas (`questionBank.js`)**
```javascript
const questions = {
  1: [ // Nível 1 - 5 pontos
    {
      id: "lgbtq_1_1",
      category: "LGBT+",
      question: "Que cores compõem a bandeira do orgulho LGBT+?",
      options: ["A) Vermelho, laranja, amarelo", "B) Azul, verde, roxo", ...]
    }
  ]
}
```

**Características:**
- 100 perguntas balanceadas em 3 categorias
- 10 níveis de dificuldade progressiva
- Valores de 5 a 20.000 pontos
- Sistema anti-repetição por sessão

---

## Estrutura do Frontend

### Localização: `/client/src/`

### 1. **Aplicação Principal (`App.tsx`)**
```typescript
function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  // Gerenciamento de estado e conexão WebSocket
}
```

### 2. **Dashboard do Host (`HostDashboard.tsx`)**
```typescript
interface Participant {
  id: string;
  name: string;
  joinedAt: string;
  status: 'waiting' | 'playing' | 'finished';
}
```

**Funcionalidades:**
- Interface de controle para host do quiz
- Gerenciamento de participantes em tempo real
- Exibição de perguntas com timer visual
- Processamento de respostas com feedback
- Design responsivo

### 3. **Dashboard de Histórico (`HistoryDashboard.tsx`)**
```typescript
type TabType = 'stats' | 'leaderboard' | 'sessions' | 'questions' | 'charts';

const HistoryDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('stats');
  // Analytics com navegação por abas
}
```

**Abas disponíveis:**
- **Stats**: Estatísticas gerais do jogo
- **Leaderboard**: Top 10 pontuações
- **Sessions**: Histórico de sessões com filtros
- **Questions**: Performance por pergunta
- **Charts**: Visualizações gráficas

### 4. **Serviço de API (`services/api.ts`)**
```typescript
export interface GameStats {
  totalSessions: number;
  totalParticipants: number;
  avgSessionDuration: number;
  completionRate: number;
}

export const apiService = {
  getGameStats: (): Promise<GameStats> => { /* ... */ },
  getLeaderboard: (): Promise<TopScore[]> => { /* ... */ },
  // Outros métodos...
}
```

### 5. **Sistema de Som (`hooks/useSounds.ts`)**
```typescript
const useSounds = () => {
  const playSound = (type: SoundType) => {
    // Web Audio API com osciladores
    // Efeitos: filtros, reverb, distorção
  }
}
```

**Sons contextuais:**
- `processing` - Tensão durante resposta
- `correct` - Acerto (arpejo maior)
- `incorrect` - Erro (trítono dissonante)
- `gameStart` - Fanfarra de início
- `timeWarning` - Alerta de tempo
- `victory` - Vitória triumfante

---

## APIs e Endpoints

### Endpoints HTTP REST
```
GET  /health                    # Health check
GET  /status                    # Estado atual do jogo
GET  /api/stats                 # Estatísticas gerais
GET  /api/leaderboard           # Top 10 jogadores
GET  /api/sessions?limit=N      # Histórico paginado
GET  /api/sessions/:sessionId   # Relatório detalhado
GET  /api/questions/stats       # Performance por pergunta
```

### Eventos WebSocket
```javascript
// Cliente para Servidor
socket.emit('join-game');
socket.emit('add-participant', 'NomeJogador');
socket.emit('start-game', participantId);
socket.emit('submit-answer', {participantId, answer: 'A'});

// Servidor para Cliente
socket.on('game-state', (state) => {});
socket.on('participant-added', (participant) => {});
socket.on('answer-result', (result) => {});
```

---

## Deploy e Infraestrutura

### Frontend (GitHub Pages)
```yaml
# .github/workflows/deploy-client.yml
name: Deploy React App to GitHub Pages
on:
  push:
    branches: [ main ]
    paths: ['client/**']

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      - name: Install & Build
        run: |
          cd client
          npm ci
          npm run build
        env:
          PUBLIC_URL: /melzao
```

### Backend (Render)
- **URL**: `https://melzao-backend.onrender.com`
- **Auto-deploy**: Conectado ao GitHub
- **Variáveis**: `PORT=5001`, `NODE_ENV=production`
- **CORS**: Permite origin do GitHub Pages

---

## Guia para Escalonamento

### Limitações Atuais
1. **SQLite único** - Acesso concorrente limitado
2. **Estado em memória** - Perda em restart do servidor
3. **Instância única** - Sem escalabilidade horizontal
4. **Armazenamento local** - Limitado a um nó

### Recomendações de Escalabilidade

#### Curto Prazo (MVP+)
```javascript
// Integração Redis para estado persistente
const redis = require('redis');
const client = redis.createClient(process.env.REDIS_URL);

// Migração PostgreSQL
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20 // Connection pooling
});
```

#### Médio Prazo (Produção)
```yaml
# docker-compose.yml - Microserviços
version: '3.8'
services:
  game-service:
    build: ./game-service
    depends_on: [redis, postgres]

  analytics-service:
    build: ./analytics-service
    depends_on: [postgres]

  nginx:
    image: nginx:alpine
    # Load balancer com sticky sessions
```

#### Longo Prazo (Enterprise)
```yaml
# kubernetes/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: melzao-game-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: melzao-game
  template:
    spec:
      containers:
      - name: game-service
        image: melzao/game-service:latest
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
```

### Otimizações de Performance

#### Backend
```javascript
// Connection pooling
const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Rate limiting
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // máximo 100 requests por IP
});
app.use('/api/', limiter);
```

#### Frontend
```typescript
// Code splitting com React.lazy
const HistoryDashboard = React.lazy(
  () => import('./components/HistoryDashboard')
);

// Service Worker para cache
self.addEventListener('fetch', event => {
  if (event.request.url.includes('/api/')) {
    // Cache API responses
  }
});
```

---

## Estrutura de Pastas Completa

```
melzao/
├── .github/
│   └── workflows/
│       └── deploy-client.yml      # CI/CD GitHub Pages
├── client/                        # Frontend React
│   ├── public/
│   │   ├── index.html
│   │   └── manifest.json
│   ├── src/
│   │   ├── components/
│   │   │   ├── HistoryDashboard.tsx
│   │   │   └── SimpleCharts.tsx
│   │   ├── hooks/
│   │   │   └── useSounds.ts       # Sistema de som
│   │   ├── services/
│   │   │   └── api.ts             # Cliente API
│   │   ├── App.tsx                # App principal
│   │   ├── HostDashboard.tsx      # Dashboard host
│   │   └── index.tsx
│   ├── package.json
│   └── tsconfig.json
├── server/                        # Backend Node.js
│   ├── app.js                     # Servidor principal
│   ├── database.js                # Camada de dados
│   ├── gameController.js          # Lógica do jogo
│   ├── gameSocket.js              # WebSocket handlers
│   ├── gameData.js                # Persistência
│   ├── questionBank.js            # Banco de perguntas
│   └── package.json
├── .gitignore                     # Git ignore (inclui *.db)
├── package.json                   # Scripts raiz
├── README.md                      # Documentação
└── TECHNICAL_DOCUMENTATION.md    # Esta documentação
```

---

## Comandos de Desenvolvimento

```bash
# Setup inicial
npm run install-all

# Desenvolvimento local
npm run dev          # Frontend + Backend simultaneamente
npm run client       # Apenas frontend (porta 3000)
npm run server       # Apenas backend (porta 5001)

# Deploy
git push origin main # Trigger automático GitHub Actions

# Produção
npm run build        # Build do backend
npm start           # Produção backend
```

---

## Considerações de Segurança

### Validação de Input
```javascript
// Validação no backend
const validator = require('validator');

const addParticipant = (name) => {
  if (!name || typeof name !== 'string') {
    throw new Error('Nome inválido');
  }

  if (name.length > 50) {
    throw new Error('Nome muito longo');
  }

  const sanitized = validator.escape(name);
  return sanitized;
};
```

### Rate Limiting
```javascript
// Proteção contra spam
const participantLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 5, // máximo 5 participantes por minuto por IP
  message: 'Muitos participantes adicionados. Tente novamente em 1 minuto.'
});
```

### CORS Seguro
```javascript
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://zurcleo.github.io',
      'http://localhost:3000',
      'http://localhost:3001'
    ];

    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Não permitido pelo CORS'));
    }
  }
};
```

---

## Monitoramento e Logs

### Health Checks
```javascript
// Endpoint de health check
app.get('/health', async (req, res) => {
  try {
    // Verifica conexão com banco
    await database.get('SELECT 1');

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});
```

### Logging Estruturado
```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

---

Esta documentação fornece uma base sólida para escalar o projeto "Show do Melzão MVP", mantendo a arquitetura educativa e a experiência de usuário envolvente enquanto cresce para suportar mais usuários e funcionalidades avançadas.