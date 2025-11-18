const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { testConnection } = require('./config/database');
const adminRoutes = require('./routes/admin');
const participantRoutes = require('./routes/participant');
const socketHandler = require('./socket/handler');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Rotas da API
app.use('/api/admin', adminRoutes);
app.use('/api/participant', participantRoutes);

// Rota principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Inicializar WebSocket handler
socketHandler(io);

// Iniciar servidor
const PORT = process.env.PORT || 3000;

async function startServer() {
  // Testar conexão com banco de dados
  const dbConnected = await testConnection();
  
  if (!dbConnected) {
    console.error('❌ Não foi possível conectar ao banco de dados. Verifique suas configurações.');
    process.exit(1);
  }
  
  server.listen(PORT, () => {
    console.log(`\n🚀 Servidor rodando em http://localhost:${PORT}`);
    console.log(`📱 Admin: http://localhost:${PORT}/admin.html`);
    console.log(`📺 Telão: http://localhost:${PORT}/display.html`);
    console.log(`👥 Participante: http://localhost:${PORT}/participant.html\n`);
  });
}

startServer();
