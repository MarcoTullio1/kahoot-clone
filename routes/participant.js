const express = require('express');
const router = express.Router();
const Team = require('../models/Team');
const Game = require('../models/Game');

// Validar código de acesso
router.post('/join', async (req, res) => {
  try {
    const { accessCode } = req.body;
    const team = await Team.findByAccessCode(accessCode);
    
    if (!team) {
      return res.status(404).json({ success: false, error: 'Código inválido' });
    }
    
    // Buscar informações do jogo
    const game = await Game.findById(team.game_id);
    
    res.json({ 
      success: true, 
      team: {
        id: team.id,
        name: team.name,
        gameId: team.game_id
      },
      game: {
        id: game.id,
        name: game.name,
        status: game.status
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
