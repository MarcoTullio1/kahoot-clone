const { pool } = require('../config/database');

class Question {
  // Criar nova pergunta
  static async create(gameId, questionText, timeLimit, points, orderIndex) {
    const [result] = await pool.execute(
      'INSERT INTO questions (game_id, question_text, time_limit, points, order_index) VALUES (?, ?, ?, ?, ?)',
      [gameId, questionText, timeLimit, points, orderIndex]
    );
    return result.insertId;
  }

  // Buscar perguntas por jogo
  static async findByGameId(gameId) {
    const [questions] = await pool.execute(
      'SELECT * FROM questions WHERE game_id = ? ORDER BY order_index',
      [gameId]
    );
    return questions;
  }

  // Buscar pergunta por ID
  static async findById(questionId) {
    const [questions] = await pool.execute(
      'SELECT * FROM questions WHERE id = ?',
      [questionId]
    );
    return questions.length > 0 ? questions[0] : null;
  }

  // Deletar pergunta
  static async delete(questionId) {
    await pool.execute('DELETE FROM questions WHERE id = ?', [questionId]);
  }
}

module.exports = Question;
