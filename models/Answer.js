const { pool } = require('../config/database');

class Answer {
  // Criar nova resposta
  static async create(questionId, answerText, isCorrect) {
    const [result] = await pool.execute(
      'INSERT INTO answers (question_id, answer_text, is_correct) VALUES (?, ?, ?)',
      [questionId, answerText, isCorrect]
    );
    return result.insertId;
  }

  // Buscar respostas por pergunta
  static async findByQuestionId(questionId) {
    const [answers] = await pool.execute(
      'SELECT * FROM answers WHERE question_id = ?',
      [questionId]
    );
    return answers;
  }

  // Verificar se resposta está correta
  static async isCorrect(answerId) {
    const [answers] = await pool.execute(
      'SELECT is_correct FROM answers WHERE id = ?',
      [answerId]
    );
    return answers.length > 0 ? answers[0].is_correct : false;
  }

  // Deletar resposta
  static async delete(answerId) {
    await pool.execute('DELETE FROM answers WHERE id = ?', [answerId]);
  }
}

module.exports = Answer;
