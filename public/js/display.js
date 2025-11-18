const socket = io();
let currentGameId = null;
let currentGame = null;
let timerInterval = null;

// Elementos DOM
const waitingStartScreen = document.getElementById('waitingStartScreen');
const questionDisplayScreen = document.getElementById('questionDisplayScreen');
const rankingDisplayScreen = document.getElementById('rankingDisplayScreen');
const endDisplayScreen = document.getElementById('endDisplayScreen');

document.addEventListener('DOMContentLoaded', () => {
    loadGames();
    setupSocketListeners();
});

function setupSocketListeners() {
    socket.on('game:started', () => console.log('Jogo iniciado!'));

    socket.on('question:new', (questionData) => {
        showQuestion(questionData);
    });

    socket.on('ranking:show', (rankingData) => {
        showRanking(rankingData);
    });

    socket.on('game:ended', () => {
        setTimeout(() => {
            socket.emit('admin:showRanking', currentGameId);
        }, 2000);
    });

    // --- CORREÇÃO: Ouvir contagem real ---
    socket.on('participant:update_count', (count) => {
        const countEl = document.getElementById('participantsCount');
        if (countEl) countEl.textContent = count;
    });
}

async function loadGames() {
    try {
        const response = await fetch('/api/admin/games');
        const data = await response.json();
        if (data.success) renderGamesList(data.games);
    } catch (error) { console.error(error); }
}

function renderGamesList(games) {
    const container = document.getElementById('gamesListDisplay');
    if (games.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #718096;">Nenhum jogo disponível</p>';
        return;
    }
    container.innerHTML = games.map(game => `
        <div class="game-item-display" onclick="selectGame(${game.id}, '${game.name}')">
            <h3>${game.name}</h3>
            <p>Status: ${game.status}</p>
        </div>
    `).join('');
}

async function selectGame(gameId, gameName) {
    currentGameId = gameId;
    try {
        const response = await fetch(`/api/admin/games/${gameId}`);
        const data = await response.json();
        if (data.success) {
            currentGame = data.game;
            socket.emit('display:connect', gameId);

            document.getElementById('displayGameName').textContent = gameName;
            showScreen(waitingStartScreen);
        }
    } catch (error) { console.error(error); }
}

function showQuestion(questionData) {
    document.getElementById('displayQuestionNum').textContent = questionData.questionNumber;
    document.getElementById('displayTotalQuestions').textContent = questionData.totalQuestions;
    document.getElementById('displayQuestionText').textContent = questionData.text;

    const answersContainer = document.getElementById('displayAnswersContainer');
    answersContainer.innerHTML = questionData.answers.map((answer, index) => `
        <div class="answer-display-item" data-letter="${String.fromCharCode(65 + index)}">
            ${answer.text}
        </div>
    `).join('');

    startTimer(questionData.timeLimit);
    showScreen(questionDisplayScreen);
}

// --- CORREÇÃO: Timer ---
function startTimer(timeLimit) {
    const timerText = document.getElementById('displayTimer');
    const timerProgress = document.querySelector('.timer-progress-large');

    // Reset visual
    const circumference = 2 * Math.PI * 50;
    timerProgress.style.strokeDasharray = circumference;
    timerProgress.style.strokeDashoffset = 0;
    timerProgress.style.stroke = '#667eea';
    timerText.style.color = '#2d3748';

    let timeRemaining = timeLimit;
    timerText.textContent = timeRemaining;

    stopTimer(); // Limpa anterior

    timerInterval = setInterval(() => {
        timeRemaining--;

        // Atualiza texto
        timerText.textContent = Math.max(0, timeRemaining);

        // Atualiza círculo
        const progress = timeRemaining / timeLimit;
        const offset = circumference * (1 - progress);
        timerProgress.style.strokeDashoffset = offset;

        // Cor de alerta
        if (timeRemaining <= 5) {
            timerProgress.style.stroke = '#e53e3e';
            timerText.style.color = '#e53e3e';
        }

        // Parar no zero
        if (timeRemaining <= 0) {
            stopTimer();
        }
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function showRanking(rankingData) {
    stopTimer();
    const rankingList = document.getElementById('displayRankingList');

    if (currentGame && currentGame.status === 'finished') {
        showFinalRanking(rankingData);
        return;
    }

    rankingList.innerHTML = rankingData.teams.map((team, index) => {
        let positionClass = index === 0 ? 'first' : index === 1 ? 'second' : index === 2 ? 'third' : '';

        // Adicionando barra de precisão
        return `
            <div class="ranking-display-item ${positionClass}">
                <div class="ranking-display-position">${index + 1}</div>
                <div class="ranking-display-info">
                    <div class="ranking-display-name">${team.name}</div>
                    
                    <div style="display: flex; align-items: center; gap: 10px; margin-top: 5px;">
                         <div style="flex: 1; height: 8px; background: rgba(0,0,0,0.1); border-radius: 4px; overflow: hidden; max-width: 150px;">
                            <div style="width: ${team.accuracy || 0}%; height: 100%; background: #48bb78;"></div>
                         </div>
                         <span style="font-size: 0.9rem; opacity: 0.8">${team.accuracy || 0}% acerto</span>
                    </div>
                    </div>
                <div class="ranking-display-score">${team.score} pts</div>
            </div>
        `;
    }).join('');

    showScreen(rankingDisplayScreen);
}

function showFinalRanking(rankingData) {
    const teams = rankingData.teams;
    if (teams[0]) updatePodium('#firstPlace', teams[0]);
    if (teams[1]) updatePodium('#secondPlace', teams[1]);
    if (teams[2]) updatePodium('#thirdPlace', teams[2]);
    showScreen(endDisplayScreen);
}

function updatePodium(selector, team) {
    const el = document.querySelector(selector);
    if (el) {
        el.querySelector('.podium-team').textContent = team.name;
        el.querySelector('.podium-score').textContent = team.score + ' pts';
    }
}

function showScreen(screen) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    screen.classList.add('active');
}

function getStatusText(status) {
    const statusMap = {
        waiting: 'Aguardando Início',
        active: 'Em Andamento',
        finished: 'Finalizado'
    };
    return statusMap[status] || status;
}