const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const path = require('path');
const cors = require('cors');

const User = require('./models/User');
const app = express();

// ==========================================
// 1. CONFIGURAÇÕES BÁSICAS
// ==========================================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Chave de acesso à API da Groq
const GROQ_API_KEY = process.env.GROQ_API_KEY;

// ==========================================
// 2. CONEXÃO AO MONGODB ATLAS
// ==========================================
const mongoURI = process.env.MONGODB_URI || "mongodb://localhost:27017/honey_ia_local";
mongoose.connect(mongoURI)
  .then(() => console.log("Ligado com sucesso ao MongoDB Atlas! 🚀"))
  .catch(err => console.error("Erro de conexão ao MongoDB:", err));

// ==========================================
// 3. CONFIGURAÇÃO DA SESSÃO
// ==========================================
app.use(session({
    secret: process.env.SESSION_SECRET || 'chave_secreta_honey_ia',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

// Inicializar Passport
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

// ==========================================
// 4. CONFIGURAÇÃO DO TRANSPORTADOR DE EMAIL
// ==========================================
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// ==========================================
// 5. LOGIN SOCIAL (GOOGLE E FACEBOOK)
// ==========================================
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "/auth/google/callback"
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            let user = await User.findOne({ email: profile.emails[0].value });
            if (!user) {
                user = new User({
                    primeiroNome: profile.name.givenName,
                    apelido: profile.name.familyName,
                    email: profile.emails[0].value,
                    googleId: profile.id,
                    isVerified: true
                });
                await user.save();
            } else if (!user.googleId) {
                user.googleId = profile.id;
                user.isVerified = true;
                await user.save();
            }
            return done(null, user);
        } catch (err) {
            return done(err, null);
        }
    }));
}

if (process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET) {
    passport.use(new FacebookStrategy({
        clientID: process.env.FACEBOOK_CLIENT_ID,
        clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
        callbackURL: "/auth/facebook/callback",
        profileFields: ['id', 'name', 'emails']
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            const email = profile.emails ? profile.emails[0].value : `${profile.id}@facebook.com`;
            let user = await User.findOne({ email });
            if (!user) {
                user = new User({
                    primeiroNome: profile.name.givenName,
                    apelido: profile.name.familyName,
                    email: email,
                    facebookId: profile.id,
                    isVerified: true
                });
                await user.save();
            } else if (!user.facebookId) {
                user.facebookId = profile.id;
                user.isVerified = true;
                await user.save();
            }
            return done(null, user);
        } catch (err) {
            return done(err, null);
        }
    }));
}

// ==========================================
// 6. MIDDLEWARE DE VERIFICAÇÃO DE ACESSO
// ==========================================
function verificarAcesso(req, res, next) {
    const rotaAtual = req.path;

    // Libertamos as rotas da IA para não exigirem login obrigatório no ecrã inicial
    const rotasPublicas = [
        '/', '/login', '/registar', '/confirmar-codigo', '/politica-privacidade',
        '/auth/google', '/auth/google/callback', '/auth/facebook', '/auth/facebook/callback',
        '/gerar-gratis', '/gerar'
    ];

    const ehRecursoEstatico = rotaAtual.startsWith('/css') || 
                               rotaAtual.startsWith('/js') || 
                               rotaAtual.startsWith('/img') || 
                               rotaAtual.startsWith('/assets');

    if (rotasPublicas.includes(rotaAtual) || ehRecursoEstatico) {
        return next();
    }

    const utilizador = req.session.user || req.user;

    if (!utilizador) {
        return res.redirect('/login');
    }

    if (!utilizador.isVerified && rotaAtual !== '/confirmar-codigo') {
        req.session.tempEmail = utilizador.email;
        return res.redirect('/confirmar-codigo');
    }

    next();
}

app.use(verificarAcesso);

// ==========================================
// 7. ROTA DO MOTOR DE INTELIGÊNCIA ARTIFICIAL (GROQ)
// ==========================================
app.post('/gerar-gratis', async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ erro: "Descreva o seu projeto." });

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json", 
                "Authorization": `Bearer ${GROQ_API_KEY}` 
            },
            body: JSON.stringify({
                model: "llama3-8b-8192",
                messages: [
                    { role: "system", content: "Você é a Honey IA. Gere apenas código limpo sem introduções." },
                    { role: "user", content: prompt }
                ]
            })
        });

        const data = await response.json();
        
        if (!response.ok || !data.choices) {
            return res.status(500).json({ erro: "Erro na API da Groq. Verifica as credenciais no Render." });
        }

        res.json({ sucesso: true, codigo: data.choices[0].message.content });
    } catch (e) {
        console.error(e);
        res.status(500).json({ erro: "Falha ao conectar com o motor da Honey IA." });
    }
});

// Espelho da rota para utilizadores logados
app.post('/gerar', async (req, res) => {
    const { prompt } = req.body;
    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json", 
                "Authorization": `Bearer ${GROQ_API_KEY}` 
            },
            body: JSON.stringify({
                model: "llama3-8b-8192",
                messages: [
                    { role: "system", content: "Você é a Honey IA. Gere apenas código limpo." },
                    { role: "user", content: prompt }
                ]
            })
        });
        const data = await response.json();
        res.json({ sucesso: true, codigo: data.choices[0].message.content });
    } catch (e) {
        res.status(500).json({ erro: "Falha ao conectar com o motor." });
    }
});

