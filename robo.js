// robo.js
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const { Client, LocalAuth } = require('whatsapp-web.js');

const AUTH_DIR = '/data/.wwebjs_auth';
if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
}

class WhatsAppBot {
    constructor() {
        this.clientStatus = 'initializing';
        this.qrCodeData = null;
        this.sessions = {};
        this.suporteNumeros = ['553190843766@c.us', '553171453481@c.us'];

        this.client = new Client({
            authStrategy: new LocalAuth({ dataPath: AUTH_DIR }),
            puppeteer: {
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            }
        });

        this.setupEvents();
    }

    setupEvents() {
        this.client.on('qr', (qr) => {
            console.log('QR Code recebido, escaneie-o com seu telefone:');
            this.qrCodeData = qr;
            this.clientStatus = 'qr-received';
            qrcode.generate(qr, { small: true });
            fs.writeFileSync(path.join(__dirname, 'last_qr.txt'), qr);
        });

        this.client.on('authenticated', () => {
            console.log('✅ Autenticado com sucesso!');
            this.clientStatus = 'authenticated';
            this.qrCodeData = null;
        });

        this.client.on('ready', () => {
            console.log('✅ Cliente WhatsApp está pronto!');
            this.clientStatus = 'ready';
        });

        this.client.on('disconnected', (reason) => {
            console.log('❌ Cliente desconectado:', reason);
            this.clientStatus = 'disconnected';
            setTimeout(() => {
                this.initialize();
            }, 5000);
        });

        this.client.on('message', async (msg) => {
            const chat = await msg.getChat();
            if (chat.isGroup || msg.from.includes('-') || msg.author) return;

            const contact = await msg.getContact();
            const name = contact.pushname || "cliente";
            const texto = msg.body.trim();

            if (this.sessions[msg.from] === "pausado" && texto !== "5") return;

            if (texto === "5") {
                this.sessions[msg.from] = "menu";
                await this._type(chat);
                return this._sendMenu(msg);
            }

            if (texto === "6") {
                this.sessions[msg.from] = "encerrado";
                return msg.reply(
                    `Agradecemos o seu contato!\nSe precisar de algo mais, estaremos sempre à disposição. 💧\n\n` +
                    `🔁 Digite *5* para voltar ao menu principal.`
                );
            }

            if (!this.sessions[msg.from] || this.sessions[msg.from] === "encerrado") {
                await this._type(chat);
                await this._sendWelcome(msg, name);
                return;
            }

            if (this.sessions[msg.from] === "calibracao") {
                if (texto === "1") {
                    this.sessions[msg.from] = "poço";
                    return msg.reply(
                        "📍 *Calibração - Poço*\n1 - Aferir dados de nível do Poço\n\n" +
                        "🧭 Digite *1* para voltar ao menu de calibração.\n" +
                        "🔁 Digite *5* para voltar ao menu principal.\n" +
                        "🔚 Digite *6* para encerrar o atendimento."
                    );
                }
                if (texto === "2") {
                    this.sessions[msg.from] = "rio";
                    return msg.reply(
                        "🌊 *Calibração - Rio*\n2 - Dados do barramento Offset\n\n" +
                        "🌊 Digite *2* para voltar ao menu de calibração.\n" +
                        "🔁 Digite *5* para voltar ao menu principal.\n" +
                        "🔚 Digite *6* para encerrar o atendimento."
                    );
                }
            }

            if ((texto === "1" && this.sessions[msg.from] === "poço") || (texto === "2" && this.sessions[msg.from] === "rio")) {
                this.sessions[msg.from] = "calibracao";
                return msg.reply(
                    `Selecione o tipo de ponto para calibração:\n\n` +
                    `1 - Poço\n` +
                    `2 - Rio\n\n` +
                    `🔁 Digite *5* para voltar ao menu principal.\n` +
                    `🔚 Digite *6* para encerrar o atendimento.`
                );
            }

            if (this.sessions[msg.from] === "sistema") {
                this.sessions[msg.from] = "menu";
                return msg.reply(
                    `Você escolheu: ${texto}\n\n` +
                    `🔁 Digite *5* para voltar ao menu principal.\n` +
                    `🔚 Digite *6* para encerrar o atendimento.`
                );
            }

            switch (texto) {
                case "1":
                    this.sessions[msg.from] = "menu";
                    return msg.reply(
                        `Para ajudar na identificação do problema com seu equipamento, pedimos que siga os seguintes passos:\n\n` +
                        `1. Verifique se o LED do equipamento está aceso.\n` +
                        `2. Inspecione o cabo da antena satélite e veja se há sinais de rompimento ou obstrução da visada.\n` +
                        `3. Verifique se a tomada está energizada.\n` +
                        `4. Acione um eletricista se for preciso.\n\n` +
                        `Estamos aqui para te apoiar com os próximos passos. ✅\n\n` +
                        `🔁 Digite *5* para voltar ao menu principal.\n` +
                        `🔚 Digite *6* para encerrar o atendimento.`
                    );

                case "2":
                    this.sessions[msg.from] = "sistema";
                    return msg.reply(
                        `Escolha o tópico de sua dúvida:\n\n` +
                        `1 - Cadastro de Usuários\n` +
                        `2 - Preenchimento de Outorga\n` +
                        `3 - Vínculo de Responsável Técnico\n\n` +
                        `🔁 Digite *5* para voltar ao menu principal.\n` +
                        `🔚 Digite *6* para encerrar o atendimento.`
                    );

                case "3":
                    this.sessions[msg.from] = "calibracao";
                    return msg.reply(
                        `Selecione o tipo de ponto para calibração:\n\n` +
                        `1 - Poço\n` +
                        `2 - Rio\n\n` +
                        `🔁 Digite *5* para voltar ao menu principal.\n` +
                        `🔚 Digite *6* para encerrar o atendimento.`
                    );

                case "4":
                    this.sessions[msg.from] = "pausado";
                    const retorno = new Date(Date.now() + 30 * 60 * 1000);
                    const hora = retorno.toLocaleTimeString("pt-BR", {
                        hour: "2-digit", minute: "2-digit"
                    });

                    await msg.reply(
                        `Tudo bem! ✅ Já recebemos sua mensagem.\n\n` +
                        `Aguarde alguns minutos, nossa equipe irá entrar em contato com você.\n\n` +
                        `🕒 *O atendimento automático será reativado às ${hora}.*\n\n` +
                        `🔁 Digite *5* para voltar ao menu principal.\n` +
                        `🔚 Digite *6* para encerrar o atendimento.`
                    );

                    for (const numero of this.suporteNumeros) {
                        await this.client.sendMessage(numero,
                            `🚨 *Alerta de atendimento personalizado:*\n\nO cliente *${name}* escolheu 'Outros assuntos'.\nNúmero: wa.me/${msg.from.split('@')[0]}`
                        );
                    }

                    setTimeout(() => {
                        if (this.sessions[msg.from] === "pausado") {
                            this.sessions[msg.from] = "menu";
                            console.log(`⏰ Sessão do cliente ${name} liberada após 30 minutos.`);
                        }
                    }, 30 * 60 * 1000);
                    return;

                default:
                    return this._sendMenu(msg);
            }
        });
    }

