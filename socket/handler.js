const Game = require('../models/Game');
const Team = require('../models/Team');
const Participant = require('../models/Participant');
const { pool } = require('../config/database'); // Importando pool para contar participantes

module.exports = (io) => {
  // Armazenar informações de sessão (Timer, Estado do jogo)
  const activeGames = new Map();

  io.on('connection', (socket) => {
    console.log(`✅ Cliente conectado: ${socket.id}`);

    // ----------------------------------------------------------------
    // EVENTOS DO ADMINISTRADOR
    // ----------------------------------------------------------------

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

          // Enviar para participantes (sem resposta correta)
          io.to(`game:${gameId}`).emit('question:new', questionData);

          // Enviar para telão (sem resposta correta)
          io.to(`game:${gameId}:display`).emit('question:new', questionData);

          // Enviar para admin (COM resposta correta para controle)
          io.to(`game:${gameId}:admin`).emit('question:new', {
            ...questionData,
            correctAnswerId: question.answers.find(a => a.is_correct)?.id
          });

          // Iniciar controle de timer no servidor
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

          io.to(`game:${gameId}`).emit('question:new', questionData);
          io.to(`game:${gameId}:display`).emit('question:new', questionData);
          io.to(`game:${gameId}:admin`).emit('question:new', {
            ...questionData,
            correctAnswerId: question.answers.find(a => a.is_correct)?.id
          });

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

        // Recalcular pontuação e estatísticas de cada time
        const teamsWithScores = await Promise.all(
          teams.map(async (team) => {
            const totalScore = await Team.calculateTotalScore(team.id);
            const participants = await Participant.findByTeamId(team.id);

            // --- CORREÇÃO: Pegar estatísticas de acerto ---
            // Se der erro aqui, verifique se colou o getStats no Team.js
            const stats = await Team.getStats(team.id);
            // ----------------------------------------------

            return {
              id: team.id,
              name: team.name,
              score: totalScore,
              participantCount: participants.length,
              accuracy: stats.percentage // Envia a % correta
            };
          })
        );

        // Ordenar por pontuação (Maior para menor)
        teamsWithScores.sort((a, b) => b.score - a.score);

        const rankingData = {
          teams: teamsWithScores,
          timestamp: Date.now()
        };

        // Enviar para todos
        io.to(`game:${gameId}:display`).emit('ranking:show', rankingData);
        io.to(`game:${gameId}:admin`).emit('ranking:show', rankingData);
        io.to(`game:${gameId}`).emit('ranking:show', rankingData);

      } catch (error) {
        console.error("Erro no ranking:", error);
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

    // ----------------------------------------------------------------
    // EVENTOS DO PARTICIPANTE
    // ----------------------------------------------------------------

    // Participante: Entrar no jogo
    // Participante: Entrar no jogo (ATUALIZADO COM PONTUAÇÃO)
    socket.on('participant:join', async ({ teamId, nickname }) => {
      try {
        const team = await Team.findByTeamId(teamId);
        if (!team) {
          socket.emit('error', { message: 'Time não encontrado!' });
          return;
        }

        const participantId = await Participant.create(teamId, nickname, socket.id);
        const gameId = team.game_id;

        const currentScore = 0;


        if (gameId) {
          socket.join(`game:${gameId}`);
          socket.participantId = participantId;
          socket.teamId = teamId;
          socket.gameId = gameId;

          socket.emit('participant:joined', {
            participantId,
            teamId,
            nickname,
            score: currentScore // Envia a pontuação inicial
          });

          // Notificar admin
          io.to(`game:${gameId}:admin`).emit('participant:new', { participantId, teamId, nickname });

          // Contagem real
          const [countResult] = await pool.execute(
            `SELECT COUNT(*) as total FROM participants 
             JOIN teams ON participants.team_id = teams.id 
             WHERE teams.game_id = ?`,
            [gameId]
          );
          const realCount = countResult[0].total;
          io.to(`game:${gameId}:display`).emit('participant:update_count', realCount);
        }
      } catch (error) {
        console.error('Erro no join:', error);
        socket.emit('error', { message: error.message });
      }
    });

    // Participante: Enviar resposta
    socket.on('participant:answer', async ({ participantId, questionId, answerId }) => {
      try {
        const gameState = activeGames.get(socket.gameId);

        if (!gameState) {
          // Se o jogo não estiver ativo na memória do servidor, permite responder mas sem validar tempo rigoroso
          // ou retorna erro. Aqui optamos por avisar.
          // return socket.emit('error', { message: 'Jogo não está ativo ou pergunta já encerrou' });
        }

        // Calcular tempo decorrido
        let timeTaken = 0;
        if (gameState) {
          timeTaken = (Date.now() - gameState.startTime) / 1000;

          // Tolerância de 2 segundos para delay de rede
          if (timeTaken > (gameState.timeLimit + 2)) {
            return socket.emit('answer:result', {
              success: false,
              message: 'Tempo esgotado'
            });
          }
        }

        // Registrar resposta no banco
        const result = await Participant.submitAnswer(
          participantId,
          questionId,
          answerId,
          timeTaken
        );

        if (result) {
          // Enviar resultado para o participante (Feedback imediato)
          socket.emit('answer:result', {
            success: true,
            isCorrect: result.isCorrect,
            pointsEarned: result.pointsEarned,
            timeTaken: timeTaken.toFixed(2)
          });

          // Notificar admin (para mostrar progresso em tempo real, se quiser implementar depois)
          io.to(`game:${socket.gameId}:admin`).emit('participant:answered', {
            participantId,
            questionId,
            isCorrect: result.isCorrect,
            pointsEarned: result.pointsEarned
          });
        }
      } catch (error) {
        console.error("Erro ao responder:", error);
        socket.emit('error', { message: error.message });
      }
    });

    // ----------------------------------------------------------------
    // EVENTOS DO TELÃO
    // ----------------------------------------------------------------

    // Telão: Conectar ao jogo
    socket.on('display:connect', async (gameId) => {
      socket.join(`game:${gameId}:display`);
      socket.gameId = gameId;
      console.log(`📺 Telão conectado ao jogo ${gameId}`);

      // Ao conectar, enviar contagem atual de participantes para não ficar zerado
      try {
        const [countResult] = await pool.execute(
          `SELECT COUNT(*) as total FROM participants 
             JOIN teams ON participants.team_id = teams.id 
             WHERE teams.game_id = ?`,
          [gameId]
        );
        const realCount = countResult[0].total;
        socket.emit('participant:update_count', realCount);
      } catch (e) {
        console.error("Erro ao buscar contagem inicial:", e);
      }
    });

    // Desconexão
    socket.on('disconnect', () => {
      // Opcional: Se quiser diminuir o contador quando alguém sai, teria que implementar lógica de remoção
      console.log(`❌ Cliente desconectado: ${socket.id}`);
    });
  });
};