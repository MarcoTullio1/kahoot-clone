const Game = require('../models/Game');
const Team = require('../models/Team');
const Participant = require('../models/Participant');
const { pool } = require('../config/database');

module.exports = (io) => {
  const activeGames = new Map();

  io.on('connection', (socket) => {

    // --- ADMIN ---
    socket.on('admin:connect', async (gameId) => {
      socket.join(`game:${gameId}:admin`);
      socket.gameId = gameId;
    });

    socket.on('admin:startGame', async (gameId) => {
      try {
        await pool.execute('UPDATE teams SET total_score = 0 WHERE game_id = ?', [gameId]);
        const [teams] = await pool.execute('SELECT id FROM teams WHERE game_id = ?', [gameId]);
        if (teams.length > 0) {
          const teamIds = teams.map(t => t.id).join(',');
          await pool.execute(`UPDATE participants SET total_score = 0 WHERE team_id IN (${teamIds})`);
          await pool.execute(`DELETE FROM participant_answers WHERE participant_id IN (SELECT id FROM participants WHERE team_id IN (${teamIds}))`);
        }
        await Game.updateStatus(gameId, 'active');
        await Game.updateCurrentQuestion(gameId, 0);
        io.to(`game:${gameId}`).emit('game:started');
        startQuestion(gameId, 0);
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('admin:nextQuestion', async (gameId) => {
      try {
        const game = await Game.findById(gameId);
        const nextIndex = game.current_question_index + 1;
        if (nextIndex < game.questions.length) {
          await Game.updateCurrentQuestion(gameId, nextIndex);
          startQuestion(gameId, nextIndex);
        } else {
          finishGame(gameId);
        }
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Botão "Voltar" (Destravado)
    socket.on('admin:reshowQuestion', async (gameId) => {
      const gameState = activeGames.get(gameId);
      const game = await Game.findById(gameId);
      if (!game || !gameState) return;

      const timeElapsed = (Date.now() - gameState.startTime) / 1000;

      // Se o tempo já acabou, mostra o Gráfico direto
      if (timeElapsed >= gameState.timeLimit) {
        sendStats(gameId);
        return;
      }

      // Se ainda tem tempo, mostra a pergunta com o tempo que falta
      const question = game.questions[game.current_question_index];
      const remainingTime = Math.max(0, Math.round(gameState.timeLimit - timeElapsed)); // Mínimo 0

      const questionData = {
        id: question.id,
        text: question.question_text,
        timeLimit: remainingTime,
        answers: question.answers.map(a => ({ id: a.id, text: a.answer_text })),
        questionNumber: game.current_question_index + 1,
        totalQuestions: game.questions.length
      };
      io.to(`game:${gameId}:display`).emit('question:new', questionData);
    });

    socket.on('admin:showStats', (gameId) => sendStats(gameId));
    socket.on('admin:showRanking', async (gameId) => {
      const game = await Game.findById(gameId);
      const isFinal = game && game.status === 'finished'; // Verifica se acabou
      sendRanking(gameId, isFinal); // Passa o aviso
    });
    socket.on('admin:endGame', async (gameId) => finishGame(gameId));

    // --- PARTICIPANTE ---
    socket.on('participant:join', async ({ teamId, nickname }) => {
      try {
        const team = await Team.findByTeamId(teamId);
        if (!team) return socket.emit('error', { message: 'Time não encontrado!' });

        let participantId;
        const [existing] = await pool.execute('SELECT id, total_score FROM participants WHERE team_id = ? AND nickname = ?', [teamId, nickname]);
        let currentScore = 0;

        if (existing.length > 0) {
          participantId = existing[0].id;
          currentScore = existing[0].total_score;
          await Participant.updateSocketId(participantId, socket.id);
        } else {
          participantId = await Participant.create(teamId, nickname, socket.id);
          io.to(`game:${team.game_id}:admin`).emit('participant:new', { participantId, teamId, nickname });
        }

        const gameId = team.game_id;
        socket.join(`game:${gameId}`);
        socket.participantId = participantId;
        socket.teamId = teamId;
        socket.gameId = gameId;

        socket.emit('participant:joined', { participantId, teamId, nickname, score: currentScore });

        // Verifica se já respondeu a pergunta atual para mostrar tela de espera
        const gameState = activeGames.get(gameId);
        if (gameState) {
          const [ans] = await pool.execute(
            'SELECT * FROM participant_answers WHERE participant_id = ? AND question_id = ?',
            [participantId, gameState.currentQuestionId]
          );
          if (ans.length > 0) {
            socket.emit('participant:answer_registered'); // Manda para tela de espera
          }
        }

        updateLiveCount(gameId);
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('participant:answer', async ({ participantId, questionId, answerId }) => {
      try {
        const gameState = activeGames.get(socket.gameId);
        if (!gameState) return;

        const timeTaken = (Date.now() - gameState.startTime) / 1000;
        if (timeTaken > (gameState.timeLimit + 3)) return socket.emit('answer:result', { success: false, message: 'Tempo esgotado' });

        const result = await Participant.submitAnswer(participantId, questionId, answerId, timeTaken);

        if (result) {
          // MUDANÇA: Não envia o resultado (pontos) agora. Só confirma o recebimento.
          socket.emit('participant:answer_registered');

          io.to(`game:${socket.gameId}:admin`).emit('participant:answered', { participantId, isCorrect: result.isCorrect });
          checkAllAnswered(socket.gameId, questionId);
        }
      } catch (error) {
        console.error(error);
      }
    });

    // --- TELÃO ---
    socket.on('display:connect', async (gameId) => {
      socket.join(`game:${gameId}:display`);
      socket.gameId = gameId;
      updateLiveCount(gameId);
    });

    socket.on('display:timeUp', async (gameId) => sendStats(gameId));

    socket.on('disconnect', () => {
      if (socket.gameId) updateLiveCount(socket.gameId);
    });

    // --- FUNÇÕES AUXILIARES ---
    async function startQuestion(gameId, index) {
      const game = await Game.findById(gameId);
      if (!game || !game.questions || !game.questions[index]) return;

      const question = game.questions[index];
      const questionData = {
        id: question.id,
        text: question.question_text,
        timeLimit: question.time_limit,
        answers: question.answers.map(a => ({ id: a.id, text: a.answer_text })),
        questionNumber: index + 1,
        totalQuestions: game.questions.length
      };

      io.to(`game:${gameId}`).emit('question:new', questionData);
      io.to(`game:${gameId}:display`).emit('question:new', questionData);
      io.to(`game:${gameId}:admin`).emit('question:new', { ...questionData, correctAnswerId: question.answers.find(a => a.is_correct)?.id });

      activeGames.set(gameId, {
        currentQuestionId: question.id,
        startTime: Date.now(),
        timeLimit: question.time_limit
      });
    }

    async function checkAllAnswered(gameId, questionId) {
      const room = io.sockets.adapter.rooms.get(`game:${gameId}`);
      if (!room) return;

      const sockets = await io.in(`game:${gameId}`).fetchSockets();
      const onlinePlayersCount = sockets.filter(s => s.participantId).length;

      const [res] = await pool.execute('SELECT COUNT(*) as total FROM participant_answers WHERE question_id = ?', [questionId]);
      const answersCount = res[0].total;

      console.log(`Auto-Finish: Online=${onlinePlayersCount}, Respostas=${answersCount}`);

      if (onlinePlayersCount > 0 && answersCount >= onlinePlayersCount) {
        setTimeout(() => {
          const gameState = activeGames.get(gameId);
          if (gameState && gameState.currentQuestionId === questionId) {
            sendStats(gameId);
          }
        }, 1000);
      }
    }

    async function sendStats(gameId) {
      const gameState = activeGames.get(gameId);
      if (!gameState) return;
      const qId = gameState.currentQuestionId;

      // 1. Mandar gráfico para o Telão
      const [stats] = await pool.execute(
        `SELECT a.id, a.answer_text as text, a.is_correct, COUNT(pa.id) as count 
         FROM answers a 
         LEFT JOIN participant_answers pa ON pa.answer_id = a.id 
         WHERE a.question_id = ? 
         GROUP BY a.id ORDER BY a.id ASC`, [qId]
      );
      const totalVotes = stats.reduce((sum, i) => sum + i.count, 0);

      io.to(`game:${gameId}:display`).emit('question:stats', {
        totalVotes,
        distribution: stats.map(s => ({
          text: s.text,
          count: s.count,
          isCorrect: s.is_correct,
          percent: totalVotes === 0 ? 0 : Math.round((s.count / totalVotes) * 100)
        }))
      });

      // 2. MUDANÇA: Mandar o resultado individual para cada Participante
      const sockets = await io.in(`game:${gameId}`).fetchSockets();

      // Busca todas as respostas dessa pergunta
      const [answers] = await pool.execute(
        'SELECT participant_id, points_earned, time_taken, answer_id FROM participant_answers WHERE question_id = ?',
        [qId]
      );

      // Cria um mapa para acesso rápido
      const answersMap = {};
      answers.forEach(a => answersMap[a.participant_id] = a);

      // Itera sobre cada socket conectado e manda o resultado dele
      for (const socket of sockets) {
        if (socket.participantId) {
          const myAnswer = answersMap[socket.participantId];

          if (myAnswer) {
            // Descobre se acertou olhando o 'stats' ou fazendo query extra.
            // Simplificando: se points_earned > 0, acertou.
            const isCorrect = myAnswer.points_earned > 0;

            socket.emit('answer:result', {
              isCorrect: isCorrect,
              pointsEarned: myAnswer.points_earned,
              timeTaken: myAnswer.time_taken
            });
          } else {
            // Não respondeu a tempo
            socket.emit('answer:result', {
              isCorrect: false,
              pointsEarned: 0,
              message: "Tempo esgotado!"
            });
          }
        }
      }
    }
    async function sendRanking(gameId, isFinal = false) { // <--- Adicione isFinal = false
      const teams = await Team.findByGameId(gameId);
      const ranking = await Promise.all(teams.map(async t => {
        const score = await Team.calculateTotalScore(t.id);
        const stats = await Team.getStats(t.id);
        return { id: t.id, name: t.name, score, accuracy: stats.percentage };
      }));
      ranking.sort((a, b) => b.score - a.score);

      // MUDANÇA AQUI: Adicionar isFinal no envio
      const rankingData = {
        teams: ranking,
        timestamp: Date.now(),
        isFinal: isFinal
      };

      // Envia o objeto novo
      io.to(`game:${gameId}`).emit('ranking:show', rankingData);
      // IMPORTANTE: Adicionar envio explícito para o display também se não estiver no grupo acima
      io.to(`game:${gameId}:display`).emit('ranking:show', rankingData);
    }
    async function finishGame(gameId) {
      await Game.updateStatus(gameId, 'finished');
      io.to(`game:${gameId}`).emit('game:ended');
      io.to(`game:${gameId}:display`).emit('game:ended');
      io.to(`game:${gameId}:admin`).emit('game:ended');
      activeGames.delete(gameId);
    }

    async function updateLiveCount(gameId) {
      const sockets = await io.in(`game:${gameId}`).fetchSockets();
      const count = sockets.filter(s => s.participantId).length;
      io.to(`game:${gameId}:display`).emit('participant:update_count', count);
    }
  });
};