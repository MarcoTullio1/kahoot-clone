// Conexão com Socket.IO
const socket = io();

// Estado da aplicação
let currentGameId = null;
let currentGame = null;

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    loadGames();
    setupEventListeners();
    setupSocketListeners();
});

// Configurar event listeners
function setupEventListeners() {
    // Botões principais
    document.getElementById('btnNewGame').addEventListener('click', () => openModal(document.getElementById('modalNewGame')));
    document.getElementById('btnNewTeam').addEventListener('click', () => openModal(document.getElementById('modalNewTeam')));
    document.getElementById('btnNewQuestion').addEventListener('click', () => openModal(document.getElementById('modalNewQuestion')));

    // Controles do jogo
    document.getElementById('btnStartGame').addEventListener('click', startGame);
    document.getElementById('btnNextQuestion').addEventListener('click', nextQuestion);
    document.getElementById('btnShowRanking').addEventListener('click', showRanking);
    document.getElementById('btnEndGame').addEventListener('click', endGame);

    // --- CORREÇÃO: Botão Voltar ---
    const btnBack = document.getElementById('btnBackToGames');
    if (btnBack) {
        btnBack.addEventListener('click', (e) => {
            e.preventDefault(); // Previne comportamentos estranhos
            showGamesList();
        });
    }

    // Forms
    document.getElementById('formNewGame').addEventListener('submit', createGame);
    document.getElementById('formNewTeam').addEventListener('submit', createTeam);
    document.getElementById('formNewQuestion').addEventListener('submit', createQuestion);

    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Modais
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.modal').classList.remove('active');
        });
    });
}

document.getElementById('btnReshow').addEventListener('click', () => {
    if (confirm('Re-exibir pergunta/gráfico no telão?')) {
        socket.emit('admin:reshowQuestion', currentGameId);
    }
});

// Configurar listeners do Socket.IO
function setupSocketListeners() {
    socket.on('game:started', () => {
        showNotification('Jogo iniciado!', 'success');
        updateGameControls('active');
        loadGames(); // Atualiza status na lista
    });

    socket.on('game:ended', () => {
        showNotification('Jogo finalizado!', 'info');
        updateGameControls('finished');
        loadGames();
    });

    socket.on('participant:new', (data) => {
        showNotification(`${data.nickname} entrou no jogo!`, 'info');
    });

    socket.on('participant:answered', (data) => console.log('Resp:', data));
    socket.on('error', (data) => showNotification(data.message, 'error'));
}

// --- FUNÇÃO DE VOLTAR CORRIGIDA ---
function showGamesList() {
    // Esconde a gestão
    document.getElementById('gameManagement').classList.add('hidden');
    // Mostra a lista
    document.getElementById('gamesList').classList.remove('hidden');

    // Limpa variáveis
    currentGameId = null;
    currentGame = null;

    // Recarrega a lista para atualizar status
    loadGames();
}

// Carregar lista de jogos
async function loadGames() {
    try {
        const response = await fetch('/api/admin/games');
        const data = await response.json();
        if (data.success) renderGames(data.games);
    } catch (error) {
        showNotification('Erro ao carregar jogos', 'error');
    }
}

function renderGames(games) {
    const container = document.getElementById('gamesContainer');
    if (games.length === 0) {
        container.innerHTML = '<p>Nenhum jogo criado ainda.</p>';
        return;
    }

    container.innerHTML = games.map(game => `
        <div class="game-card" onclick="selectGame(${game.id})">
            <h3>${game.name}</h3>
            <div class="meta">
                <div>${getStatusBadge(game.status)}</div>
                <div>Criado em: ${new Date(game.created_at).toLocaleDateString('pt-BR')}</div>
            </div>
            <div class="actions" onclick="event.stopPropagation()">
                <button class="btn btn-secondary" onclick="selectGame(${game.id})">Gerenciar</button>
                <button class="btn btn-danger" onclick="deleteGame(${game.id})">Excluir</button>
            </div>
        </div>
    `).join('');
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
            socket.emit('admin:connect', gameId);
        }
    } catch (error) {
        showNotification('Erro ao carregar jogo', 'error');
    }
}

