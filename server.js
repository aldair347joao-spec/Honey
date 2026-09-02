/*
============================================================
HONEY PAY
MAIN SERVER
V3.2.0
STABLE AUTH / MERCHANT API
============================================================

OBJECTIVOS
------------------------------------------------------------
- Google OAuth como único login
- JWT em cookie HttpOnly
- Sessão persistente
- /api/me como fonte oficial da sessão
- Sem redirect automático das APIs para /login
- /login separado do dashboard privado
- MongoDB / Mongoose
- Merchant criado automaticamente no primeiro login
- Dashboard
- Customers
- Products
- Orders
- Payments
- Payment Links
- Reports
- Public checkout
- Segurança
- Rate limit
- CORS
- Helmet

FLUXO
------------------------------------------------------------

Google
  ↓
/api/auth/google
  ↓
Google OAuth
  ↓
/api/auth/google/callback
  ↓
JWT
  ↓
HttpOnly Cookie: honey_pay_token
  ↓
/
  ↓
public/app.js
  ↓
/api/me
  ↓
Dashboard

IMPORTANTE
------------------------------------------------------------
Nenhuma API protegida redireciona para /login.

401 é devolvido como JSON.

É o frontend que decide quando deve ir para /login.

============================================================
*/

'use strict';

require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const path = require('path');

/* =========================================================
   APP
========================================================= */

const app = express();

const PORT = Number(
  process.env.PORT || 10000
);

const NODE_ENV =
  process.env.NODE_ENV || 'development';

/* =========================================================
   ENVIRONMENT
========================================================= */

const MONGODB_URI =
  process.env.MONGODB_URI;

const JWT_SECRET =
  process.env.JWT_SECRET;

const GOOGLE_CLIENT_ID =
  process.env.GOOGLE_CLIENT_ID || '';

const GOOGLE_CLIENT_SECRET =
  process.env.GOOGLE_CLIENT_SECRET || '';

const APP_BASE_URL =
  process.env.APP_BASE_URL ||
  `http://localhost:${PORT}`;

const GOOGLE_CALLBACK_URL =
  process.env.GOOGLE_CALLBACK_URL ||
  `${APP_BASE_URL}/api/auth/google/callback`;

const HONEY_PAY_FEE_BPS =
  Number(
    process.env.HONEY_PAY_FEE_BPS || 80
  );

const BITPAY_BASE_URL =
  process.env.BITPAY_BASE_URL ||
  'https://api-sandbox.bitpay.ao/v1';

const BITPAY_SECRET_KEY =
  process.env.BITPAY_SECRET_KEY || '';

const BITPAY_WEBHOOK_SECRET =
  process.env.BITPAY_WEBHOOK_SECRET || '';

const BITPAY_MULTI_MERCHANT_ENABLED =
  String(
    process.env.BITPAY_MULTI_MERCHANT_ENABLED ||
      'false'
  ).toLowerCase() === 'true';

/* =========================================================
   PATHS
========================================================= */

const FRONTEND_DIR =
  path.join(__dirname, 'public');

const INDEX_FILE =
  path.join(
    FRONTEND_DIR,
    'index.html'
  );

const CHECKOUT_FILE =
  path.join(
    FRONTEND_DIR,
    'checkout.html'
  );

/* =========================================================
   REQUIRED ENV
========================================================= */

if (!MONGODB_URI) {
  console.error(
    'ERRO: MONGODB_URI não configurado.'
  );

  process.exit(1);
}

if (!JWT_SECRET) {
  console.error(
    'ERRO: JWT_SECRET não configurado.'
  );

  process.exit(1);
}

if (
  !GOOGLE_CLIENT_ID ||
  !GOOGLE_CLIENT_SECRET
) {
  console.warn(
    'AVISO: GOOGLE_CLIENT_ID ou GOOGLE_CLIENT_SECRET não configurado.'
  );
}

/* =========================================================
   SECURITY
========================================================= */

app.disable('x-powered-by');

app.set(
  'trust proxy',
  1
);

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: {
      policy: 'cross-origin'
    }
  })
);

app.use(
  cors({
    origin: true,
    credentials: true
  })
);

/* =========================================================
   RATE LIMIT
========================================================= */

const apiLimiter =
  rateLimit({
    windowMs:
      15 * 60 * 1000,

    max: 1000,

    standardHeaders: true,

    legacyHeaders: false,

    message: {
      success: false,
      error:
        'Muitas requisições. Tente novamente mais tarde.'
    }
  });

app.use(
  '/api',
  apiLimiter
);

/* =========================================================
   BODY
========================================================= */

app.use(
  express.json({
    limit: '2mb'
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: '2mb'
  })
);

/* =========================================================
   DATABASE
========================================================= */

mongoose.set(
  'strictQuery',
  true
);

/* =========================================================
   HELPERS
========================================================= */

function normalizeEmail(
  email
) {
  return String(email || '')
    .trim()
    .toLowerCase();
}

function cleanString(
  value,
  max = 500
) {
  return String(value || '')
    .trim()
    .slice(0, max);
}

function generateToken() {
  return crypto
    .randomBytes(24)
    .toString('hex');
}

function generateReference(
  prefix = 'HP'
) {
  const timestamp =
    new Date()
      .toISOString()
      .replace(/\D/g, '')
      .slice(0, 14);

  const random =
    crypto
      .randomBytes(4)
      .toString('hex')
      .toUpperCase();

  return `${prefix}-${timestamp}-${random}`;
}

