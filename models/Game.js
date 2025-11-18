const { pool } = require('../config/database');

class Game {
  // Criar novo jogo
  static async create(name) {
    const [result] = await pool.execute(
      'INSERT INTO games (name, status) VALUES (?, ?)',
      [name, 'waiting']
    );
    return result.insertId;
  }

  // Buscar jogo por ID com perguntas e respostas
  static async findById(gameId) {
    const [games] = await pool.execute(
      'SELECT * FROM games WHERE id = ?',
      [gameId]
    );
    
    if (games.length === 0) return null;
    
    const game = games[0];
    
    // Buscar perguntas do jogo
    const [questions] = await pool.execute(
      'SELECT * FROM questions WHERE game_id = ? ORDER BY order_index',
      [gameId]
    );
    
    // Buscar respostas para cada pergunta
    for (let question of questions) {
      const [answers] = await pool.execute(
        'SELECT id, answer_text, is_correct FROM answers WHERE question_id = ?',
        [question.id]
      );
      question.answers = answers;
    }
    
    game.questions = questions;
    return game;
  }

  // Listar todos os jogos
  static async findAll() {
    const [games] = await pool.execute(
      'SELECT * FROM games ORDER BY created_at DESC'
    );
    return games;
  }

  // Atualizar status do jogo
  static async updateStatus(gameId, status) {
    await pool.execute(
      'UPDATE games SET status = ? WHERE id = ?',
      [status, gameId]
    );
  }

  // Atualizar índice da pergunta atual
  static async updateCurrentQuestion(gameId, questionIndex) {
    await pool.execute(
      'UPDATE games SET current_question_index = ? WHERE id = ?',
      [questionIndex, gameId]
    );
  }

  // Deletar jogo
  static async delete(gameId) {
    await pool.execute('DELETE FROM games WHERE id = ?', [gameId]);
  }
}

module.exports = Game;