function showGameManagement(game) {
    document.getElementById('gamesList').classList.add('hidden');
    document.getElementById('gameManagement').classList.remove('hidden');

    document.getElementById('gameTitle').textContent = game.name;
    document.getElementById('gameStatus').innerHTML = getStatusBadge(game.status);

    renderTeams(game.teams || []);
    renderQuestions(game.questions || []);
    updateGameControls(game.status);
}

// Funções CRUD (Create, Delete) simplificadas aqui para caber
async function createGame(e) {
    e.preventDefault();
    const name = document.getElementById('gameName').value;
    const res = await fetch('/api/admin/games', { method: 'POST', headers: { 'Content-Type': 'json' }, body: JSON.stringify({ name }) }); // Simplificado
    // ... (Mantenha sua lógica de createGame original se preferir, ou copie do anterior, o foco aqui é o botão voltar)
    // Vou colocar a lógica completa para garantir:
    try {
        const response = await fetch('/api/admin/games', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name })
        });
        const data = await response.json();
        if (data.success) {
            showNotification('Jogo criado!', 'success');
            document.getElementById('modalNewGame').classList.remove('active');
            document.getElementById('formNewGame').reset();
            loadGames();
        }
    } catch (e) { showNotification('Erro', 'error'); }
}

async function createTeam(e) {
    e.preventDefault();
    const name = document.getElementById('teamName').value;
    try {
        const response = await fetch('/api/admin/teams', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gameId: currentGameId, name })
        });
        const data = await response.json();
        if (data.success) {
            showNotification('Time criado!', 'success');
            document.getElementById('modalNewTeam').classList.remove('active');
            document.getElementById('formNewTeam').reset();
            selectGame(currentGameId);
        }
    } catch (e) { showNotification('Erro', 'error'); }
}

async function createQuestion(e) {
    e.preventDefault();
    const qText = document.getElementById('questionText').value;
    const time = document.getElementById('timeLimit').value;
    const pts = document.getElementById('points').value;
    const order = currentGame.questions ? currentGame.questions.length : 0;

    try {
        const res = await fetch('/api/admin/questions', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gameId: currentGameId, questionText: qText, timeLimit: time, points: pts, orderIndex: order })
        });
        const data = await res.json();
        if (data.success) {
            const qId = data.questionId;
            const answers = document.querySelectorAll('.answer-text');
            const correct = document.querySelector('input[name="correctAnswer"]:checked').value;

            for (let i = 0; i < answers.length; i++) {
                await fetch('/api/admin/answers', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ questionId: qId, answerText: answers[i].value, isCorrect: i == correct })
                });
            }
            showNotification('Pergunta criada!', 'success');
            document.getElementById('modalNewQuestion').classList.remove('active');
            document.getElementById('formNewQuestion').reset();
            selectGame(currentGameId);
        }
    } catch (e) { showNotification('Erro', 'error'); }
}

// Controles de Jogo
function startGame() {
    if (confirm('Iniciar jogo?')) {
        socket.emit('admin:startGame', currentGameId);
        updateGameControls('active');
    }
}
function nextQuestion() {
    if (confirm('Próxima pergunta?')) socket.emit('admin:nextQuestion', currentGameId);
}
function showRanking() {
    socket.emit('admin:showRanking', currentGameId);
}
function endGame() {
    if (confirm('Finalizar jogo?')) {
        socket.emit('admin:endGame', currentGameId);
        updateGameControls('finished');
    }
}