function calculateFee(
  amount
) {
  const value =
    Number(amount);

  if (
    !Number.isFinite(value) ||
    value < 0
  ) {
    return 0;
  }

  return Math.round(
    value *
      HONEY_PAY_FEE_BPS /
      10000
  );
}

function isValidObjectId(
  id
) {
  return mongoose.Types.ObjectId.isValid(
    id
  );
}

function asyncHandler(
  fn
) {
  return function (
    req,
    res,
    next
  ) {
    Promise.resolve(
      fn(req, res, next)
    ).catch(next);
  };
}

/* =========================================================
   COOKIE
========================================================= */

function parseCookies(
  req
) {
  const header =
    req.headers.cookie || '';

  const cookies = {};

  for (
    const part of header.split(';')
  ) {
    const index =
      part.indexOf('=');

    if (index === -1) {
      continue;
    }

    const key =
      part
        .slice(0, index)
        .trim();

    const value =
      part
        .slice(index + 1)
        .trim();

    if (!key) {
      continue;
    }

    try {
      cookies[key] =
        decodeURIComponent(
          value
        );
    } catch {
      cookies[key] =
        value;
    }
  }

  return cookies;
}

function serializeCookie(
  name,
  value,
  options = {}
) {
  const parts = [
    `${name}=${encodeURIComponent(
      value
    )}`
  ];

  if (
    options.maxAge !== undefined
  ) {
    parts.push(
      `Max-Age=${Math.floor(
        Number(options.maxAge)
      )}`
    );
  }

  if (options.path) {
    parts.push(
      `Path=${options.path}`
    );
  }

  if (options.httpOnly) {
    parts.push(
      'HttpOnly'
    );
  }

  if (options.secure) {
    parts.push(
      'Secure'
    );
  }

  if (options.sameSite) {
    parts.push(
      `SameSite=${options.sameSite}`
    );
  }

  return parts.join('; ');
}

function setAuthCookie(
  res,
  token
) {
  res.setHeader(
    'Set-Cookie',
    serializeCookie(
      'honey_pay_token',
      token,
      {
        httpOnly: true,

        secure:
          NODE_ENV ===
          'production',

        sameSite: 'Lax',

        path: '/',

        maxAge:
          30 *
          24 *
          60 *
          60
      }
    )
  );
}

function clearAuthCookie(
  res
) {
  res.setHeader(
    'Set-Cookie',
    serializeCookie(
      'honey_pay_token',
      '',
      {
        httpOnly: true,

        secure:
          NODE_ENV ===
          'production',

        sameSite: 'Lax',

        path: '/',

        maxAge: 0
      }
    )
  );
}

/* =========================================================
   JWT
========================================================= */

function signJWT(
  user
) {
  return jwt.sign(
    {
      sub:
        String(user._id),

      email:
        user.email,

      role:
        user.role ||
        'merchant'
    },

    JWT_SECRET,

    {
      expiresIn:
        '30d'
    }
  );
}

function getBearerToken(
  req
) {
  const header =
    req.headers.authorization ||
    '';

  if (
    !header.startsWith(
      'Bearer '
    )
  ) {
    return null;
  }

  return header
    .slice(7)
    .trim();
}

function getAuthToken(
  req
) {
  const bearer =
    getBearerToken(req);

  if (bearer) {
    return bearer;
  }

  const cookies =
    parseCookies(req);

  return (
    cookies.honey_pay_token ||
    null
  );
}

/* =========================================================
   AUTHENTICATION
========================================================= */

/*
IMPORTANT:

Este middleware NUNCA faz redirect.

Uma API protegida devolve:

401 JSON

O public/app.js é responsável por decidir
se deve mandar o utilizador para /login.
*/

function authenticate(
  req,
  res,
  next
) {
  try {
    const token =
      getAuthToken(req);

    if (!token) {
      return res
        .status(401)
        .json({
          success: false,
          error:
            'Autenticação necessária.'
        });
    }

    const payload =
      jwt.verify(
        token,
        JWT_SECRET
      );

    if (
      !payload ||
      !payload.sub
    ) {
      return res
        .status(401)
        .json({
          success: false,
          error:
            'Token inválido.'
        });
    }

    req.userId =
      String(payload.sub);

    req.userEmail =
      payload.email || '';

    req.userRole =
      payload.role ||
      'merchant';

    req.authToken =
      token;

    next();

  } catch (error) {
    return res
      .status(401)
      .json({
        success: false,
        error:
          'Sessão inválida ou expirada.'
      });
  }
}

/* =========================================================
   GOOGLE OAUTH
========================================================= */

function createOAuthState() {
  return jwt.sign(
    {
      purpose:
        'google_oauth',

      nonce:
        crypto
          .randomBytes(16)
          .toString('hex')
    },

    JWT_SECRET,

    {
      expiresIn:
        '10m'
    }
  );
}

function verifyOAuthState(
  state
) {
  try {
    const payload =
      jwt.verify(
        state,
        JWT_SECRET
      );

    return Boolean(
      payload &&
      payload.purpose ===
        'google_oauth'
    );

  } catch {
    return false;
  }
}

function buildGoogleAuthorizationUrl() {
  const params =
    new URLSearchParams({
      client_id:
        GOOGLE_CLIENT_ID,

      redirect_uri:
        GOOGLE_CALLBACK_URL,

      response_type:
        'code',

      scope:
        'openid email profile',

      access_type:
        'offline',

      prompt:
        'select_account',

      state:
        createOAuthState()
    });

  return (
    'https://accounts.google.com/o/oauth2/v2/auth?' +
    params.toString()
  );
}

