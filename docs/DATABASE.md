# Estrutura do Banco de Dados

## Diagrama ER

\`\`\`
┌─────────────────┐
│     games       │
├─────────────────┤
│ id (PK)         │
│ name            │
│ status          │
│ current_q_index │
│ created_at      │
│ updated_at      │
└────────┬────────┘
         │
         │ 1:N
         │
┌────────▼────────┐       ┌──────────────────┐
│     teams       │       │    questions     │
├─────────────────┤       ├──────────────────┤
│ id (PK)         │       │ id (PK)          │
│ game_id (FK)    │◄──────┤ game_id (FK)     │
│ name            │  1:N  │ question_text    │
│ access_code     │       │ time_limit       │
│ qr_code         │       │ points           │
│ total_score     │       │ order_index      │
└────────┬────────┘       └────────┬─────────┘
         │                         │
         │ 1:N                     │ 1:N
         │                         │
┌────────▼──────────┐     ┌────────▼─────────┐
│  participants     │     │    answers       │
├───────────────────┤     ├──────────────────┤
│ id (PK)           │     │ id (PK)          │
│ team_id (FK)      │     │ question_id (FK) │
│ nickname          │     │ answer_text      │
│ socket_id         │     │ is_correct       │
│ total_score       │     └──────────────────┘
└────────┬──────────┘              │
         │                         │
         │ 1:N                     │
         │                         │
┌────────▼──────────────────────┐  │
│  participant_answers          │  │
├───────────────────────────────┤  │
│ id (PK)                       │  │
│ participant_id (FK)           │  │
│ question_id (FK)              │  │
│ answer_id (FK)                │◄─┘
│ time_taken                    │
│ points_earned                 │
│ answered_at                   │
└───────────────────────────────┘
\`\`\`

## Tabelas

### games
Armazena informações dos jogos/sessões

| Campo                 | Tipo      | Descrição                    |
|-----------------------|-----------|------------------------------|
| id                    | INT       | Chave primária               |
| name                  | VARCHAR   | Nome do jogo                 |
| status                | ENUM      | waiting/active/finished      |
| current_question_index| INT       | Índice da pergunta atual     |
| created_at            | TIMESTAMP | Data de criação              |
| updated_at            | TIMESTAMP | Data de atualização          |

### teams
Armazena os times participantes

| Campo        | Tipo      | Descrição                    |
|--------------|-----------|------------------------------|
| id           | INT       | Chave primária               |
| game_id      | INT       | FK para games                |
| name         | VARCHAR   | Nome do time                 |
| qr_code      | TEXT      | QR Code em base64            |
| access_code  | VARCHAR   | Código de acesso único       |
| total_score  | INT       | Pontuação total do time      |
| created_at   | TIMESTAMP | Data de criação              |

### questions
Armazena as perguntas dos jogos

| Campo          | Tipo      | Descrição                    |
|----------------|-----------|------------------------------|
| id             | INT       | Chave primária               |
| game_id        | INT       | FK para games                |
| question_text  | TEXT      | Texto da pergunta            |
| time_limit     | INT       | Tempo limite em segundos     |
| points         | INT       | Pontos base da pergunta      |
| order_index    | INT       | Ordem de exibição            |
| created_at     | TIMESTAMP | Data de criação              |

### answers
Armazena as opções de resposta

| Campo        | Tipo      | Descrição                    |
|--------------|-----------|------------------------------|
| id           | INT       | Chave primária               |
| question_id  | INT       | FK para questions            |
| answer_text  | TEXT      | Texto da resposta            |
| is_correct   | BOOLEAN   | Se é a resposta correta      |
| created_at   | TIMESTAMP | Data de criação              |

### participants
Armazena os participantes individuais

| Campo       | Tipo      | Descrição                    |
|-------------|-----------|------------------------------|
| id          | INT       | Chave primária               |
| team_id     | INT       | FK para teams                |
| nickname    | VARCHAR   | Nome/apelido do participante |
| socket_id   | VARCHAR   | ID da conexão Socket.IO      |
| total_score | INT       | Pontuação total individual   |
| joined_at   | TIMESTAMP | Data de entrada              |

### participant_answers
Armazena as respostas dos participantes

| Campo          | Tipo      | Descrição                    |
|----------------|-----------|------------------------------|
| id             | INT       | Chave primária               |
| participant_id | INT       | FK para participants         |
| question_id    | INT       | FK para questions            |
| answer_id      | INT       | FK para answers              |
| time_taken     | DECIMAL   | Tempo gasto (segundos)       |
| points_earned  | INT       | Pontos ganhos                |
| answered_at    | TIMESTAMP | Data/hora da resposta        |

## Índices

Para melhor performance, os seguintes índices são criados:

- `teams.game_id` - Buscar times por jogo
- `teams.access_code` - Validar código de acesso (UNIQUE)
- `questions.game_id` - Buscar perguntas por jogo
- `answers.question_id` - Buscar respostas por pergunta
- `participants.team_id` - Buscar participantes por time
- `participants.socket_id` - Buscar participante por socket
- `participant_answers.participant_id` - Buscar respostas por participante
- `participant_answers.question_id` - Estatísticas por pergunta

## Consultas Úteis

### Ranking de Times
\`\`\`sql
SELECT 
    t.id,
    t.name,
    t.total_score,
    COUNT(DISTINCT p.id) as participant_count
FROM teams t
LEFT JOIN participants p ON p.team_id = t.id
WHERE t.game_id = ?
GROUP BY t.id
ORDER BY t.total_score DESC;
\`\`\`

### Estatísticas de uma Pergunta
\`\`\`sql
SELECT 
    q.question_text,
    a.answer_text,
    a.is_correct,
    COUNT(pa.id) as answer_count,
    AVG(pa.time_taken) as avg_time
FROM questions q
JOIN answers a ON a.question_id = q.id
LEFT JOIN participant_answers pa ON pa.answer_id = a.id
WHERE q.id = ?
GROUP BY a.id;
\`\`\`

### Performance de um Participante
\`\`\`sql
SELECT 
    p.nickname,
    p.total_score,
    COUNT(pa.id) as questions_answered,
    SUM(CASE WHEN ans.is_correct THEN 1 ELSE 0 END) as correct_answers,
    AVG(pa.time_taken) as avg_time
FROM participants p
LEFT JOIN participant_answers pa ON pa.participant_id = p.id
LEFT JOIN answers ans ON ans.id = pa.answer_id
WHERE p.id = ?
GROUP BY p.id;
