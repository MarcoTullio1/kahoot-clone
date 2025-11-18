const Game = require('../models/Game');
const Team = require('../models/Team');
const Participant = require('../models/Participant');

module.exports = (io) => {
  // Armazenar informações de sessão
  const activeGames = new Map();

  io.on('connection', (socket) => {
    console.log(`✅ Cliente conectado: ${socket.id}`);

    // Admin: Conectar ao jogo
    socket.on('admin:connect', async (gameId) => {
      socket.join(`game:${gameId}:admin`);
      socket.gameId = gameId;
      console.log(`👨‍💼 Admin conectado ao jogo ${gameId}`);
    });

    // Admin: Iniciar jogo
    socket.on('admin:startGame', async (gameId) => {
      try {
        await Game.updateStatus(gameId, 'active');
        await Game.updateCurrentQuestion(gameId, 0);

        // Notificar todos os participantes
        io.to(`game:${gameId}`).emit('game:started');

        // Enviar primeira pergunta
        const game = await Game.findById(gameId);
        if (game.questions.length > 0) {
          const question = game.questions[0];
          const questionData = {
            id: question.id,
            text: question.question_text,
            timeLimit: question.time_limit,
            answers: question.answers.map(a => ({ id: a.id, text: a.answer_text })),
            questionNumber: 1,
            totalQuestions: game.questions.length
          };

          // Enviar para participantes (sem mostrar resposta correta)
          io.to(`game:${gameId}`).emit('question:new', questionData);

          // Enviar para telão (sem mostrar resposta correta)
          io.to(`game:${gameId}:display`).emit('question:new', questionData);

          // Enviar para admin (com resposta correta)
          io.to(`game:${gameId}:admin`).emit('question:new', {
            ...questionData,
            correctAnswerId: question.answers.find(a => a.is_correct)?.id
          });

          // Iniciar timer
          activeGames.set(gameId, {
            currentQuestionId: question.id,
            startTime: Date.now(),
            timeLimit: question.time_limit
          });
        }
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Admin: Próxima pergunta
    socket.on('admin:nextQuestion', async (gameId) => {
      try {
        const game = await Game.findById(gameId);
        const currentIndex = game.current_question_index;
        const nextIndex = currentIndex + 1;

        if (nextIndex < game.questions.length) {
          await Game.updateCurrentQuestion(gameId, nextIndex);

          const question = game.questions[nextIndex];
          const questionData = {
            id: question.id,
            text: question.question_text,
            timeLimit: question.time_limit,
            answers: question.answers.map(a => ({ id: a.id, text: a.answer_text })),
            questionNumber: nextIndex + 1,
            totalQuestions: game.questions.length
          };

          // Enviar para participantes
          io.to(`game:${gameId}`).emit('question:new', questionData);

          // Enviar para telão
          io.to(`game:${gameId}:display`).emit('question:new', questionData);

          // Enviar para admin
          io.to(`game:${gameId}:admin`).emit('question:new', {
            ...questionData,
            correctAnswerId: question.answers.find(a => a.is_correct)?.id
          });

          // Atualizar timer
          activeGames.set(gameId, {
            currentQuestionId: question.id,
            startTime: Date.now(),
            timeLimit: question.time_limit
          });
        }
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Admin: Mostrar ranking
    socket.on('admin:showRanking', async (gameId) => {
      try {
        const teams = await Team.findByGameId(gameId);

        // Recalcular pontuação de cada time
        const teamsWithScores = await Promise.all(
          teams.map(async (team) => {
            const totalScore = await Team.calculateTotalScore(team.id);
            const participants = await Participant.findByTeamId(team.id);
            return {
              id: team.id,
              name: team.name,
              score: totalScore,
              participantCount: participants.length
            };
          })
        );

        // Ordenar por pontuação
        teamsWithScores.sort((a, b) => b.score - a.score);

        const rankingData = {
          teams: teamsWithScores,
          timestamp: Date.now()
        };

        // Enviar para telão e admin
        io.to(`game:${gameId}:display`).emit('ranking:show', rankingData);
        io.to(`game:${gameId}:admin`).emit('ranking:show', rankingData);
        io.to(`game:${gameId}`).emit('ranking:show', rankingData);
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Admin: Finalizar jogo
    socket.on('admin:endGame', async (gameId) => {
      try {
        await Game.updateStatus(gameId, 'finished');
        io.to(`game:${gameId}`).emit('game:ended');
        io.to(`game:${gameId}:display`).emit('game:ended');
        activeGames.delete(gameId);
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Participante: Entrar no jogo
    // Participante: Entrar no jogo (VERSÃO CORRIGIDA)
    socket.on('participant:join', async ({ teamId, nickname }) => {
      try {
        // 1. Busca o time de forma segura
        // Nota: Baseado no Team.js que te passei, isso retorna um Objeto, não um Array
        const team = await Team.findByTeamId(teamId);

        if (!team) {
          socket.emit('error', { message: 'Time não encontrado!' });
          return;
        }

        // 2. Cria o participante
        const participantId = await Participant.create(teamId, nickname, socket.id);

        // 3. Pega o ID do jogo direto do time
        const gameId = team.game_id;

        if (gameId) {
          socket.join(`game:${gameId}`);
          socket.participantId = participantId;
          socket.teamId = teamId;
          socket.gameId = gameId;

          socket.emit('participant:joined', {
            participantId,
            teamId,
            nickname
          });

          // Notificar admin
          io.to(`game:${gameId}:admin`).emit('participant:new', {
            participantId,
            teamId,
            nickname
          });

          console.log(`👤 Participante ${nickname} entrou no time ${team.name} (ID: ${teamId})`);
        }
      } catch (error) {
        console.error('Erro no join:', error);
        socket.emit('error', { message: 'Erro ao entrar no jogo: ' + error.message });
      }
    });

    // Participante: Enviar resposta
    socket.on('participant:answer', async ({ participantId, questionId, answerId }) => {
      try {
        const gameState = activeGames.get(socket.gameId);

        if (!gameState) {
          return socket.emit('error', { message: 'Jogo não está ativo' });
        }

        // Calcular tempo decorrido
        const timeTaken = (Date.now() - gameState.startTime) / 1000; // em segundos

        if (timeTaken > gameState.timeLimit) {
          return socket.emit('answer:result', {
            success: false,
            message: 'Tempo esgotado'
          });
        }

        // Registrar resposta
        const result = await Participant.submitAnswer(
          participantId,
          questionId,
          answerId,
          timeTaken
        );

        if (result) {
          socket.emit('answer:result', {
            success: true,
            isCorrect: result.isCorrect,
            pointsEarned: result.pointsEarned,
            timeTaken: timeTaken.toFixed(2)
          });

          // Notificar admin sobre a resposta
          io.to(`game:${socket.gameId}:admin`).emit('participant:answered', {
            participantId,
            questionId,
            isCorrect: result.isCorrect,
            pointsEarned: result.pointsEarned
          });
        }
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Telão: Conectar ao jogo
    socket.on('display:connect', async (gameId) => {
      socket.join(`game:${gameId}:display`);
      socket.gameId = gameId;
      console.log(`📺 Telão conectado ao jogo ${gameId}`);
    });

    // Desconexão
    socket.on('disconnect', () => {
      console.log(`❌ Cliente desconectado: ${socket.id}`);
    });
  });
};