async function exchangeGoogleCode(
  code
) {
  const response =
    await fetch(
      'https://oauth2.googleapis.com/token',
      {
        method: 'POST',

        headers: {
          'Content-Type':
            'application/x-www-form-urlencoded'
        },

        body:
          new URLSearchParams({
            code,

            client_id:
              GOOGLE_CLIENT_ID,

            client_secret:
              GOOGLE_CLIENT_SECRET,

            redirect_uri:
              GOOGLE_CALLBACK_URL,

            grant_type:
              'authorization_code'
          }).toString()
      }
    );

  const text =
    await response.text();

  let data = {};

  try {
    data =
      text
        ? JSON.parse(text)
        : {};
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(
      data.error_description ||
      data.error ||
      'Falha na autenticação Google.'
    );
  }

  return data;
}

async function getGoogleUser(
  accessToken
) {
  const response =
    await fetch(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      {
        headers: {
          Authorization:
            `Bearer ${accessToken}`
        }
      }
    );

  const text =
    await response.text();

  let data = {};

  try {
    data =
      text
        ? JSON.parse(text)
        : {};
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(
      data.error ||
      'Não foi possível obter o perfil Google.'
    );
  }

  return data;
}

/* =========================================================
   MODELS
========================================================= */

const UserSchema =
  new mongoose.Schema(
    {
      name: {
        type: String,
        required: true,
        trim: true
      },

      email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true
      },

      googleId: {
        type: String,
        default: '',
        index: true
      },

      avatar: {
        type: String,
        default: ''
      },

      authProvider: {
        type: String,
        enum: [
          'google',
          'legacy'
        ],
        default: 'google'
      },

      role: {
        type: String,
        enum: [
          'merchant',
          'admin'
        ],
        default: 'merchant'
      },

      active: {
        type: Boolean,
        default: true
      },

      lastLoginAt: {
        type: Date,
        default: null
      }
    },

    {
      timestamps: true
    }
  );

const MerchantSchema =
  new mongoose.Schema(
    {
      userId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref: 'User',

        required: true,

        unique: true,

        index: true
      },

      businessName: {
        type: String,
        default: ''
      },

      phone: {
        type: String,
        default: ''
      },

      nif: {
        type: String,
        default: ''
      },

      address: {
        type: String,
        default: ''
      },

      city: {
        type: String,
        default: ''
      },

      country: {
        type: String,
        default: 'AO'
      },

      currency: {
        type: String,
        default: 'AOA'
      },

      provider: {
        type: String,
        default: 'bitpay'
      },

      providerAccountRef: {
        type: String,
        default: ''
      },

      providerSettlementReady: {
        type: Boolean,
        default: false
      },

      active: {
        type: Boolean,
        default: true
      }
    },

    {
      timestamps: true
    }
  );

const CustomerSchema =
  new mongoose.Schema(
    {
      merchantId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref: 'Merchant',

        required: true,

        index: true
      },

      name: {
        type: String,
        required: true,
        trim: true
      },

      email: {
        type: String,
        default: '',
        lowercase: true,
        trim: true
      },

      phone: {
        type: String,
        default: ''
      },

      notes: {
        type: String,
        default: ''
      },

      totalOrders: {
        type: Number,
        default: 0
      },

      totalSpent: {
        type: Number,
        default: 0
      },

      lastOrderAt: {
        type: Date,
        default: null
      }
    },

    {
      timestamps: true
    }
  );

const ProductSchema =
  new mongoose.Schema(
    {
      merchantId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref: 'Merchant',

        required: true,

        index: true
      },

      name: {
        type: String,
        required: true,
        trim: true
      },

      description: {
        type: String,
        default: ''
      },

      sku: {
        type: String,
        default: ''
      },

      price: {
        type: Number,
        required: true,
        min: 1
      },

      currency: {
        type: String,
        default: 'AOA'
      },

      image: {
        type: String,
        default: ''
      },

      active: {
        type: Boolean,
        default: true
      },

      stock: {
        type: Number,
        default: null
      }
    },

    {
      timestamps: true
    }
  );

const OrderSchema =
  new mongoose.Schema(
    {
      merchantId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref: 'Merchant',

        required: true,

        index: true
      },

      customerId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref: 'Customer',

        default: null
      },

      reference: {
        type: String,
        unique: true,
        index: true
      },

      items: [
        {
          productId: {
            type:
              mongoose.Schema.Types.ObjectId,

            ref: 'Product',

            default: null
          },

          name: String,

          quantity: {
            type: Number,
            min: 1
          },

          unitPrice: {
            type: Number,
            min: 0
          },

          total: {
            type: Number,
            min: 0
          }
        }
      ],

      subtotal: {
        type: Number,
        required: true,
        min: 0
      },

      total: {
        type: Number,
        required: true,
        min: 1
      },

      currency: {
        type: String,
        default: 'AOA'
      },

      status: {
        type: String,

        enum: [
          'PENDING',
          'PAYMENT_PROCESSING',
          'PAID',
          'FAILED',
          'CANCELLED',
          'REFUNDED',
          'PARTIALLY_REFUNDED'
        ],

        default: 'PENDING',

        index: true
      },

      customerSnapshot: {
        name: String,
        email: String,
        phone: String
      },

      paidAt: {
        type: Date,
        default: null
      }
    },

    {
      timestamps: true
    }
  );

