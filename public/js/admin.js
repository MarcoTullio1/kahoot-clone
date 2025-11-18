// Conexão com Socket.IO
const socket = io();

// Estado da aplicação
let currentGameId = null;
let currentGame = null;

// Elementos DOM
const gamesList = document.getElementById('gamesList');
const gamesContainer = document.getElementById('gamesContainer');
const gameManagement = document.getElementById('gameManagement');
const gameTitle = document.getElementById('gameTitle');
const gameStatus = document.getElementById('gameStatus');

// Modals
const modalNewGame = document.getElementById('modalNewGame');
const modalNewTeam = document.getElementById('modalNewTeam');
const modalNewQuestion = document.getElementById('modalNewQuestion');
const modalQRCode = document.getElementById('modalQRCode');

// Botões
const btnNewGame = document.getElementById('btnNewGame');
const btnNewTeam = document.getElementById('btnNewTeam');
const btnNewQuestion = document.getElementById('btnNewQuestion');
const btnStartGame = document.getElementById('btnStartGame');
const btnNextQuestion = document.getElementById('btnNextQuestion');
const btnShowRanking = document.getElementById('btnShowRanking');
const btnEndGame = document.getElementById('btnEndGame');

// Containers
const teamsContainer = document.getElementById('teamsContainer');
const questionsContainer = document.getElementById('questionsContainer');

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    loadGames();
    setupEventListeners();
    setupSocketListeners();
});

// Configurar event listeners
function setupEventListeners() {
    // Botões principais
    btnNewGame.addEventListener('click', () => openModal(modalNewGame));
    btnNewTeam.addEventListener('click', () => openModal(modalNewTeam));
    btnNewQuestion.addEventListener('click', () => openModal(modalNewQuestion));

    // Controles do jogo
    btnStartGame.addEventListener('click', startGame);
    btnNextQuestion.addEventListener('click', nextQuestion);
    btnShowRanking.addEventListener('click', showRanking);
    btnEndGame.addEventListener('click', endGame);

    // Forms
    document.getElementById('formNewGame').addEventListener('submit', createGame);
    document.getElementById('formNewTeam').addEventListener('submit', createTeam);
    document.getElementById('formNewQuestion').addEventListener('submit', createQuestion);

    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.modal').classList.remove('active');
        });
    });

    // Fechar modal ao clicar fora
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });
}

// Configurar listeners do Socket.IO
function setupSocketListeners() {
    socket.on('game:started', () => {
        showNotification('Jogo iniciado!', 'success');
        updateGameControls('active');
    });

    socket.on('game:ended', () => {
        showNotification('Jogo finalizado!', 'info');
        updateGameControls('finished');
    });

    socket.on('participant:new', (data) => {
        showNotification(`${data.nickname} entrou no jogo!`, 'info');
    });

    socket.on('participant:answered', (data) => {
        console.log('Participante respondeu:', data);
    });

    socket.on('error', (data) => {
        showNotification(data.message, 'error');
    });
}

// Carregar lista de jogos
async function loadGames() {
    try {
        const response = await fetch('/api/admin/games');
        const data = await response.json();

        if (data.success) {
            renderGames(data.games);
        }
    } catch (error) {
        showNotification('Erro ao carregar jogos', 'error');
    }
}

// Renderizar jogos
function renderGames(games) {
    if (games.length === 0) {
        gamesContainer.innerHTML = '<p>Nenhum jogo criado ainda. Clique em "Novo Jogo" para começar.</p>';
        return;
    }

    gamesContainer.innerHTML = games.map(game => `
        <div class="game-card" onclick="selectGame(${game.id})">
            <h3>${game.name}</h3>
            <div class="meta">
                <div>Status: <span class="badge badge-${game.status}">${getStatusText(game.status)}</span></div>
                <div>Criado em: ${formatDate(game.created_at)}</div>
            </div>
            <div class="actions" onclick="event.stopPropagation()">
                <button class="btn btn-secondary" onclick="selectGame(${game.id})">Gerenciar</button>
                <button class="btn btn-danger" onclick="deleteGame(${game.id})">Excluir</button>
            </div>
        </div>
    `).join('');
}

// Criar novo jogo
async function createGame(e) {
    e.preventDefault();

    const name = document.getElementById('gameName').value;

    try {
        const response = await fetch('/api/admin/games', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });

        const data = await response.json();

        if (data.success) {
            showNotification('Jogo criado com sucesso!', 'success');
            closeModal(modalNewGame);
            document.getElementById('formNewGame').reset();
            loadGames();
        }
    } catch (error) {
        showNotification('Erro ao criar jogo', 'error');
    }
}

// Selecionar jogo
async function selectGame(gameId) {
    currentGameId = gameId;

    try {
        const response = await fetch(`/api/admin/games/${gameId}`);
        const data = await response.json();

        if (data.success) {
            currentGame = data.game;
            showGameManagement(data.game);

            // Conectar ao jogo via socket
            socket.emit('admin:connect', gameId);
        }
    } catch (error) {
        showNotification('Erro ao carregar jogo', 'error');
    }
}

