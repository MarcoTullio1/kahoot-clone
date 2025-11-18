# Sistema Quiz Interativo - Estilo Kahoot

Sistema completo de quiz em tempo real com interface para administrador, participantes via QR Code e telão para projeção. Desenvolvido com Node.js, Express, MySQL e Socket.IO.

## Características Principais

- **Painel Administrativo**: Criação e gerenciamento completo de jogos, times, perguntas e respostas
- **QR Code Automático**: Cada time recebe um QR Code único para acesso dos participantes
- **Tempo Real**: Comunicação instantânea via WebSockets (Socket.IO)
- **Sistema de Pontuação**: Pontos baseados em acerto + bônus por velocidade de resposta
- **Telão/Projeção**: Interface otimizada para telas grandes com animações e ranking ao vivo
- **Interface Mobile**: Design responsivo para participantes acessarem via celular

## Tecnologias Utilizadas

### Backend
- **Node.js** v18+ com Express
- **MySQL** 8.0+ para banco de dados
- **Socket.IO** para comunicação em tempo real
- **QRCode** para geração automática de códigos
- **dotenv** para gerenciamento de variáveis de ambiente

### Frontend
- **HTML5, CSS3, JavaScript** puro (sem frameworks)
- **Socket.IO Client** para WebSockets
- **Design Responsivo** com CSS Grid e Flexbox

## Estrutura do Projeto

\`\`\`
kahoot-system/
├── config/
│   └── database.js          # Configuração do pool de conexões MySQL
├── models/
│   ├── Game.js              # Model para jogos
│   ├── Team.js              # Model para times
│   ├── Question.js          # Model para perguntas
│   ├── Answer.js            # Model para respostas
│   └── Participant.js       # Model para participantes
├── routes/
│   ├── admin.js             # Rotas da API administrativa
│   └── participant.js       # Rotas da API dos participantes
├── socket/
│   └── handler.js           # Gerenciamento de eventos WebSocket
├── public/
│   ├── css/
│   │   ├── admin.css
│   │   ├── participant.css
│   │   └── display.css
│   ├── js/
│   │   ├── admin.js
│   │   ├── participant.js
│   │   └── display.js
│   ├── index.html
│   ├── admin.html
│   ├── participant.html
│   └── display.html
├── scripts/
│   ├── database-schema.sql  # Schema do banco de dados
│   └── sample-data.sql      # Dados de exemplo
├── .env.example             # Exemplo de variáveis de ambiente
├── package.json
├── server.js                # Arquivo principal do servidor
└── README.md
\`\`\`

## Instalação Local

### Pré-requisitos

- Node.js 18 ou superior
- MySQL 8.0 ou superior
- npm ou yarn

### Passo 1: Clonar o Repositório

\`\`\`bash
git clone <url-do-repositorio>
cd kahoot-system
\`\`\`

### Passo 2: Instalar Dependências

\`\`\`bash
npm install
\`\`\`

### Passo 3: Configurar o Banco de Dados

1. Crie um banco de dados MySQL:

\`\`\`bash
mysql -u root -p
\`\`\`

\`\`\`sql
CREATE DATABASE kahoot_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
\`\`\`

2. Execute o script de criação das tabelas:

\`\`\`bash
mysql -u root -p kahoot_system < scripts/database-schema.sql
\`\`\`

3. (Opcional) Execute o script de dados de exemplo:

\`\`\`bash
mysql -u root -p kahoot_system < scripts/sample-data.sql
\`\`\`

### Passo 4: Configurar Variáveis de Ambiente

1. Copie o arquivo de exemplo:

\`\`\`bash
cp .env.example .env
\`\`\`

2. Edite o arquivo `.env` com suas configurações:

\`\`\`env
# Configurações do Banco de Dados
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=sua_senha_aqui
DB_NAME=kahoot_system
DB_PORT=3306

# Configurações do Servidor
PORT=3000
NODE_ENV=development

# URL base para QR codes
BASE_URL=http://localhost:3000
\`\`\`

### Passo 5: Iniciar o Servidor

\`\`\`bash
# Modo produção
npm start

# Modo desenvolvimento (com nodemon)
npm run dev
\`\`\`

O servidor estará rodando em `http://localhost:3000`

### Passo 6: Acessar as Interfaces

- **Página Inicial**: http://localhost:3000
- **Painel Admin**: http://localhost:3000/admin.html
- **Telão**: http://localhost:3000/display.html
- **Participante**: http://localhost:3000/participant.html?code=CODIGO_ACESSO

## Como Usar o Sistema

### 1. Criar um Jogo (Admin)

1. Acesse o painel administrativo
2. Clique em "Novo Jogo"
3. Digite o nome do jogo
4. O jogo será criado com status "Aguardando"

### 2. Adicionar Times