const PaymentSchema =
  new mongoose.Schema(
    {
      merchantId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref: 'Merchant',

        required: true,

        index: true
      },

      orderId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref: 'Order',

        required: true,

        index: true
      },

      customerId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref: 'Customer',

        default: null
      },

      reference: {
        type: String,
        required: true,
        index: true
      },

      provider: {
        type: String,
        default: 'bitpay'
      },

      providerPaymentId: {
        type: String,
        default: '',
        index: true
      },

      paymentMethod: {
        type: String,
        default: 'multicaixa_express'
      },

      amount: {
        type: Number,
        required: true,
        min: 1
      },

      feeAmount: {
        type: Number,
        default: 0
      },

      netAmount: {
        type: Number,
        default: 0
      },

      currency: {
        type: String,
        default: 'AOA'
      },

      status: {
        type: String,

        enum: [
          'PENDING',
          'PROCESSING',
          'PAID',
          'FAILED',
          'CANCELLED',
          'REFUNDED'
        ],

        default: 'PENDING',

        index: true
      },

      paidAt: {
        type: Date,
        default: null
      }
    },

    {
      timestamps: true
    }
  );

const PaymentLinkSchema =
  new mongoose.Schema(
    {
      merchantId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref: 'Merchant',

        required: true,

        index: true
      },

      token: {
        type: String,
        unique: true,
        index: true
      },

      title: {
        type: String,
        required: true
      },

      description: {
        type: String,
        default: ''
      },

      amount: {
        type: Number,
        required: true,
        min: 1
      },

      currency: {
        type: String,
        default: 'AOA'
      },

      active: {
        type: Boolean,
        default: true
      },

      expiresAt: {
        type: Date,
        default: null
      }
    },

    {
      timestamps: true
    }
  );

/* =========================================================
   MODELS
========================================================= */

const User =
  mongoose.models.User ||
  mongoose.model(
    'User',
    UserSchema
  );

const Merchant =
  mongoose.models.Merchant ||
  mongoose.model(
    'Merchant',
    MerchantSchema
  );

const Customer =
  mongoose.models.Customer ||
  mongoose.model(
    'Customer',
    CustomerSchema
  );

const Product =
  mongoose.models.Product ||
  mongoose.model(
    'Product',
    ProductSchema
  );

const Order =
  mongoose.models.Order ||
  mongoose.model(
    'Order',
    OrderSchema
  );

const Payment =
  mongoose.models.Payment ||
  mongoose.model(
    'Payment',
    PaymentSchema
  );

const PaymentLink =
  mongoose.models.PaymentLink ||
  mongoose.model(
    'PaymentLink',
    PaymentLinkSchema
  );

/* =========================================================
   MERCHANT MIDDLEWARE
========================================================= */

async function requireMerchant(
  req,
  res,
  next
) {
  try {
    const merchant =
      await Merchant.findOne({
        userId: req.userId,
        active: true
      }).lean();

    if (!merchant) {
      return res
        .status(403)
        .json({
          success: false,
          error:
            'Conta de comerciante não encontrada.'
        });
    }

    req.merchant =
      merchant;

    req.merchantId =
      merchant._id;

    next();

  } catch (error) {
    next(error);
  }
}

/* =========================================================
   HEALTH
========================================================= */

app.get(
  '/api/health',
  (req, res) => {
    res.json({
      success: true,
      service: 'Honey Pay',
      version: '3.2.0',
      status: 'ok',
      database:
        mongoose.connection.readyState ===
        1
          ? 'connected'
          : 'disconnected'
    });
  }
);

/* =========================================================
   AUTH - GOOGLE
========================================================= */

app.get(
  '/api/auth/google',
  (req, res) => {
    if (
      !GOOGLE_CLIENT_ID ||
      !GOOGLE_CLIENT_SECRET
    ) {
      return res
        .status(503)
        .send(
          'Google OAuth não está configurado no servidor.'
        );
    }

    return res.redirect(
      buildGoogleAuthorizationUrl()
    );
  }
);

/* =========================================================
   AUTH - CALLBACK
========================================================= */

app.get(
  '/api/auth/google/callback',

  asyncHandler(
    async (req, res) => {
      const {
        code,
        state,
        error
      } = req.query;

      if (error) {
        return res.redirect(
          '/login?error=google_cancelled'
        );
      }

      if (!code) {
        return res.redirect(
          '/login?error=missing_code'
        );
      }

      if (
        !state ||
        !verifyOAuthState(state)
      ) {
        return res.redirect(
          '/login?error=invalid_state'
        );
      }

      try {
        const tokens =
          await exchangeGoogleCode(
            code
          );

        if (
          !tokens.access_token
        ) {
          throw new Error(
            'Google não devolveu access_token.'
          );
        }

        const googleUser =
          await getGoogleUser(
            tokens.access_token
          );

        const email =
          normalizeEmail(
            googleUser.email
          );

        if (!email) {
          throw new Error(
            'A conta Google não possui email válido.'
          );
        }

        if (
          googleUser.email_verified === false
        ) {
          throw new Error(
            'O email Google não está verificado.'
          );
        }

        let user =
          await User.findOne({
            $or: [
              {
                googleId:
                  googleUser.sub
              },
              {
                email
              }
            ]
          });

        if (!user) {
          user =
            await User.create({
              name:
                cleanString(
                  googleUser.name ||
                  email.split('@')[0],
                  150
                ),

              email,

              googleId:
                googleUser.sub,

              avatar:
                googleUser.picture ||
                '',

              authProvider:
                'google',

              role:
                'merchant',

              active:
                true,

              lastLoginAt:
                new Date()
            });

        } else {
          user.name =
            cleanString(
              googleUser.name ||
              user.name ||
              email,
              150
            );

          user.email =
            email;

          user.googleId =
            googleUser.sub;

          user.avatar =
            googleUser.picture ||
            user.avatar ||
            '';

          user.authProvider =
            'google';

          user.lastLoginAt =
            new Date();

          await user.save();
        }

        if (!user.active) {
          return res.redirect(
            '/login?error=account_disabled'
          );
        }

        let merchant =
          await Merchant.findOne({
            userId:
              user._id
          });

        if (!merchant) {
          merchant =
            await Merchant.create({
              userId:
                user._id,

              businessName:
                cleanString(
                  googleUser.name ||
                  email.split('@')[0],
                  150
                ),

              country:
                'AO',

              currency:
                'AOA',

              provider:
                'bitpay',

              active:
                true
            });
        }

        const token =
          signJWT(user);

        setAuthCookie(
          res,
          token
        );

        /*
        IMPORTANTE:

        O callback NÃO envia token pela URL.

        O token fica exclusivamente no cookie
        HttpOnly.

        O app.js depois chama /api/me.
        */

        return res.redirect(
          '/'
        );

      } catch (error) {
        console.error(
          'Google OAuth callback error:',
          error
        );

        return res.redirect(
          '/login?error=google_auth_failed'
        );
      }
    }
  )
);

