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

    // Montar a URL usando seu domínio configurado no .env
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const participantUrl = `${baseUrl}/participant.html?code=${accessCode}`;

    // Gerar QR Code direto com seu link
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

  // Calcular pontuação total do time
  static async calculateTotalScore(teamId) {
    // Pega a soma dos pontos de todos os participantes
    const [sumResult] = await pool.execute(
      'SELECT SUM(total_score) as total_points, COUNT(id) as num_participants FROM participants WHERE team_id = ?',
      [teamId]
    );

    const totalPoints = sumResult[0].total_points || 0;
    const numParticipants = sumResult[0].num_participants || 1; // Evita divisão por zero

    // Calcula a média (arredondada)
    const averageScore = Math.round(totalPoints / numParticipants);

    // Salva a média no time
    await this.updateScore(teamId, averageScore);
    return averageScore;
  }

  // Deletar time
  static async delete(teamId) {
    await pool.execute('DELETE FROM teams WHERE id = ?', [teamId]);
  }

  // Estatísticas
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