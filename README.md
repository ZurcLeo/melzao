# 🎯 Show do Melzão MVP

Quiz LGBT+ interativo com WebSocket em tempo real, baseado no conceito do programa "Quem Quer Ser um Milionário", mas com foco educativo sobre diversidade e inclusão LGBT+.

## 📋 Funcionalidades do MVP

- ✅ **Backend Express + Socket.io** - Comunicação em tempo real
- ✅ **10 perguntas LGBT+ hardcoded** - Conteúdo educativo pronto
- ✅ **Sistema de participantes** - Adicionar e gerenciar jogadores
- ✅ **Timer de 15 segundos** - Pressão temporal por pergunta
- ✅ **Lógica de pontuação** - Sistema honey com progressão
- ✅ **Dashboard do host** - Interface de controle completa
- ✅ **Interface mobile responsiva** - Tailwind CSS + React
- ✅ **Deploy-ready** - Configurado para produção

## 🚀 Como Executar

### Desenvolvimento Rápido
```bash
# Instalar todas as dependências
npm run install-all

# Executar servidor + client simultaneamente
npm run dev
```

### Execução Separada

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd client
npm start
```

## 🌐 URLs de Acesso

- **Frontend:** http://localhost:3000
- **Backend:** http://localhost:5001
- **Health Check:** http://localhost:5001/health
- **Game Status:** http://localhost:5001/status

## 🎮 Como Jogar

1. **Adicionar Participante:** Digite o nome e clique ➕
2. **Iniciar Jogo:** Clique ▶️ no participante desejado
3. **Responder:** Selecione uma opção e clique ✅
4. **Timer:** 15 segundos para cada pergunta
5. **Progressão:** 10 perguntas com valores crescentes de honey
6. **Vitória:** Acertar todas as 10 perguntas
7. **Derrota:** Errar uma pergunta (fica com 50% do valor)
8. **Desistir:** Parar e ficar com o valor atual

## 💰 Sistema de Pontuação

| Nível | Pergunta | Honey | Acumulado |
|-------|----------|-------|-----------|
| 1     | LGBT no Brasil | 10 | 10 |
| 2     | Representatividade | 100 | 110 |
| 3     | Casamento igualitário | 200 | 310 |
| 4     | Drag queens | 400 | 710 |
| 5     | Bandeira não-binária | 800 | 1.510 |
| 6     | Casais homoafetivos | 1.200 | 2.710 |
| 7     | Comunidade bear | 2.400 | 5.110 |
| 8     | Casamento mundial | 4.800 | 9.910 |
| 9     | Bandeira original | 9.600 | 19.510 |
| 10    | Sigla LGBTQIAPN+ | 20.000 | **39.510** 🏆 |

## 🏗️ Estrutura do Projeto

```
show-melzao-mvp/
├── package.json              # Root - Scripts de desenvolvimento
├── server/                   # Backend Node.js
│   ├── app.js               # Setup Express + Socket.io
│   ├── gameController.js    # Lógica do jogo e perguntas
│   ├── gameSocket.js        # Eventos WebSocket
│   └── package.json         # Dependências do servidor
└── client/                  # Frontend React + TypeScript
    ├── src/
    │   ├── App.tsx          # App principal com Socket.io
    │   ├── HostDashboard.tsx # Interface do host
    │   └── index.css        # Styles com Tailwind
    ├── tailwind.config.js   # Config do Tailwind
    └── package.json         # Dependências do cliente
```

## 🔧 Tecnologias Utilizadas

### Backend
- **Node.js** - Runtime JavaScript
- **Express** - Framework web
- **Socket.io** - WebSocket em tempo real
- **CORS** - Cross-origin resource sharing

### Frontend
- **React** - Biblioteca de interface
- **TypeScript** - Tipagem estática
- **Socket.io-client** - Cliente WebSocket
- **React-Toastify** - Notificações
- **Tailwind CSS** - Framework de estilos

## 📡 API WebSocket Events

### Client → Server
- `join-game` - Entrar na sala do jogo
- `add-participant` - Adicionar participante
- `start-game` - Iniciar jogo para participante
- `submit-answer` - Enviar resposta
- `quit-game` - Desistir do jogo
- `reset-game` - Resetar estado do jogo

### Server → Client
- `game-state` - Estado atual do jogo
- `participant-added` - Participante adicionado
- `game-started` - Jogo iniciado
- `answer-result` - Resultado da resposta
- `time-up` - Tempo esgotado
- `error` - Erro no servidor

## 🚀 Deploy

### Preparar para Produção
```bash
# Build do frontend
cd client
npm run build

# Configurar variáveis de ambiente
cd ../server
cp .env.example .env  # (criar este arquivo)
```

### Variáveis de Ambiente
```bash
# server/.env
PORT=5000
NODE_ENV=production
CLIENT_URL=https://seu-frontend.com
```

## 🎯 Próximos Passos (Pós-MVP)

1. **Base de Dados** - Salvar participantes e histórico
2. **Mais Perguntas** - Expandir banco de questões
3. **Níveis de Dificuldade** - Categorias diferentes
4. **Multiplayer** - Múltiplos participantes simultâneos
5. **Admin Panel** - Gerenciar perguntas e jogos
6. **Analytics** - Estatísticas de participação
7. **Mobile App** - Versão nativa
8. **Personalização** - Temas e configurações

## 🤝 Contribuindo

1. Fork do projeto
2. Criar branch para feature (`git checkout -b feature/nova-feature`)
3. Commit das mudanças (`git commit -m 'feat: adiciona nova feature'`)
4. Push para branch (`git push origin feature/nova-feature`)
5. Abrir Pull Request

## 📄 Licença

MIT License - veja [LICENSE](LICENSE) para detalhes.

---

**✨ Feito com ❤️ para promover educação e inclusão LGBT+**