/* =========================================================
   AUTH STATUS
========================================================= */

app.get(
  '/api/auth/status',

  asyncHandler(
    async (req, res) => {
      const token =
        getAuthToken(req);

      if (!token) {
        return res.json({
          success: true,
          authenticated: false
        });
      }

      try {
        const payload =
          jwt.verify(
            token,
            JWT_SECRET
          );

        if (
          !payload ||
          !payload.sub
        ) {
          return res.json({
            success: true,
            authenticated: false
          });
        }

        const user =
          await User.findById(
            payload.sub
          ).lean();

        if (
          !user ||
          !user.active
        ) {
          return res.json({
            success: true,
            authenticated: false
          });
        }

        return res.json({
          success: true,

          authenticated:
            true,

          user: {
            id:
              String(user._id),

            name:
              user.name,

            email:
              user.email,

            avatar:
              user.avatar || '',

            role:
              user.role
          }
        });

      } catch {
        return res.json({
          success: true,
          authenticated: false
        });
      }
    }
  )
);

/* =========================================================
   LOGOUT
========================================================= */

app.post(
  '/api/auth/logout',
  (req, res) => {
    clearAuthCookie(
      res
    );

    return res.json({
      success: true
    });
  }
);

/* =========================================================
   CURRENT USER
========================================================= */

app.get(
  '/api/me',

  authenticate,

  asyncHandler(
    async (req, res) => {
      const user =
        await User.findById(
          req.userId
        ).lean();

      if (
        !user ||
        !user.active
      ) {
        return res
          .status(401)
          .json({
            success: false,
            error:
              'Utilizador não encontrado ou inativo.'
          });
      }

      const merchant =
        await Merchant.findOne({
          userId:
            user._id
        }).lean();

      if (!merchant) {
        return res
          .status(403)
          .json({
            success: false,
            error:
              'Merchant não encontrado.'
          });
      }

      return res.json({
        success: true,

        user: {
          id:
            String(user._id),

          name:
            user.name,

          email:
            user.email,

          avatar:
            user.avatar || '',

          role:
            user.role
        },

        merchant: {
          id:
            String(merchant._id),

          businessName:
            merchant.businessName,

          phone:
            merchant.phone,

          nif:
            merchant.nif,

          address:
            merchant.address,

          city:
            merchant.city,

          country:
            merchant.country,

          currency:
            merchant.currency,

          provider:
            merchant.provider,

          active:
            merchant.active
        }
      });
    }
  )
);

/* =========================================================
   DASHBOARD
========================================================= */

app.get(
  '/api/dashboard',

  authenticate,

  requireMerchant,

  asyncHandler(
    async (req, res) => {
      const merchantId =
        req.merchantId;

      const [
        totalOrders,
        paidOrders,
        pendingOrders,
        totalCustomers,
        totalProducts,
        totalLinks
      ] =
        await Promise.all([
          Order.countDocuments({
            merchantId
          }),

          Order.countDocuments({
            merchantId,

            status:
              'PAID'
          }),

          Order.countDocuments({
            merchantId,

            status:
              'PENDING'
          }),

          Customer.countDocuments({
            merchantId
          }),

          Product.countDocuments({
            merchantId,
            active: true
          }),

          PaymentLink.countDocuments({
            merchantId,
            active: true
          })
        ]);

      const paidResult =
        await Payment.aggregate([
          {
            $match: {
              merchantId,

              status:
                'PAID'
            }
          },

          {
            $group: {
              _id: null,

              total: {
                $sum:
                  '$amount'
              },

              fees: {
                $sum:
                  '$feeAmount'
              },

              net: {
                $sum:
                  '$netAmount'
              }
            }
          }
        ]);

      const totals =
        paidResult[0] || {
          total: 0,
          fees: 0,
          net: 0
        };

      const recentOrders =
        await Order.find({
          merchantId
        })
          .sort({
            createdAt: -1
          })
          .limit(10)
          .lean();

      return res.json({
        success: true,

        dashboard: {
          totalOrders,

          paidOrders,

          pendingOrders,

          totalCustomers,

          totalProducts,

          totalLinks,

          totalRevenue:
            totals.total || 0,

          totalFees:
            totals.fees || 0,

          netRevenue:
            totals.net || 0,

          currency:
            req.merchant.currency ||
            'AOA',

          recentOrders
        }
      });
    }
  )
);

