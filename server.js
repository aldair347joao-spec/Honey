const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const path = require('path');

const User = require('./models/User');
const app = express();

// ==========================================
// 1. CONFIGURAÇÕES BÁSICAS
// ==========================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

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
    cookie: { secure: false } // Altera para true se usares HTTPS em produção
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
// 4. CONFIGURAÇÃO DO TRANSPORTADOR DE EMAIL (Nodemailer)
// ==========================================
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, // Teu e-mail do Gmail configurado no Render
        pass: process.env.EMAIL_PASS  // Palavra-passe de app gerada no Gmail
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
                    isVerified: true // Contas Google já vêm verificadas
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
                    isVerified: true // Contas Facebook já vêm verificadas
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

    const rotasPublicas = [
        '/', '/login', '/registar', '/confirmar-codigo', '/politica-privacidade',
        '/auth/google', '/auth/google/callback', '/auth/facebook', '/auth/facebook/callback'
    ];

    const ehRecursoEstatico = rotaAtual.startsWith('/css') || 
                               rotaAtual.startsWith('/js') || 
                               rotaAtual.startsWith('/img') || 
                               rotaAtual.startsWith('/assets');

    if (rotasPublicas.includes(rotaAtual) || ehRecursoEstatico) {
        return next();
    }

    // Obter o utilizador da sessão (Passport ou Manual)
    const utilizador = req.session.user || req.user;

    if (!utilizador) {
        return res.redirect('/login');
    }

    // Se o utilizador manual não estiver verificado por e-mail, obriga a verificar
    if (!utilizador.isVerified && rotaAtual !== '/confirmar-codigo') {
        req.session.tempEmail = utilizador.email;
        return res.redirect('/confirmar-codigo');
    }

    next();
}

app.use(verificarAcesso);

// ==========================================
// 7. ROTAS DE VISUALIZAÇÃO (VIEWS)
// ==========================================
app.get('/', (req, res) => res.render('index'));
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
// 8. ROTAS DE AUTENTICAÇÃO MANUAL (POST)
// ==========================================

// Registo Manual com Envio de Código
app.post('/registar', async (req, res) => {
    const { primeiroNome, apelido, email, password } = req.body;

    try {
        const usuarioExistente = await User.findOne({ email });
        if (usuarioExistente) {
            return res.render('registar', { erro: "Este e-mail já está registado na Honey IA." });
        }

        // Validação de Senha Forte (Mínimo 8 caracteres, 1 maiúscula, 1 número, 1 símbolo)
        const regexSenhaForte = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!regexSenhaForte.test(password)) {
            return res.render('registar', { erro: "A senha precisa de pelo menos 8 caracteres, uma letra maiúscula, um número e um caractere especial." });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Gerar código numérico de 6 dígitos
        const codigoVerificacao = Math.floor(100000 + Math.random() * 900000).toString();
        const expiracaoCodigo = new Date(Date.now() + 15 * 60 * 1000); // 15 Minutos

        const novoUsuario = new User({
            primeiroNome,
            apelido,
            email,
            password: hashedPassword,
            verificationCode: codigoVerificacao,
            verificationCodeExpires: expiracaoCodigo
        });

        await novoUsuario.save();

        // Enviar o e-mail
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

// Confirmação do Código de E-mail
app.post('/confirmar-codigo', async (req, res) => {
    const { codigo } = req.body;
    const email = req.session.tempEmail;

    if (!email) return res.redirect('/registar');

    try {
        const usuario = await User.findOne({ email });

        if (!usuario) {
            return res.render('confirmar-codigo', { email, erro: "Utilizador não encontrado." });
        }

        if (usuario.verificationCode !== codigo || usuario.verificationCodeExpires < Date.now()) {
            return res.render('confirmar-codigo', { email, erro: "Código inválido ou expirado. Tenta registar-te novamente." });
        }

        usuario.isVerified = true;
        usuario.verificationCode = null;
        usuario.verificationCodeExpires = null;
        await usuario.save();

        // Inicia a sessão
        req.session.user = {
            id: usuario._id,
            nome: `${usuario.primeiroNome} ${usuario.apelido}`,
            email: usuario.email,
            isVerified: true
        };

        delete req.session.tempEmail;
        res.redirect('/compilador');

    } catch (error) {
        console.error(error);
        res.render('confirmar-codigo', { email, erro: "Erro ao validar o código." });
    }
});

// Login Manual
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const usuario = await User.findOne({ email });
        if (!usuario) {
            return res.render('login', { erro: "E-mail ou senha incorretos." });
        }

        // Se o login for social, não permite login manual sem senha
        if (!usuario.password) {
            return res.render('login', { erro: "Esta conta está associada ao Login Social (Google/Facebook)." });
        }

        const senhaCorreta = await bcrypt.compare(password, usuario.password);
        if (!senhaCorreta) {
            return res.render('login', { erro: "E-mail ou senha incorretos." });
        }

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
        console.error(error);
        res.render('login', { erro: "Erro interno ao tentar fazer login." });
    }
});

// Logout
app.get('/sair', (req, res) => {
    req.logout((err) => {
        req.session.destroy(() => {
            res.redirect('/');
        });
    });
});

// ==========================================
// 9. ROTAS DE REDIRECIONAMENTO DOS LOGINS SOCIAIS
// ==========================================
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/auth/google/callback', 
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => res.redirect('/compilador')
);

app.get('/auth/facebook', passport.authenticate('facebook', { scope: ['email'] }));
app.get('/auth/facebook/callback', 
    passport.authenticate('facebook', { failureRedirect: '/login' }),
    (req, res) => res.redirect('/compilador')
);

// Inicializar Servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Honey IA a rodar na porta ${PORT}! 🐝`));
