const { pool } = require('../config/database');
const QRCode = require('qrcode');
const axios = require('axios'); // Biblioteca para chamar a API

class Team {
  // Criar novo time
  static async create(gameId, name) {
    // Gerar código de acesso único
    const accessCode = this.generateAccessCode();

    const [result] = await pool.execute(
      'INSERT INTO teams (game_id, name, access_code) VALUES (?, ?, ?)',
      [gameId, name, accessCode]
    );

    const teamId = result.insertId;

    // Montar a URL original (IP)
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const longUrl = `${baseUrl}/participant.html?code=${accessCode}`;

    // --- AUTOMATIZAÇÃO DO ENCURTADOR ---
    let finalUrl = longUrl;

    try {
      // Chama a API do TinyURL para encurtar
      const response = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`, {
        timeout: 5000 // Espera no máximo 5 segundos
      });

      if (response.data && response.data.startsWith('http')) {
        finalUrl = response.data; // Usa o link curto (ex: https://tinyurl.com/y3x...)
        console.log(`Link encurtado com sucesso: ${finalUrl}`);
      }
    } catch (error) {
      console.error('Falha ao encurtar link (usando original):', error.message);
      // Se der erro, o finalUrl continua sendo o longUrl (IP), então o sistema não quebra
    }
    // -----------------------------------

    // Gerar QR Code com o link (encurtado ou original)
    const qrCodeDataUrl = await QRCode.toDataURL(finalUrl);

    // Salvar QR Code no banco
    await pool.execute(
      'UPDATE teams SET qr_code = ? WHERE id = ?',
      [qrCodeDataUrl, teamId]
    );

    return { id: teamId, name, accessCode, qrCode: qrCodeDataUrl };
  }

  // Gerar código de acesso aleatório
  static generateAccessCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // Buscar time por código de acesso
  static async findByAccessCode(accessCode) {
    const [teams] = await pool.execute(
      'SELECT * FROM teams WHERE access_code = ?',
      [accessCode]
    );
    return teams.length > 0 ? teams[0] : null;
  }

  // Buscar times por jogo
  static async findByGameId(gameId) {
    const [teams] = await pool.execute(
      'SELECT * FROM teams WHERE game_id = ?',
      [gameId]
    );
    return teams;
  }

  // Atualizar pontuação do time
  static async updateScore(teamId, score) {
    await pool.execute(
      'UPDATE teams SET total_score = ? WHERE id = ?',
      [score, teamId]
    );
  }

  // Calcular pontuação total do time (soma de todos os participantes)
  static async calculateTotalScore(teamId) {
    const [result] = await pool.execute(
      'SELECT SUM(total_score) as total FROM participants WHERE team_id = ?',
      [teamId]
    );
    const total = result[0].total || 0;
    await this.updateScore(teamId, total);
    return total;
  }

  // Deletar time
  static async delete(teamId) {
    await pool.execute('DELETE FROM teams WHERE id = ?', [teamId]);
  }

  // Obter estatísticas
  static async getStats(teamId) {
    const [totalRes] = await pool.execute(
      `SELECT COUNT(*) as total FROM participant_answers 
       JOIN participants ON participant_answers.participant_id = participants.id 
       WHERE participants.team_id = ?`,
      [teamId]
    );

    const [correctRes] = await pool.execute(
      `SELECT COUNT(*) as correct FROM participant_answers 
       JOIN participants ON participant_answers.participant_id = participants.id 
       WHERE participants.team_id = ? AND participant_answers.points_earned > 0`,
      [teamId]
    );

    const total = parseInt(totalRes[0].total) || 0;
    const correct = parseInt(correctRes[0].correct) || 0;
    const percentage = total === 0 ? 0 : Math.round((correct / total) * 100);

    return { total, correct, percentage };
  }

  // Busca genérica
  static async findById(teamId) {
    const [teams] = await pool.execute(
      'SELECT * FROM teams WHERE id = ?',
      [teamId]
    );
    return teams.length > 0 ? teams[0] : null;
  }

  static async findByTeamId(teamId) {
    return await this.findById(teamId);
  }
}

module.exports = Team;