// Conexão com Socket.IO
const socket = io();

// Estado da aplicação
let currentGameId = null;
let currentGame = null;
let timerInterval = null;

// Elementos DOM
const selectGameScreen = document.getElementById('selectGameScreen');
const waitingStartScreen = document.getElementById('waitingStartScreen');
const questionDisplayScreen = document.getElementById('questionDisplayScreen');
const rankingDisplayScreen = document.getElementById('rankingDisplayScreen');
const endDisplayScreen = document.getElementById('endDisplayScreen');

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    loadGames();
    setupSocketListeners();
});

// Configurar listeners do Socket.IO
function setupSocketListeners() {
    // Jogo iniciado
    socket.on('game:started', () => {
        console.log('Jogo iniciado no telão!');
    });
    
    // Nova pergunta
    socket.on('question:new', (questionData) => {
        showQuestion(questionData);
    });
    
    // Mostrar ranking
    socket.on('ranking:show', (rankingData) => {
        showRanking(rankingData);
    });
    
    // Jogo finalizado
    socket.on('game:ended', () => {
        // Esperar um pouco e então mostrar tela final com ranking
        setTimeout(() => {
            socket.emit('admin:showRanking', currentGameId);
        }, 2000);
    });
    
    // Erro
    socket.on('error', (data) => {
        console.error('Erro:', data.message);
    });
}

// Carregar lista de jogos
async function loadGames() {
    try {
        const response = await fetch('/api/admin/games');
        const data = await response.json();
        
        if (data.success) {
            renderGamesList(data.games);
        }
    } catch (error) {
        console.error('Erro ao carregar jogos:', error);
    }
}

// Renderizar lista de jogos
function renderGamesList(games) {
    const container = document.getElementById('gamesListDisplay');
    
    if (games.length === 0) {
        container.innerHTML = '<p style="text-align: center; font-size: 1.5rem; color: #718096;">Nenhum jogo disponível</p>';
        return;
    }
    
    container.innerHTML = games.map(game => `
        <div class="game-item-display" onclick="selectGame(${game.id}, '${game.name}')">
            <h3>${game.name}</h3>
            <p>Status: ${getStatusText(game.status)}</p>
        </div>
    `).join('');
}

// Selecionar jogo
async function selectGame(gameId, gameName) {
    currentGameId = gameId;
    
    try {
        const response = await fetch(`/api/admin/games/${gameId}`);
        const data = await response.json();
        
        if (data.success) {
            currentGame = data.game;
            
            // Conectar ao jogo via socket
            socket.emit('display:connect', gameId);
            
            // Mostrar tela de espera
            document.getElementById('displayGameName').textContent = gameName;
            showScreen(waitingStartScreen);
            
            // Atualizar contador de participantes (simulado)
            updateParticipantsCount();
        }
    } catch (error) {
        console.error('Erro ao carregar jogo:', error);
    }
}

// Atualizar contador de participantes
function updateParticipantsCount() {
    // Em uma implementação real, isso viria do servidor
    let count = 0;
    const interval = setInterval(() => {
        if (count < 50) {
            count += Math.floor(Math.random() * 3);
            document.getElementById('participantsCount').textContent = count;
        } else {
            clearInterval(interval);
        }
    }, 500);
}

// Mostrar pergunta
function showQuestion(questionData) {
    // Atualizar informações da pergunta
    document.getElementById('displayQuestionNum').textContent = questionData.questionNumber;
    document.getElementById('displayTotalQuestions').textContent = questionData.totalQuestions;
    document.getElementById('displayQuestionText').textContent = questionData.text;
    
    // Renderizar respostas
    const answersContainer = document.getElementById('displayAnswersContainer');
    answersContainer.innerHTML = questionData.answers.map((answer, index) => `
        <div class="answer-display-item" data-letter="${String.fromCharCode(65 + index)}">
            ${answer.text}
        </div>
    `).join('');
    
    // Iniciar timer
    startTimer(questionData.timeLimit);
    
    // Mostrar tela de pergunta
    showScreen(questionDisplayScreen);
}

// Iniciar timer
function startTimer(timeLimit) {
    const timerText = document.getElementById('displayTimer');
    const timerProgress = document.querySelector('.timer-progress-large');
    
    const circumference = 2 * Math.PI * 50; // raio = 50
    timerProgress.style.strokeDasharray = circumference;
    timerProgress.style.strokeDashoffset = 0;
    
    let timeRemaining = timeLimit;
    timerText.textContent = timeRemaining;
    
    timerInterval = setInterval(() => {
        timeRemaining--;
        timerText.textContent = timeRemaining;
        
        // Atualizar círculo de progresso
        const progress = timeRemaining / timeLimit;
        const offset = circumference * (1 - progress);
        timerProgress.style.strokeDashoffset = offset;
        
        // Mudar cor quando tempo está acabando
        if (timeRemaining <= 5) {
            timerProgress.style.stroke = '#e53e3e';
            timerText.style.color = '#e53e3e';
        } else {
            timerProgress.style.stroke = '#667eea';
            timerText.style.color = '#2d3748';
        }
        
        if (timeRemaining <= 0) {
            stopTimer();
        }
    }, 1000);
}

// Parar timer
function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// Mostrar ranking
function showRanking(rankingData) {
    stopTimer();
    
    const rankingList = document.getElementById('displayRankingList');
    
    // Se for a tela final (após game:ended), mostrar pódio
    if (currentGame && currentGame.status === 'finished') {
        showFinalRanking(rankingData);
        return;
    }
    
    // Ranking intermediário
    rankingList.innerHTML = rankingData.teams.map((team, index) => {
        let positionClass = '';
        if (index === 0) positionClass = 'first';
        else if (index === 1) positionClass = 'second';
        else if (index === 2) positionClass = 'third';
        
        return `
            <div class="ranking-display-item ${positionClass}">
                <div class="ranking-display-position">${index + 1}</div>
                <div class="ranking-display-info">
                    <div class="ranking-display-name">${team.name}</div>
                    <div class="ranking-display-participants">${team.participantCount} participantes</div>
                </div>
                <div class="ranking-display-score">${team.score} pts</div>
            </div>
        `;
    }).join('');
    
    showScreen(rankingDisplayScreen);
}

// Mostrar ranking final com pódio
function showFinalRanking(rankingData) {
    const teams = rankingData.teams;
    
    // Preencher pódio
    if (teams[0]) {
        document.querySelector('#firstPlace .podium-team').textContent = teams[0].name;
        document.querySelector('#firstPlace .podium-score').textContent = teams[0].score + ' pts';
    }
    
    if (teams[1]) {
        document.querySelector('#secondPlace .podium-team').textContent = teams[1].name;
        document.querySelector('#secondPlace .podium-score').textContent = teams[1].score + ' pts';
    }
    
    if (teams[2]) {
        document.querySelector('#thirdPlace .podium-team').textContent = teams[2].name;
        document.querySelector('#thirdPlace .podium-score').textContent = teams[2].score + ' pts';
    }
    
    showScreen(endDisplayScreen);
}

// Mostrar tela específica
function showScreen(screen) {
    // Esconder todas as telas
    document.querySelectorAll('.screen').forEach(s => {
        s.classList.remove('active');
    });
    
    // Mostrar tela específica
    screen.classList.add('active');
}

// Funções auxiliares
function getStatusText(status) {
    const statusMap = {
        waiting: 'Aguardando',
        active: 'Em Andamento',
        finished: 'Finalizado'
    };
    return statusMap[status] || status;
}