/* =========================================================
   MERCHANT
========================================================= */

app.patch(
  '/api/merchant',

  authenticate,

  requireMerchant,

  asyncHandler(
    async (req, res) => {
      const allowed = [
        'businessName',
        'phone',
        'nif',
        'address',
        'city'
      ];

      const update = {};

      for (
        const field of allowed
      ) {
        if (
          req.body[field] !==
          undefined
        ) {
          update[field] =
            cleanString(
              req.body[field],
              500
            );
        }
      }

      const merchant =
        await Merchant.findByIdAndUpdate(
          req.merchantId,

          {
            $set:
              update
          },

          {
            new: true
          }
        ).lean();

      return res.json({
        success: true,
        merchant
      });
    }
  )
);

/* =========================================================
   CUSTOMERS
========================================================= */

app.get(
  '/api/customers',

  authenticate,

  requireMerchant,

  asyncHandler(
    async (req, res) => {
      const customers =
        await Customer.find({
          merchantId:
            req.merchantId
        })
          .sort({
            createdAt: -1
          })
          .lean();

      return res.json({
        success: true,
        customers
      });
    }
  )
);

app.post(
  '/api/customers',

  authenticate,

  requireMerchant,

  asyncHandler(
    async (req, res) => {
      const name =
        cleanString(
          req.body.name,
          150
        );

      if (!name) {
        return res
          .status(400)
          .json({
            success: false,
            error:
              'Nome do cliente é obrigatório.'
          });
      }

      const customer =
        await Customer.create({
          merchantId:
            req.merchantId,

          name,

          email:
            normalizeEmail(
              req.body.email
            ),

          phone:
            cleanString(
              req.body.phone,
              50
            ),

          notes:
            cleanString(
              req.body.notes,
              1000
            )
        });

      return res
        .status(201)
        .json({
          success: true,
          customer
        });
    }
  )
);

/* =========================================================
   PRODUCTS
========================================================= */

app.get(
  '/api/products',

  authenticate,

  requireMerchant,

  asyncHandler(
    async (req, res) => {
      const products =
        await Product.find({
          merchantId:
            req.merchantId
        })
          .sort({
            createdAt: -1
          })
          .lean();

      return res.json({
        success: true,
        products
      });
    }
  )
);

app.post(
  '/api/products',

  authenticate,

  requireMerchant,

  asyncHandler(
    async (req, res) => {
      const name =
        cleanString(
          req.body.name,
          150
        );

      const price =
        Number(
          req.body.price
        );

      if (
        !name ||
        !Number.isFinite(price) ||
        price <= 0
      ) {
        return res
          .status(400)
          .json({
            success: false,
            error:
              'Nome e preço válidos são obrigatórios.'
          });
      }

      const product =
        await Product.create({
          merchantId:
            req.merchantId,

          name,

          description:
            cleanString(
              req.body.description,
              2000
            ),

          sku:
            cleanString(
              req.body.sku,
              100
            ),

          price,

          currency:
            'AOA',

          image:
            cleanString(
              req.body.image,
              1000
            ),

          stock:
            req.body.stock ===
            null ||
            req.body.stock ===
            undefined ||
            req.body.stock ===
            ''
              ? null
              : Number(
                  req.body.stock
                )
        });

      return res
        .status(201)
        .json({
          success: true,
          product
        });
    }
  )
);

app.delete(
  '/api/products/:id',

  authenticate,

  requireMerchant,

  asyncHandler(
    async (req, res) => {
      if (
        !isValidObjectId(
          req.params.id
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,
            error:
              'Produto inválido.'
          });
      }

      const product =
        await Product.findOneAndUpdate(
          {
            _id:
              req.params.id,

            merchantId:
              req.merchantId
          },

          {
            $set: {
              active: false
            }
          },

          {
            new: true
          }
        );

      if (!product) {
        return res
          .status(404)
          .json({
            success: false,
            error:
              'Produto não encontrado.'
          });
      }

      return res.json({
        success: true
      });
    }
  )
);

/* =========================================================
   ORDERS
========================================================= */

app.get(
  '/api/orders',

  authenticate,

  requireMerchant,

  asyncHandler(
    async (req, res) => {
      const orders =
        await Order.find({
          merchantId:
            req.merchantId
        })
          .sort({
            createdAt: -1
          })
          .limit(500)
          .lean();

      return res.json({
        success: true,
        orders
      });
    }
  )
);

/* =========================================================
   PAYMENTS
========================================================= */

app.get(
  '/api/payments',

  authenticate,

  requireMerchant,

  asyncHandler(
    async (req, res) => {
      const payments =
        await Payment.find({
          merchantId:
            req.merchantId
        })
          .sort({
            createdAt: -1
          })
          .limit(500)
          .lean();

      return res.json({
        success: true,
        payments
      });
    }
  )
);

/* =========================================================
   PAYMENT LINKS
========================================================= */

app.get(
  '/api/payment-links',

  authenticate,

  requireMerchant,

  asyncHandler(
    async (req, res) => {
      const links =
        await PaymentLink.find({
          merchantId:
            req.merchantId
        })
          .sort({
            createdAt: -1
          })
          .lean();

      return res.json({
        success: true,
        links
      });
    }
  )
);