function updateGameControls(status) {
    const btnStart = document.getElementById('btnStartGame');
    const btnNext = document.getElementById('btnNextQuestion');
    const btnRank = document.getElementById('btnShowRanking');
    const btnEnd = document.getElementById('btnEndGame');

    // MUDANÇA: Permite iniciar se estiver 'waiting' OU 'finished' (para reiniciar)
    btnStart.disabled = status === 'active';

    // Se estiver finished, muda o texto do botão para "Reiniciar Jogo"
    if (status === 'finished') {
        btnStart.textContent = "Reiniciar Jogo";
        btnStart.classList.remove('btn-success');
        btnStart.classList.add('btn-warning'); // Cor diferente para indicar reinício
    } else {
        btnStart.textContent = "Iniciar Jogo";
        btnStart.classList.remove('btn-warning');
        btnStart.classList.add('btn-success');
    }

    btnNext.disabled = status === 'finished' || status === 'waiting';
    btnRank.disabled = status === 'waiting';
    btnEnd.disabled = status === 'finished' || status === 'waiting';
}

// Deletes (Simplificados)
async function deleteGame(id) { if (confirm('Excluir?')) { await fetch(`/api/admin/games/${id}`, { method: 'DELETE' }); loadGames(); } }
async function deleteTeam(id) { if (confirm('Excluir?')) { await fetch(`/api/admin/teams/${id}`, { method: 'DELETE' }); selectGame(currentGameId); } }
async function deleteQuestion(id) { if (confirm('Excluir?')) { await fetch(`/api/admin/questions/${id}`, { method: 'DELETE' }); selectGame(currentGameId); } }

// Helpers
function getStatusBadge(status) {
    const map = {
        waiting: { color: '#f6ad55', label: '🟡 Aguardando' },
        active: { color: '#48bb78', label: '🟢 Em Andamento' },
        finished: { color: '#e53e3e', label: '🔴 Finalizado' }
    };
    const s = map[status] || { color: '#ccc', label: status };
    return `<span class="badge" style="background-color: ${s.color}; color: white; padding: 4px 8px; border-radius: 4px;">${s.label}</span>`;
}

function renderTeams(teams) {
    const container = document.getElementById('teamsContainer');
    if (teams.length === 0) { container.innerHTML = '<p>Sem times.</p>'; return; }
    container.innerHTML = teams.map(t => `
        <div class="team-card">
            <h4>${t.name}</h4>
            <p>Código: <strong>${t.access_code}</strong></p>
            <div class="actions">
                <a href="/participant.html?code=${t.access_code}" target="_blank" class="btn btn-success" style="background-color: #28a745; color: white; padding: 5px 10px; text-decoration: none; border-radius: 5px;">Entrar</a>
                <button class="btn btn-primary" onclick="showQRCode(${t.id}, '${t.name}', '${t.access_code}', '${t.qr_code}')">QR</button>
                <button class="btn btn-danger" onclick="deleteTeam(${t.id})">Excluir</button>
            </div>
        </div>
    `).join('');
}

function renderQuestions(qs) {
    const container = document.getElementById('questionsContainer');
    if (qs.length === 0) { container.innerHTML = '<p>Sem perguntas.</p>'; return; }
    container.innerHTML = qs.map((q, i) => `
        <div class="question-card">
            <h4>${i + 1}. ${q.question_text}</h4>
            <button class="btn btn-danger" onclick="deleteQuestion(${q.id})">Excluir</button>
        </div>
    `).join('');
}

function openModal(el) { el.classList.add('active'); }
function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
    document.getElementById(`${tab}Tab`).classList.add('active');
}
function showQRCode(id, name, code, img) {
    document.getElementById('qrTeamName').textContent = name;
    document.getElementById('qrAccessCode').textContent = code;
    document.getElementById('qrCodeImage').src = img;
    document.getElementById('modalQRCode').classList.add('active');
}
function showNotification(msg, type) {
    const n = document.createElement('div');
    n.className = `notification notification-${type}`;
    n.innerText = msg;
    n.style.cssText = `position: fixed; top: 20px; right: 20px; padding: 15px; background: ${type == 'success' ? '#48bb78' : '#e53e3e'}; color: white; border-radius: 5px; z-index: 1000;`;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 3000);
}