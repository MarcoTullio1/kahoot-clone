# Documentação da API

## Rotas Administrativas

Base URL: `/api/admin`

### Jogos

#### GET /games
Lista todos os jogos

**Resposta:**
\`\`\`json
{
  "success": true,
  "games": [
    {
      "id": 1,
      "name": "Quiz de Conhecimentos Gerais",
      "status": "waiting",
      "current_question_index": 0,
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
\`\`\`

#### POST /games
Cria um novo jogo

**Body:**
\`\`\`json
{
  "name": "Meu Novo Quiz"
}
\`\`\`

**Resposta:**
\`\`\`json
{
  "success": true,
  "gameId": 1
}
\`\`\`

#### GET /games/:id
Busca jogo específico com perguntas e times

**Resposta:**
\`\`\`json
{
  "success": true,
  "game": {
    "id": 1,
    "name": "Quiz",
    "status": "waiting",
    "questions": [...],
    "teams": [...]
  }
}
\`\`\`

#### DELETE /games/:id
Deleta um jogo

**Resposta:**
\`\`\`json
{
  "success": true
}
\`\`\`

### Times

#### POST /teams
Cria um novo time

**Body:**
\`\`\`json
{
  "gameId": 1,
  "name": "Time Alpha"
}
\`\`\`

**Resposta:**
\`\`\`json
{
  "success": true,
  "team": {
    "id": 1,
    "name": "Time Alpha",
    "accessCode": "ABC12345",
    "qrCode": "data:image/png;base64,..."
  }
}
\`\`\`

#### DELETE /teams/:id
Deleta um time

### Perguntas

#### POST /questions
Cria uma pergunta

**Body:**
\`\`\`json
{
  "gameId": 1,
  "questionText": "Qual é a capital do Brasil?",
  "timeLimit": 30,
  "points": 100,
  "orderIndex": 0
}
\`\`\`

#### DELETE /questions/:id
Deleta uma pergunta

### Respostas

#### POST /answers
Cria uma resposta

**Body:**
\`\`\`json
{
  "questionId": 1,
  "answerText": "Brasília",
  "isCorrect": true
}
\`\`\`

#### DELETE /answers/:id
Deleta uma resposta

## Rotas dos Participantes

Base URL: `/api/participant`

#### POST /join
Valida código de acesso

**Body:**
\`\`\`json
{
  "accessCode": "ABC12345"
}
\`\`\`

**Resposta:**
\`\`\`json
{
  "success": true,
  "team": {
    "id": 1,
    "name": "Time Alpha",
    "gameId": 1
  },
  "game": {
    "id": 1,
    "name": "Quiz",
    "status": "waiting"
  }
}
\`\`\`

## Eventos Socket.IO

### Eventos do Admin

#### admin:connect
Conecta admin ao jogo
\`\`\`javascript
socket.emit('admin:connect', gameId);
\`\`\`

#### admin:startGame
Inicia o jogo
\`\`\`javascript
socket.emit('admin:startGame', gameId);
\`\`\`

#### admin:nextQuestion
Avança para próxima pergunta
\`\`\`javascript
socket.emit('admin:nextQuestion', gameId);
\`\`\`

#### admin:showRanking
Mostra ranking
\`\`\`javascript
socket.emit('admin:showRanking', gameId);
\`\`\`

#### admin:endGame
Finaliza o jogo
\`\`\`javascript
socket.emit('admin:endGame', gameId);
\`\`\`

### Eventos do Participante

#### participant:join
Participante entra no jogo
\`\`\`javascript
socket.emit('participant:join', { teamId, nickname });
\`\`\`

#### participant:answer
Envia resposta
\`\`\`javascript
socket.emit('participant:answer', { 
  participantId, 
  questionId, 
  answerId 
});
\`\`\`

### Eventos do Telão

#### display:connect
Conecta telão ao jogo
\`\`\`javascript
socket.emit('display:connect', gameId);
\`\`\`

### Eventos Recebidos

#### game:started
Jogo foi iniciado
\`\`\`javascript
socket.on('game:started', () => {});
\`\`\`

#### question:new
Nova pergunta disponível
\`\`\`javascript
socket.on('question:new', (questionData) => {});
\`\`\`

#### answer:result
Resultado da resposta
\`\`\`javascript
socket.on('answer:result', (result) => {});
\`\`\`

#### ranking:show
Mostrar ranking
\`\`\`javascript
socket.on('ranking:show', (rankingData) => {});
\`\`\`

#### game:ended
Jogo finalizado
\`\`\`javascript
socket.on('game:ended', () => {});
\`\`\`

#### error
Erro ocorrido
\`\`\`javascript
socket.on('error', (data) => {});
