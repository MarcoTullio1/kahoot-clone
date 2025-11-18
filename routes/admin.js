const express = require('express');
const router = express.Router();
const Game = require('../models/Game');
const Team = require('../models/Team');
const Question = require('../models/Question');
const Answer = require('../models/Answer');

// Listar todos os jogos
router.get('/games', async (req, res) => {
  try {
    const games = await Game.findAll();
    res.json({ success: true, games });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Criar novo jogo
router.post('/games', async (req, res) => {
  try {
    const { name } = req.body;
    const gameId = await Game.create(name);
    res.json({ success: true, gameId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Buscar jogo específico com todas as informações
router.get('/games/:id', async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) {
      return res.status(404).json({ success: false, error: 'Jogo não encontrado' });
    }
    
    // Buscar times do jogo
    const teams = await Team.findByGameId(req.params.id);
    game.teams = teams;
    
    res.json({ success: true, game });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Deletar jogo
router.delete('/games/:id', async (req, res) => {
  try {
    await Game.delete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Criar time
router.post('/teams', async (req, res) => {
  try {
    const { gameId, name } = req.body;
    const team = await Team.create(gameId, name);
    res.json({ success: true, team });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Deletar time
router.delete('/teams/:id', async (req, res) => {
  try {
    await Team.delete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Criar pergunta
router.post('/questions', async (req, res) => {
  try {
    const { gameId, questionText, timeLimit, points, orderIndex } = req.body;
    const questionId = await Question.create(gameId, questionText, timeLimit, points, orderIndex);
    res.json({ success: true, questionId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Deletar pergunta
router.delete('/questions/:id', async (req, res) => {
  try {
    await Question.delete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Criar resposta
router.post('/answers', async (req, res) => {
  try {
    const { questionId, answerText, isCorrect } = req.body;
    const answerId = await Answer.create(questionId, answerText, isCorrect);
    res.json({ success: true, answerId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Deletar resposta
router.delete('/answers/:id', async (req, res) => {
  try {
    await Answer.delete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
