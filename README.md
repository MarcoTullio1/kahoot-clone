# Kahoot Clone - Sistema de Quiz Interativo 🎮

Sistema de quiz em tempo real desenvolvido com Node.js, Socket.IO e MySQL.  
Permite criar jogos, gerenciar times via QR Code, exibir um telão para os participantes, acompanhar ranking ao vivo e calcular pontuação baseada na velocidade das respostas.

---

## 📋 Pré-requisitos

Antes de começar, instale:

- **Node.js** (versão 18+)
- **Git**
- **MySQL** — escolha uma opção:
  - **Opção A (Recomendada)**: Docker Desktop
  - **Opção B**: MySQL Server local / XAMPP

---

## 🚀 Instalação e Configuração

### 1️⃣ Clonar o Projeto e Instalar Dependências

```bash
git clone https://github.com/MarcoTullio1/kahoot-clone.git
cd kahoot-clone
npm install --legacy-peer-deps
```

### 2️⃣ Configurar o Banco de Dados

Escolha uma opção:

#### ✔ Opção A — Docker (mais simples e limpo)

```bash
docker run --name kahoot-mysql -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=kahoot_system -p 3306:3306 -d mysql:8
```

Aguarde cerca de 15 segundos…

```bash
Get-Content .\scripts\database-schema.sql | docker exec -i kahoot-mysql mysql -u root -proot kahoot_system
```

```bash
docker exec -i kahoot-mysql mysql -u root -proot kahoot_system -e "
CREATE TABLE IF NOT EXISTS participant_answers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  participant_id INT NOT NULL,
  question_id INT NOT NULL,
  answer_id INT NOT NULL,
  time_taken INT,
  points_earned INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (participant_id) REFERENCES participants(id),
  FOREIGN KEY (question_id) REFERENCES questions(id),
  FOREIGN KEY (answer_id) REFERENCES answers(id)
);"
```

#### ✔ Opção B — MySQL local / XAMPP

1. Crie o banco:

   ```sql
   kahoot_system
   ```

2. Importe:

   ```
   scripts/database-schema.sql
   ```

3. Execute também:

   ```sql
   CREATE TABLE IF NOT EXISTS participant_answers (
     id INT AUTO_INCREMENT PRIMARY KEY,
     participant_id INT NOT NULL,
     question_id INT NOT NULL,
     answer_id INT NOT NULL,
     time_taken INT,
     points_earned INT,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     FOREIGN KEY (participant_id) REFERENCES participants(id),
     FOREIGN KEY (question_id) REFERENCES questions(id),
     FOREIGN KEY (answer_id) REFERENCES answers(id)
   );
   ```

### 3️⃣ Variáveis de Ambiente (.env)

Crie o arquivo `.env` na raiz:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=root
DB_NAME=kahoot_system
PORT=3000
```

⚠️ **Nunca suba credenciais reais para o GitHub.**

---

## ▶ Como Jogar

### 👨‍💼 Admin

**URL**: `http://localhost:3000/admin.html`

- Criar novo jogo
- Criar times (QR Code gerado automaticamente)
- Criar perguntas
- Abrir a tela do jogador

### 🖥 Telão (Projetor)

**URL**: `http://localhost:3000/display.html`

- Exibe ranking
- Mostra perguntas em tempo real
- Atualiza pontuação automaticamente

### 📱 Participantes (celular)

- Escanear QR Code
- Acessar link gerado automaticamente
- Responder com rapidez ⚡ para ganhar mais pontos

---

# Guia de Deploy na AWS Free Tier ☁️

Este guia cobre a hospedagem completa do sistema Kahoot Clone usando serviços gratuitos da AWS (EC2 e RDS).

## 1. Banco de Dados (AWS RDS)

1. Acesse o **AWS Console** e vá para o serviço **RDS**.
2. Clique em **Create database**.
3. Escolha **Standard create** > **MySQL**.
4. Em **Templates**, selecione **Free tier**.
5. **Settings**:
    - **DB Instance Identifier**: `kahoot-db`
    - **Username**: `admin`
    - **Password**: Crie uma senha forte
6. **Connectivity**:
    - **Public access**: Selecione **Yes** (Para facilitar a conexão inicial).
    - **VPC Security Group**: Create new (Nome: `kahoot-db-sg`).
7. Clique em **Create database**.
8. Após criar, clique no banco e copie o **Endpoint** (ex: `kahoot-db.xyz.us-east-1.rds.amazonaws.com`).

### Configurar Tabelas

Do seu computador, conecte ao banco remoto e crie as tabelas:

```bash
mysql -h SEU_ENDPOINT_RDS -u admin -p < scripts/database-schema.sql
