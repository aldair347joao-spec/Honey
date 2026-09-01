/*
============================================================
HONEY PAY
MAIN SERVER
V3.1.0
PRODUCTION BACKEND
============================================================

FOCO ATUAL
------------------------------------------------------------
- Login exclusivo com Google OAuth
- JWT
- MongoDB / Mongoose
- Criação automática de User
- Criação automática de Merchant
- /api/me
- Dashboard
- Customers
- Products
- Orders
- Payments
- Payment Links
- Reports
- BitPay
- BitPay Webhooks
- Refunds
- Audit Logs
- Public Checkout
- Static Frontend
- Security / Rate Limit
- Idempotency

FRONTEND
------------------------------------------------------------
public/index.html
public/app.js

GOOGLE OAUTH
------------------------------------------------------------
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_CALLBACK_URL

JWT
------------------------------------------------------------
JWT_SECRET
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
   CONFIGURATION
========================================================= */

const app = express();

const PORT = Number(process.env.PORT || 10000);
const NODE_ENV = process.env.NODE_ENV || 'development';

const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET;

const GOOGLE_CLIENT_ID =
  process.env.GOOGLE_CLIENT_ID || '';

const GOOGLE_CLIENT_SECRET =
  process.env.GOOGLE_CLIENT_SECRET || '';

const GOOGLE_CALLBACK_URL =
  process.env.GOOGLE_CALLBACK_URL ||
  `${process.env.APP_BASE_URL || `http://localhost:${PORT}`}/api/auth/google/callback`;

const BITPAY_BASE_URL =
  process.env.BITPAY_BASE_URL ||
  'https://api-sandbox.bitpay.ao/v1';

const BITPAY_SECRET_KEY =
  process.env.BITPAY_SECRET_KEY || '';

const BITPAY_WEBHOOK_SECRET =
  process.env.BITPAY_WEBHOOK_SECRET || '';

const APP_BASE_URL =
  process.env.APP_BASE_URL ||
  `http://localhost:${PORT}`;

const HONEY_PAY_FEE_BPS = Number(
  process.env.HONEY_PAY_FEE_BPS || 80
);

const BITPAY_MULTI_MERCHANT_ENABLED =
  String(
    process.env.BITPAY_MULTI_MERCHANT_ENABLED ||
      'false'
  ).toLowerCase() === 'true';

const FRONTEND_DIR =
  path.join(__dirname, 'public');

const INDEX_FILE =
  path.join(FRONTEND_DIR, 'index.html');

const CHECKOUT_FILE =
  path.join(FRONTEND_DIR, 'checkout.html');

/* =========================================================
   REQUIRED ENVIRONMENT
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

app.set('trust proxy', 1);

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: 'cross-origin'
    },
    contentSecurityPolicy: false
  })
);

app.use(
  cors({
    origin: true,
    credentials: true
  })
);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error:
      'Muitas requisições. Tente novamente mais tarde.'
  }
});

app.use('/api', apiLimiter);

/* =========================================================
   WEBHOOK RAW BODY
========================================================= */

app.post(
  '/api/webhooks/bitpay',
  express.raw({
    type: 'application/json'
  }),
  handleBitPayWebhook
);

/* =========================================================
   BODY PARSERS
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

mongoose.set('strictQuery', true);

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log(
      'MongoDB conectado com sucesso.'
    );
  })
  .catch((error) => {
    console.error(
      'Erro ao conectar MongoDB:',
      error
    );

    process.exit(1);
  });

/* =========================================================
   HELPERS
========================================================= */

function normalizeEmail(email) {
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

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function generateToken() {
  return crypto
    .randomBytes(24)
    .toString('hex');
}

function generateReference(
  prefix = 'HP'
) {
  const date = new Date()
    .toISOString()
    .replace(/\D/g, '')
    .slice(0, 14);

  const random = crypto
    .randomBytes(4)
    .toString('hex')
    .toUpperCase();

  return `${prefix}-${date}-${random}`;
}

function calculateFee(amount) {
  const numeric = Number(amount);

  if (
    !Number.isInteger(numeric) ||
    numeric < 0
  ) {
    throw new Error(
      'Valor financeiro inválido.'
    );
  }

  return Math.round(
    (numeric * HONEY_PAY_FEE_BPS) /
      10000
  );
}

/* =========================================================
   COOKIE HELPERS
========================================================= */

function parseCookies(req) {
  const header =
    req.headers.cookie || '';

  const cookies = {};

  for (const part of header.split(';')) {
    const index = part.indexOf('=');

    if (index === -1) {
      continue;
    }

    const key = part
      .slice(0, index)
      .trim();

    const value = part
      .slice(index + 1)
      .trim();

    if (!key) {
      continue;
    }

    try {
      cookies[key] =
        decodeURIComponent(value);
    } catch {
      cookies[key] = value;
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
    `${name}=${encodeURIComponent(value)}`
  ];

  if (options.maxAge !== undefined) {
    parts.push(
      `Max-Age=${Math.floor(
        Number(options.maxAge)
      )}`
    );
  }

  if (options.domain) {
    parts.push(
      `Domain=${options.domain}`
    );
  }

  if (options.path) {
    parts.push(
      `Path=${options.path}`
    );
  }

  if (options.expires) {
    parts.push(
      `Expires=${options.expires.toUTCString()}`
    );
  }

  if (options.httpOnly) {
    parts.push('HttpOnly');
  }

  if (options.secure) {
    parts.push('Secure');
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
          NODE_ENV === 'production',
        sameSite: 'Lax',
        path: '/',
        maxAge:
          30 * 24 * 60 * 60
      }
    )
  );
}

