const { pool } = require('../config/database');

class Participant {
  // Adicionar participante ao time
  static async create(teamId, nickname, socketId) {
    const [result] = await pool.execute(
      'INSERT INTO participants (team_id, nickname, socket_id) VALUES (?, ?, ?)',
      [teamId, nickname, socketId]
    );
    return result.insertId;
  }

  // Buscar participantes por time
  static async findByTeamId(teamId) {
    const [participants] = await pool.execute(
      'SELECT * FROM participants WHERE team_id = ?',
      [teamId]
    );
    return participants;
  }

  // Buscar participante por socket ID
  static async findBySocketId(socketId) {
    const [participants] = await pool.execute(
      'SELECT * FROM participants WHERE socket_id = ?',
      [socketId]
    );
    return participants.length > 0 ? participants[0] : null;
  }

  // Registrar resposta do participante
  static async submitAnswer(participantId, questionId, answerId, timeTaken) {
    // Verificar se a resposta está correta
    const [answers] = await pool.execute(
      'SELECT is_correct FROM answers WHERE id = ?',
      [answerId]
    );

    if (answers.length === 0) return null;

    const isCorrect = answers[0].is_correct;

    // Calcular pontos baseado no tempo (resposta mais rápida = mais pontos)
    let pointsEarned = 0;
    if (isCorrect) {
      const [questions] = await pool.execute(
        'SELECT points, time_limit FROM questions WHERE id = ?',
        [questionId]
      );

      if (questions.length > 0) {
        const basePoints = questions[0].points;
        const timeLimit = questions[0].time_limit;

        // Fórmula: pontos base + bônus por velocidade
        const timeBonus = Math.floor((1 - timeTaken / timeLimit) * (basePoints * 0.5));
        pointsEarned = basePoints + Math.max(0, timeBonus);
      }
    }

    // Salvar resposta
    await pool.execute(
      'INSERT INTO participant_answers (participant_id, question_id, answer_id, time_taken, points_earned) VALUES (?, ?, ?, ?, ?)',
      [participantId, questionId, answerId, timeTaken, pointsEarned]
    );

    // Atualizar pontuação total do participante
    await pool.execute(
      'UPDATE participants SET total_score = total_score + ? WHERE id = ?',
      [pointsEarned, participantId]
    );

    return { isCorrect, pointsEarned };
  }

  // Atualizar socket ID
  static async updateSocketId(participantId, socketId) {
    await pool.execute(
      'UPDATE participants SET socket_id = ? WHERE id = ?',
      [socketId, participantId]
    );
  }

  // Remover participante
  static async delete(participantId) {
    await pool.execute('DELETE FROM participants WHERE id = ?', [participantId]);
  }
}

module.exports = Participant;