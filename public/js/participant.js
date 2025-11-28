const socket = io();
let participantId = null;
let teamId = null;
let currentQuestionId = null;
let timerInterval = null;
let questionStartTime = null;

// Variável global para guardar a pontuação
let totalScore = 0;

// Elementos DOM
const loginScreen = document.getElementById('loginScreen');
const waitingScreen = document.getElementById('waitingScreen');
const questionScreen = document.getElementById('questionScreen');
const resultScreen = document.getElementById('resultScreen');
const endScreen = document.getElementById('endScreen');

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const accessCode = urlParams.get('code');

    if (accessCode) {
        validateAccessCode(accessCode);
    }

    document.getElementById('formLogin').addEventListener('submit', handleLogin);
    setupSocketListeners();
});

function setupSocketListeners() {
    socket.on('game:started', () => {
        console.log('Jogo começou!');
    });

    socket.on('question:new', (questionData) => {
        console.log('Nova pergunta recebida:', questionData);
        showQuestion(questionData);
    });

    socket.on('answer:result', (result) => {
        console.log('Resultado:', result);
        showResult(result);
    });

    // Adicionando listener para o ranking no celular também (aviso)
    socket.on('ranking:show', (data) => {
        showScreen(waitingScreen);
        document.querySelector('#waitingScreen h2').textContent = "Olhe para o Telão!";
        document.querySelector('#waitingScreen .waiting-text').textContent = "Ranking sendo exibido...";
    });

    socket.on('game:ended', () => showEndScreen());

    socket.on('participant:joined', (data) => {
        participantId = data.participantId;
        if (data.score !== undefined) totalScore = data.score;

        showScreen(waitingScreen);
        document.getElementById('participantName').textContent = data.nickname;
        const scoreEl = document.getElementById('currentScore');
        if (scoreEl) scoreEl.textContent = totalScore;
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
            alert('Código de acesso inválido');
        }
    } catch (e) { console.error(e); }
}

function handleLogin(e) {
    e.preventDefault();
    const nickname = document.getElementById('nickname').value;
    if (nickname && teamId) {
        socket.emit('participant:join', { teamId, nickname });
    }
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

        btn.addEventListener('click', () => handleAnswerClick(answer.id, btn));
        container.appendChild(btn);
    });

    showScreen(questionScreen);

    currentQuestionId = data.id;
    questionStartTime = Date.now();
    startTimer(data.timeLimit);
}

function handleAnswerClick(answerId, btnElement) {
    if (btnElement.disabled) return;

    const allBtns = document.querySelectorAll('.answer-btn');
    allBtns.forEach(b => {
        b.disabled = true;
        b.style.opacity = '0.6';
        b.style.cursor = 'default';
    });

    btnElement.classList.add('selected');
    btnElement.style.opacity = '1';
    btnElement.style.borderColor = '#667eea';
    btnElement.style.background = '#e0e7ff';

    stopTimer();

    console.log('Enviando resposta...', answerId);
    socket.emit('participant:answer', {
        participantId,
        questionId: currentQuestionId,
        answerId
    });
}

function startTimer(seconds) {
    stopTimer();

    const textEl = document.getElementById('timer');
    const circle = document.querySelector('.timer-progress');
    let left = seconds;

    if (textEl) {
        textEl.textContent = left;
        textEl.style.color = '#2d3748';
    }
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
            if (left <= 5) {
                circle.style.stroke = '#e53e3e';
                if (textEl) textEl.style.color = '#e53e3e';
            }
        }

        if (left <= 0) {
            stopTimer();
            document.querySelectorAll('.answer-btn').forEach(b => b.disabled = true);

            // Só mostra tela de erro se ainda estiver na pergunta
            setTimeout(() => {
                if (document.getElementById('questionScreen').classList.contains('active')) {
                    showResult({ isCorrect: false, message: 'Tempo esgotado!', pointsEarned: 0, timeTaken: seconds });
                }
            }, 1000);
        }
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
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
        document.getElementById('currentScore').textContent = totalScore;

    } else {
        resultBox.classList.add('incorrect');
        resultIcon.innerHTML = '<svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#e53e3e" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>';
        resultTitle.textContent = "Incorreto 😔";
        resultTitle.style.color = "#e53e3e";
        resultMessage.textContent = result.message || "Não foi dessa vez.";

        // CORRIGIDO AQUI: pts -> pointsEarned
        pointsEarned.textContent = "0 pontos";
    }

    if (timeDisplay) timeDisplay.textContent = `Tempo: ${result.timeTaken || '-'}s`;

    showScreen(resultScreen);
}

function showEndScreen() {
    document.getElementById('finalScore').textContent = totalScore;
    const finalTeamEl = document.getElementById('finalTeam');
    const teamNameEl = document.getElementById('teamName');

    if (finalTeamEl) {
        finalTeamEl.textContent = teamNameEl ? teamNameEl.textContent : 'Seu Time';
    }

    showScreen(endScreen);
}

function showScreen(screen) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    screen.classList.add('active');
}