1. Selecione o jogo criado
2. Vá para a aba "Times"
3. Clique em "Adicionar Time"
4. Digite o nome do time
5. O sistema gerará automaticamente:
   - Código de acesso único
   - QR Code para participantes

### 3. Criar Perguntas

1. Na aba "Perguntas", clique em "Adicionar Pergunta"
2. Preencha:
   - Texto da pergunta
   - Tempo limite (em segundos)
   - Pontos base
   - 4 opções de resposta
   - Marque a resposta correta
3. As perguntas serão exibidas na ordem de criação

### 4. Preparar o Telão

1. Abra `display.html` em um computador conectado ao projetor
2. Selecione o jogo que será projetado
3. A tela mostrará "Aguardando início do jogo"

### 5. Participantes Entram

1. Escaneie o QR Code do seu time OU
2. Acesse o link com o código de acesso
3. Digite seu nome/apelido
4. Aguarde o início do jogo

### 6. Iniciar o Jogo

1. No painel admin, vá para "Controle do Jogo"
2. Clique em "Iniciar Jogo"
3. A primeira pergunta será exibida automaticamente

### 7. Durante o Jogo

- **Participantes**: Respondem as perguntas no celular
- **Telão**: Mostra a pergunta e timer
- **Admin**: Controla o fluxo do jogo

**Controles disponíveis:**
- "Próxima Pergunta": Avança para a próxima questão
- "Mostrar Ranking": Exibe ranking parcial
- "Finalizar Jogo": Encerra o jogo e mostra ranking final

### 8. Pontuação

A pontuação é calculada da seguinte forma:

\`\`\`
Pontos = Pontos Base + Bônus de Velocidade

Bônus de Velocidade = (1 - tempo_gasto/tempo_limite) × (Pontos Base × 0.5)
\`\`\`

**Exemplo:**
- Pergunta com 100 pontos base e 30 segundos de limite
- Participante responde corretamente em 10 segundos
- Pontos = 100 + (1 - 10/30) × 50 = 100 + 33 = 133 pontos

## Deploy na AWS (Free Tier)

### Opção 1: AWS EC2 (Recomendado)

#### Passo 1: Criar Instância EC2

1. Acesse o AWS Console
2. Vá para EC2 > Launch Instance
3. Selecione:
   - **AMI**: Ubuntu Server 22.04 LTS (Free tier eligible)
   - **Instance Type**: t2.micro (Free tier eligible)
   - **Storage**: 8GB (suficiente para a aplicação)

4. Configure Security Group:
   - SSH (22) - Seu IP
   - HTTP (80) - 0.0.0.0/0
   - HTTPS (443) - 0.0.0.0/0
   - Custom TCP (3000) - 0.0.0.0/0

5. Crie ou selecione um Key Pair para acesso SSH

#### Passo 2: Configurar RDS MySQL (Free Tier)

1. Vá para RDS > Create database
2. Selecione:
   - **Engine**: MySQL 8.0
   - **Template**: Free tier
   - **DB Instance**: db.t3.micro
   - **Storage**: 20GB
   - **Public Access**: Yes (para desenvolvimento)

3. Anote:
   - Endpoint
   - Username
   - Password
   - Database name

#### Passo 3: Conectar à Instância EC2

\`\`\`bash
chmod 400 sua-chave.pem
ssh -i sua-chave.pem ubuntu@SEU-IP-PUBLICO
\`\`\`

#### Passo 4: Instalar Dependências no EC2

\`\`\`bash
# Atualizar sistema
sudo apt update
sudo apt upgrade -y

# Instalar Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar PM2 (gerenciador de processos)
sudo npm install -g pm2

# Instalar MySQL Client (para executar scripts)
sudo apt install -y mysql-client

# Instalar Git
sudo apt install -y git
\`\`\`

#### Passo 5: Clonar e Configurar Aplicação

\`\`\`bash
# Clonar repositório
cd /home/ubuntu
git clone <url-do-repositorio>
cd kahoot-system

# Instalar dependências
npm install

# Criar arquivo .env
nano .env
\`\`\`

Configure o `.env` com dados do RDS:

\`\`\`env
DB_HOST=seu-rds-endpoint.rds.amazonaws.com
DB_USER=admin
DB_PASSWORD=sua_senha
DB_NAME=kahoot_system
DB_PORT=3306

PORT=3000
NODE_ENV=production

BASE_URL=http://SEU-IP-PUBLICO:3000
\`\`\`

#### Passo 6: Configurar Banco de Dados

\`\`\`bash
# Conectar ao RDS e criar database
mysql -h seu-rds-endpoint.rds.amazonaws.com -u admin -p

# No prompt MySQL:
CREATE DATABASE kahoot_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
exit;

# Executar scripts
mysql -h seu-rds-endpoint.rds.amazonaws.com -u admin -p kahoot_system < scripts/database-schema.sql
mysql -h seu-rds-endpoint.rds.amazonaws.com -u admin -p kahoot_system < scripts/sample-data.sql
\`\`\`

#### Passo 7: Iniciar Aplicação com PM2

\`\`\`bash
# Iniciar aplicação
pm2 start server.js --name kahoot-system

# Configurar PM2 para iniciar no boot
pm2 startup
pm2 save

# Ver logs
pm2 logs kahoot-system

# Ver status
pm2 status
\`\`\`

#### Passo 8: Configurar NGINX (Opcional - Recomendado)

\`\`\`bash
# Instalar NGINX
sudo apt install -y nginx

# Criar configuração
sudo nano /etc/nginx/sites-available/kahoot-system
\`\`\`

Adicione:

\`\`\`nginx
server {
    listen 80;
    server_name SEU-IP-PUBLICO ou seu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
\`\`\`

\`\`\`bash
# Habilitar site
sudo ln -s /etc/nginx/sites-available/kahoot-system /etc/nginx/sites-enabled/

# Testar configuração
sudo nginx -t

# Reiniciar NGINX
sudo systemctl restart nginx
\`\`\`

Agora acesse: `http://SEU-IP-PUBLICO`

