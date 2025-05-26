const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

// Criar pasta para autenticação se não existir
const AUTH_DIR = '/data/.wwebjs_auth';
if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
}

class WhatsAppBot {
    constructor() {
        // Variáveis para armazenar o status do cliente
        this.clientStatus = 'initializing';
        this.qrCodeData = null;
        
        // Configurar o cliente WhatsApp com autenticação local
        this.client = new Client({
            authStrategy: new LocalAuth({
                dataPath: AUTH_DIR
            }),
            puppeteer: {
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--single-process',
                    '--disable-gpu'
                ]
            }
        });
        
        // Configurar eventos
        this.setupEvents();
    }
    
    setupEvents() {
        // Evento quando o QR code é recebido
        this.client.on('qr', (qr) => {
            console.log('QR Code recebido, escaneie-o com seu telefone:');
            this.qrCodeData = qr;
            this.clientStatus = 'qr-received';
            qrcode.generate(qr, {small: true});
            
            // Salvar QR code em um arquivo para acesso posterior
            fs.writeFileSync(path.join(__dirname, 'last_qr.txt'), qr);
        });
        
        // Evento quando o cliente está autenticando
        this.client.on('authenticated', () => {
            console.log('Autenticado com sucesso!');
            this.clientStatus = 'authenticated';
            this.qrCodeData = null;
        });
        
        // Evento quando o cliente está pronto
        this.client.on('ready', () => {
            console.log('Cliente WhatsApp está pronto!');
            this.clientStatus = 'ready';
        });
        
        // Evento para lidar com desconexão
        this.client.on('disconnected', (reason) => {
            console.log('Cliente desconectado:', reason);
            this.clientStatus = 'disconnected';
            // Reiniciar cliente após desconexão
            setTimeout(() => {
                this.initialize();
            }, 5000);
        });
        
        // Evento para lidar com mensagens recebidas
        this.client.on('message', async (msg) => {
            console.log('Mensagem recebida:', msg.body);
            
            // Processar comandos
            this.processCommand(msg);
        });
    }
    
    processCommand(msg) {
        // Comando ping
        if (msg.body === '!ping') {
            msg.reply('pong');
        }
        
        // Comando de ajuda
        if (msg.body === '!ajuda' || msg.body === '!help') {
            msg.reply(`
*Comandos disponíveis:*
!ping - Testar se o bot está online
!ajuda - Mostrar esta mensagem de ajuda
!info - Mostrar informações sobre o bot
!hora - Mostrar a hora atual
            `);
        }
        
        // Comando de informações
        if (msg.body === '!info') {
            msg.reply(`
*Informações do Bot*
Status: ${this.clientStatus}
Uptime: ${Math.floor(process.uptime())} segundos
Memória: ${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB
            `);
        }
        
        // Comando de hora
        if (msg.body === '!hora') {
            const agora = new Date();
            msg.reply(`A hora atual é: ${agora.toLocaleTimeString('pt-BR')}`);
        }
        
        // Você pode adicionar mais comandos aqui
    }
    
    initialize() {
        try {
            console.log('Inicializando cliente WhatsApp...');
            this.client.initialize();
        } catch (error) {
            console.error('Erro ao inicializar cliente:', error);
            this.clientStatus = 'error';
        }
    }
    
    getStatus() {
        return {
            status: this.clientStatus,
            hasQR: this.qrCodeData !== null,
            uptime: Math.floor(process.uptime()),
            memory: Math.round(process.memoryUsage().rss / 1024 / 1024)
        };
    }
    
    getQRCode() {
        return this.qrCodeData;
    }
    
    restart() {
        try {
            this.client.initialize();
            return { success: true, message: 'Cliente reiniciado' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

module.exports = WhatsAppBot;