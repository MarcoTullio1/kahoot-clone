const socket = io();
let currentGameId = null;
let currentGame = null;
let timerInterval = null;
let gameFinished = false;

// Elementos DOM
const waitingStartScreen = document.getElementById('waitingStartScreen');
const questionDisplayScreen = document.getElementById('questionDisplayScreen');
const rankingDisplayScreen = document.getElementById('rankingDisplayScreen');
const endDisplayScreen = document.getElementById('endDisplayScreen');
// Adicione isso no topo com as outras consts
const rankingList = document.getElementById('rankingList');

document.addEventListener('DOMContentLoaded', () => {
    loadGames();
    setupSocketListeners();
});

function setupSocketListeners() {
    socket.on('game:started', () => {
        console.log('Jogo iniciado!');
        gameFinished = false; // Reset flag
    });

    socket.on('question:new', (questionData) => {
        console.log('Pergunta nova recebida:', questionData);
        showQuestion(questionData);
    });

    socket.on('ranking:show', (rankingData) => {
        console.log('📊 Evento ranking:show recebido:', rankingData);
        console.log('🎮 gameFinished flag:', gameFinished);
        console.log('🎮 rankingData.isFinal:', rankingData.isFinal);

        // Força a parada de qualquer timer
        stopTimer();

        // Chama a função de exibição diretamente
        showRanking(rankingData);
    });

    socket.on('game:ended', () => {
        console.log('🏁 Jogo finalizado recebido no display');
        gameFinished = true; // <--- MARCA QUE ACABOU

        if (typeof currentGame !== 'undefined') {
            currentGame.status = 'finished';
        }

        // Espera um pouco e pede o ranking final automaticamente
        setTimeout(() => {
            // Certifique-se que você tem acesso ao socket e ao ID do jogo aqui
            socket.emit('admin:showRanking', currentGameId);
        }, 500);
    });

    socket.on('question:stats', (data) => {
        console.log('📈 Estatísticas da pergunta recebidas');
        stopTimer();
        renderStatsChart(data);
    });

    socket.on('participant:update_count', (count) => {
        const countEl = document.getElementById('participantsCount');
        if (countEl) countEl.textContent = count;
    });

    socket.on('disconnect', () => {
        console.log('Desconectado...');
        setTimeout(() => window.location.reload(), 3000);
    });
}

