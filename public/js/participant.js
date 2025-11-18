const socket = io();
let participantId = null;
let teamId = null;
let currentQuestionId = null;
let timerInterval = null;
let questionStartTime = null;

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
        // Mantém na tela de espera até chegar a pergunta
    });

    socket.on('question:new', (questionData) => {
        console.log('Nova pergunta recebida:', questionData);
        showQuestion(questionData);
    });

    socket.on('answer:result', (result) => {
        console.log('Resultado:', result);
        showResult(result);
    });

    socket.on('game:ended', () => showEndScreen());

    socket.on('participant:joined', (data) => {
        participantId = data.participantId;
        showScreen(waitingScreen);
        document.getElementById('participantName').textContent = data.nickname;
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
    // 1. Prepara a tela
    document.getElementById('currentQuestionNum').textContent = data.questionNumber;
    document.getElementById('totalQuestions').textContent = data.totalQuestions;
    document.getElementById('questionText').textContent = data.text;

    const container = document.getElementById('answersContainer');
    container.innerHTML = ''; // Limpa botões antigos

    const letters = ['A', 'B', 'C', 'D'];

    // 2. Cria os botões de forma segura (sem onclick no HTML)
    data.answers.forEach((answer, index) => {
        const btn = document.createElement('button');
        btn.className = 'answer-btn';
        // Garante que o botão está habilitado ao nascer
        btn.disabled = false;

        btn.innerHTML = `
            <span style="background: #667eea; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 10px; flex-shrink: 0;">${letters[index]}</span>
            <span>${answer.text}</span>
        `;

        // Adiciona o evento de clique
        btn.addEventListener('click', () => handleAnswerClick(answer.id, btn));

        container.appendChild(btn);
    });

    showScreen(questionScreen);

    // 3. Inicia Timer
    currentQuestionId = data.id;
    questionStartTime = Date.now(); // Marca a hora que a pergunta apareceu
    startTimer(data.timeLimit);
}

function handleAnswerClick(answerId, btnElement) {
    // 1. Trava cliques múltiplos
    if (btnElement.disabled) return;

    // 2. Desabilita todos os botões visualmente
    const allBtns = document.querySelectorAll('.answer-btn');
    allBtns.forEach(b => {
        b.disabled = true;
        b.style.opacity = '0.6';
        b.style.cursor = 'default';
    });

    // 3. Destaca o escolhido
    btnElement.classList.add('selected');
    btnElement.style.opacity = '1';
    btnElement.style.borderColor = '#667eea';
    btnElement.style.background = '#e0e7ff';

    // 4. Para o timer
    stopTimer();

    // 5. Envia para o servidor
    console.log('Enviando resposta...', answerId);
    socket.emit('participant:answer', {
        participantId,
        questionId: currentQuestionId,
        answerId
    });
}

function startTimer(seconds) {
    stopTimer(); // Garante que não tem timer antigo rodando

    const textEl = document.getElementById('timer');
    const circle = document.querySelector('.timer-progress');
    let left = seconds;

    // Configura visual inicial
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
            // Tempo acabou: desabilita tudo
            document.querySelectorAll('.answer-btn').forEach(b => b.disabled = true);

            // Mostra tela de erro após 1s
            setTimeout(() => {
                // Só mostra "Tempo esgotado" se o usuário ainda estiver nesta tela
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
    const title = document.getElementById('resultTitle');
    const msg = document.getElementById('resultMessage');
    const pts = document.getElementById('pointsEarned');
    const timeDisplay = document.getElementById('timeTaken');

    if (result.isCorrect) {
        title.textContent = "Correto! 🎉";
        title.style.color = "#38a169";
        msg.textContent = "Mandou bem!";
        pts.textContent = `+${result.pointsEarned} pontos`;

        // --- CORREÇÃO: Atualiza a variável global de pontuação ---
        totalScore += result.pointsEarned;
        // Atualiza também o mostrador da tela de espera para a próxima rodada
        document.getElementById('currentScore').textContent = totalScore;
        // ---------------------------------------------------------

    } else {
        title.textContent = "Incorreto 😔";
        title.style.color = "#e53e3e";
        msg.textContent = result.message || "Não foi dessa vez.";
        pts.textContent = "0 pontos";
    }

    if (timeDisplay) timeDisplay.textContent = `Tempo: ${result.timeTaken || '-'}s`;

    showScreen(resultScreen);
}

function showEndScreen() {
    document.getElementById('finalScore').textContent = totalScore;
    document.getElementById('finalTeam').textContent = teamName || 'Seu Time';

    showScreen(endScreen);
}

function showScreen(screen) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    screen.classList.add('active');
}