#### Passo 9: Configurar Domínio (Opcional)

1. Compre um domínio ou use serviços gratuitos (Freenom, etc)
2. Configure DNS A Record apontando para o IP público do EC2
3. Atualize a configuração do NGINX com seu domínio
4. (Opcional) Configure SSL com Let's Encrypt:

\`\`\`bash
# Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obter certificado SSL
sudo certbot --nginx -d seu-dominio.com

# Renovação automática
sudo systemctl enable certbot.timer
\`\`\`

Agora acesse: `https://seu-dominio.com`

### Opção 2: AWS Elastic Beanstalk

#### Passo 1: Preparar Aplicação

Criar arquivo `.ebextensions/01_nodecommand.config`:

\`\`\`yaml
option_settings:
  aws:elasticbeanstalk:container:nodejs:
    NodeCommand: "npm start"
\`\`\`

#### Passo 2: Instalar EB CLI

\`\`\`bash
pip install awsebcli
\`\`\`

#### Passo 3: Inicializar e Deploy

\`\`\`bash
# Inicializar
eb init -p node.js-18 kahoot-system --region us-east-1

# Criar ambiente
eb create kahoot-production

# Deploy
eb deploy

# Ver logs
eb logs

# Abrir no navegador
eb open
\`\`\`

## Comandos Úteis

### PM2

\`\`\`bash
# Parar aplicação
pm2 stop kahoot-system

# Reiniciar aplicação
pm2 restart kahoot-system

# Deletar aplicação
pm2 delete kahoot-system

# Ver logs em tempo real
pm2 logs kahoot-system --lines 100

# Monitorar recursos
pm2 monit
\`\`\`

### MySQL

\`\`\`bash
# Conectar ao banco
mysql -u root -p kahoot_system

# Backup do banco
mysqldump -u root -p kahoot_system > backup.sql

# Restaurar banco
mysql -u root -p kahoot_system < backup.sql

# Ver tabelas
mysql -u root -p kahoot_system -e "SHOW TABLES;"
\`\`\`

## Solução de Problemas

### Erro: "ER_NOT_SUPPORTED_AUTH_MODE"

**Solução:**
\`\`\`sql
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'sua_senha';
FLUSH PRIVILEGES;
\`\`\`

### Erro: "ECONNREFUSED" ao conectar ao MySQL

**Verifique:**
1. MySQL está rodando: `sudo systemctl status mysql`
2. Credenciais corretas no `.env`
3. Firewall permite conexão na porta 3306

### WebSocket não conecta

**Verifique:**
1. Porta 3000 está aberta no Security Group (AWS)
2. NGINX está configurado para proxy WebSocket
3. Não há firewall bloqueando WebSocket

### QR Code não funciona

**Verifique:**
1. `BASE_URL` no `.env` está correto
2. URL acessível externamente
3. Participantes estão na mesma rede ou URL é pública

## Otimizações de Produção

### 1. Variáveis de Ambiente

\`\`\`env
NODE_ENV=production
\`\`\`

### 2. Compressão

Adicionar ao `server.js`:

\`\`\`javascript
const compression = require('compression');
app.use(compression());
\`\`\`

### 3. Rate Limiting

\`\`\`javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

app.use('/api/', limiter);
\`\`\`

### 4. Segurança

\`\`\`javascript
const helmet = require('helmet');
app.use(helmet());
\`\`\`

## Monitoramento

### CloudWatch (AWS)

1. Configure CloudWatch Logs para EC2
2. Monitore métricas: CPU, memória, rede
3. Configure alarmes para alta utilização

### PM2 Monitoring

\`\`\`bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
\`\`\`

## Suporte e Contribuição

Para reportar bugs ou sugerir melhorias, abra uma issue no repositório.

## Licença

MIT License