app.post(
  '/api/payment-links',

  authenticate,

  requireMerchant,

  asyncHandler(
    async (req, res) => {
      const title =
        cleanString(
          req.body.title,
          150
        );

      const amount =
        Number(
          req.body.amount
        );

      if (
        !title ||
        !Number.isFinite(
          amount
        ) ||
        amount <= 0
      ) {
        return res
          .status(400)
          .json({
            success: false,
            error:
              'Título e valor são obrigatórios.'
          });
      }

      const link =
        await PaymentLink.create({
          merchantId:
            req.merchantId,

          token:
            generateToken(),

          title,

          description:
            cleanString(
              req.body.description,
              2000
            ),

          amount,

          currency:
            'AOA',

          active:
            true
        });

      return res
        .status(201)
        .json({
          success: true,
          link,

          url:
            `${APP_BASE_URL}/pay/${link.token}`
        });
    }
  )
);

app.delete(
  '/api/payment-links/:id',

  authenticate,

  requireMerchant,

  asyncHandler(
    async (req, res) => {
      if (
        !isValidObjectId(
          req.params.id
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,
            error:
              'Link inválido.'
          });
      }

      const link =
        await PaymentLink.findOneAndUpdate(
          {
            _id:
              req.params.id,

            merchantId:
              req.merchantId
          },

          {
            $set: {
              active: false
            }
          },

          {
            new: true
          }
        );

      if (!link) {
        return res
          .status(404)
          .json({
            success: false,
            error:
              'Link não encontrado.'
          });
      }

      return res.json({
        success: true
      });
    }
  )
);

/* =========================================================
   REPORTS
========================================================= */

app.get(
  '/api/reports',

  authenticate,

  requireMerchant,

  asyncHandler(
    async (req, res) => {
      const [
        payments,
        orders
      ] =
        await Promise.all([
          Payment.aggregate([
            {
              $match: {
                merchantId:
                  req.merchantId
              }
            },

            {
              $group: {
                _id:
                  '$status',

                count: {
                  $sum: 1
                },

                amount: {
                  $sum:
                    '$amount'
                }
              }
            }
          ]),

          Order.aggregate([
            {
              $match: {
                merchantId:
                  req.merchantId
              }
            },

            {
              $group: {
                _id:
                  '$status',

                count: {
                  $sum: 1
                },

                amount: {
                  $sum:
                    '$total'
                }
              }
            }
          ])
        ]);

      return res.json({
        success: true,

        reports: {
          payments,
          orders,
          currency:
            req.merchant.currency ||
            'AOA'
        }
      });
    }
  )
);

/* =========================================================
   PUBLIC PAYMENT LINK
========================================================= */

app.get(
  '/api/public/payment-links/:token',

  asyncHandler(
    async (req, res) => {
      const link =
        await PaymentLink.findOne({
          token:
            req.params.token,

          active:
            true
        }).lean();

      if (!link) {
        return res
          .status(404)
          .json({
            success: false,
            error:
              'Link de pagamento não encontrado.'
          });
      }

      if (
        link.expiresAt &&
        new Date(link.expiresAt)
          .getTime() <
          Date.now()
      ) {
        return res
          .status(410)
          .json({
            success: false,
            error:
              'Este link expirou.'
          });
      }

      const merchant =
        await Merchant.findById(
          link.merchantId
        ).lean();

      return res.json({
        success: true,

        link: {
          id:
            String(link._id),

          token:
            link.token,

          title:
            link.title,

          description:
            link.description,

          amount:
            link.amount,

          currency:
            link.currency
        },

        merchant: merchant
          ? {
              id:
                String(
                  merchant._id
                ),

              businessName:
                merchant.businessName,

              phone:
                merchant.phone,

              currency:
                merchant.currency
            }
          : null
      });
    }
  )
);

/* =========================================================
   PUBLIC CHECKOUT
========================================================= */

app.get(
  '/pay/:token',

  asyncHandler(
    async (req, res) => {
      if (
        require('fs').existsSync(
          CHECKOUT_FILE
        )
      ) {
        return res.sendFile(
          CHECKOUT_FILE
        );
      }

      return res.status(404).send(
        'Checkout não configurado.'
      );
    }
  )
);

/* =========================================================
   BITPAY CONFIG STATUS
========================================================= */

app.get(
  '/api/bitpay/status',

  authenticate,

  requireMerchant,

  (req, res) => {
    return res.json({
      success: true,

      configured:
        Boolean(
          BITPAY_SECRET_KEY
        ),

      baseUrl:
        BITPAY_BASE_URL,

      feeBps:
        HONEY_PAY_FEE_BPS,

      multiMerchant:
        BITPAY_MULTI_MERCHANT_ENABLED
    });
  }
);

/* =========================================================
   STATIC FRONTEND
========================================================= */

app.use(
  express.static(
    FRONTEND_DIR,
    {
      index: false,

      maxAge:
        NODE_ENV ===
        'production'
          ? '1h'
          : 0
    }
  )
);

/* =========================================================
   LOGIN PAGE
========================================================= */

/*
NÃO servir index.html em /login.

Este era um dos pontos que podia provocar o loop.

Agora /login é uma página independente.
*/

