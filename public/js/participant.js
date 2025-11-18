// Conexão com Socket.IO
const socket = io();

// Estado da aplicação
let participantId = null;
let teamId = null;
let teamName = null;
let nickname = null;
let currentQuestionId = null;
let questionStartTime = null;
let timerInterval = null;
let totalScore = 0;

// Elementos DOM
const loginScreen = document.getElementById('loginScreen');
const waitingScreen = document.getElementById('waitingScreen');
const questionScreen = document.getElementById('questionScreen');
const resultScreen = document.getElementById('resultScreen');
const rankingScreen = document.getElementById('rankingScreen');
const endScreen = document.getElementById('endScreen');

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    // Obter código de acesso da URL
    const urlParams = new URLSearchParams(window.location.search);
    const accessCode = urlParams.get('code');
    
    if (accessCode) {
        // Validar código de acesso
        validateAccessCode(accessCode);
    } else {
        showScreen(loginScreen);
        showError('Código de acesso não encontrado na URL');
    }
    
    setupEventListeners();
    setupSocketListeners();
});

// Configurar event listeners
function setupEventListeners() {
    document.getElementById('formLogin').addEventListener('submit', handleLogin);
}

// Configurar listeners do Socket.IO
function setupSocketListeners() {
    // Jogo iniciado
    socket.on('game:started', () => {
        console.log('Jogo iniciado!');
    });
    
    // Nova pergunta
    socket.on('question:new', (questionData) => {
        showQuestion(questionData);
    });
    
    // Resultado da resposta
    socket.on('answer:result', (result) => {
        showResult(result);
    });
    
    // Mostrar ranking
    socket.on('ranking:show', (rankingData) => {
        showRanking(rankingData);
    });
    
    // Jogo finalizado
    socket.on('game:ended', () => {
        showEndScreen();
    });
    
    // Erro
    socket.on('error', (data) => {
        showError(data.message);
    });
}

// Validar código de acesso
async function validateAccessCode(accessCode) {
    try {
        const response = await fetch('/api/participant/join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accessCode })
        });
        
        const data = await response.json();
        
        if (data.success) {
            teamId = data.team.id;
            teamName = data.team.name;
            
            // Mostrar tela de login
            showScreen(loginScreen);
        } else {
            showError('Código de acesso inválido');
        }
    } catch (error) {
        showError('Erro ao validar código de acesso');
    }
}

// Handle login
function handleLogin(e) {
    e.preventDefault();
    
    nickname = document.getElementById('nickname').value.trim();
    
    if (!nickname) {
        showError('Por favor, digite seu nome ou apelido');
        return;
    }
    
    if (!teamId) {
        showError('Time não identificado');
        return;
    }
    
    // Entrar no jogo via socket
    socket.emit('participant:join', { teamId, nickname });
}

// Participante entrou com sucesso
socket.on('participant:joined', (data) => {
    participantId = data.participantId;
    
    // Mostrar tela de espera
    document.getElementById('participantName').textContent = nickname;
    document.getElementById('teamName').textContent = teamName;
    document.getElementById('currentScore').textContent = totalScore;
    
    showScreen(waitingScreen);
});

// Mostrar pergunta
function showQuestion(questionData) {
    currentQuestionId = questionData.id;
    questionStartTime = Date.now();
    
    // Atualizar informações da pergunta
    document.getElementById('currentQuestionNum').textContent = questionData.questionNumber;
    document.getElementById('totalQuestions').textContent = questionData.totalQuestions;
    document.getElementById('questionText').textContent = questionData.text;
    
    // Renderizar respostas
    const answersContainer = document.getElementById('answersContainer');
    answersContainer.innerHTML = questionData.answers.map(answer => `
        <button class="answer-btn" data-answer-id="${answer.id}">
            ${answer.text}
        </button>
    `).join('');
    
    // Adicionar event listeners aos botões de resposta
    answersContainer.querySelectorAll('.answer-btn').forEach(btn => {
        btn.addEventListener('click', () => selectAnswer(btn));
    });
    
    // Iniciar timer
    startTimer(questionData.timeLimit);
    
    // Mostrar tela de pergunta
    showScreen(questionScreen);
}