    async _sendMenu(msg) {
        return this.client.sendMessage(msg.from,
            `Por favor, escolha uma das opções abaixo digitando o número correspondente:\n\n` +
            `1️⃣ - Problema no Equipamento (Ausência de relatório)\n` +
            `2️⃣ - Dúvidas sobre o Sistema\n` +
            `3️⃣ - Calibrações\n` +
            `4️⃣ - Outros assuntos\n\n` +
            `⏩ Digite *5* a qualquer momento para voltar ao menu principal.`
        );
    }

    async _sendWelcome(msg, name) {
        this.sessions[msg.from] = "menu";
        await this.client.sendMessage(msg.from,
            `Olá, ${name.split(" ")[0]}! 👋\n\n` +
            `Bem-vindo(a) ao *Suporte da Hidrocontrol*. Estamos aqui para te ajudar! 💧`
        );
        await new Promise(r => setTimeout(r, 1500));
        await this._sendMenu(msg);
    }

    async _type(chat) {
        await chat.sendStateTyping();
        await new Promise(r => setTimeout(r, 1000));
    }

    initialize() {
        console.log("Inicializando cliente WhatsApp...");
        this.client.initialize();
    }

    getStatus() {
        return {
            status: this.clientStatus,
            hasQR: this.qrCodeData !== null
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