// Mostrar painel de gerenciamento
function showGameManagement(game) {
    gamesList.classList.add('hidden');
    gameManagement.classList.remove('hidden');

    gameTitle.textContent = game.name;
    gameStatus.textContent = getStatusText(game.status);
    gameStatus.className = `badge badge-${game.status}`;

    renderTeams(game.teams || []);
    renderQuestions(game.questions || []);
    updateGameControls(game.status);
}

// Renderizar times
function renderTeams(teams) {
    if (teams.length === 0) {
        teamsContainer.innerHTML = '<p>Nenhum time cadastrado. Clique em "Adicionar Time" para começar.</p>';
        return;
    }

    teamsContainer.innerHTML = teams.map(team => `
        <div class="team-card">
            <h4>${team.name}</h4>
            <div class="info">
                <div class="info-item">
                    <span>Código:</span>
                    <strong>${team.access_code}</strong>
                </div>
                <div class="info-item">
                    <span>Pontuação:</span>
                    <strong>${team.total_score} pts</strong>
                </div>
            </div>
            ${team.qr_code ? `<img src="${team.qr_code}" alt="QR Code" class="qr-code">` : ''}
            <div class="actions">
                <button class="btn btn-primary" onclick="showQRCode(${team.id}, '${team.name}', '${team.access_code}', '${team.qr_code}')">Ver QR Code</button>
                <button class="btn btn-danger" onclick="deleteTeam(${team.id})">Excluir</button>
            </div>
        </div>
    `).join('');
}

// Renderizar perguntas
function renderQuestions(questions) {
    if (questions.length === 0) {
        questionsContainer.innerHTML = '<p>Nenhuma pergunta cadastrada. Clique em "Adicionar Pergunta" para começar.</p>';
        return;
    }

    questionsContainer.innerHTML = questions.map((q, index) => `
        <div class="question-card">
            <div class="question-header">
                <h4>Pergunta ${index + 1}: ${q.question_text}</h4>
            </div>
            <div class="question-meta">
                <span>Tempo: ${q.time_limit}s</span>
                <span>Pontos: ${q.points}</span>
            </div>
            <div class="answers-grid">
                ${q.answers.map(a => `
                    <div class="answer-badge ${a.is_correct ? 'correct' : ''}">
                        ${a.answer_text} ${a.is_correct ? '✓' : ''}
                    </div>
                `).join('')}
            </div>
            <div class="question-actions">
                <button class="btn btn-danger" onclick="deleteQuestion(${q.id})">Excluir</button>
            </div>
        </div>
    `).join('');
}

// Criar time
async function createTeam(e) {
    e.preventDefault();

    const name = document.getElementById('teamName').value;

    try {
        const response = await fetch('/api/admin/teams', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gameId: currentGameId, name })
        });

        const data = await response.json();

        if (data.success) {
            showNotification('Time criado com sucesso!', 'success');
            closeModal(modalNewTeam);
            document.getElementById('formNewTeam').reset();
            selectGame(currentGameId);
        }
    } catch (error) {
        showNotification('Erro ao criar time', 'error');
    }
}

// Criar pergunta
async function createQuestion(e) {
    e.preventDefault();

    const questionText = document.getElementById('questionText').value;
    const timeLimit = document.getElementById('timeLimit').value;
    const points = document.getElementById('points').value;

    // Obter próximo índice de ordem
    const orderIndex = currentGame.questions ? currentGame.questions.length : 0;

    try {
        // Criar pergunta
        const qResponse = await fetch('/api/admin/questions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                gameId: currentGameId,
                questionText,
                timeLimit,
                points,
                orderIndex
            })
        });

        const qData = await qResponse.json();

        if (qData.success) {
            const questionId = qData.questionId;

            // Criar respostas
            const answerTexts = document.querySelectorAll('.answer-text');
            const correctAnswerIndex = parseInt(document.querySelector('input[name="correctAnswer"]:checked').value);

            for (let i = 0; i < answerTexts.length; i++) {
                const answerText = answerTexts[i].value;
                const isCorrect = i === correctAnswerIndex;

                await fetch('/api/admin/answers', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ questionId, answerText, isCorrect })
                });
            }

            showNotification('Pergunta criada com sucesso!', 'success');
            closeModal(modalNewQuestion);
            document.getElementById('formNewQuestion').reset();
            selectGame(currentGameId);
        }
    } catch (error) {
        showNotification('Erro ao criar pergunta', 'error');
    }
}