// Selecionar resposta
function selectAnswer(btn) {
    const answerId = parseInt(btn.dataset.answerId);
    
    // Desabilitar todos os botões
    document.querySelectorAll('.answer-btn').forEach(b => {
        b.disabled = true;
    });
    
    // Marcar resposta selecionada
    btn.classList.add('selected');
    
    // Calcular tempo decorrido
    const timeTaken = (Date.now() - questionStartTime) / 1000;
    
    // Parar timer
    stopTimer();
    
    // Enviar resposta
    socket.emit('participant:answer', {
        participantId,
        questionId: currentQuestionId,
        answerId
    });
}

// Iniciar timer
function startTimer(timeLimit) {
    const timerText = document.getElementById('timer');
    const timerProgress = document.querySelector('.timer-progress');
    
    const circumference = 2 * Math.PI * 25; // raio = 25
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
        }
        
        if (timeRemaining <= 0) {
            stopTimer();
            // Desabilitar todos os botões
            document.querySelectorAll('.answer-btn').forEach(b => {
                b.disabled = true;
            });
            
            // Mostrar mensagem de tempo esgotado
            setTimeout(() => {
                showResult({
                    success: false,
                    message: 'Tempo esgotado!',
                    isCorrect: false,
                    pointsEarned: 0,
                    timeTaken: timeLimit
                });
            }, 500);
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

// Mostrar resultado
function showResult(result) {
    const resultBox = document.getElementById('resultScreen').querySelector('.result-box');
    const resultIcon = document.getElementById('resultIcon');
    const resultTitle = document.getElementById('resultTitle');
    const resultMessage = document.getElementById('resultMessage');
    const pointsEarned = document.getElementById('pointsEarned');
    const timeTaken = document.getElementById('timeTaken');
    
    if (result.isCorrect) {
        resultBox.className = 'result-box correct';
        resultIcon.textContent = '✓';
        resultIcon.style.color = '#38a169';
        resultTitle.textContent = 'Correto!';
        resultMessage.textContent = 'Parabéns, você acertou!';
        pointsEarned.textContent = `+${result.pointsEarned} pontos`;
        totalScore += result.pointsEarned;
    } else {
        resultBox.className = 'result-box incorrect';
        resultIcon.textContent = '✗';
        resultIcon.style.color = '#e53e3e';
        resultTitle.textContent = result.message || 'Incorreto';
        resultMessage.textContent = 'Que pena, tente novamente na próxima!';
        pointsEarned.textContent = '0 pontos';
    }
    
    timeTaken.textContent = `Tempo: ${result.timeTaken}s`;
    
    // Atualizar pontuação
    document.getElementById('currentScore').textContent = totalScore;
    
    showScreen(resultScreen);
}

// Mostrar ranking
function showRanking(rankingData) {
    const rankingList = document.getElementById('rankingList');
    
    rankingList.innerHTML = rankingData.teams.map((team, index) => {
        let positionClass = '';
        if (index === 0) positionClass = 'first';
        else if (index === 1) positionClass = 'second';
        else if (index === 2) positionClass = 'third';
        
        return `
            <div class="ranking-item ${positionClass}">
                <div class="ranking-position">${index + 1}</div>
                <div class="ranking-info">
                    <div class="ranking-name">${team.name}</div>
                </div>
                <div class="ranking-score">${team.score} pts</div>
            </div>
        `;
    }).join('');
    
    // Encontrar posição do seu time
    const yourTeamIndex = rankingData.teams.findIndex(t => t.id === teamId);
    const yourTeam = rankingData.teams[yourTeamIndex];
    
    if (yourTeam) {
        document.getElementById('yourTeamRanking').textContent = `${yourTeamIndex + 1}º lugar - ${yourTeam.name}`;
        document.getElementById('yourScoreRanking').textContent = yourTeam.score;
    }
    
    showScreen(rankingScreen);
}

// Mostrar tela de fim
function showEndScreen() {
    document.getElementById('finalScore').textContent = totalScore;
    document.getElementById('finalTeam').textContent = teamName;
    
    showScreen(endScreen);
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

// Mostrar erro
function showError(message) {
    const errorEl = document.getElementById('loginError');
    if (errorEl) {
        errorEl.textContent = message;
    } else {
        alert(message);
    }
}