async function loadGames() {
    try {
        const response = await fetch('/api/admin/games');
        const data = await response.json();
        if (data.success) renderGamesList(data.games);
    } catch (error) {
        console.error('Erro ao carregar jogos:', error);
    }
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
            <p>Status: ${getStatusText(game.status)}</p>
        </div>
    `).join('');
}

async function selectGame(gameId, gameName) {
    currentGameId = gameId;
    gameFinished = false; // Reset ao selecionar novo jogo

    try {
        const response = await fetch(`/api/admin/games/${gameId}`);
        const data = await response.json();
        if (data.success) {
            currentGame = data.game;

            // Verifica se o jogo já está finalizado
            if (currentGame.status === 'finished') {
                gameFinished = true;
            }

            socket.emit('display:connect', gameId);

            document.getElementById('displayGameName').textContent = gameName;
            showScreen(waitingStartScreen);
        }
    } catch (error) {
        console.error('Erro ao selecionar jogo:', error);
    }
}

function showQuestion(questionData) {
    const qNum = document.getElementById('displayQuestionNum');
    const qTotal = document.getElementById('displayTotalQuestions');
    const qText = document.getElementById('displayQuestionText');

    if (qNum) qNum.textContent = questionData.questionNumber;
    if (qTotal) qTotal.textContent = questionData.totalQuestions;
    if (qText) qText.textContent = questionData.text;

    const answersContainer = document.getElementById('displayAnswersContainer');

    // Limpa estilos do gráfico anterior
    answersContainer.removeAttribute('style');
    answersContainer.innerHTML = '';

    answersContainer.innerHTML = questionData.answers.map((answer, index) => `
        <div class="answer-display-item" data-letter="${String.fromCharCode(65 + index)}">
            ${answer.text}
        </div>
    `).join('');

    startTimer(questionData.timeLimit);
    showScreen(questionDisplayScreen);
}

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

    stopTimer();

    timerInterval = setInterval(() => {
        timeRemaining--;
        timerText.textContent = Math.max(0, timeRemaining);

        const progress = timeRemaining / timeLimit;
        const offset = circumference * (1 - progress);
        timerProgress.style.strokeDashoffset = offset;

        if (timeRemaining <= 5) {
            timerProgress.style.stroke = '#e53e3e';
            timerText.style.color = '#e53e3e';
        }

        if (timeRemaining <= 0) {
            stopTimer();
            // Pede o gráfico automaticamente quando o tempo acaba
            socket.emit('display:timeUp', currentGameId);
        }
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function renderStatsChart(data) {
    const container = document.getElementById('displayAnswersContainer');

    // Configura layout do container principal
    container.style.display = 'flex';
    container.style.flexDirection = 'row';
    container.style.alignItems = 'flex-end';
    container.style.justifyContent = 'space-around';
    container.style.height = '500px';
    container.style.padding = '20px';
    container.style.gap = '15px';

    const colors = ['#e21b3c', '#1368ce', '#d89e00', '#26890c'];
    const letters = ['A', 'B', 'C', 'D'];

    container.innerHTML = data.distribution.map((item, index) => {
        const checkIcon = item.isCorrect ?
            `<div style="margin-bottom: 10px; font-size: 2.5rem; background: white; border-radius: 50%; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.2); z-index: 10;">✅</div>`
            : '<div style="height: 60px;"></div>';

        const barHeight = Math.max(5, item.percent);
        const opacity = item.isCorrect ? '1' : '0.6';

        return `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; flex: 1; max-width: 150px;">
                
                ${checkIcon}

                <div style="width: 100%; height: ${barHeight}%; background-color: ${colors[index]}; opacity: ${opacity}; border-radius: 5px 5px 0 0; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 10px; transition: height 1s ease-out; box-shadow: 0 4px 6px rgba(0,0,0,0.1); min-height: 40px;">
                    <span style="color: white; font-weight: bold; font-size: 1.5rem; text-shadow: 0 1px 3px rgba(0,0,0,0.5);">${item.count}</span>
                </div>

                <div style="width: 100%; height: 60px; background-color: ${colors[index]}; margin-top: 5px; border-radius: 0 0 5px 5px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                     <span style="color: white; font-weight: 900; font-size: 2rem;">${letters[index]}</span>
                </div>
                
                <div style="font-size: 1rem; color: #2d3748; margin-top: 10px; text-align: center; font-weight: 700; line-height: 1.2; width: 100%; word-wrap: break-word;">
                    ${item.text}
                </div>
            </div>
        `;
    }).join('');
}
function showRanking(rankingData) {
    // Para qualquer timer que esteja rodando
    if (typeof stopTimer === 'function') stopTimer();

    // Verificação tripla para garantir que é a final
    const isFinalRanking = gameFinished ||
        rankingData.isFinal === true ||
        (typeof currentGame !== 'undefined' && currentGame && currentGame.status === 'finished');

    console.log('🏆 Exibindo Ranking. É final?', isFinalRanking);

    if (isFinalRanking) {
        // Mostra o PÓDIO
        showFinalRanking(rankingData);
    } else {
        // Mostra a LISTA de classificação normal
        renderRankingList(rankingData.teams, rankingList); // Ajuste os nomes das variáveis se necessário
        showScreen(rankingDisplayScreen);
    }
}
function showFinalRanking(rankingData) {
    console.log('🎊 Renderizando pódio com', rankingData.teams.length, 'times');

    const podiumContainer = document.querySelector('.podium');
    if (!podiumContainer) {
        console.error('❌ Container do pódio não encontrado!');
        return;
    }

    podiumContainer.innerHTML = '';

    const teams = rankingData.teams;

    if (teams.length > 0) renderPodiumItem(teams[0], 'first', podiumContainer);
    if (teams.length > 1) renderPodiumItem(teams[1], 'second', podiumContainer);
    if (teams.length > 2) renderPodiumItem(teams[2], 'third', podiumContainer);

    // FORÇA a exibição da tela final
    showScreen(endDisplayScreen);
    console.log('✅ Tela do pódio exibida');
}

function renderPodiumItem(team, positionClass, container) {
    if (!team || !container) return;

    console.log(`   Renderizando ${positionClass}:`, team.name, '-', team.score, 'pts');

    const div = document.createElement('div');
    div.className = `podium-item ${positionClass}`;
    div.innerHTML = `
        <div class="podium-medal">🏅</div>
        <div class="podium-position">
            ${positionClass === 'first' ? '1º' : positionClass === 'second' ? '2º' : '3º'}
        </div>
        <div class="podium-team">${team.name}</div>
        <div class="podium-score">${team.score} pts</div>
        <div class="podium-bar"></div>
    `;
    container.appendChild(div);
}

function renderRankingList(teams, container) {
    if (!container) return;
    container.innerHTML = teams.map((team, index) => {
        let positionClass = index === 0 ? 'first' : index === 1 ? 'second' : index === 2 ? 'third' : '';
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
}

function showScreen(screen) {
    console.log('🖥️ Trocando para tela:', screen.id);
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