function clearAuthCookie(res) {
  res.setHeader(
    'Set-Cookie',
    serializeCookie(
      'honey_pay_token',
      '',
      {
        httpOnly: true,
        secure:
          NODE_ENV === 'production',
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

function signJWT(user) {
  return jwt.sign(
    {
      sub: String(user._id),
      email: user.email,
      role: user.role || 'merchant'
    },
    JWT_SECRET,
    {
      expiresIn: '30d'
    }
  );
}

function getBearerToken(req) {
  const header =
    req.headers.authorization || '';

  if (
    !header.startsWith('Bearer ')
  ) {
    return null;
  }

  return header
    .slice(7)
    .trim();
}

function getAuthToken(req) {
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

function authenticate(
  req,
  res,
  next
) {
  try {
    const token =
      getAuthToken(req);

    if (!token) {
      return res.status(401).json({
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

    if (!payload.sub) {
      return res.status(401).json({
        success: false,
        error:
          'Token inválido.'
      });
    }

    req.userId =
      payload.sub;

    req.userEmail =
      payload.email || '';

    req.userRole =
      payload.role || 'merchant';

    req.authToken =
      token;

    next();
  } catch {
    return res.status(401).json({
      success: false,
      error:
        'Sessão inválida ou expirada.'
    });
  }
}

function asyncHandler(fn) {
  return function wrapped(
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
   GOOGLE OAUTH HELPERS
========================================================= */

function createOAuthState() {
  return jwt.sign(
    {
      purpose:
        'google_oauth',
      nonce:
        crypto.randomBytes(16).toString('hex')
    },
    JWT_SECRET,
    {
      expiresIn: '10m'
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

    return (
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
    data = {
      raw: text
    };
  }

  if (!response.ok) {
    throw new Error(
      data.error_description ||
        data.error ||
        'Não foi possível autenticar com o Google.'
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
        method: 'GET',

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
      data.error_description ||
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

      /*
      Mantido apenas para compatibilidade
      com utilizadores antigos.
      O login atual é exclusivamente Google.
      */
      passwordHash: {
        type: String,
        default: null
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
        unique: true,
        required: true,
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

CustomerSchema.index({
  merchantId: 1,
  email: 1
});

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

ProductSchema.index({
  merchantId: 1,
  createdAt: -1
});

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
        default: null,
        index: true
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

OrderSchema.index({
  merchantId: 1,
  createdAt: -1
});

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
        enum: [
          'multicaixa_express',
          'multicaixa_reference'
        ],
        required: true
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
          'SUCCEEDED',
          'FAILED',
          'EXPIRED',
          'UNKNOWN',
          'CANCELLED',
          'PARTIALLY_REFUNDED',
          'REFUNDED'
        ],
        default: 'PENDING',
        index: true
      },

      idempotencyKey: {
        type: String,
        unique: true,
        index: true
      },

      providerPayload: {
        type:
          mongoose.Schema.Types.Mixed,
        default: null
      },

      failureReason: {
        type: String,
        default: ''
      },

      succeededAt: {
        type: Date,
        default: null
      }
    },
    {
      timestamps: true
    }
  );

PaymentSchema.index({
  merchantId: 1,
  createdAt: -1
});

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
      },

      totalPayments: {
        type: Number,
        default: 0
      },

      totalReceived: {
        type: Number,
        default: 0
      }
    },
    {
      timestamps: true
    }
  );

const WebhookEventSchema =
  new mongoose.Schema(
    {
      provider: {
        type: String,
        required: true
      },

      eventId: {
        type: String,
        required: true,
        unique: true,
        index: true
      },

      eventType: {
        type: String,
        default: ''
      },

      payload: {
        type:
          mongoose.Schema.Types.Mixed,
        default: null
      },

      processed: {
        type: Boolean,
        default: false
      },

      processedAt: {
        type: Date,
        default: null
      },

      error: {
        type: String,
        default: ''
      }
    },
    {
      timestamps: true
    }
  );

const AuditLogSchema =
  new mongoose.Schema(
    {
      merchantId: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: 'Merchant',
        default: null,
        index: true
      },

      userId: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
      },

      action: {
        type: String,
        required: true
      },

      entity: {
        type: String,
        default: ''
      },

      entityId: {
        type: String,
        default: ''
      },

      metadata: {
        type:
          mongoose.Schema.Types.Mixed,
        default: {}
      },

      ip: {
        type: String,
        default: ''
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
  mongoose.model(
    'User',
    UserSchema
  );

const Merchant =
  mongoose.model(
    'Merchant',
    MerchantSchema
  );

const Customer =
  mongoose.model(
    'Customer',
    CustomerSchema
  );

const Product =
  mongoose.model(
    'Product',
    ProductSchema
  );

const Order =
  mongoose.model(
    'Order',
    OrderSchema
  );

const Payment =
  mongoose.model(
    'Payment',
    PaymentSchema
  );

const PaymentLink =
  mongoose.model(
    'PaymentLink',
    PaymentLinkSchema
  );

const WebhookEvent =
  mongoose.model(
    'WebhookEvent',
    WebhookEventSchema
  );

const AuditLog =
  mongoose.model(
    'AuditLog',
    AuditLogSchema
  );

/* =========================================================
   MERCHANT HELPERS
========================================================= */

async function getMerchantForUser(
  userId
) {
  return Merchant.findOne({
    userId,
    active: true
  });
}

async function requireMerchant(
  req,
  res,
  next
) {
  try {
    const merchant =
      await getMerchantForUser(
        req.userId
      );

    if (!merchant) {
      return res.status(404).json({
        success: false,
        error:
          'Perfil de comerciante não encontrado.'
      });
    }

    req.merchant =
      merchant;

    next();
  } catch (error) {
    next(error);
  }
}

/* =========================================================
   AUDIT
========================================================= */

async function audit(
  req,
  action,
  entity = '',
  entityId = '',
  metadata = {}
) {
  try {
    await AuditLog.create({
      merchantId:
        req.merchant?._id ||
        null,

      userId:
        req.userId ||
        null,

      action,

      entity,

      entityId:
        String(entityId || ''),

      metadata,

      ip:
        req.ip || ''
    });
  } catch (error) {
    console.error(
      'Audit log error:',
      error.message
    );
  }
}

/* =========================================================
   GOOGLE AUTH
========================================================= */

/*
GET /api/auth/google

Inicia o fluxo OAuth.
*/
app.get(
  '/api/auth/google',
  (req, res) => {
    if (
      !GOOGLE_CLIENT_ID ||
      !GOOGLE_CLIENT_SECRET
    ) {
      return res.status(503).json({
        success: false,
        error:
          'Login Google não está configurado no servidor.'
      });
    }

    const url =
      buildGoogleAuthorizationUrl();

    return res.redirect(url);
  }
);

/*
GET /api/auth/google/callback

Recebe o retorno do Google.
*/
app.get(
  '/api/auth/google/callback',
  asyncHandler(
    async (req, res) => {
      try {
        const code =
          cleanString(
            req.query.code,
            5000
          );

        const state =
          cleanString(
            req.query.state,
            5000
          );

        const googleError =
          cleanString(
            req.query.error,
            500
          );

        if (googleError) {
          console.error(
            'Google OAuth:',
            googleError
          );

          return res.redirect(
            '/?google_error=' +
              encodeURIComponent(
                googleError
              )
          );
        }

        if (!code) {
          return res.redirect(
            '/?google_error=missing_code'
          );
        }

        if (!state) {
          return res.redirect(
            '/?google_error=missing_state'
          );
        }

        if (
          !verifyOAuthState(
            state
          )
        ) {
          return res.redirect(
            '/?google_error=invalid_state'
          );
        }

        /*
        Troca authorization code
        por access token.
        */
        const tokens =
          await exchangeGoogleCode(
            code
          );

        if (
          !tokens.access_token
        ) {
          throw new Error(
            'Google não devolveu access token.'
          );
        }

        /*
        Obtém o perfil diretamente
        através da API oficial do Google.
        */
        const googleUser =
          await getGoogleUser(
            tokens.access_token
          );

        const email =
          normalizeEmail(
            googleUser.email
          );

        const name =
          cleanString(
            googleUser.name ||
              googleUser.given_name ||
              'Comerciante',
            120
          );

        const avatar =
          cleanString(
            googleUser.picture ||
              '',
            1000
          );

        const googleId =
          cleanString(
            googleUser.sub ||
              '',
            300
          );

        if (
          !email ||
          !googleId
        ) {
          throw new Error(
            'O Google não forneceu dados suficientes para criar a conta.'
          );
        }

        /*
        O email precisa estar confirmado
        pelo Google.
        */
        if (
          googleUser.email_verified !==
          true
        ) {
          throw new Error(
            'O email da conta Google não está verificado.'
          );
        }

        /*
        Procura utilizador por Google ID
        primeiro.
        */
        let user =
          await User.findOne({
            googleId
          });

        /*
        Se não encontrar pelo Google ID,
        procura pelo email.

        Isto permite que contas antigas
        sejam associadas ao Google.
        */
        if (!user) {
          user =
            await User.findOne({
              email
            });
        }

        let isNewUser = false;

        if (!user) {
          user =
            await User.create({
              name,
              email,
              googleId,
              avatar,
              authProvider:
                'google',
              role:
                'merchant',
              active: true,
              lastLoginAt:
                new Date()
            });

          isNewUser = true;
        } else {
          if (!user.active) {
            return res.redirect(
              '/?google_error=account_disabled'
            );
          }

          user.name =
            name || user.name;

          user.email =
            email;

          user.googleId =
            googleId;

          user.avatar =
            avatar || user.avatar;

          user.authProvider =
            'google';

          user.lastLoginAt =
            new Date();

          await user.save();
        }

        /*
        Cria o Merchant automaticamente
        no primeiro login.
        */
        let merchant =
          await Merchant.findOne({
            userId: user._id
          });

        if (!merchant) {
          merchant =
            await Merchant.create({
              userId:
                user._id,

              businessName:
                name,

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

        /*
        O JWT fica num cookie HttpOnly.
        O public/app.js pode chamar
        /api/me normalmente.
        */
        setAuthCookie(
          res,
          token
        );

        /*
        Também guardamos informações
        temporárias no log, sem guardar
        tokens Google.
        */
        console.log(
          `Google login: ${email} | ${
            isNewUser
              ? 'novo utilizador'
              : 'utilizador existente'
          }`
        );

        /*
        O painel continua sendo
        public/index.html.
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
          '/?google_error=' +
            encodeURIComponent(
              error.message ||
                'google_auth_failed'
            )
        );
      }
    }
  )
);

/*
GET /api/auth/status

Permite ao frontend verificar
se existe sessão.
*/
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

        const user =
          await User.findById(
            payload.sub
          ).select(
            '-passwordHash'
          );

        if (
          !user ||
          !user.active
        ) {
          clearAuthCookie(res);

          return res.json({
            success: true,
            authenticated: false
          });
        }

        return res.json({
          success: true,
          authenticated: true,
          user
        });
      } catch {
        clearAuthCookie(res);

        return res.json({
          success: true,
          authenticated: false
        });
      }
    }
  )
);

/*
POST /api/auth/logout
*/
app.post(
  '/api/auth/logout',
  (req, res) => {
    clearAuthCookie(res);

    res.json({
      success: true
    });
  }
);

/* =========================================================
   /api/me
========================================================= */

app.get(
  '/api/me',
  authenticate,
  asyncHandler(
    async (req, res) => {
      const user =
        await User.findById(
          req.userId
        ).select(
          '-passwordHash'
        );

      if (!user) {
        clearAuthCookie(res);

        return res.status(404).json({
          success: false,
          error:
            'Utilizador não encontrado.'
        });
      }

      if (!user.active) {
        clearAuthCookie(res);

        return res.status(403).json({
          success: false,
          error:
            'Conta desativada.'
        });
      }

      const merchant =
        await getMerchantForUser(
          req.userId
        );

      return res.json({
        success: true,

        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          role: user.role,
          authProvider:
            user.authProvider
        },

        merchant: merchant
          ? {
              id:
                merchant._id,

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
                merchant.provider
            }
          : null
      });
    }
  )
);

/* =========================================================
   MERCHANT
========================================================= */

app.get(
  '/api/merchant',
  authenticate,
  requireMerchant,
  asyncHandler(
    async (req, res) => {
      res.json({
        success: true,
        merchant:
          req.merchant
      });
    }
  )
);

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

      for (
        const field of allowed
      ) {
        if (
          req.body[field] !==
          undefined
        ) {
          req.merchant[field] =
            cleanString(
              req.body[field],
              300
            );
        }
      }

      await req.merchant.save();

      await audit(
        req,
        'MERCHANT_UPDATED',
        'Merchant',
        req.merchant._id
      );

      res.json({
        success: true,
        merchant:
          req.merchant
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
      const page =
        Math.max(
          1,
          Number(
            req.query.page || 1
          )
        );

      const limit =
        Math.min(
          100,
          Math.max(
            1,
            Number(
              req.query.limit ||
                25
            )
          )
        );

      const skip =
        (page - 1) *
        limit;

      const filter = {
        merchantId:
          req.merchant._id
      };

      const search =
        cleanString(
          req.query.search,
          100
        );

      if (search) {
        filter.$or = [
          {
            name: {
              $regex: search,
              $options: 'i'
            }
          },
          {
            email: {
              $regex: search,
              $options: 'i'
            }
          },
          {
            phone: {
              $regex: search,
              $options: 'i'
            }
          }
        ];
      }

      const [
        items,
        total
      ] =
        await Promise.all([
          Customer.find(filter)
            .sort({
              updatedAt: -1
            })
            .skip(skip)
            .limit(limit)
            .lean(),

          Customer.countDocuments(
            filter
          )
        ]);

      res.json({
        success: true,
        items,

        pagination: {
          page,
          limit,
          total,
          pages:
            Math.ceil(
              total / limit
            )
        }
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
            req.merchant._id
        })
          .sort({
            createdAt: -1
          })
          .lean();

      res.json({
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
          200
        );

      const description =
        cleanString(
          req.body.description,
          2000
        );

      const price =
        Number(
          req.body.price
        );

      if (
        !name ||
        !Number.isInteger(
          price
        ) ||
        price <= 0
      ) {
        return res.status(400).json({
          success: false,
          error:
            'Nome e preço válido são obrigatórios.'
        });
      }

      const product =
        await Product.create({
          merchantId:
            req.merchant._id,

          name,

          description,

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

      await audit(
        req,
        'PRODUCT_CREATED',
        'Product',
        product._id
      );

      res.status(201).json({
        success: true,
        product
      });
    }
  )
);

app.patch(
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
        return res.status(400).json({
          success: false,
          error:
            'Produto inválido.'
        });
      }

      const product =
        await Product.findOne({
          _id:
            req.params.id,

          merchantId:
            req.merchant._id
        });

      if (!product) {
        return res.status(404).json({
          success: false,
          error:
            'Produto não encontrado.'
        });
      }

      if (
        req.body.name !==
        undefined
      ) {
        product.name =
          cleanString(
            req.body.name,
            200
          );
      }

      if (
        req.body.description !==
        undefined
      ) {
        product.description =
          cleanString(
            req.body.description,
            2000
          );
      }

      if (
        req.body.price !==
        undefined
      ) {
        const price =
          Number(
            req.body.price
          );

        if (
          !Number.isInteger(
            price
          ) ||
          price <= 0
        ) {
          return res.status(400).json({
            success: false,
            error:
              'Preço inválido.'
          });
        }

        product.price =
          price;
      }

      if (
        req.body.sku !==
        undefined
      ) {
        product.sku =
          cleanString(
            req.body.sku,
            100
          );
      }

      if (
        req.body.image !==
        undefined
      ) {
        product.image =
          cleanString(
            req.body.image,
            1000
          );
      }

      if (
        req.body.active !==
        undefined
      ) {
        product.active =
          Boolean(
            req.body.active
          );
      }

      await product.save();

      res.json({
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
      const product =
        await Product.findOne({
          _id:
            req.params.id,

          merchantId:
            req.merchant._id
        });

      if (!product) {
        return res.status(404).json({
          success: false,
          error:
            'Produto não encontrado.'
        });
      }

      product.active =
        false;

      await product.save();

      await audit(
        req,
        'PRODUCT_DEACTIVATED',
        'Product',
        product._id
      );

      res.json({
        success: true
      });
    }
  )
);

/* =========================================================
   ORDERS
========================================================= */

app.post(
  '/api/orders',
  authenticate,
  requireMerchant,
  asyncHandler(
    async (req, res) => {
      const customerInput =
        req.body.customer ||
        {};

      const itemsInput =
        Array.isArray(
          req.body.items
        )
          ? req.body.items
          : [];

      if (
        !itemsInput.length
      ) {
        return res.status(400).json({
          success: false,
          error:
            'O pedido precisa ter pelo menos um item.'
        });
      }

      let customer = null;

      const customerName =
        cleanString(
          customerInput.name,
          200
        );

      const customerEmail =
        normalizeEmail(
          customerInput.email
        );

      const customerPhone =
        cleanString(
          customerInput.phone,
          50
        );

      if (!customerName) {
        return res.status(400).json({
          success: false,
          error:
            'Nome do cliente é obrigatório.'
        });
      }

      if (customerEmail) {
        customer =
          await Customer.findOne({
            merchantId:
              req.merchant._id,

            email:
              customerEmail
          });
      }

      if (
        !customer &&
        customerPhone
      ) {
        customer =
          await Customer.findOne({
            merchantId:
              req.merchant._id,

            phone:
              customerPhone
          });
      }

      if (!customer) {
        customer =
          await Customer.create({
            merchantId:
              req.merchant._id,

            name:
              customerName,

            email:
              customerEmail,

            phone:
              customerPhone
          });
      } else {
        customer.name =
          customerName;

        if (
          customerEmail
        ) {
          customer.email =
            customerEmail;
        }

        if (
          customerPhone
        ) {
          customer.phone =
            customerPhone;
        }

        await customer.save();
      }

      const items = [];

      let subtotal = 0;

      for (
        const input of itemsInput
      ) {
        const quantity =
          Number(
            input.quantity ||
              1
          );

        if (
          !Number.isInteger(
            quantity
          ) ||
          quantity <= 0
        ) {
          return res.status(400).json({
            success: false,
            error:
              'Quantidade inválida.'
          });
        }

        let product = null;

        if (
          input.productId &&
          isValidObjectId(
            input.productId
          )
        ) {
          product =
            await Product.findOne({
              _id:
                input.productId,

              merchantId:
                req.merchant._id,

              active:
                true
            });
        }

        const unitPrice =
          product
            ? product.price
            : Number(
                input.unitPrice
              );

        const name =
          product
            ? product.name
            : cleanString(
                input.name,
                200
              );

        if (
          !name ||
          !Number.isInteger(
            unitPrice
          ) ||
          unitPrice <= 0
        ) {
          return res.status(400).json({
            success: false,
            error:
              'Item de pedido inválido.'
          });
        }

        const total =
          unitPrice *
          quantity;

        subtotal +=
          total;

        items.push({
          productId:
            product
              ? product._id
              : null,

          name,

          quantity,

          unitPrice,

          total
        });
      }

      const order =
        await Order.create({
          merchantId:
            req.merchant._id,

          customerId:
            customer._id,

          reference:
            generateReference(
              'ORD'
            ),

          items,

          subtotal,

          total:
            subtotal,

          currency:
            'AOA',

          status:
            'PENDING',

          customerSnapshot: {
            name:
              customerName,

            email:
              customerEmail,

            phone:
              customerPhone
          }
        });

      customer.totalOrders +=
        1;

      customer.lastOrderAt =
        new Date();

      await customer.save();

      await audit(
        req,
        'ORDER_CREATED',
        'Order',
        order._id,
        {
          amount:
            order.total
        }
      );

      res.status(201).json({
        success: true,
        order
      });
    }
  )
);

app.get(
  '/api/orders',
  authenticate,
  requireMerchant,
  asyncHandler(
    async (req, res) => {
      const page =
        Math.max(
          1,
          Number(
            req.query.page ||
              1
          )
        );

      const limit =
        Math.min(
          100,
          Math.max(
            1,
            Number(
              req.query.limit ||
                25
            )
          )
        );

      const skip =
        (page - 1) *
        limit;

      const filter = {
        merchantId:
          req.merchant._id
      };

      if (
        req.query.status &&
        [
          'PENDING',
          'PAYMENT_PROCESSING',
          'PAID',
          'FAILED',
          'CANCELLED',
          'REFUNDED',
          'PARTIALLY_REFUNDED'
        ].includes(
          req.query.status
        )
      ) {
        filter.status =
          req.query.status;
      }

      const [
        orders,
        total
      ] =
        await Promise.all([
          Order.find(filter)
            .populate(
              'customerId',
              'name email phone'
            )
            .sort({
              createdAt: -1
            })
            .skip(skip)
            .limit(limit)
            .lean(),

          Order.countDocuments(
            filter
          )
        ]);

      res.json({
        success: true,
        orders,

        pagination: {
          page,
          limit,
          total,
          pages:
            Math.ceil(
              total / limit
            )
        }
      });
    }
  )
);

app.get(
  '/api/orders/:id',
  authenticate,
  requireMerchant,
  asyncHandler(
    async (req, res) => {
      const order =
        await Order.findOne({
          _id:
            req.params.id,

          merchantId:
            req.merchant._id
        })
          .populate(
            'customerId',
            'name email phone totalOrders totalSpent'
          )
          .lean();

      if (!order) {
        return res.status(404).json({
          success: false,
          error:
            'Pedido não encontrado.'
        });
      }

      const payments =
        await Payment.find({
          orderId:
            order._id,

          merchantId:
            req.merchant._id
        })
          .sort({
            createdAt: -1
          })
          .lean();

      res.json({
        success: true,
        order,
        payments
      });
    }
  )
);

/* =========================================================
   PAYMENT LINKS
========================================================= */

app.post(
  '/api/payment-links',
  authenticate,
  requireMerchant,
  asyncHandler(
    async (req, res) => {
      const title =
        cleanString(
          req.body.title,
          200
        );

      const amount =
        Number(
          req.body.amount
        );

      if (
        !title ||
        !Number.isInteger(
          amount
        ) ||
        amount <= 0
      ) {
        return res.status(400).json({
          success: false,
          error:
            'Título e valor válido são obrigatórios.'
        });
      }

      const link =
        await PaymentLink.create({
          merchantId:
            req.merchant._id,

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
            true,

          expiresAt:
            req.body.expiresAt
              ? new Date(
                  req.body.expiresAt
                )
              : null
        });

      const url =
        `${APP_BASE_URL.replace(
          /\/$/,
          ''
        )}/pay/${link.token}`;

      await audit(
        req,
        'PAYMENT_LINK_CREATED',
        'PaymentLink',
        link._id,
        {
          amount
        }
      );

      res.status(201).json({
        success: true,
        link,
        url
      });
    }
  )
);

app.get(
  '/api/payment-links',
  authenticate,
  requireMerchant,
  asyncHandler(
    async (req, res) => {
      const links =
        await PaymentLink.find({
          merchantId:
            req.merchant._id
        })
          .sort({
            createdAt: -1
          })
          .lean();

      const items =
        links.map(
          (link) => ({
            ...link,

            url:
              `${APP_BASE_URL.replace(
                /\/$/,
                ''
              )}/pay/${link.token}`
          })
        );

      res.json({
        success: true,
        links:
          items
      });
    }
  )
);

app.patch(
  '/api/payment-links/:id',
  authenticate,
  requireMerchant,
  asyncHandler(
    async (req, res) => {
      const link =
        await PaymentLink.findOne({
          _id:
            req.params.id,

          merchantId:
            req.merchant._id
        });

      if (!link) {
        return res.status(404).json({
          success: false,
          error:
            'Link não encontrado.'
        });
      }

      if (
        req.body.active !==
        undefined
      ) {
        link.active =
          Boolean(
            req.body.active
          );
      }

      if (
        req.body.title !==
        undefined
      ) {
        link.title =
          cleanString(
            req.body.title,
            200
          );
      }

      if (
        req.body.description !==
        undefined
      ) {
        link.description =
          cleanString(
            req.body.description,
            2000
          );
      }

      await link.save();

      res.json({
        success: true,
        link
      });
    }
  )
);

/* =========================================================
   BITPAY CLIENT
========================================================= */

async function bitpayRequest(
  endpoint,
  options = {}
) {
  if (!BITPAY_SECRET_KEY) {
    throw new Error(
      'BITPAY_SECRET_KEY não configurado.'
    );
  }

  const url =
    `${BITPAY_BASE_URL.replace(
      /\/$/,
      ''
    )}${endpoint}`;

  const headers = {
    Authorization:
      `Bearer ${BITPAY_SECRET_KEY}`,

    'Content-Type':
      'application/json',

    Accept:
      'application/json',

    ...(options.headers || {})
  };

  const response =
    await fetch(
      url,
      {
        method:
          options.method ||
          'GET',

        headers,

        body:
          options.body
      }
    );

  const text =
    await response.text();

  let data;

  try {
    data =
      text
        ? JSON.parse(text)
        : {};
  } catch {
    data = {
      raw: text
    };
  }

  if (!response.ok) {
    const message =
      data?.error?.message ||
      data?.message ||
      data?.error ||
      `BitPay HTTP ${response.status}`;

    const error =
      new Error(
        String(message)
      );

    error.status =
      response.status;

    error.providerResponse =
      data;

    throw error;
  }

  return data;
}

/* =========================================================
   BITPAY PAYMENT CREATION
========================================================= */

async function createBitPayPayment({
  amount,
  paymentMethod,
  customerPhone,
  merchantReference,
  metadata,
  idempotencyKey
}) {
  const payload = {
    amount,

    currency:
      'AOA',

    payment_method:
      paymentMethod,

    merchant_reference:
      merchantReference,

    metadata:
      metadata || {}
  };

  if (
    paymentMethod ===
    'multicaixa_express'
  ) {
    payload.customer = {
      mobile:
        customerPhone
    };
  }

  return bitpayRequest(
    '/payment_intents',
    {
      method:
        'POST',

      headers: {
        'Idempotency-Key':
          idempotencyKey
      },

      body:
        JSON.stringify(
          payload
        )
    }
  );
}

/* =========================================================
   PAYMENT CREATION
========================================================= */

app.post(
  '/api/payments',
  authenticate,
  requireMerchant,
  asyncHandler(
    async (req, res) => {
      const orderId =
        req.body.orderId;

      const paymentMethod =
        req.body.paymentMethod ||
        'multicaixa_express';

      if (
        !isValidObjectId(
          orderId
        )
      ) {
        return res.status(400).json({
          success: false,
          error:
            'Pedido inválido.'
        });
      }

      if (
        ![
          'multicaixa_express',
          'multicaixa_reference'
        ].includes(
          paymentMethod
        )
      ) {
        return res.status(400).json({
          success: false,
          error:
            'Método de pagamento inválido.'
        });
      }

      const order =
        await Order.findOne({
          _id:
            orderId,

          merchantId:
            req.merchant._id
        });

      if (!order) {
        return res.status(404).json({
          success: false,
          error:
            'Pedido não encontrado.'
        });
      }

      if (
        order.status ===
        'PAID'
      ) {
        return res.status(409).json({
          success: false,
          error:
            'Este pedido já está pago.'
        });
      }

      if (
        paymentMethod ===
          'multicaixa_express' &&
        !cleanString(
          req.body.customerPhone,
          30
        )
      ) {
        return res.status(400).json({
          success: false,
          error:
            'O número de telemóvel é obrigatório para Multicaixa Express.'
        });
      }

      const existingActivePayment =
        await Payment.findOne({
          orderId:
            order._id,

          merchantId:
            req.merchant._id,

          status: {
            $in: [
              'PENDING',
              'PROCESSING',
              'UNKNOWN'
            ]
          }
        });

      if (
        existingActivePayment
      ) {
        return res.status(409).json({
          success: false,
          error:
            'Já existe um pagamento ativo ou em reconciliação para este pedido.',

          payment:
            existingActivePayment
        });
      }

      if (
        !BITPAY_MULTI_MERCHANT_ENABLED &&
        req.merchant
          .providerSettlementReady
      ) {
        return res.status(503).json({
          success: false,
          error:
            'A configuração de settlement do comerciante requer ativação do modo multi-merchant da BitPay.'
        });
      }

      const idempotencyKey =
        cleanString(
          req.headers[
            'idempotency-key'
          ],
          200
        ) ||
        crypto.randomUUID();

      const existingByKey =
        await Payment.findOne({
          idempotencyKey
        });

      if (existingByKey) {
        return res.json({
          success: true,
          payment:
            existingByKey,

          idempotent:
            true
        });
      }

      const feeAmount =
        calculateFee(
          order.total
        );

      const payment =
        await Payment.create({
          merchantId:
            req.merchant._id,

          orderId:
            order._id,

          customerId:
            order.customerId,

          reference:
            order.reference,

          provider:
            'bitpay',

          paymentMethod,

          amount:
            order.total,

          feeAmount,

          netAmount:
            order.total -
            feeAmount,

          currency:
            'AOA',

          status:
            'PENDING',

          idempotencyKey
        });

      order.status =
        'PAYMENT_PROCESSING';

      await order.save();

      try {
        const providerResponse =
          await createBitPayPayment({
            amount:
              order.total,

            paymentMethod,

            customerPhone:
              cleanString(
                req.body.customerPhone,
                30
              ) ||
              order
                .customerSnapshot
                ?.phone ||
              '',

            merchantReference:
              order.reference,

            metadata: {
              honeyPayPaymentId:
                String(
                  payment._id
                ),

              honeyPayOrderId:
                String(
                  order._id
                ),

              honeyPayMerchantId:
                String(
                  req.merchant
                    ._id
                )
            },

            idempotencyKey
          });

        payment.providerPaymentId =
          providerResponse?.id ||
          providerResponse
            ?.data?.id ||
          '';

        payment.providerPayload =
          providerResponse;

        payment.status =
          mapBitPayStatus(
            providerResponse?.status ||
              providerResponse
                ?.data?.status ||
              'PENDING'
          );

        await payment.save();

        res.status(201).json({
          success: true,

          payment: {
            id:
              payment._id,

            orderId:
              payment.orderId,

            providerPaymentId:
              payment.providerPaymentId,

            reference:
              payment.reference,

            amount:
              payment.amount,

            feeAmount:
              payment.feeAmount,

            netAmount:
              payment.netAmount,

            currency:
              payment.currency,

            paymentMethod:
              payment.paymentMethod,

            status:
              payment.status
          },

          provider:
            providerResponse
        });
      } catch (error) {
        payment.status =
          'FAILED';

        payment.failureReason =
          error.message ||
          'Erro no provedor.';

        payment.providerPayload =
          error.providerResponse ||
          null;

        await payment.save();

        order.status =
          'FAILED';

        await order.save();

        await audit(
          req,
          'PAYMENT_CREATION_FAILED',
          'Payment',
          payment._id,
          {
            error:
              error.message
          }
        );

        return res.status(
          error.status ===
            400
            ? 400
            : 502
        ).json({
          success: false,
          error:
            error.message ||
            'Não foi possível criar o pagamento.',

          paymentId:
            payment._id
        });
      }
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
      const page =
        Math.max(
          1,
          Number(
            req.query.page ||
              1
          )
        );

      const limit =
        Math.min(
          100,
          Math.max(
            1,
            Number(
              req.query.limit ||
                25
            )
          )
        );

      const filter = {
        merchantId:
          req.merchant._id
      };

      if (
        req.query.status
      ) {
        filter.status =
          req.query.status;
      }

      const [
        payments,
        total
      ] =
        await Promise.all([
          Payment.find(filter)
            .populate(
              'customerId',
              'name email phone'
            )
            .populate(
              'orderId',
              'reference total status'
            )
            .sort({
              createdAt: -1
            })
            .skip(
              (page - 1) *
                limit
            )
            .limit(limit)
            .lean(),

          Payment.countDocuments(
            filter
          )
        ]);

      res.json({
        success: true,
        payments,

        pagination: {
          page,
          limit,
          total,
          pages:
            Math.ceil(
              total / limit
            )
        }
      });
    }
  )
);

app.get(
  '/api/payments/:id',
  authenticate,
  requireMerchant,
  asyncHandler(
    async (req, res) => {
      const payment =
        await Payment.findOne({
          _id:
            req.params.id,

          merchantId:
            req.merchant._id
        })
          .populate(
            'orderId',
            'reference total status items customerSnapshot'
          )
          .populate(
            'customerId',
            'name email phone'
          )
          .lean();

      if (!payment) {
        return res.status(404).json({
          success: false,
          error:
            'Pagamento não encontrado.'
        });
      }

      res.json({
        success: true,
        payment
      });
    }
  )
);

/* =========================================================
   REFUND
========================================================= */

app.post(
  '/api/payments/:id/refund',
  authenticate,
  requireMerchant,
  asyncHandler(
    async (req, res) => {
      const payment =
        await Payment.findOne({
          _id:
            req.params.id,

          merchantId:
            req.merchant._id
        });

      if (!payment) {
        return res.status(404).json({
          success: false,
          error:
            'Pagamento não encontrado.'
        });
      }

      if (
        ![
          'SUCCEEDED',
          'PARTIALLY_REFUNDED'
        ].includes(
          payment.status
        )
      ) {
        return res.status(400).json({
          success: false,
          error:
            'Só pagamentos confirmados podem ser reembolsados.'
        });
      }

      if (
        !payment.providerPaymentId
      ) {
        return res.status(400).json({
          success: false,
          error:
            'Pagamento sem ID do provedor.'
        });
      }

      const amount =
        req.body.amount ===
        undefined
          ? payment.amount
          : Number(
              req.body.amount
            );

      if (
        !Number.isInteger(
          amount
        ) ||
        amount <= 0 ||
        amount >
          payment.amount
      ) {
        return res.status(400).json({
          success: false,
          error:
            'Valor de reembolso inválido.'
        });
      }

      try {
        const response =
          await bitpayRequest(
            '/refunds',
            {
              method:
                'POST',

              headers: {
                'Idempotency-Key':
                  `refund-${payment._id}-${amount}`
              },

              body:
                JSON.stringify({
                  payment_id:
                    payment.providerPaymentId,

                  amount,

                  currency:
                    'AOA',

                  metadata: {
                    honeyPayPaymentId:
                      String(
                        payment._id
                      )
                  }
                })
            }
          );

        await audit(
          req,
          'REFUND_CREATED',
          'Payment',
          payment._id,
          {
            amount
          }
        );

        res.json({
          success: true,
          refund:
            response
        });
      } catch (error) {
        return res.status(502).json({
          success: false,
          error:
            error.message ||
            'Não foi possível criar o reembolso.'
        });
      }
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
        req.merchant._id;

      const [
        successful,
        pending,
        failed,
        customers,
        orders,
        links
      ] =
        await Promise.all([
          Payment.aggregate([
            {
              $match: {
                merchantId,
                status:
                  'SUCCEEDED'
              }
            },

            {
              $group: {
                _id:
                  null,

                count: {
                  $sum: 1
                },

                gross: {
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
          ]),

          Payment.aggregate([
            {
              $match: {
                merchantId,

                status: {
                  $in: [
                    'PENDING',
                    'PROCESSING',
                    'UNKNOWN'
                  ]
                }
              }
            },

            {
              $group: {
                _id:
                  null,

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

          Payment.aggregate([
            {
              $match: {
                merchantId,

                status: {
                  $in: [
                    'FAILED',
                    'EXPIRED'
                  ]
                }
              }
            },

            {
              $group: {
                _id:
                  null,

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

          Customer.countDocuments({
            merchantId
          }),

          Order.countDocuments({
            merchantId
          }),

          PaymentLink.countDocuments({
            merchantId,

            active:
              true
          })
        ]);

      const successfulData =
        successful[0] || {
          count: 0,
          gross: 0,
          fees: 0,
          net: 0
        };

      const pendingData =
        pending[0] || {
          count: 0,
          amount: 0
        };

      const failedData =
        failed[0] || {
          count: 0,
          amount: 0
        };

      const recentPayments =
        await Payment.find({
          merchantId
        })
          .populate(
            'customerId',
            'name email phone'
          )
          .populate(
            'orderId',
            'reference total'
          )
          .sort({
            createdAt: -1
          })
          .limit(10)
          .lean();

      res.json({
        success: true,

        stats: {
          successfulPayments:
            successfulData.count,

          grossVolume:
            successfulData.gross,

          honeyPayFees:
            successfulData.fees,

          netVolume:
            successfulData.net,

          pendingPayments:
            pendingData.count,

          pendingAmount:
            pendingData.amount,

          failedPayments:
            failedData.count,

          failedAmount:
            failedData.amount,

          customers,

          orders,

          activePaymentLinks:
            links
        },

        recentPayments
      });
    }
  )
);

/* =========================================================
   REPORTS
========================================================= */

app.get(
  '/api/reports/overview',
  authenticate,
  requireMerchant,
  asyncHandler(
    async (req, res) => {
      const merchantId =
        req.merchant._id;

      const days =
        Math.min(
          365,
          Math.max(
            1,
            Number(
              req.query.days ||
                30
            )
          )
        );

      const start =
        new Date();

      start.setDate(
        start.getDate() -
          days
      );

      const report =
        await Payment.aggregate([
          {
            $match: {
              merchantId,

              createdAt: {
                $gte:
                  start
              }
            }
          },

          {
            $group: {
              _id: {
                year: {
                  $year:
                    '$createdAt'
                },

                month: {
                  $month:
                    '$createdAt'
                },

                day: {
                  $dayOfMonth:
                    '$createdAt'
                }
              },

              transactions: {
                $sum: 1
              },

              succeeded: {
                $sum: {
                  $cond: [
                    {
                      $eq: [
                        '$status',
                        'SUCCEEDED'
                      ]
                    },

                    1,

                    0
                  ]
                }
              },

              volume: {
                $sum: {
                  $cond: [
                    {
                      $eq: [
                        '$status',
                        'SUCCEEDED'
                      ]
                    },

                    '$amount',

                    0
                  ]
                }
              },

              fees: {
                $sum: {
                  $cond: [
                    {
                      $eq: [
                        '$status',
                        'SUCCEEDED'
                      ]
                    },

                    '$feeAmount',

                    0
                  ]
                }
              }
            }
          },

          {
            $sort: {
              '_id.year': 1,
              '_id.month': 1,
              '_id.day': 1
            }
          }
        ]);

      res.json({
        success: true,
        days,
        report
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
        })
          .populate(
            'merchantId',
            'businessName phone currency'
          )
          .lean();

      if (!link) {
        return res.status(404).json({
          success: false,
          error:
            'Link de pagamento não encontrado.'
        });
      }

      if (
        link.expiresAt &&
        new Date(
          link.expiresAt
        ) <
          new Date()
      ) {
        return res.status(410).json({
          success: false,
          error:
            'Este link de pagamento expirou.'
        });
      }

      res.json({
        success: true,

        link: {
          id:
            link._id,

          token:
            link.token,

          title:
            link.title,

          description:
            link.description,

          amount:
            link.amount,

          currency:
            link.currency,

          merchant:
            link.merchantId
              ? {
                  id:
                    link
                      .merchantId
                      ._id,

                  businessName:
                    link
                      .merchantId
                      .businessName
                }
              : null
        }
      });
    }
  )
);

/* =========================================================
   PUBLIC PAYMENT
========================================================= */

app.post(
  '/api/public/payment-links/:token/pay',
  asyncHandler(
    async (req, res) => {
      const link =
        await PaymentLink.findOne({
          token:
            req.params.token,

          active:
            true
        });

      if (!link) {
        return res.status(404).json({
          success: false,
          error:
            'Link não encontrado.'
        });
      }

      if (
        link.expiresAt &&
        new Date(
          link.expiresAt
        ) <
          new Date()
      ) {
        return res.status(410).json({
          success: false,
          error:
            'Este link expirou.'
        });
      }

      const merchant =
        await Merchant.findOne({
          _id:
            link.merchantId,

          active:
            true
        });

      if (!merchant) {
        return res.status(404).json({
          success: false,
          error:
            'Comerciante indisponível.'
        });
      }

      const customerName =
        cleanString(
          req.body.customerName,
          200
        );

      const customerEmail =
        normalizeEmail(
          req.body.customerEmail
        );

      const customerPhone =
        cleanString(
          req.body.customerPhone,
          30
        );

      const paymentMethod =
        req.body.paymentMethod ||
        'multicaixa_express';

      if (!customerName) {
        return res.status(400).json({
          success: false,
          error:
            'Nome é obrigatório.'
        });
      }

      if (
        paymentMethod ===
          'multicaixa_express' &&
        !customerPhone
      ) {
        return res.status(400).json({
          success: false,
          error:
            'Telemóvel é obrigatório para Multicaixa Express.'
        });
      }

      let customer = null;

      if (customerEmail) {
        customer =
          await Customer.findOne({
            merchantId:
              merchant._id,

            email:
              customerEmail
          });
      }

      if (
        !customer &&
        customerPhone
      ) {
        customer =
          await Customer.findOne({
            merchantId:
              merchant._id,

            phone:
              customerPhone
          });
      }

      if (!customer) {
        customer =
          await Customer.create({
            merchantId:
              merchant._id,

            name:
              customerName,

            email:
              customerEmail,

            phone:
              customerPhone
          });
      }

      const order =
        await Order.create({
          merchantId:
            merchant._id,

          customerId:
            customer._id,

          reference:
            generateReference(
              'ORD'
            ),

          items: [
            {
              productId:
                null,

              name:
                link.title,

              quantity:
                1,

              unitPrice:
                link.amount,

              total:
                link.amount
            }
          ],

          subtotal:
            link.amount,

          total:
            link.amount,

          currency:
            'AOA',

          status:
            'PAYMENT_PROCESSING',

          customerSnapshot: {
            name:
              customerName,

            email:
              customerEmail,

            phone:
              customerPhone
          }
        });

      customer.totalOrders +=
        1;

      customer.lastOrderAt =
        new Date();

      await customer.save();

      const idempotencyKey =
        crypto.randomUUID();

      const feeAmount =
        calculateFee(
          order.total
        );

      const payment =
        await Payment.create({
          merchantId:
            merchant._id,

          orderId:
            order._id,

          customerId:
            customer._id,

          reference:
            order.reference,

          provider:
            'bitpay',

          paymentMethod,

          amount:
            order.total,

          feeAmount,

          netAmount:
            order.total -
            feeAmount,

          currency:
            'AOA',

          status:
            'PENDING',

          idempotencyKey
        });

      try {
        const providerResponse =
          await createBitPayPayment({
            amount:
              order.total,

            paymentMethod,

            customerPhone,

            merchantReference:
              order.reference,

            metadata: {
              honeyPayPaymentId:
                String(
                  payment._id
                ),

              honeyPayOrderId:
                String(
                  order._id
                ),

              honeyPayMerchantId:
                String(
                  merchant._id
                ),

              paymentLinkId:
                String(
                  link._id
                )
            },

            idempotencyKey
          });

        payment.providerPaymentId =
          providerResponse?.id ||
          providerResponse
            ?.data?.id ||
          '';

        payment.providerPayload =
          providerResponse;

        payment.status =
          mapBitPayStatus(
            providerResponse?.status ||
              providerResponse
                ?.data?.status ||
              'PENDING'
          );

        await payment.save();

        link.totalPayments +=
          1;

        await link.save();

        res.status(201).json({
          success: true,

          order: {
            id:
              order._id,

            reference:
              order.reference,

            total:
              order.total
          },

          payment: {
            id:
              payment._id,

            providerPaymentId:
              payment.providerPaymentId,

            status:
              payment.status,

            paymentMethod:
              payment.paymentMethod
          },

          provider:
            providerResponse
        });
      } catch (error) {
        payment.status =
          'FAILED';

        payment.failureReason =
          error.message ||
          '';

        payment.providerPayload =
          error.providerResponse ||
          null;

        await payment.save();

        order.status =
          'FAILED';

        await order.save();

        return res.status(502).json({
          success: false,
          error:
            error.message ||
            'Falha ao criar pagamento.'
        });
      }
    }
  )
);

/* =========================================================
   BITPAY STATUS
========================================================= */

function mapBitPayStatus(
  status
) {
  const normalized =
    String(status || '')
      .toUpperCase();

  const allowed = [
    'PENDING',
    'PROCESSING',
    'SUCCEEDED',
    'FAILED',
    'EXPIRED',
    'UNKNOWN',
    'CANCELLED',
    'PARTIALLY_REFUNDED',
    'REFUNDED'
  ];

  return allowed.includes(
    normalized
  )
    ? normalized
    : 'PENDING';
}

/* =========================================================
   BITPAY WEBHOOK SECURITY
========================================================= */

function parseBitPaySignature(
  header
) {
  const result = {};

  const value =
    String(header || '');

  for (
    const part of
      value.split(',')
  ) {
    const [key, val] =
      part
        .trim()
        .split('=');

    if (
      key &&
      val
    ) {
      result[key] =
        val;
    }
  }

  return result;
}

function verifyBitPayWebhook(
  rawBody,
  signatureHeader
) {
  if (
    !BITPAY_WEBHOOK_SECRET
  ) {
    return false;
  }

  const parsed =
    parseBitPaySignature(
      signatureHeader
    );

  const timestamp =
    parsed.t;

  const signature =
    parsed.v1;

  if (
    !timestamp ||
    !signature
  ) {
    return false;
  }

  const timestampNumber =
    Number(timestamp);

  if (
    !Number.isFinite(
      timestampNumber
    )
  ) {
    return false;
  }

  const age =
    Math.abs(
      Date.now() -
        timestampNumber *
          1000
    );

  if (
    age >
    10 * 60 * 1000
  ) {
    return false;
  }

  const signedPayload =
    `${timestamp}.${rawBody.toString(
      'utf8'
    )}`;

  const expected =
    crypto
      .createHmac(
        'sha256',
        BITPAY_WEBHOOK_SECRET
      )
      .update(
        signedPayload
      )
      .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(
        expected,
        'utf8'
      ),
      Buffer.from(
        signature,
        'utf8'
      )
    );
  } catch {
    return false;
  }
}

/* =========================================================
   BITPAY WEBHOOK
========================================================= */

async function handleBitPayWebhook(
  req,
  res
) {
  try {
    const rawBody =
      Buffer.isBuffer(
        req.body
      )
        ? req.body
        : Buffer.from(
            JSON.stringify(
              req.body || {}
            )
          );

    const signature =
      req.headers[
        'bitpay-signature'
      ];

    if (
      !verifyBitPayWebhook(
        rawBody,
        signature
      )
    ) {
      return res.status(401).json({
        success: false,
        error:
          'Assinatura inválida.'
      });
    }

    let payload;

    try {
      payload =
        JSON.parse(
          rawBody.toString(
            'utf8'
          )
        );
    } catch {
      return res.status(400).json({
        success: false,
        error:
          'Webhook JSON inválido.'
      });
    }

    const eventId =
      payload.id ||
      payload.event_id ||
      payload.eventId;

    const eventType =
      payload.type ||
      payload.event ||
      payload.event_type ||
      '';

    if (!eventId) {
      return res.status(400).json({
        success: false,
        error:
          'Webhook sem identificador de evento.'
      });
    }

    const existing =
      await WebhookEvent.findOne({
        eventId
      });

    if (existing) {
      return res.status(200).json({
        success: true,
        duplicate:
          true
      });
    }

    await WebhookEvent.create({
      provider:
        'bitpay',

      eventId,

      eventType,

      payload,

      processed:
        false
    });

    const providerPaymentId =
      payload.payment_id ||
      payload.paymentId ||
      payload.data
        ?.payment_id ||
      payload.data
        ?.paymentId ||
      payload.data?.id ||
      '';

    const merchantReference =
      payload.merchant_reference ||
      payload.merchantReference ||
      payload.data
        ?.merchant_reference ||
      payload.data
        ?.merchantReference ||
      '';

    let payment =
      null;

    if (
      providerPaymentId
    ) {
      payment =
        await Payment.findOne({
          providerPaymentId
        });
    }

    if (
      !payment &&
      merchantReference
    ) {
      payment =
        await Payment.findOne({
          reference:
            merchantReference
        });
    }

    if (!payment) {
      await WebhookEvent.updateOne(
        {
          eventId
        },
        {
          processed:
            true,

          processedAt:
            new Date(),

          error:
            'Pagamento correspondente ainda não encontrado.'
        }
      );

      return res.status(200).json({
        success: true,
        processed:
          false
      });
    }

    if (
      providerPaymentId &&
      !payment.providerPaymentId
    ) {
      payment.providerPaymentId =
        providerPaymentId;
    }

    const incomingStatus =
      payload.status ||
      payload.data?.status ||
      eventTypeToStatus(
        eventType
      );

    const mappedStatus =
      mapBitPayStatus(
        incomingStatus
      );

    payment.status =
      mappedStatus;

    payment.providerPayload =
      payload;

    if (
      mappedStatus ===
      'FAILED'
    ) {
      payment.failureReason =
        payload.failure_reason ||
        payload.error
          ?.message ||
        payload.data
          ?.error
          ?.message ||
        'Pagamento falhou.';
    }

    if (
      mappedStatus ===
      'SUCCEEDED'
    ) {
      payment.succeededAt =
        payment.succeededAt ||
        new Date();
    }

    await payment.save();

    const order =
      await Order.findById(
        payment.orderId
      );

    if (order) {
      if (
        mappedStatus ===
        'SUCCEEDED'
      ) {
        order.status =
          'PAID';

        order.paidAt =
          order.paidAt ||
          new Date();

        await order.save();

        if (
          payment.customerId
        ) {
          await Customer.updateOne(
            {
              _id:
                payment.customerId
            },
            {
              $inc: {
                totalSpent:
                  payment.amount
              }
            }
          );
        }
      } else if (
        [
          'FAILED',
          'EXPIRED'
        ].includes(
          mappedStatus
        )
      ) {
        if (
          order.status !==
          'PAID'
        ) {
          order.status =
            'FAILED';

          await order.save();
        }
      }
    }

    await WebhookEvent.updateOne(
      {
        eventId
      },
      {
        processed:
          true,

        processedAt:
          new Date(),

        error:
          ''
      }
    );

    return res.status(200).json({
      success: true,
      processed:
        true
    });
  } catch (error) {
    console.error(
      'BitPay webhook error:',
      error
    );

    return res.status(500).json({
      success: false,
      error:
        'Erro interno.'
    });
  }
}

function eventTypeToStatus(
  type
) {
  switch (
    String(type || '')
      .toLowerCase()
  ) {
    case 'payment.succeeded':
    case 'reference.paid':
      return 'SUCCEEDED';

    case 'payment.failed':
      return 'FAILED';

    case 'payment.unknown':
      return 'UNKNOWN';

    case 'payment.reconciled':
      return 'SUCCEEDED';

    case 'payment.created':
      return 'PENDING';

    default:
      return 'PENDING';
  }
}

/* =========================================================
   PAYMENT REFRESH
========================================================= */

app.post(
  '/api/payments/:id/refresh',
  authenticate,
  requireMerchant,
  asyncHandler(
    async (req, res) => {
      const payment =
        await Payment.findOne({
          _id:
            req.params.id,

          merchantId:
            req.merchant._id
        });

      if (!payment) {
        return res.status(404).json({
          success: false,
          error:
            'Pagamento não encontrado.'
        });
      }

      if (
        !payment.providerPaymentId
      ) {
        return res.status(400).json({
          success: false,
          error:
            'Este pagamento ainda não possui ID no provedor.'
        });
      }

      try {
        const providerResponse =
          await bitpayRequest(
            `/payment_intents/${encodeURIComponent(
              payment.providerPaymentId
            )}`
          );

        const status =
          mapBitPayStatus(
            providerResponse?.status ||
              providerResponse
                ?.data?.status
          );

        payment.status =
          status;

        payment.providerPayload =
          providerResponse;

        if (
          status ===
          'SUCCEEDED'
        ) {
          payment.succeededAt =
            payment.succeededAt ||
            new Date();

          const order =
            await Order.findById(
              payment.orderId
            );

          if (
            order &&
            order.status !==
              'PAID'
          ) {
            order.status =
              'PAID';

            order.paidAt =
              new Date();

            await order.save();
          }
        }

        await payment.save();

        res.json({
          success: true,
          payment,
          provider:
            providerResponse
        });
      } catch (error) {
        res.status(502).json({
          success: false,
          error:
            error.message ||
            'Não foi possível consultar o provedor.'
        });
      }
    }
  )
);

/* =========================================================
   HEALTH
========================================================= */

app.get(
  '/health',
  asyncHandler(
    async (req, res) => {
      const mongoReady =
        mongoose.connection
          .readyState ===
        1;

      res.status(
        mongoReady
          ? 200
          : 503
      ).json({
        success:
          mongoReady,

        service:
          'Honey Pay API',

        version:
          '3.1.0',

        environment:
          NODE_ENV,

        database:
          mongoReady
            ? 'connected'
            : 'disconnected',

        googleOAuth:
          Boolean(
            GOOGLE_CLIENT_ID &&
              GOOGLE_CLIENT_SECRET
          ),

        frontend:
          'public/index.html',

        timestamp:
          new Date().toISOString()
      });
    }
  )
);

/* =========================================================
   API STATUS
========================================================= */

app.get(
  '/api',
  (req, res) => {
    res.json({
      success: true,
      name:
        'Honey Pay API',
      version:
        '3.1.0',
      status:
        'operational',

      authentication:
        'Google OAuth',

      frontend:
        'public/index.html'
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
   PUBLIC CHECKOUT
========================================================= */

app.get(
  '/pay/:token',
  (req, res) => {
    res.sendFile(
      CHECKOUT_FILE,
      (error) => {
        if (error) {
          console.error(
            'Checkout error:',
            error
          );

          res.status(404).send(
            'Checkout não encontrado.'
          );
        }
      }
    );
  }
);

/* =========================================================
   SPA FRONTEND ROUTES
========================================================= */

const FRONTEND_ROUTES = [
  '/',
  '/dashboard',
  '/merchant',
  '/payments',
  '/orders',
  '/customers',
  '/products',
  '/payment-links',
  '/reports',
  '/settings',
  '/login'
];

for (
  const route of
    FRONTEND_ROUTES
) {
  app.get(
    route,
    (req, res) => {
      res.sendFile(
        INDEX_FILE,
        (error) => {
          if (error) {
            console.error(
              'Frontend error:',
              error
            );

            res.status(404).send(
              'Frontend não encontrado.'
            );
          }
        }
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
    res.status(404).json({
      success: false,

      error:
        'API_ROUTE_NOT_FOUND',

      path:
        req.originalUrl
    });
  }
);

/* =========================================================
   GLOBAL ERROR HANDLER
========================================================= */

app.use(
  (
    error,
    req,
    res,
    next
  ) => {
    console.error(
      'Unhandled server error:',
      error
    );

    if (
      res.headersSent
    ) {
      return next(error);
    }

    if (
      error.name ===
      'ValidationError'
    ) {
      return res.status(400).json({
        success: false,

        error:
          'Dados inválidos.',

        details:
          Object.values(
            error.errors
          ).map(
            (item) =>
              item.message
          )
      });
    }

    if (
      error.code ===
      11000
    ) {
      return res.status(409).json({
        success: false,

        error:
          'Este registo já existe.'
      });
    }

    res.status(500).json({
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
   START SERVER
========================================================= */

const server =
  app.listen(
    PORT,
    () => {
      console.log(
        '===================================================='
      );

      console.log(
        'HONEY PAY'
      );

      console.log(
        '===================================================='
      );

      console.log(
        `API: http://localhost:${PORT}/api`
      );

      console.log(
        `Frontend: ${INDEX_FILE}`
      );

      console.log(
        `Environment: ${NODE_ENV}`
      );

      console.log(
        `Google OAuth: ${
          GOOGLE_CLIENT_ID &&
          GOOGLE_CLIENT_SECRET
            ? 'CONFIGURADO'
            : 'NÃO CONFIGURADO'
        }`
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
        '===================================================='
      );
    }
  );

/* =========================================================
   PROCESS SAFETY
========================================================= */

process.on(
  'unhandledRejection',
  (reason) => {
    console.error(
      'Unhandled Promise Rejection:',
      reason
    );
  }
);

process.on(
  'uncaughtException',
  (error) => {
    console.error(
      'Uncaught Exception:',
      error
    );
  }
);

/* =========================================================
   GRACEFUL SHUTDOWN
========================================================= */

async function shutdown(
  signal
) {
  console.log(
    `${signal} recebido. Encerrando Honey Pay...`
  );

  try {
    await mongoose.connection.close();

    server.close(
      () => {
        console.log(
          'Honey Pay encerrado corretamente.'
        );

        process.exit(0);
      }
    );
  } catch (error) {
    console.error(
      'Erro durante shutdown:',
      error
    );

    process.exit(1);
  }
}

process.on(
  'SIGTERM',
  () =>
    shutdown('SIGTERM')
);

process.on(
  'SIGINT',
  () =>
    shutdown('SIGINT')
);
