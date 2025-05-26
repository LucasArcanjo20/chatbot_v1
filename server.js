const QRCode = require('qrcode');
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

// Página principal
const getIndexHtml = () => `<!DOCTYPE html>
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
        .ready { background-color: #d4edda; color: #155724; }
        .initializing, .qr-received { background-color: #fff3cd; color: #856404; }
        .error, .disconnected { background-color: #f8d7da; color: #721c24; }
        .authenticated { background-color: #cce5ff; color: #004085; }
        h1 { color: #333; }
        .refresh {
            background-color: #007bff;
            color: white;
            border: none;
            padding: 10px 15px;
            border-radius: 5px;
            cursor: pointer;
        }
        .refresh:hover { background-color: #0069d9; }
    </style>
</head>
<body>
    <h1>WhatsApp Bot Status</h1>
    <div class="status" id="statusDiv">Carregando status...</div>
    <p>Última atualização: <span id="lastUpdate"></span></p>
    <button class="refresh" onclick="location.reload()">Atualizar</button>

    <h2>Informações</h2>
    <ul>
        <li>Porta: ${PORT}</li>
        <li>Ambiente: ${process.env.NODE_ENV || 'development'}</li>
        <li>Versão Node: ${process.version}</li>
    </ul>

    <script>
        document.getElementById('lastUpdate').textContent = new Date().toLocaleString();
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
</html>`;

// Rotas
app.get('/', (req, res) => res.send(getIndexHtml()));

app.get('/status', (req, res) => res.json(bot.getStatus()));

app.get('/qr', async (req, res) => {
    const qrCodeData = bot.getQRCode();
    if (qrCodeData) {
        try {
            const qrImageDataUrl = await QRCode.toDataURL(qrCodeData);
            res.send(`
                <html>
                    <head>
                        <title>WhatsApp QR Code</title>
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    </head>
                    <body style="display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f4f4f4; font-family: sans-serif;">
                        <div style="text-align: center;">
                            <h1>Escaneie o QR Code</h1>
                            <img src="${qrImageDataUrl}" alt="QR Code" />
                            <p>Abra o WhatsApp no seu celular e escaneie este código para conectar o bot</p>
                        </div>
                    </body>
                </html>
            `);
        } catch (error) {
            res.status(500).send("Erro ao gerar QR Code.");
        }
    } else {
        res.status(404).send("QR Code não disponível no momento.");
    }
});

app.post('/restart', (req, res) => {
    const result = bot.restart();
    if (result.success) {
        res.json({ success: true, message: 'Cliente reiniciado' });
    } else {
        res.status(500).json({ success: false, error: result.error });
    }
});

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// 404 e erros
app.use((req, res) => {
    console.log(`Rota não encontrada: ${req.originalUrl}`);
    res.status(404).send('<h1>404 - Página não encontrada</h1><p><a href="/">Voltar</a></p>');
});

app.use((err, req, res, next) => {
    console.error('Erro no servidor:', err);
    res.status(500).send('<h1>Erro no servidor</h1><p>Ocorreu um erro interno.</p>');
});

// Iniciar servidor
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});

// Tratamento de falhas
process.on('uncaughtException', (err) => console.error('Erro não capturado:', err));
process.on('unhandledRejection', (reason) => console.error('Promessa rejeitada não tratada:', reason));
process.on('SIGTERM', () => {
    console.log('SIGTERM recebido. Encerrando servidor...');
    server.close(() => process.exit(0));
});
