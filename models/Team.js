const { pool } = require('../config/database');
const QRCode = require('qrcode');

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

    // Gerar QR Code
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const participantUrl = `${baseUrl}/participant.html?code=${accessCode}`;
    const qrCodeDataUrl = await QRCode.toDataURL(participantUrl);

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

  // --- CORREÇÃO DOS ERROS ---

  // Função padrão que estava faltando
  static async findById(teamId) {
    const [teams] = await pool.execute(
      'SELECT * FROM teams WHERE id = ?',
      [teamId]
    );
    return teams.length > 0 ? teams[0] : null;
  }

  // Função de compatibilidade para corrigir o erro da tela
  static async findByTeamId(teamId) {
    return await this.findById(teamId);
  }
}

module.exports = Team;