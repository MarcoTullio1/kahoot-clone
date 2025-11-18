# Guia de Solução de Problemas

## Problemas Comuns e Soluções

### 1. Erro de Conexão com MySQL

#### Sintoma
\`\`\`
Error: connect ECONNREFUSED 127.0.0.1:3306
\`\`\`

#### Soluções

**A. Verificar se MySQL está rodando**
\`\`\`bash
# Linux/Mac
sudo systemctl status mysql
# ou
sudo service mysql status

# Iniciar MySQL
sudo systemctl start mysql
\`\`\`

**B. Verificar credenciais no .env**
\`\`\`env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=sua_senha_correta
DB_NAME=kahoot_system
DB_PORT=3306
\`\`\`

**C. Testar conexão manualmente**
\`\`\`bash
mysql -u root -p -h localhost
\`\`\`

### 2. Erro de Autenticação MySQL

#### Sintoma
\`\`\`
ER_NOT_SUPPORTED_AUTH_MODE: Client does not support authentication protocol
\`\`\`

#### Solução
\`\`\`sql
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'sua_senha';
FLUSH PRIVILEGES;
\`\`\`

### 3. Porta 3000 já em uso

#### Sintoma
\`\`\`
Error: listen EADDRINUSE: address already in use :::3000
\`\`\`

#### Soluções

**A. Encontrar processo usando a porta**
\`\`\`bash
# Linux/Mac
lsof -i :3000

# Windows
netstat -ano | findstr :3000
\`\`\`

**B. Matar o processo**
\`\`\`bash
# Linux/Mac
kill -9 PID

# Windows
taskkill /PID PID /F
\`\`\`

**C. Usar porta diferente**
\`\`\`env
PORT=3001
\`\`\`

### 4. WebSocket não conecta

#### Sintoma
- Participantes não conseguem se conectar
- Telão não atualiza em tempo real

#### Soluções

**A. Verificar firewall**
\`\`\`bash
# Linux - permitir porta 3000
sudo ufw allow 3000
\`\`\`

**B. Verificar configuração NGINX**
\`\`\`nginx
location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
\`\`\`

**C. Verificar CORS**
No `server.js`:
\`\`\`javascript
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
\`\`\`

### 5. QR Code não funciona

#### Sintoma
- QR Code gerado mas link não abre
- Participantes não conseguem acessar

#### Soluções

**A. Verificar BASE_URL**
\`\`\`env
# Desenvolvimento
BASE_URL=http://localhost:3000

# Produção
BASE_URL=http://seu-ip-publico:3000
# ou
BASE_URL=https://seu-dominio.com
\`\`\`

**B. Testar URL manualmente**
\`\`\`
http://seu-servidor/participant.html?code=CODIGO_ACESSO
\`\`\`

**C. Verificar código de acesso**
\`\`\`sql
SELECT access_code FROM teams WHERE id = ?;
\`\`\`

### 6. Erro ao criar tabelas

#### Sintoma
\`\`\`
Error: Table 'games' already exists
\`\`\`

#### Solução

**A. Dropar e recriar**
\`\`\`sql
DROP DATABASE kahoot_system;
CREATE DATABASE kahoot_system;
\`\`\`

**B. Executar script novamente**
\`\`\`bash
mysql -u root -p kahoot_system < scripts/database-schema.sql
\`\`\`

### 7. PM2 não inicia aplicação

#### Sintoma
\`\`\`
PM2: Process exited with code 1
\`\`\`

#### Soluções

**A. Ver logs**
\`\`\`bash
pm2 logs kahoot-system --lines 50
\`\`\`

**B. Verificar dependências**
\`\`\`bash
cd /caminho/para/app
npm install
\`\`\`

**C. Verificar permissões**
\`\`\`bash
sudo chown -R $USER:$USER .
\`\`\`

**D. Reiniciar PM2**
\`\`\`bash
pm2 kill
pm2 start server.js --name kahoot-system
\`\`\`

### 8. Ranking não atualiza

#### Sintoma
- Pontuação dos times não muda
- Ranking mostra valores antigos

#### Soluções

**A. Forçar recálculo**
\`\`\`javascript
// No socket handler ou API
const Team = require('./models/Team');
await Team.calculateTotalScore(teamId);
\`\`\`

**B. Verificar consulta SQL**
\`\`\`sql
-- Recalcular manualmente
UPDATE teams t 
SET total_score = (
    SELECT COALESCE(SUM(p.total_score), 0) 
    FROM participants p 
    WHERE p.team_id = t.id
) 
WHERE t.game_id = ?;
\`\`\`

### 9. Erros de CORS

#### Sintoma
\`\`\`
Access to XMLHttpRequest has been blocked by CORS policy
\`\`\`

#### Solução

No `server.js`:
\`\`\`javascript
const cors = require('cors');

app.use(cors({
  origin: '*',
  credentials: true
}));
\`\`\`

### 10. AWS EC2 - Aplicação para após reboot

#### Sintoma
- Servidor EC2 reinicia
- Aplicação não inicia automaticamente

#### Solução

**Configurar PM2 para iniciar no boot**
\`\`\`bash
pm2 startup
# Copiar e executar o comando que aparece

pm2 save
\`\`\`

## Logs e Debugging

### Visualizar logs da aplicação

\`\`\`bash
# PM2
pm2 logs kahoot-system

# Com tail
tail -f ~/.pm2/logs/kahoot-system-out.log
tail -f ~/.pm2/logs/kahoot-system-error.log
\`\`\`

### Adicionar logs de debug

No código:
\`\`\`javascript
console.log('[v0] Estado atual:', estado);
console.log('[v0] Dados recebidos:', dados);
\`\`\`

### Monitorar recursos

\`\`\`bash
# CPU e memória
pm2 monit

# Processos
htop

# Conexões de rede
netstat -an | grep :3000
\`\`\`

## Contato para Suporte

Se o problema persistir:

1. Verifique os logs completos
2. Anote a mensagem de erro exata
3. Documente os passos para reproduzir
4. Verifique se todas as dependências estão instaladas
5. Teste em ambiente limpo (nova instalação)

## Checklist de Diagnóstico

Antes de pedir ajuda, verifique:

- [ ] MySQL está rodando
- [ ] Credenciais do banco estão corretas
- [ ] Tabelas foram criadas corretamente
- [ ] Porta 3000 está disponível
- [ ] Dependências do npm instaladas
- [ ] Arquivo .env configurado
- [ ] Firewall permite conexões
- [ ] Logs não mostram erros críticos
- [ ] Versão do Node.js é 18+
- [ ] Versão do MySQL é 8.0+
