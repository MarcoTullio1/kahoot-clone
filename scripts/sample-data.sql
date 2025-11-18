-- Dados de exemplo para testar o sistema
USE kahoot_system;

-- Inserir jogo exemplo
INSERT INTO games (name, status) VALUES ('Quiz de Conhecimentos Gerais', 'waiting');

-- Inserir times
INSERT INTO teams (game_id, name, access_code, qr_code) VALUES 
(1, 'Time Alpha', 'ALPHA2024', NULL),
(1, 'Time Beta', 'BETA2024', NULL),
(1, 'Time Gamma', 'GAMMA2024', NULL);

-- Inserir perguntas
INSERT INTO questions (game_id, question_text, time_limit, points, order_index) VALUES 
(1, 'Qual é a capital do Brasil?', 20, 100, 1),
(1, 'Quantos planetas existem no sistema solar?', 25, 100, 2),
(1, 'Quem pintou a Mona Lisa?', 30, 100, 3),
(1, 'Qual é o maior oceano do mundo?', 20, 100, 4);

-- Inserir respostas para a pergunta 1
INSERT INTO answers (question_id, answer_text, is_correct) VALUES 
(1, 'Brasília', TRUE),
(1, 'Rio de Janeiro', FALSE),
(1, 'São Paulo', FALSE),
(1, 'Salvador', FALSE);

-- Inserir respostas para a pergunta 2
INSERT INTO answers (question_id, answer_text, is_correct) VALUES 
(2, '8', TRUE),
(2, '7', FALSE),
(2, '9', FALSE),
(2, '10', FALSE);

-- Inserir respostas para a pergunta 3
INSERT INTO answers (question_id, answer_text, is_correct) VALUES 
(3, 'Leonardo da Vinci', TRUE),
(3, 'Pablo Picasso', FALSE),
(3, 'Vincent van Gogh', FALSE),
(3, 'Michelangelo', FALSE);

-- Inserir respostas para a pergunta 4
INSERT INTO answers (question_id, answer_text, is_correct) VALUES 
(4, 'Oceano Pacífico', TRUE),
(4, 'Oceano Atlântico', FALSE),
(4, 'Oceano Índico', FALSE),
(4, 'Oceano Ártico', FALSE);
