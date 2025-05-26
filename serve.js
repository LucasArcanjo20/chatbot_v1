const express = require('express');
const fs = require('fs');
const path = require('path');
const WhatsAppBot = require('./robo');
const app = express();

// Porta definida pelo ambiente ou padrão 8080
const PORT = process.env.PORT || 8080;

// Middleware para processar JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Inicializar o bot
const bot = new WhatsAppBot();
bot.initialize();

// Criar uma página HTML simples para a rota principal
const getIndexHtml = () => `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WhatsApp Bot</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
        }
        .status {
            padding: 10px;
            border-radius: 5px;
            margin: 20px 0;
        }
        .ready {
            background-color: #d4edda;
            color: #155724;
        }
        .initializing, .qr-received {
            background-color: #fff3cd;
            color: #856404;
        }
        .error, .disconnected {
            background-color: #f8d7da;
            color: #721c24;
        }
        .authenticated {
            background-color: #cce5ff;
            color: #004085;
        }
        h1 {
            color: #333;
        }
        .refresh {
            background-color: #007bff;
            color: white;
            border: none;
            padding: 10px 15px;
            border-radius: 5px;
            cursor: pointer;
        }
        .refresh:hover {
            background-color: #0069d9;
        }
    </style>
</head>
<body>
    <h1>WhatsApp Bot Status</h1>
    <div class="status" id="statusDiv">
        Carregando status...
    </div>
    <p>Última atualização: <span id="lastUpdate"></span></p>
    <button class="refresh" onclick="location.reload()">Atualizar</button>
    
    <h2>Informações</h2>
    <ul>
        <li>Porta: ${PORT}</li>
        <li>Ambiente: ${process.env.NODE_ENV || 'development'}</li>
        <li>Versão Node: ${process.version}</li>
    </ul>
    
    <script>
        // Atualizar a data e hora
        document.getElementById('lastUpdate').textContent = new Date().toLocaleString();
        
        // Buscar o status atual
        fetch('/status')
            .then(response => response.json())
            .then(data => {
                const statusDiv = document.getElementById('statusDiv');
                statusDiv.textContent = 'Status: ' + data.status;
                statusDiv.className = 'status ' + data.status;
                
                if (data.hasQR) {
                    statusDiv.innerHTML += '<p>QR Code disponível em <a href="/qr" target="_blank">/qr</a></p>';
                }
            })
            .catch(error => {
                document.getElementById('statusDiv').textContent = 'Erro ao buscar status: ' + error;
                document.getElementById('statusDiv').className = 'status error';
            });
    </script>
</body>
</html>
`;

// Rota principal
app.get('/', (req, res) => {
    res.send(getIndexHtml());
});

// Rota para verificar o status
app.get('/status', (req, res) => {
    res.json(bot.getStatus());
});

// Rota para obter o QR code (se disponível)
app.get('/qr', (req, res) => {
    const qrCodeData = bot.getQRCode();
    
    if (qrCodeData) {
        res.send(`
            <html>
                <head>
                    <title>WhatsApp QR Code</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;">
                    <div style="text-align: center;">
                        <h1>Escaneie o QR Code</h1>
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrCodeData)}" alt="QR Code" />
                        <p>Abra o WhatsApp no seu celular e escaneie este código para conectar o bot</p>
                    </div>
                </body>
            </html>
        `);
    } else {
        try {
            // Tentar ler o último QR code salvo
            if (fs.existsSync(path.join(__dirname, 'last_qr.txt'))) {
                const lastQr = fs.readFileSync(path.join(__dirname, 'last_qr.txt'), 'utf8');
                res.send(`
                    <html>
                        <head>
                            <title>WhatsApp QR Code (Último Salvo)</title>
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        </head>
                        <body style="display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;">
                            <div style="text-align: center;">
                                <h1>Escaneie o QR Code (Último Salvo)</h1>
                                <img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(lastQr)}" alt="QR Code" />
                                <p>Abra o WhatsApp no seu celular e escaneie este código para conectar o bot</p>
                                <p><small>Este é o último QR code salvo. Se não funcionar, reinicie o servidor.</small></p>
                            </div>
                        </body>
                    </html>
                `);
            } else {
                res.status(404).json({ error: 'QR code não disponível' });
            }
        } catch (error) {
            res.status(404).json({ error: 'QR code não disponível', details: error.message });
        }
    }
});

// Rota para reiniciar o cliente
app.post('/restart', (req, res) => {
    const result = bot.restart();
    if (result.success) {
        res.json({ success: true, message: 'Cliente reiniciado' });
    } else {
        res.status(500).json({ success: false, error: result.error });
    }
});

// Rota de verificação de saúde para plataformas de hospedagem
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// Middleware para tratar rotas não encontradas (404)
app.use((req, res) => {
    console.log(`Rota não encontrada: ${req.originalUrl}`);
    res.status(404).send(`
        <html>
            <head>
                <title>Página não encontrada</title>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        text-align: center;
                        padding: 50px;
                    }
                    h1 {
                        color: #333;
                    }
                    a {
                        color: #007bff;
                        text-decoration: none;
                    }
                    a:hover {
                        text-decoration: underline;
                    }
                </style>
            </head>
            <body>
                <h1>404 - Página não encontrada</h1>
                <p>A página que você está procurando não existe.</p>
                <p><a href="/">Voltar para a página inicial</a></p>
            </body>
        </html>
    `);
});

// Middleware para tratar erros
app.use((err, req, res, next) => {
    console.error('Erro no servidor:', err);
    res.status(500).send(`
        <html>
            <head>
                <title>Erro no servidor</title>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        text-align: center;
                        padding: 50px;
                    }
                    h1 {
                        color: #721c24;
                    }
                    .error-box {
                        background-color: #f8d7da;
                        color: #721c24;
                        padding: 20px;
                        border-radius: 5px;
                        margin: 20px 0;
                    }
                    a {
                        color: #007bff;
                        text-decoration: none;
                    }
                    a:hover {
                        text-decoration: underline;
                    }
                </style>
            </head>
            <body>
                <h1>Erro no servidor</h1>
                <div class="error-box">
                    <p>Ocorreu um erro ao processar sua solicitação.</p>
                    <p><small>${process.env.NODE_ENV === 'production' ? '' : err.message}</small></p>
                </div>
                <p><a href="/">Voltar para a página inicial</a></p>
            </body>
        </html>
    `);
});

// Iniciar o servidor Express
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});

// Tratamento de erros não capturados
process.on('uncaughtException', (err) => {
    console.error('Erro não capturado:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Promessa rejeitada não tratada:', reason);
});

// Tratamento de encerramento gracioso
process.on('SIGTERM', () => {
    console.log('SIGTERM recebido. Encerrando servidor...');
    server.close(() => {
        console.log('Servidor encerrado');
        process.exit(0);
    });
});