app.get(
  '/login',
  (req, res) => {
    const error =
      cleanString(
        req.query.error,
        100
      );

    let message =
      'Entre no Honey Pay com a sua conta Google.';

    if (
      error ===
      'google_cancelled'
    ) {
      message =
        'O login Google foi cancelado.';
    }

    if (
      error ===
      'google_auth_failed'
    ) {
      message =
        'Não foi possível concluir o login Google.';
    }

    if (
      error ===
      'invalid_state'
    ) {
      message =
        'A sessão de autenticação expirou. Tente novamente.';
    }

    if (
      error ===
      'account_disabled'
    ) {
      message =
        'Esta conta está desativada.';
    }

    res
      .status(200)
      .type('html')
      .send(
        `<!DOCTYPE html>
<html lang="pt-PT">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Honey Pay — Entrar</title>
<style>
* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  min-height: 100%;
  font-family:
    Inter,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
  background: #080808;
  color: #fff;
}

body {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.login-card {
  width: 100%;
  max-width: 430px;
  padding: 40px;
  border-radius: 24px;
  background: #111;
  border: 1px solid rgba(255,255,255,.09);
  box-shadow:
    0 30px 80px rgba(0,0,0,.45);
}

.logo {
  width: 54px;
  height: 54px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5c542;
  color: #111;
  font-size: 27px;
  font-weight: 900;
  margin-bottom: 26px;
}

h1 {
  margin: 0 0 10px;
  font-size: 30px;
}

p {
  color: #999;
  line-height: 1.6;
  margin: 0 0 28px;
}

.google-button {
  width: 100%;
  border: 0;
  border-radius: 14px;
  padding: 15px 18px;
  background: #fff;
  color: #111;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  text-decoration: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.google-button:hover {
  opacity: .92;
}

.error {
  margin-bottom: 20px;
  padding: 13px 15px;
  border-radius: 12px;
  background: rgba(255,70,70,.12);
  border: 1px solid rgba(255,70,70,.2);
  color: #ff9b9b;
  font-size: 14px;
  line-height: 1.5;
}
</style>
</head>

<body>

<div class="login-card">

  <div class="logo">
    H
  </div>

  <h1>
    Bem-vindo ao Honey Pay
  </h1>

  <p>
    Gerencie pagamentos, clientes,
    produtos e links de pagamento
    num único lugar.
  </p>

  ${
    error
      ? `<div class="error">${message}</div>`
      : ''
  }

  <a
    class="google-button"
    href="/api/auth/google"
  >
    <span>G</span>
    Continuar com Google
  </a>

</div>

</body>
</html>`
      );
  }
);

/* =========================================================
   SPA ROUTES
========================================================= */

/*
IMPORTANTE:

Somente páginas privadas recebem index.html.

Não colocar /login aqui.
*/

const SPA_ROUTES = [
  '/',
  '/dashboard',
  '/merchant',
  '/payments',
  '/orders',
  '/customers',
  '/products',
  '/payment-links',
  '/reports',
  '/settings'
];

for (
  const route of SPA_ROUTES
) {
  app.get(
    route,
    (req, res) => {
      res.sendFile(
        INDEX_FILE
      );
    }
  );
}

/* =========================================================
   API 404
========================================================= */

app.use(
  '/api',
  (req, res) => {
    return res
      .status(404)
      .json({
        success: false,
        error:
          'API_ROUTE_NOT_FOUND',
        path:
          req.originalUrl
      });
  }
);

/* =========================================================
   FRONTEND FALLBACK
========================================================= */

app.use(
  (req, res) => {
    if (
      req.method !==
      'GET'
    ) {
      return res
        .status(404)
        .send('Not Found');
    }

    /*
    Não transformar caminhos desconhecidos
    em index.html indiscriminadamente.

    Isso evita mascarar erros de rota.
    */

    return res
      .status(404)
      .send('Página não encontrada.');
  }
);

/* =========================================================
   ERROR HANDLER
========================================================= */

app.use(
  (
    error,
    req,
    res,
    next
  ) => {
    console.error(
      'SERVER ERROR:',
      error
    );

    if (
      res.headersSent
    ) {
      return next(error);
    }

    return res
      .status(
        error.status ||
        500
      )
      .json({
        success: false,

        error:
          NODE_ENV ===
          'production'
            ? 'Erro interno do servidor.'
            : error.message
      });
  }
);

/* =========================================================
   DATABASE + SERVER
========================================================= */

async function startServer() {
  try {
    await mongoose.connect(
      MONGODB_URI
    );

    console.log(
      'MongoDB conectado com sucesso.'
    );

    app.listen(
      PORT,
      () => {
        console.log(
          '============================================================'
        );

        console.log(
          'HONEY PAY V3.2.0'
        );

        console.log(
          '============================================================'
        );

        console.log(
          `Servidor: ${APP_BASE_URL}`
        );

        console.log(
          `Google Callback: ${GOOGLE_CALLBACK_URL}`
        );

        console.log(
          `BitPay: ${BITPAY_BASE_URL}`
        );

        console.log(
          `Honey Pay fee: ${HONEY_PAY_FEE_BPS} bps`
        );

        console.log(
          `Multi-merchant BitPay: ${
            BITPAY_MULTI_MERCHANT_ENABLED
              ? 'ENABLED'
              : 'DISABLED'
          }`
        );

        console.log(
          'Auth: Google OAuth + HttpOnly Cookie'
        );

        console.log(
          'Session endpoint: /api/me'
        );

        console.log(
          'Login: /login'
        );

        console.log(
          '============================================================'
        );
      }
    );

  } catch (error) {
    console.error(
      'Falha ao iniciar Honey Pay:',
      error
    );

    process.exit(1);
  }
}

startServer();

/* =========================================================
   EXPORT
========================================================= */

module.exports = app;
