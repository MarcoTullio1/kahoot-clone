const socket = io();
let participantId = null;
let teamId = null;
let currentQuestionId = null;
let timerInterval = null;
let questionStartTime = null;
let totalScore = 0;

// Elementos
const loginScreen = document.getElementById('loginScreen');
const waitingScreen = document.getElementById('waitingScreen');
const questionScreen = document.getElementById('questionScreen');
const resultScreen = document.getElementById('resultScreen');
const endScreen = document.getElementById('endScreen');

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const accessCode = urlParams.get('code');
    if (accessCode) validateAccessCode(accessCode);
    document.getElementById('formLogin').addEventListener('submit', handleLogin);
    setupSocketListeners();
});

function setupSocketListeners() {
    socket.on('game:started', () => {
        console.log('Jogo começou!');
    });

    socket.on('question:new', (questionData) => {
        console.log('Nova pergunta:', questionData);
        showQuestion(questionData);
    });

    // NOVO: Confirmação silenciosa que a resposta foi enviada
    socket.on('participant:answer_registered', () => {
        showWaitingScreen("Resposta Enviada!", "Aguarde o resultado no telão...");
    });

    // Se o participante entrar no meio e já tiver respondido
    socket.on('participant:alreadyAnswered', () => {
        showWaitingScreen("Você já respondeu!", "Aguarde o fim do tempo...");
    });

    // O resultado agora chega só no final do tempo
    socket.on('answer:result', (result) => {
        console.log('Resultado final:', result);
        showResult(result);
    });

    socket.on('ranking:show', () => {
        showWaitingScreen("Olhe para o Telão!", "Ranking sendo exibido...");
    });

    socket.on('game:ended', () => showEndScreen());

    socket.on('participant:joined', (data) => {
        participantId = data.participantId;
        if (data.score !== undefined) totalScore = data.score;
        showWaitingScreen(`Olá, ${data.nickname}!`, "Aguardando início do jogo...");
        updateScoreDisplay();
    });

    socket.on('error', (data) => alert('Erro: ' + data.message));
}

async function validateAccessCode(code) {
    try {
        const res = await fetch('/api/participant/join', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accessCode: code })
        });
        const data = await res.json();
        if (data.success) {
            teamId = data.team.id;
            document.getElementById('teamName').textContent = data.team.name;
            showScreen(loginScreen);
        } else {
            alert('Código inválido');
        }
    } catch (e) { console.error(e); }
}

function handleLogin(e) {
    e.preventDefault();
    const nickname = document.getElementById('nickname').value;
    if (nickname && teamId) socket.emit('participant:join', { teamId, nickname });
}

function showQuestion(data) {
    document.getElementById('currentQuestionNum').textContent = data.questionNumber;
    document.getElementById('totalQuestions').textContent = data.totalQuestions;
    document.getElementById('questionText').textContent = data.text;

    const container = document.getElementById('answersContainer');
    container.innerHTML = '';
    const letters = ['A', 'B', 'C', 'D'];

    data.answers.forEach((answer, index) => {
        const btn = document.createElement('button');
        btn.className = 'answer-btn';
        btn.disabled = false;
        btn.innerHTML = `
            <span style="background: #667eea; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 10px; flex-shrink: 0;">${letters[index]}</span>
            <span>${answer.text}</span>
        `;
        btn.addEventListener('click', () => handleAnswerClick(answer.id));
        container.appendChild(btn);
    });

    showScreen(questionScreen);
    currentQuestionId = data.id;
    startTimer(data.timeLimit);
}

function handleAnswerClick(answerId) {
    stopTimer();
    // Envia resposta
    socket.emit('participant:answer', {
        participantId,
        questionId: currentQuestionId,
        answerId
    });
    // Não mostra resultado aqui, espera o evento 'answer_registered'
}

// Função auxiliar para mostrar tela de espera com mensagem customizada
function showWaitingScreen(title, message) {
    const titleEl = document.querySelector('#waitingScreen h2');
    const msgEl = document.querySelector('#waitingScreen .waiting-text');

    // Limpa conteúdo anterior se não for o padrão (para garantir)
    if (document.getElementById('participantName')) {
        // Se a tela tem estrutura fixa com spans, melhor atualizar apenas o texto
        // Mas como estamos reutilizando, vamos simplificar:
        if (title) titleEl.textContent = title;
        if (message) msgEl.textContent = message;
    }

    showScreen(waitingScreen);
    updateScoreDisplay();
}

function updateScoreDisplay() {
    const scoreEl = document.getElementById('currentScore');
    if (scoreEl) scoreEl.textContent = totalScore;
}

function startTimer(seconds) {
    stopTimer();
    const textEl = document.getElementById('timer');
    const circle = document.querySelector('.timer-progress');
    let left = seconds;

    if (textEl) { textEl.textContent = left; textEl.style.color = '#2d3748'; }
    if (circle) {
        circle.style.strokeDasharray = 157;
        circle.style.strokeDashoffset = 0;
        circle.style.stroke = '#667eea';
    }

    timerInterval = setInterval(() => {
        left--;
        if (textEl) textEl.textContent = left;
        if (circle) {
            const offset = 157 * (1 - (left / seconds));
            circle.style.strokeDashoffset = offset;
            if (left <= 5) { circle.style.stroke = '#e53e3e'; if (textEl) textEl.style.color = '#e53e3e'; }
        }
        if (left <= 0) {
            stopTimer();
            // Tempo acabou, desabilita botões (mas não mostra erro ainda, espera o servidor mandar o stats)
            document.querySelectorAll('.answer-btn').forEach(b => b.disabled = true);
        }
    }, 1000);
}

function stopTimer() {
    if (timerInterval) clearInterval(timerInterval);
}

function showResult(result) {
    const resultBox = document.querySelector('.result-box');
    const resultIcon = document.getElementById('resultIcon');
    const resultTitle = document.getElementById('resultTitle');
    const resultMessage = document.getElementById('resultMessage');
    const pointsEarned = document.getElementById('pointsEarned');
    const timeDisplay = document.getElementById('timeTaken');

    resultBox.classList.remove('correct', 'incorrect');

    if (result.isCorrect) {
        resultBox.classList.add('correct');
        resultIcon.innerHTML = '<svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#38a169" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>';
        resultTitle.textContent = "Correto! 🎉";
        resultTitle.style.color = "#38a169";
        resultMessage.textContent = "Mandou bem!";
        pointsEarned.textContent = `+${result.pointsEarned} pontos`;
        totalScore += result.pointsEarned;
    } else {
        resultBox.classList.add('incorrect');
        resultIcon.innerHTML = '<svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#e53e3e" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>';
        resultTitle.textContent = "Incorreto 😔";
        resultTitle.style.color = "#e53e3e";
        resultMessage.textContent = result.message || "Não foi dessa vez.";
        pointsEarned.textContent = "0 pontos";
    }

    updateScoreDisplay();
    if (timeDisplay) timeDisplay.textContent = `Tempo: ${result.timeTaken || '-'}s`;
    showScreen(resultScreen);
}

function showEndScreen() {
    document.getElementById('finalScore').textContent = totalScore;
    const finalTeamEl = document.getElementById('finalTeam');
    const teamNameEl = document.getElementById('teamName');
    if (finalTeamEl) finalTeamEl.textContent = teamNameEl ? teamNameEl.textContent : 'Seu Time';
    showScreen(endScreen);
}

function showScreen(screen) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    screen.classList.add('active');
}