// ==========================================
// 8. ROTAS DE VISUALIZAÇÃO (VIEWS)
// ==========================================
app.get('/', (req, res) => {
    // Se tiveres um index.html na raiz e quiseres usá-lo:
    res.sendFile(path.join(__dirname, 'index.html'));
});
app.get('/login', (req, res) => res.render('login', { erro: null }));
app.get('/registar', (req, res) => res.render('registar', { erro: null }));
app.get('/confirmar-codigo', (req, res) => {
    if (!req.session.tempEmail) return res.redirect('/registar');
    res.render('confirmar-codigo', { email: req.session.tempEmail, erro: null });
});
app.get('/compilador', (req, res) => {
    const utilizador = req.session.user || req.user;
    res.render('compilador', { user: utilizador });
});

// ==========================================
// 9. ROTAS DE AUTENTICAÇÃO MANUAL (POST)
// ==========================================
app.post('/registar', async (req, res) => {
    const { primeiroNome, apelido, email, password } = req.body;

    try {
        const usuarioExistente = await User.findOne({ email });
        if (usuarioExistente) {
            return res.render('registar', { erro: "Este e-mail já está registado na Honey IA." });
        }

        const regexSenhaForte = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!regexSenhaForte.test(password)) {
            return res.render('registar', { erro: "A senha precisa de pelo menos 8 caracteres, uma letra maiúscula, um número e um caractere especial." });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const codigoVerificacao = Math.floor(100000 + Math.random() * 900000).toString();
        const expiracaoCodigo = new Date(Date.now() + 15 * 60 * 1000);

        const novoUsuario = new User({
            primeiroNome,
            apelido,
            email,
            password: hashedPassword,
            verificationCode: codigoVerificacao,
            verificationCodeExpires: expiracaoCodigo
        });

        await novoUsuario.save();

        const mailOptions = {
            from: '"Honey IA" <teu-email@gmail.com>',
            to: email,
            subject: 'O teu código de ativação Honey IA 🐝',
            html: `
                <div style="font-family: sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #FFB900; text-align: center;">Bem-vindo à Honey IA!</h2>
                    <p>Olá <strong>${primeiroNome}</strong>, para ativares a tua conta gratuita, usa o código de verificação abaixo:</p>
                    <div style="background: #fdf6e2; font-size: 32px; font-weight: bold; text-align: center; padding: 15px; letter-spacing: 5px; color: #333; margin: 20px 0;">
                        ${codigoVerificacao}
                    </div>
                    <p style="font-size: 12px; color: #777; text-align: center;">Este código é válido por 15 minutos.</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        req.session.tempEmail = email;
        res.redirect('/confirmar-codigo');

    } catch (error) {
        console.error(error);
        res.render('registar', { erro: "Erro de sistema ao processar o registo." });
    }
});

app.post('/confirmar-codigo', async (req, res) => {
    const { codigo } = req.body;
    const email = req.session.tempEmail;

    if (!email) return res.redirect('/registar');

    try {
        const usuario = await User.findOne({ email });
        if (!usuario) return res.render('confirmar-codigo', { email, erro: "Utilizador não encontrado." });

        if (usuario.verificationCode !== codigo || usuario.verificationCodeExpires < Date.now()) {
            return res.render('confirmar-codigo', { email, erro: "Código inválido ou expirado." });
        }

        usuario.isVerified = true;
        usuario.verificationCode = null;
        usuario.verificationCodeExpires = null;
        await usuario.save();

        req.session.user = {
            id: usuario._id,
            nome: `${usuario.primeiroNome} ${usuario.apelido}`,
            email: usuario.email,
            isVerified: true
        };

        delete req.session.tempEmail;
        res.redirect('/compilador');
    } catch (error) {
        res.render('confirmar-codigo', { email, erro: "Erro ao validar o código." });
    }
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const usuario = await User.findOne({ email });
        if (!usuario) return res.render('login', { erro: "E-mail ou senha incorretos." });

        if (!usuario.password) return res.render('login', { erro: "Esta conta está associada ao Login Social." });

        const senhaCorreta = await bcrypt.compare(password, usuario.password);
        if (!senhaCorreta) return res.render('login', { erro: "E-mail ou senha incorretos." });

        if (!usuario.isVerified) {
            req.session.tempEmail = usuario.email;
            return res.redirect('/confirmar-codigo');
        }

        req.session.user = {
            id: usuario._id,
            nome: `${usuario.primeiroNome} ${usuario.apelido}`,
            email: usuario.email,
            isVerified: true
        };
        res.redirect('/compilador');
    } catch (error) {
        res.render('login', { erro: "Erro interno no servidor." });
    }
});

app.get('/sair', (req, res) => {
    req.logout((err) => {
        req.session.destroy(() => { res.redirect('/'); });
    });
});

// Redirecionamento das Redes Sociais
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), (req, res) => res.redirect('/compilador'));
app.get('/auth/facebook', passport.authenticate('facebook', { scope: ['email'] }));
app.get('/auth/facebook/callback', passport.authenticate('facebook', { failureRedirect: '/login' }), (req, res) => res.redirect('/compilador'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Honey IA unificada e operacional na porta ${PORT}! 🐝`));
