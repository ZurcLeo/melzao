# 📊 Dashboard de Dados Históricos - Show do Melzão

## Funcionalidades Implementadas

### 🗄️ **Sistema de Persistência**
- **Banco SQLite** com tabelas para sessões, participantes e respostas
- **Persistência automática** de todos os dados do jogo
- **Histórico completo** de todas as partidas

### 📋 **Estrutura do Banco de Dados**

#### Tabela `game_sessions`
- Sessões de jogo com timestamps e status
- Rastreamento de duração e número de participantes

#### Tabela `participants`
- Dados completos dos jogadores
- Status final (winner, eliminated, quit)
- Pontuação e nível final

#### Tabela `answers`
- Cada resposta individual salva
- Pergunta, opções escolhidas, acertos/erros
- Honey ganho por resposta

### 🎯 **API Endpoints Disponíveis**

#### Estatísticas Gerais
- `GET /api/stats` - Estatísticas gerais do jogo

#### Rankings
- `GET /api/leaderboard` - Top 10 maiores pontuações

#### Histórico de Sessões
- `GET /api/sessions?limit=50` - Lista das últimas sessões
- `GET /api/sessions/:sessionId` - Relatório detalhado de uma sessão

#### Análise de Perguntas
- `GET /api/questions/stats` - Estatísticas de dificuldade das perguntas

### 🖥️ **Interface do Dashboard**

#### **Visualização "Ao Vivo"**
- Interface original do jogo
- Controles para adicionar participantes
- Acompanhamento do jogo em tempo real

#### **Visualização "Dados Históricos"**

##### 📊 **Aba Estatísticas**
- Total de sessões, participantes e vencedores
- Taxa de acerto geral
- Média de honey ganho
- Distribuição de respostas corretas/erradas

##### 🏆 **Aba Ranking**
- Top 10 maiores pontuações de todos os tempos
- Detalhes de cada performance (nível, status, data)
- Ranking ordenado por honey ganho

##### 📋 **Aba Sessões**
- Lista das últimas 30 sessões
- Clique em qualquer sessão para ver relatório detalhado
- Informações completas de participantes e suas respostas

##### ❓ **Aba Perguntas**
- Estatísticas de dificuldade por pergunta
- Taxa de acerto individual
- Frequência que cada pergunta foi feita

##### 📈 **Aba Gráficos**
- **Gráfico de barras** para top scores
- **Distribuição de dificuldade** das perguntas
- **Perguntas mais feitas** no jogo
- **Taxa de acerto geral** em formato donut
- **Distribuição por nível** (1-10)

### 🔧 **Recursos Técnicos**

#### **Performance**
- Índices otimizados no banco
- Carregamento assíncrono de dados
- Limite configurável de registros

#### **Usabilidade**
- Interface responsiva
- Estados de loading e erro
- Formatação de datas em português
- Cores indicativas para performance

#### **Funcionalidades Avançadas**
- Filtragem inteligente de perguntas difíceis
- Análise de performance por nível
- Relatórios detalhados com drill-down
- Visualizações em tempo real

### 📱 **Como Usar**

1. **Iniciar o servidor**: `npm run dev` na pasta `server/`
2. **Iniciar o cliente**: `npm start` na pasta `client/`
3. **Acessar**: `http://localhost:3000`
4. **Navegar**: Usar os botões "🔴 Ao Vivo" e "📊 Dados Históricos"

### 🎮 **Fluxo de Dados**

```
Jogo Ativo → Persistência Automática → APIs → Dashboard Histórico
     ↓              ↓                    ↓           ↓
Participantes  →  Banco SQLite  →  Endpoints  →  Visualizações
Respostas     →  (3 tabelas)   →  REST API   →  (5 abas)
Sessões       →  Índices       →  JSON       →  Gráficos
```

### 🚀 **Próximas Melhorias**
- Filtros de data para histórico
- Exportação de relatórios em PDF/Excel
- Gráficos mais avançados (linha temporal)
- Comparação entre sessões
- Análise de performance por participante

---

**Desenvolvido para o Show do Melzão MVP**
*Sistema completo de análise e visualização de dados históricos*