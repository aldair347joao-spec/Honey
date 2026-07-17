const express = require('express');
const cors = require('cors');
const path = require('path');
const https = require('https');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve o ficheiro HTML principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Chave de acesso à API da Groq
const GROQ_API_KEY = process.env.GROQ_API_KEY;

// Base de dados temporária de teste
let users = [
    { identifier: "admin@honey.com", password: "Password123", pago: true, verificado: true }
];
let codigosVerificacao = {}; 

// Validação de senha forte
function validarSenha(senha) {
    const temOitoCaracteres = senha.length >= 8;
    const temMaiuscula = /[A-Z]/.test(senha);
    const temNumero = /[0-9]/.test(senha);
    return temOitoCaracteres && temMaiuscula && temNumero;
}

// FUNÇÃO AUXILIAR PARA LIGAÇÃO À GROQ USANDO HTTPS NATIVO
function conectarMotorGroq(promptText) {
    return new Promise((resolve, reject) => {
        if (!GROQ_API_KEY) {
            return reject("Chave GROQ_API_KEY não configurada no painel do Render.");
        }

        const corpoDados = JSON.stringify({
            model: "llama3-8b-8192",
            messages: [
                { role: "system", content: "Você é a Honey IA. Gere apenas código limpo, sem introduções ou explicações." },
                { role: "user", content: promptText }
            ]
        });

        const opcoes = {
            hostname: 'api.groq.com',
            port: 443,
            path: '/openai/v1/chat/completions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_API_KEY.trim()}`,
                'Content-Length': Buffer.byteLength(corpoDados)
            }
        };

        const requisicao = https.request(opcoes, (respostaServidor) => {
            let dadosAcumulados = '';
            respostaServidor.on('data', (chunk) => { dadosAcumulados += chunk; });
            
            respostaServidor.on('end', () => {
                try {
                    const respostaJson = JSON.parse(dadosAcumulados);
                    if (respostaServidor.statusCode === 200 && respostaJson.choices && respostaJson.choices[0]) {
                        resolve(respostaJson.choices[0].message.content);
                    } else {
                        const detalheErro = respostaJson.error ? respostaJson.error.message : `Status HTTP ${respostaServidor.statusCode}`;
                        reject(`Erro na API Groq: ${detalheErro}`);
                    }
                } catch (e) {
                    reject("Falha ao interpretar a resposta da inteligência artificial.");
                }
            });
        });

        requisicao.on('error', (erroDeRede) => {
            reject(`Falha de rede física: ${erroDeRede.message}`);
        });

        requisicao.write(corpoDados);
        requisicao.end();
    });
}

// ROTA: Gerar o 1º Código (100% Grátis e sem conta)
app.post('/gerar-gratis', async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ sucesso: false, erro: "Descreva o seu projeto." });

    try {
        const codigoGerado = await conectarMotorGroq(prompt);
        res.json({ sucesso: true, codigo: codigoGerado });
    } catch (erroDoMotor) {
        console.error(erroDoMotor);
        res.status(500).json({ sucesso: false, erro: erroDoMotor });
    }
});

// ROTA: Iniciar Cadastro
app.post('/register/init', (req, res) => {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
        return res.status(400).json({ erro: "Preencha todos os campos." });
    }

    if (!validarSenha(password)) {
        return res.status(400).json({ 
            erro: "A palavra-passe deve ter pelo menos 8 caracteres, uma letra maiúscula e um número." 
        });
    }

    const existe = users.find(u => u.identifier === identifier);
    if (existe) return res.status(400).json({ erro: "Este utilizador já está registado." });

    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    codigosVerificacao[identifier] = { codigo, password };

    console.log(`\n[HONEY IA SECURITY] Código para ${identifier}: ${codigo}\n`);

    res.json({ 
        sucesso: true, 
        msg: "Código de verificação gerado!", 
        codigoSimulado: codigo 
    });
});

// ROTA: Confirmar Código OTP
app.post('/register/confirm', (req, res) => {
    const { identifier, codigoInserido } = req.body;
    const dadosProvisorios = codigosVerificacao[identifier];

    if (!dadosProvisorios) {
        return res.status(400).json({ erro: "Sessão expirada. Tente registar-se novamente." });
    }

    if (dadosProvisorios.codigo !== codigoInserido) {
        return res.status(400).json({ erro: "Código de verificação incorreto." });
    }

    users.push({
        identifier: identifier,
        password: dadosProvisorios.password,
        pago: false, 
        verificado: true
    });

    delete codigosVerificacao[identifier];
    res.json({ sucesso: true, msg: "Cadastro confirmado! Agora efetue o pagamento para libertar o acesso ilimitado." });
});

// ROTA: Login
app.post('/login', (req, res) => {
    const { identifier, password } = req.body;
    const user = users.find(u => u.identifier === identifier && u.password === password);
    
    if (!user) {
        return res.status(401).json({ erro: "Credenciais inválidas ou conta não registada." });
    }
    
    res.json({ sucesso: true, user: { identifier: user.identifier, pago: user.pago } });
});

// ROTA: Gerar Código com Honey IA (Ilimitado após cadastro e pagamento)
app.post('/gerar', async (req, res) => {
    const { identifier, prompt } = req.body;
    const user = users.find(u => u.identifier === identifier);

    if (!user) return res.status(403).json({ erro: "Utilizador não encontrado." });
    if (!user.pago) return res.status(403).json({ erro: "Pagamento em falta." });

    try {
        const codigoGerado = await conectarMotorGroq(prompt);
        res.json({ sucesso: true, codigo: codigoGerado });
    } catch (erroDoMotor) {
        res.status(500).json({ sucesso: false, erro: erroDoMotor });
    }
});

// CORREÇÃO DA PORTA DINÂMICA DO RENDER
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(` Honey IA ativa na porta correta: ${PORT}`);
});