// Mostrar QR Code
function showQRCode(teamId, teamName, accessCode, qrCode) {
    document.getElementById('qrTeamName').textContent = teamName;
    document.getElementById('qrAccessCode').textContent = accessCode;
    document.getElementById('qrCodeImage').src = qrCode;

    document.getElementById('btnDownloadQR').onclick = () => {
        const link = document.createElement('a');
        link.download = `qr-code-${teamName}.png`;
        link.href = qrCode;
        link.click();
    };

    openModal(modalQRCode);
}

// Controles do jogo
function startGame() {
    if (!currentGame.questions || currentGame.questions.length === 0) {
        showNotification('Adicione perguntas antes de iniciar o jogo!', 'error');
        return;
    }

    if (confirm('Deseja iniciar o jogo?')) {
        socket.emit('admin:startGame', currentGameId);
        updateGameControls('active');
    }
}

function nextQuestion() {
    if (confirm('Deseja avançar para a próxima pergunta?')) {
        socket.emit('admin:nextQuestion', currentGameId);
    }
}

function showRanking() {
    socket.emit('admin:showRanking', currentGameId);
}

function endGame() {
    if (confirm('Deseja finalizar o jogo? Esta ação não pode ser desfeita.')) {
        socket.emit('admin:endGame', currentGameId);
        updateGameControls('finished');
    }
}

// Atualizar controles baseado no status
function updateGameControls(status) {
    if (status === 'waiting') {
        btnStartGame.disabled = false;
        btnNextQuestion.disabled = true;
        btnShowRanking.disabled = true;
        btnEndGame.disabled = true;
    } else if (status === 'active') {
        btnStartGame.disabled = true;
        btnNextQuestion.disabled = false;
        btnShowRanking.disabled = false;
        btnEndGame.disabled = false;
    } else if (status === 'finished') {
        btnStartGame.disabled = true;
        btnNextQuestion.disabled = true;
        btnShowRanking.disabled = false;
        btnEndGame.disabled = true;
    }
}

// Deletar jogo
async function deleteGame(gameId) {
    if (!confirm('Deseja realmente excluir este jogo?')) return;

    try {
        const response = await fetch(`/api/admin/games/${gameId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            showNotification('Jogo excluído com sucesso!', 'success');
            loadGames();
        }
    } catch (error) {
        showNotification('Erro ao excluir jogo', 'error');
    }
}

// Deletar time
async function deleteTeam(teamId) {
    if (!confirm('Deseja realmente excluir este time?')) return;

    try {
        const response = await fetch(`/api/admin/teams/${teamId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            showNotification('Time excluído com sucesso!', 'success');
            selectGame(currentGameId);
        }
    } catch (error) {
        showNotification('Erro ao excluir time', 'error');
    }
}

// Deletar pergunta
async function deleteQuestion(questionId) {
    if (!confirm('Deseja realmente excluir esta pergunta?')) return;

    try {
        const response = await fetch(`/api/admin/questions/${questionId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            showNotification('Pergunta excluída com sucesso!', 'success');
            selectGame(currentGameId);
        }
    } catch (error) {
        showNotification('Erro ao excluir pergunta', 'error');
    }
}

// Funções auxiliares
function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}Tab`).classList.add('active');
}

function openModal(modal) {
    modal.classList.add('active');
}

function closeModal(modal) {
    modal.classList.remove('active');
}

function getStatusText(status) {
    const statusMap = {
        waiting: 'Aguardando',
        active: 'Em Andamento',
        finished: 'Finalizado'
    };
    return statusMap[status] || status;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR');
}

function showNotification(message, type = 'info') {
    // Criar elemento de notificação
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#48bb78' : type === 'error' ? '#e53e3e' : '#3182ce'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000;
        font-weight: 600;
        animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Adicionar estilos de animação
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
    }
`;
document.head.appendChild(style);

function renderTeams(teams) {
    if (teams.length === 0) {
        teamsContainer.innerHTML = '<p>Nenhum time cadastrado. Clique em "Adicionar Time" para começar.</p>';
        return;
    }

    teamsContainer.innerHTML = teams.map(team => `
        <div class="team-card">
            <h4>${team.name}</h4>
            <div class="info">
                <div class="info-item">
                    <span>Código:</span>
                    <strong>${team.access_code}</strong>
                </div>
                <div class="info-item">
                    <span>Pontuação:</span>
                    <strong>${team.total_score} pts</strong>
                </div>
            </div>
            ${team.qr_code ? `<img src="${team.qr_code}" alt="QR Code" class="qr-code">` : ''}
            <div class="actions">
                <a href="/participant.html?code=${team.access_code}" target="_blank" class="btn btn-success" style="background-color: #28a745; color: white; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; height: 38px;">Entrar</a>
                
                <button class="btn btn-primary" onclick="showQRCode(${team.id}, '${team.name}', '${team.access_code}', '${team.qr_code}')">Ver QR Code</button>
                <button class="btn btn-danger" onclick="deleteTeam(${team.id})">Excluir</button>
            </div>
        </div>
    `).join('');
}