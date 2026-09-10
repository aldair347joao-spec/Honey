/*
============================================================
HONEY PAY
MAIN SERVER
V4.0.0
APPYPAY PAYMENT GATEWAY
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
- AppyPay
- AppyPay Webhook
- Deduplicação de webhooks
- Confirmação automática de pagamentos
- Segurança
- Rate limit
- CORS
- Helmet

TAXA HONEY PAY
------------------------------------------------------------
0,80%

80 basis points = 0,80%

IMPORTANTE
------------------------------------------------------------
A taxa Honey Pay é apenas registada/calculada neste servidor.

A liquidação dos pagamentos é feita através do
gateway/provedor configurado para o comerciante.

Não assumimos split settlement sem suporte contratual/API.

WEBHOOK
------------------------------------------------------------
AppyPay
   ↓
POST /api/webhooks/appypay
   ↓
Deduplicação event_id
   ↓
Atualização do pagamento
   ↓
Payment = PAID
   ↓
Order = PAID
   ↓
Customer atualizado
   ↓
Dashboard atualizado

URL DE PRODUÇÃO
------------------------------------------------------------

https://honey-pay.onrender.com/api/webhooks/appypay

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
const fs = require('fs');
const {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LIST,
  normalizePaymentMethod,
  normalizePaymentMethods,
  isConfigured: isAppyPayConfigured,
  createCharge: createAppyPayCharge,
  getCharge: getAppyPayCharge
} = require('./services/appypay');
const {
  PAYMENT_METHODS: BITPAY_PAYMENT_METHODS,
  normalizePaymentMethod: normalizeBitPayPaymentMethod,
  isConfigured: isBitPayConfigured,
  createPaymentIntent: createBitPayPaymentIntent,
createQRCode: createBitPayQRCode,
getPaymentIntent: getBitPayPaymentIntent,
cancelPaymentIntent: cancelBitPayPaymentIntent
} = require('./services/bitpay');
/* =========================================================
   APP
========================================================= */

const app = express();

const PORT =
  Number(
    process.env.PORT || 10000
  );

const NODE_ENV =
  process.env.NODE_ENV ||
  'development';

/* =========================================================
   ENVIRONMENT
========================================================= */

const MONGODB_URI =
  process.env.MONGODB_URI;

const JWT_SECRET =
  process.env.JWT_SECRET;

const GOOGLE_CLIENT_ID =
  process.env.GOOGLE_CLIENT_ID ||
  '';

const GOOGLE_CLIENT_SECRET =
  process.env.GOOGLE_CLIENT_SECRET ||
  '';

const APP_BASE_URL =
  process.env.APP_BASE_URL ||
  `http://localhost:${PORT}`;

const GOOGLE_CALLBACK_URL =
  process.env.GOOGLE_CALLBACK_URL ||
  `${APP_BASE_URL}/api/auth/google/callback`;

/*
============================================================
HONEY PAY FEE
============================================================

0.80%

80 basis points

Do NOT change this to 90.
============================================================
*/

const HONEY_PAY_FEE_BPS =
  Number(
    process.env.HONEY_PAY_FEE_BPS ||
    80
  );
/* =========================================================
   PATHS
========================================================= */

const FRONTEND_DIR =
  path.join(
    __dirname,
    'public'
  );

const HOME_FILE =
  path.join(
    FRONTEND_DIR,
    'home.html'
  );

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

app.disable(
  'x-powered-by'
);

app.set(
  'trust proxy',
  1
);

app.use(
  helmet({
    contentSecurityPolicy: false,

    crossOriginResourcePolicy: {
      policy:
        'cross-origin'
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

    standardHeaders:
      true,

    legacyHeaders:
      false,

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
   BODY PARSING
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
  return String(
    email || ''
  )
    .trim()
    .toLowerCase();
}

function cleanString(
  value,
  max = 500
) {
  return String(
    value || ''
  )
    .trim()
    .slice(
      0,
      max
    );
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
      .slice(
        0,
        14
      );

  const random =
    crypto
      .randomBytes(4)
      .toString('hex')
      .toUpperCase();

  return `${prefix}-${timestamp}-${random}`;
}

/*
============================================================
HONEY PAY FEE CALCULATION
============================================================

0,80% = 80 / 10000
============================================================
*/

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

function calculateNet(
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

  const fee =
    calculateFee(
      value
    );

  return Math.max(
    0,
    value - fee
  );
}

function isValidObjectId(
  id
) {
  return mongoose.Types.ObjectId.isValid(
    id
  );
}
/* =========================================================
   HONEY PAY - GUE PUBLIC COMPANY LOOKUP
========================================================= */

function normalizeNif(value) {
  return String(value || '')
    .replace(/\D/g, '')
    .trim()
    .slice(0, 20);
}


function decodeHtmlEntities(value) {
  return String(value || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, ' ')
    .replace(/&#(\d+);/g, (_, code) => {
      const number = Number(code);

      if (
        Number.isFinite(number)
      ) {
        return String.fromCharCode(number);
      }

      return _;
    });
}


function stripHtml(value) {
  return decodeHtmlEntities(
    String(value || '')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}


function extractGueCompanyFromHtml(
  html,
  nif
) {
  const cleanNif =
    normalizeNif(nif);

  if (!cleanNif) {
    return null;
  }

  const text =
    stripHtml(html);

  if (!text.includes(cleanNif)) {
    return null;
  }

  /*
   * Procuramos a tabela pública do GUE.
   * O portal apresenta:
   *
   * Firma/Denominação | NIF | Origem
   */

  const rowMatches =
    String(html || '').match(
      /<tr[\s\S]*?<\/tr>/gi
    ) || [];

  for (
    const row of rowMatches
  ) {
    const rowText =
      stripHtml(row);

    if (
      !rowText.includes(
        cleanNif
      )
    ) {
      continue;
    }

    /*
     * Extrair células da linha.
     */

    const cells =
      row.match(
        /<td[\s\S]*?<\/td>/gi
      ) || [];

    if (
      cells.length < 2
    ) {
      continue;
    }

    const values =
      cells.map(
        stripHtml
      );

    const foundNifIndex =
      values.findIndex(
        value =>
          normalizeNif(
            value
          ) === cleanNif
      );

    if (
      foundNifIndex === -1
    ) {
      continue;
    }

    const companyName =
      values
        .slice(
          0,
          foundNifIndex
        )
        .map(
          value =>
            value
              .replace(
                /\(\d{4}-\d{2}-\d{2}\)/g,
                ''
              )
              .trim()
        )
        .filter(Boolean)
        .join(' ')
        .trim();

    if (!companyName) {
      continue;
    }

    return {
      found: true,

      nif:
        cleanNif,

      name:
        companyName,

      source:
        'GUE'
    };
  }

  return null;
}


async function lookupCompanyByNif(
  nif
) {
  const cleanNif =
    normalizeNif(nif);

  if (
    !cleanNif ||
    cleanNif.length < 9
  ) {
    return {
      found: false
    };
  }

  const url =
    'https://gue.gov.ao/portal/publicacao?empresa=' +
    encodeURIComponent(
      cleanNif
    );

  const response =
    await fetch(
      url,
      {
        method:
          'GET',

        headers: {
          'User-Agent':
            'Honey-Pay/1.0',
          'Accept':
            'text/html,application/xhtml+xml'
        },

        redirect:
          'follow',

        signal:
          AbortSignal.timeout(
            12000
          )
      }
    );

  if (
    !response.ok
  ) {
    throw new Error(
      `GUE respondeu com HTTP ${response.status}.`
    );
  }

  const html =
    await response.text();

  const company =
    extractGueCompanyFromHtml(
      html,
      cleanNif
    );

  return (
    company || {
      found: false,
      nif: cleanNif
    }
  );
}
/* =========================================================
   ANGOLA IBAN VALIDATION
========================================================= */

function normalizeIban(value) {
  return String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 25);
}


function validateAngolaIban(
  value
) {
  const iban =
    normalizeIban(value);

  if (
    iban.length !== 25 ||
    !iban.startsWith('AO')
  ) {
    return false;
  }

  const rearranged =
    iban.slice(4) +
    iban.slice(0, 4);

  let numeric = '';

  for (
    const char of rearranged
  ) {
    if (
      char >= 'A' &&
      char <= 'Z'
    ) {
      numeric +=
        String(
          char.charCodeAt(0) -
          55
        );
    } else {
      numeric += char;
    }
  }

  let remainder = 0;

  for (
    let index = 0;
    index < numeric.length;
    index += 7
  ) {
    remainder =
      Number(
        String(remainder) +
        numeric.slice(
          index,
          index + 7
        )
      ) % 97;
  }

  return (
    remainder === 1
  );
}


const ANGOLA_BANKS = {
  '0004':
    'Banco Caixa Geral Angola',

  '0005':
    'Banco de Comércio e Indústria',

  '0006':
    'Banco de Fomento de Angola',

  '0010':
    'Banco de Poupança e Crédito',

  '0040':
    'Banco Angolano de Investimentos',

  '0044':
    'Banco Sol',

  '0045':
    'Banco Económico',

  '0047':
    'Banco KEVE',

  '0051':
    'Banco BIC',

  '0055':
    'Banco Millennium Atlântico',

  '0060':
    'Standard Bank de Angola'
};


function getAngolaBankFromIban(
  iban
) {
  const clean =
    normalizeIban(iban);

  if (
    clean.length !== 25 ||
    !clean.startsWith('AO')
  ) {
    return null;
  }

  const bankCode =
    clean.slice(4, 8);

  const bankName =
    ANGOLA_BANKS[
      bankCode
    ];

  if (!bankName) {
    return null;
  }

  return {
    code:
      bankCode,

    name:
      bankName
  };
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
      fn(
        req,
        res,
        next
      )
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
    req.headers.cookie ||
    '';

  const cookies = {};

  for (
    const part of header.split(';')
  ) {
    const index =
      part.indexOf('=');

    if (
      index === -1
    ) {
      continue;
    }

    const key =
      part
        .slice(
          0,
          index
        )
        .trim();

    const value =
      part
        .slice(
          index + 1
        )
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
    options.maxAge !==
    undefined
  ) {
    parts.push(
      `Max-Age=${Math.floor(
        Number(
          options.maxAge
        )
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

  return parts.join(
    '; '
  );
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
        httpOnly:
          true,

        secure:
          NODE_ENV ===
          'production',

        sameSite:
          'Lax',

        path:
          '/',

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
        httpOnly:
          true,

        secure:
          NODE_ENV ===
          'production',

        sameSite:
          'Lax',

        path:
          '/',

        maxAge:
          0
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
        String(
          user._id
        ),

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
    getBearerToken(
      req
    );

  if (bearer) {
    return bearer;
  }

  const cookies =
    parseCookies(
      req
    );

  return (
    cookies.honey_pay_token ||
    null
  );
}

/* =========================================================
   AUTHENTICATION
========================================================= */

function authenticate(
  req,
  res,
  next
) {
  try {
    const token =
      getAuthToken(
        req
      );

    if (!token) {
      return res
        .status(401)
        .json({
          success:
            false,

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
          success:
            false,

          error:
            'Token inválido.'
        });
    }

    req.userId =
      String(
        payload.sub
      );

    req.userEmail =
      payload.email ||
      '';

    req.userRole =
      payload.role ||
      'merchant';

    req.authToken =
      token;

    next();

  } catch {
    return res
      .status(401)
      .json({
        success:
          false,

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
        method:
          'POST',

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
        ? JSON.parse(
            text
          )
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
        ? JSON.parse(
            text
          )
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
        type:
          String,

        required:
          true,

        trim:
          true
      },

      email: {
        type:
          String,

        required:
          true,

        unique:
          true,

        lowercase:
          true,

        trim:
          true,

        index:
          true
      },

      googleId: {
        type:
          String,

        default:
          '',

        index:
          true
      },

      avatar: {
        type:
          String,

        default:
          ''
      },

      authProvider: {
        type:
          String,

        enum: [
          'google',
          'legacy'
        ],

        default:
          'google'
      },

      role: {
        type:
          String,

        enum: [
          'merchant',
          'admin'
        ],

        default:
          'merchant'
      },

      active: {
        type:
          Boolean,

        default:
          true
      },

      lastLoginAt: {
        type:
          Date,

        default:
          null
      }
    },

    {
      timestamps:
        true
    }
  );

const MerchantSchema =
  new mongoose.Schema(
    {
      userId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          'User',

        required:
          true,

        unique:
          true,

        index:
          true
      },

      businessName: {
        type:
          String,

        default:
          ''
      },

      phone: {
        type:
          String,

        default:
          ''
      },

      nif: {
        type:
          String,

        default:
          ''
      },

      address: {
        type:
          String,

        default:
          ''
      },

      city: {
        type:
          String,

        default:
          ''
      },

      country: {
        type:
          String,

        default:
          'AO'
      },

      currency: {
        type:
          String,

        default:
          'AOA'
      },

      provider: {
  type:
    String,

  default:
    'appypay',

  enum: [
    'appypay',
    'bitpay'
  ]
},
      providerAccountRef: {
        type:
          String,

        default:
          ''
      },

      providerSettlementReady: {
        type:
          Boolean,

        default:
          false
      },
      onboardingCompleted: {
  type:
    Boolean,

  default:
    false,

  index:
    true
},

onboardingCompletedAt: {
  type:
    Date,

  default:
    null
},
       
      active: {
        type:
          Boolean,

        default:
          true
      }
    },

    {
      timestamps:
        true
    }
  );

const CustomerSchema =
  new mongoose.Schema(
    {
      merchantId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          'Merchant',

        required:
          true,

        index:
          true
      },

      name: {
        type:
          String,

        required:
          true,

        trim:
          true
      },

      email: {
        type:
          String,

        default:
          '',

        lowercase:
          true,

        trim:
          true
      },

      phone: {
        type:
          String,

        default:
          ''
      },

      notes: {
        type:
          String,

        default:
          ''
      },

      totalOrders: {
        type:
          Number,

        default:
          0
      },

      totalSpent: {
        type:
          Number,

        default:
          0
      },

      lastOrderAt: {
        type:
          Date,

        default:
          null
      }
    },

    {
      timestamps:
        true
    }
  );

const ProductSchema =
  new mongoose.Schema(
    {
      merchantId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          'Merchant',

        required:
          true,

        index:
          true
      },

      name: {
        type:
          String,

        required:
          true,

        trim:
          true
      },

      description: {
        type:
          String,

        default:
          ''
      },

      sku: {
        type:
          String,

        default:
          ''
      },

      price: {
        type:
          Number,

        required:
          true,

        min:
          1
      },

      currency: {
        type:
          String,

        default:
          'AOA'
      },

      image: {
        type:
          String,

        default:
          ''
      },

      active: {
        type:
          Boolean,

        default:
          true
      },

      stock: {
        type:
          Number,

        default:
          null
      }
    },

    {
      timestamps:
        true
    }
  );

const OrderSchema =
  new mongoose.Schema(
    {
      merchantId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          'Merchant',

        required:
          true,

        index:
          true
      },

      customerId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          'Customer',

        default:
          null
      },

      reference: {
        type:
          String,

        unique:
          true,

        index:
          true
      },

      items: [
        {
          productId: {
            type:
              mongoose.Schema.Types.ObjectId,

            ref:
              'Product',

            default:
              null
          },

          name:
            String,

          quantity: {
            type:
              Number,

            min:
              1
          },

          unitPrice: {
            type:
              Number,

            min:
              0
          },

          total: {
            type:
              Number,

            min:
              0
          }
        }
      ],

      subtotal: {
        type:
          Number,

        required:
          true,

        min:
          0
      },

      total: {
        type:
          Number,

        required:
          true,

        min:
          1
      },

      currency: {
        type:
          String,

        default:
          'AOA'
      },

      status: {
        type:
          String,

        enum: [
          'PENDING',
          'PAYMENT_PROCESSING',
          'PAID',
          'FAILED',
          'CANCELLED',
          'REFUNDED',
          'PARTIALLY_REFUNDED'
        ],

        default:
          'PENDING',

        index:
          true
      },

      customerSnapshot: {
        name:
          String,

        email:
          String,

        phone:
          String
      },

      paidAt: {
        type:
          Date,

        default:
          null
      }
    },

    {
      timestamps:
        true
    }
  );

const PaymentSchema =
  new mongoose.Schema(
    {
      merchantId: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref:
          'Merchant',
        required:
          true,
        index:
          true
      },

      orderId: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref:
          'Order',
        required:
          true,
        index:
          true
      },

      customerId: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref:
          'Customer',
        default:
          null
      },
      idempotencyKey: {
        type:
          String,

        required:
          true,

        unique:
          true,

        index:
          true,

        trim:
          true
      },
      reference: {
        type:
          String,
        required:
          true,
        index:
          true
      },

      provider: {
  type:
    String,

  enum: [
    'appypay',
    'bitpay'
  ],

  default:
    'appypay',

  index:
    true
},

      providerPaymentId: {
        type:
          String,
        default:
          '',
        index:
          true
      },

      providerMethod: {
        type:
          String,
        default:
          '',
        index:
          true
      },

      paymentMethod: {
        type:
          String,
        enum: [
          'multicaixa_express',
          'reference',
          'unitel_money',
          'direct_debit'
        ],
        default:
          'multicaixa_express',
        index:
          true
      },

      providerRawStatus: {
        type:
          String,
        default:
          ''
      },

      providerReferenceEntity: {
        type:
          String,
        default:
          ''
      },

      providerReferenceNumber: {
        type:
          String,
        default:
          ''
      },

      checkoutUrl: {
        type:
          String,
        default:
          ''
      },

      providerQrCode: {
        type:
          String,
        default:
          ''
      },

      providerResponse: {
        type:
          mongoose.Schema.Types.Mixed,
        default:
          null
      },

      metadata: {
        type:
          mongoose.Schema.Types.Mixed,
        default:
          {}
      },

      amount: {
        type:
          Number,
        required:
          true,
        min:
          1
      },

      feeAmount: {
        type:
          Number,
        default:
          0,
        min:
          0
      },

      netAmount: {
        type:
          Number,
        default:
          0,
        min:
          0
      },

      currency: {
        type:
          String,
        default:
          'AOA'
      },

      status: {
        type:
          String,
        enum: [
          'PENDING',
          'PROCESSING',
          'PAID',
          'FAILED',
          'CANCELLED',
          'REFUNDED',
          'PARTIALLY_REFUNDED'
        ],
        default:
          'PENDING',
        index:
          true
      },

      paidAt: {
        type:
          Date,
        default:
          null
      }
    },

    {
      timestamps:
        true
    }
  );
/* =========================================================
   BANK ACCOUNT
   ========================================================= */

const BankAccountSchema =
  new mongoose.Schema(
    {
      merchantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Merchant',
        required: true,
        index: true
      },

      bankName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 120
      },

      accountNumber: {
        type: String,
        default: '',
        trim: true,
        maxlength: 80
      },

      iban: {
        type: String,
        default: '',
        trim: true,
        maxlength: 80
      },

      accountHolder: {
        type: String,
        required: true,
        trim: true,
        maxlength: 160
      },

      alias: {
        type: String,
        default: '',
        trim: true,
        maxlength: 120
      },
phone: {
  type: String,
  default: '',
  trim: true,
  maxlength: 40
},
      active: {
        type: Boolean,
        default: true,
        index: true
      },

      isDefault: {
        type: Boolean,
        default: false,
        index: true
      }
    },
    {
      timestamps: true
    }
  );

BankAccountSchema.index({
  merchantId: 1,
  active: 1
});
const PaymentLinkSchema =
  new mongoose.Schema(
    {
      merchantId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          'Merchant',

        required:
          true,

        index:
          true
      },

      token: {
        type:
          String,

        unique:
          true,

        index:
          true
      },

      title: {
        type:
          String,

        required:
          true
      },

      description: {
        type:
          String,

        default:
          ''
      },

      amount: {
        type:
          Number,

        required:
          true,

        min:
          1
      },

      currency: {
        type:
          String,

        default:
          'AOA'
      },

      active: {
        type:
          Boolean,

        default:
          true
      },

      expiresAt: {
        type:
          Date,

        default:
          null
      },
           productId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          'Product',

        default:
          null
      },
bankAccountId: {
  type:
    mongoose.Schema.Types.ObjectId,

  ref:
    'BankAccount',

  default:
    null,

  index:
    true
},
      paymentMethods: {
  type: [
    {
      type: String,
      enum: [
        'multicaixa_express',
        'reference',
        'unitel_money',
        'direct_debit'
      ]
    }
  ],
  default: [
    'multicaixa_express',
    'reference',
    'unitel_money'
  ]
},

checkoutMode: {
  type: String,
  enum: [
    'customer_choice',
    'single_method'
  ],
  default: 'customer_choice'
},

selectedPaymentMethod: {
  type: String,
  default: ''
},

qrEnabled: {
  type: Boolean,
  default: true
},

qrType: {
  type: String,
  enum: [
    'checkout',
    'appypay'
  ],
  default: 'appypay'
},

appypayQrId: {
  type: String,
  default: ''
},

appypayQrUrl: {
  type: String,
  default: ''
},

      qrSvg: {
        type:
          String,

        default:
          ''
      },

      qrUrl: {
        type:
          String,

        default:
          ''
      } 
    },

    {
      timestamps:
        true
    }
  );

/*
============================================================
WEBHOOK EVENT MODEL
============================================================

Guarda cada event_id recebido pela BitPay.

Isto protege contra retries e entregas duplicadas.
============================================================
*/

const WebhookEventSchema =
  new mongoose.Schema(
    {
      eventId: {
        type:
          String,

        required:
          true,

        unique:
          true,

        index:
          true
      },

      type: {
        type:
          String,

        default:
          ''
      },

      status: {
        type:
          String,

        enum: [
          'RECEIVED',
          'PROCESSED',
          'FAILED',
          'IGNORED'
        ],

        default:
          'RECEIVED'
      },

      receivedAt: {
        type:
          Date,

        default:
          Date.now
      },

      processedAt: {
        type:
          Date,

        default:
          null
      },

      error: {
        type:
          String,

        default:
          ''
      },

      payload: {
        type:
          mongoose.Schema.Types.Mixed,

        default:
          null
      }
    },

    {
      timestamps:
        true
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
const BankAccount =
  mongoose.models.BankAccount ||
  mongoose.model(
    'BankAccount',
    BankAccountSchema
  );
const PaymentLink =
  mongoose.models.PaymentLink ||
  mongoose.model(
    'PaymentLink',
    PaymentLinkSchema
  );

const WebhookEvent =
  mongoose.models.WebhookEvent ||
  mongoose.model(
    'WebhookEvent',
    WebhookEventSchema
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
        userId:
          req.userId,

        active:
          true
      }).lean();

    if (!merchant) {
      return res
        .status(403)
        .json({
          success:
            false,

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
   PRIVATE FRONTEND MIDDLEWARE
   Protege o dashboard e o /index.html
========================================================= */

function requirePrivatePage(
  req,
  res,
  next
) {
  try {
    const token =
      getAuthToken(req);

    if (!token) {
      return res.redirect(
        '/login'
      );
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
      return res.redirect(
        '/login'
      );
    }

    req.userId =
      String(
        payload.sub
      );

    req.userEmail =
      payload.email ||
      '';

    req.userRole =
      payload.role ||
      'merchant';

    req.authToken =
      token;

    return next();

  } catch {
    return res.redirect(
      '/login'
    );
  }
}
/* =========================================================
   HEALTH
========================================================= */

app.get(
  '/api/health',
  (req, res) => {
    res.json({
      success:
        true,

      service:
        'Honey Pay',

      version:
        '4.0.0',

      status:
        'ok',

      database:
        mongoose.connection.readyState ===
        1
          ? 'connected'
          : 'disconnected'
    });
  }
);

/* =========================================================
   APPYPAY WEBHOOK
   ========================================================= */

app.post(
  '/api/webhooks/appypay',

  asyncHandler(
    async (
      req,
      res
    ) => {

      const event =
        req.body || {};

      /*
      --------------------------------------------------------
      SEGREDO OPCIONAL
      --------------------------------------------------------
      --------------------------------------------------------
      Quando a AppyPay fornecer o mecanismo/segredo de
      assinatura da conta Honey Pay, configuramos aqui.
      --------------------------------------------------------
      */

      const configuredSecret =
        process.env.APPYPAY_WEBHOOK_SECRET ||
        '';

      if (configuredSecret) {

        const receivedSecret =
          req.headers[
            'x-appypay-webhook-secret'
          ] ||
          req.headers[
            'x-webhook-secret'
          ];

        if (
          receivedSecret !==
          configuredSecret
        ) {

          return res
            .status(401)
            .json({
              success:
                false,

              error:
                'Webhook AppyPay não autorizado.'
            });
        }
      }

      /*
      --------------------------------------------------------
      EVENT ID
      --------------------------------------------------------
      */

      const eventId =
        String(
          event?.id ||
          event?.event_id ||
          event?.eventId ||
          event?.notification_id ||
          event?.notificationId ||
          crypto
            .createHash('sha256')
            .update(
              JSON.stringify(
                event
              )
            )
            .digest('hex')
        );

      const eventType =
        String(
          event?.type ||
          event?.event ||
          event?.name ||
          'payment.updated'
        );

      /*
      --------------------------------------------------------
      DEDUPLICAÇÃO
      --------------------------------------------------------
      */

      try {

        await WebhookEvent.create({

          eventId,

          type:
            eventType,

          status:
            'RECEIVED',

          payload:
            event
        });

      } catch (error) {

        if (
          error?.code ===
          11000
        ) {

          return res
            .status(200)
            .json({
              success:
                true,

              duplicate:
                true
            });
        }

        throw error;
      }

      /*
      --------------------------------------------------------
      PROVIDER PAYMENT ID
      --------------------------------------------------------
      */

      const providerPaymentId =
        String(
          event?.paymentId ||
          event?.payment_id ||
          event?.chargeId ||
          event?.charge_id ||
          event?.data?.paymentId ||
          event?.data?.payment_id ||
          event?.data?.chargeId ||
          event?.data?.charge_id ||
          event?.data?.id ||
          event?.resource?.id ||
          event?.object?.id ||
          ''
        );

      if (!providerPaymentId) {

        return res
          .status(200)
          .json({
            success:
              true,

            processed:
              false,

            reason:
              'provider_payment_id_not_found'
          });
      }

      /*
      --------------------------------------------------------
      STATUS
      --------------------------------------------------------
      */

      const rawStatus =
        String(
          event?.status ||
          event?.paymentStatus ||
          event?.payment_status ||
          event?.data?.status ||
          event?.data?.paymentStatus ||
          event?.data?.payment_status ||
          event?.resource?.status ||
          event?.object?.status ||
          ''
        ).toUpperCase();

      let localStatus =
        null;

      if (
        [
          'PAID',
          'SUCCESS',
          'SUCCEEDED',
          'COMPLETED',
          'CONFIRMED'
        ].includes(
          rawStatus
        )
      ) {

        localStatus =
          'PAID';

      } else if (
        [
          'FAILED',
          'REJECTED',
          'DECLINED',
          'CANCELLED',
          'EXPIRED'
        ].includes(
          rawStatus
        )
      ) {

        localStatus =
          'FAILED';

      } else if (
        [
          'PROCESSING',
          'PENDING',
          'CREATED',
          'WAITING'
        ].includes(
          rawStatus
        )
      ) {

        localStatus =
          'PROCESSING';
      }

      /*
      --------------------------------------------------------
      PAYMENT
      --------------------------------------------------------
      */

      const payment =
        await Payment.findOne({
          provider:
            'appypay',

          providerPaymentId
        });

      if (!payment) {

        return res
          .status(200)
          .json({
            success:
              true,

            processed:
              false,

            reason:
              'payment_not_found'
          });
      }

      if (localStatus) {

        payment.status =
          localStatus;
      }

      payment.providerRawStatus =
        rawStatus ||
        payment.providerRawStatus;

      payment.providerResponse =
        event;

      if (
        localStatus ===
        'PAID' &&
        !payment.paidAt
      ) {

        payment.paidAt =
          new Date();
      }

      await payment.save();

      /*
      --------------------------------------------------------
      ORDER
      --------------------------------------------------------
      */

      if (
        localStatus ===
        'PAID'
      ) {

        await Order.findByIdAndUpdate(
          payment.orderId,

          {
            $set: {

              status:
                'PAID',

              paidAt:
                payment.paidAt ||
                new Date()
            }
          }
        );

      } else if (
        localStatus ===
        'FAILED'
      ) {

        await Order.findByIdAndUpdate(
          payment.orderId,

          {
            $set: {
              status:
                'FAILED'
            }
          }
        );
      }

      /*
      --------------------------------------------------------
      WEBHOOK PROCESSADO
      --------------------------------------------------------
      */

      await WebhookEvent.updateOne(
        {
          eventId
        },

        {
          $set: {
            status:
              'PROCESSED'
          }
        }
      );

      return res
        .status(200)
        .json({
          success:
            true,

          processed:
            true
        });
    }
  )
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
    async (
      req,
      res
    ) => {
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
        !verifyOAuthState(
          state
        )
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
          googleUser.email_verified ===
          false
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
                    email.split(
                      '@'
                    )[0],
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
                    email.split(
                      '@'
                    )[0],
                  150
                ),

              country:
                'AO',

              currency:
                'AOA',

              provider:
                'appypay',

              active:
                true
            });
        }

        const token =
          signJWT(
            user
          );

        setAuthCookie(
          res,
          token
        );

        if (
  merchant.onboardingCompleted
) {
  return res.redirect(
    '/index.html'
  );
}

return res.redirect(
  '/onboarding.html'
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
    async (
      req,
      res
    ) => {
      const token =
        getAuthToken(
          req
        );

      if (!token) {
        return res.json({
          success:
            true,

          authenticated:
            false
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
            success:
              true,

            authenticated:
              false
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
            success:
              true,

            authenticated:
              false
          });
        }

        return res.json({
          success:
            true,

          authenticated:
            true,

          user: {
            id:
              String(
                user._id
              ),

            name:
              user.name,

            email:
              user.email,

            avatar:
              user.avatar ||
              '',

            role:
              user.role
          }
        });

      } catch {
        return res.json({
          success:
            true,

          authenticated:
            false
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
      success:
        true
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
    async (
      req,
      res
    ) => {
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
            success:
              false,

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
            success:
              false,

            error:
              'Merchant não encontrado.'
          });
      }

      return res.json({
        success:
          true,

        user: {
          id:
            String(
              user._id
            ),

          name:
            user.name,

          email:
            user.email,

          avatar:
            user.avatar ||
            '',

          role:
            user.role
        },

        merchant: {
          id:
            String(
              merchant._id
            ),

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
   ONBOARDING
========================================================= */

/*
GET ONBOARDING STATUS
*/

app.get(
  '/api/onboarding/status',

  authenticate,

  asyncHandler(
    async (
      req,
      res
    ) => {

      const merchant =
        await Merchant.findOne({
          userId:
            req.userId
        }).lean();

      if (!merchant) {
        return res
          .status(404)
          .json({
            success:
              false,

            error:
              'Merchant não encontrado.'
          });
      }

      return res.json({
        success:
          true,

        authenticated:
          true,

        onboardingCompleted:
          Boolean(
            merchant.onboardingCompleted
          ),

        merchant: {
          id:
            String(
              merchant._id
            ),

          businessName:
            merchant.businessName ||
            '',

          nif:
            merchant.nif ||
            ''
        }
      });
    }
  )
);


/*
POST VERIFY COMPANY
*/

app.post(
  '/api/onboarding/company',

  authenticate,

  asyncHandler(
    async (
      req,
      res
    ) => {

      const nif =
        normalizeNif(
          req.body.nif
        );

      if (
        !nif ||
        nif.length < 9
      ) {
        return res
          .status(400)
          .json({
            success:
              false,

            error:
              'NIF inválido.'
          });
      }

      let company;

      try {

        company =
          await lookupCompanyByNif(
            nif
          );

      } catch (error) {

        console.error(
          'GUE lookup error:',
          error
        );

        return res
          .status(502)
          .json({
            success:
              false,

            error:
              'Não foi possível consultar o GUE neste momento. Tente novamente.'
          });
      }

      if (
        !company ||
        !company.found
      ) {
        return res
          .status(404)
          .json({
            success:
              false,

            error:
              'Empresa não encontrada.'
          });
      }

      return res.json({
        success:
          true,

        company: {
          found:
            true,

          nif:
            company.nif,

          name:
            company.name,

          source:
            'GUE'
        }
      });
    }
  )
);

function requireCompletedOnboarding(
  req,
  res,
  next
) {
  if (
    !req.merchant
  ) {
    return res
      .status(403)
      .json({
        success:
          false,

        error:
          'Merchant não encontrado.'
      });
  }

  if (
    !req.merchant.onboardingCompleted
  ) {
    return res
      .status(403)
      .json({
        success:
          false,

        error:
          'Configuração empresarial incompleta.',

        code:
          'ONBOARDING_REQUIRED',

        redirect:
          '/onboarding.html'
      });
  }

  next();
}
/*
POST COMPLETE ONBOARDING
*/

app.post(
  '/api/onboarding/complete',

  authenticate,

  asyncHandler(
    async (
      req,
      res
    ) => {

      const nif =
        normalizeNif(
          req.body.nif
        );

      const businessName =
        cleanString(
          req.body.businessName,
          500
        );

      const iban =
        normalizeIban(
          req.body.iban
        );

      if (
        !nif ||
        !businessName ||
        !iban
      ) {
        return res
          .status(400)
          .json({
            success:
              false,

            error:
              'NIF, empresa e IBAN são obrigatórios.'
          });
      }

      /*
       * Verificar novamente a empresa
       * no GUE.
       */

      let company;

      try {

        company =
          await lookupCompanyByNif(
            nif
          );

      } catch (error) {

        console.error(
          'GUE final verification error:',
          error
        );

        return res
          .status(502)
          .json({
            success:
              false,

            error:
              'Não foi possível confirmar a empresa no GUE.'
          });
      }

      if (
        !company ||
        !company.found
      ) {
        return res
          .status(400)
          .json({
            success:
              false,

            error:
              'Empresa não encontrada no GUE.'
          });
      }

      /*
       * Nunca confiar no nome enviado
       * pelo navegador.
       */

      const officialBusinessName =
        cleanString(
          company.name,
          500
        );

      /*
       * Validar IBAN novamente.
       */

      if (
        !validateAngolaIban(
          iban
        )
      ) {
        return res
          .status(400)
          .json({
            success:
              false,

            error:
              'IBAN inválido.'
          });
      }

      const bank =
        getAngolaBankFromIban(
          iban
        );

      if (!bank) {
        return res
          .status(400)
          .json({
            success:
              false,

            error:
              'Não foi possível identificar o banco através do IBAN.'
          });
      }

      const merchant =
        await Merchant.findOne({
          userId:
            req.userId
        });

      if (!merchant) {
        return res
          .status(404)
          .json({
            success:
              false,

            error:
              'Merchant não encontrado.'
          });
      }

      /*
       * Atualizar empresa.
       */

      merchant.nif =
        company.nif;

      merchant.businessName =
        officialBusinessName;

      merchant.country =
        'AO';

      merchant.currency =
        'AOA';

      merchant.onboardingCompleted =
        true;

      merchant.onboardingCompletedAt =
        new Date();

      await merchant.save();


      /*
       * Desativar contas anteriores
       * marcadas como padrão.
       */

      await BankAccount.updateMany(
        {
          merchantId:
            merchant._id,

          active:
            true
        },

        {
          $set: {
            isDefault:
              false
          }
        }
      );


      /*
       * Criar conta de liquidação.
       */

      const account =
        await BankAccount.create({
          merchantId:
            merchant._id,

          bankName:
            bank.name,

          accountNumber:
            '',

          iban:
            iban,

          accountHolder:
            officialBusinessName,

          alias:
            'Conta principal',

          phone:
            merchant.phone ||
            '',

          active:
            true,

          isDefault:
            true
        });


      return res.json({
        success:
          true,

        onboardingCompleted:
          true,

        merchant: {
          id:
            String(
              merchant._id
            ),

          businessName:
            officialBusinessName,

          nif:
            company.nif
        },

        bankAccount: {
          id:
            String(
              account._id
            ),

          bankName:
            bank.name,

          bankCode:
            bank.code
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
    async (
      req,
      res
    ) => {
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

            active:
              true
          }),

          PaymentLink.countDocuments({
            merchantId,

            active:
              true
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
              _id:
                null,

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
          total:
            0,

          fees:
            0,

          net:
            0
        };

      const recentOrders =
        await Order.find({
          merchantId
        })
          .sort({
            createdAt:
              -1
          })
          .limit(10)
          .lean();

      return res.json({
        success:
          true,

        dashboard: {
          totalOrders,

          paidOrders,

          pendingOrders,

          totalCustomers,

          totalProducts,

          totalLinks,

          totalRevenue:
            totals.total ||
            0,

          totalFees:
            totals.fees ||
            0,

          netRevenue:
            totals.net ||
            0,

          honeyPayFeeBps:
            HONEY_PAY_FEE_BPS,

          honeyPayFeePercent:
            HONEY_PAY_FEE_BPS /
            100,

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
    async (
      req,
      res
    ) => {
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
            new:
              true
          }
        ).lean();

      return res.json({
        success:
          true,

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
    async (
      req,
      res
    ) => {
      const customers =
        await Customer.find({
          merchantId:
            req.merchantId
        })
          .sort({
            createdAt:
              -1
          })
          .lean();

      return res.json({
        success:
          true,

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
    async (
      req,
      res
    ) => {
      const name =
        cleanString(
          req.body.name,
          150
        );

      if (!name) {
        return res
          .status(400)
          .json({
            success:
              false,

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
          success:
            true,

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
    async (
      req,
      res
    ) => {
      const products =
        await Product.find({
          merchantId:
            req.merchantId
        })
          .sort({
            createdAt:
              -1
          })
          .lean();

      return res.json({
        success:
          true,

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
    async (
      req,
      res
    ) => {
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
        !Number.isFinite(
          price
        ) ||
        price <= 0
      ) {
        return res
          .status(400)
          .json({
            success:
              false,

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
          success:
            true,

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
    async (
      req,
      res
    ) => {
      if (
        !isValidObjectId(
          req.params.id
        )
      ) {
        return res
          .status(400)
          .json({
            success:
              false,

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
              active:
                false
            }
          },

          {
            new:
              true
          }
        );

      if (!product) {
        return res
          .status(404)
          .json({
            success:
              false,

            error:
              'Produto não encontrado.'
          });
      }

      return res.json({
        success:
          true
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
    async (
      req,
      res
    ) => {
      const orders =
        await Order.find({
          merchantId:
            req.merchantId
        })
          .sort({
            createdAt:
              -1
          })
          .limit(500)
          .lean();

      return res.json({
        success:
          true,

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
    async (
      req,
      res
    ) => {
      const payments =
        await Payment.find({
          merchantId:
            req.merchantId
        })
          .sort({
            createdAt:
              -1
          })
          .limit(500)
          .lean();

      return res.json({
        success:
          true,

        payments
      });
    }
  )
);
/* =========================================================
   PUBLIC PAYMENT STATUS
========================================================= */
app.get(
  '/api/public/payments/:id/status',

  asyncHandler(
    async (
      req,
      res
    ) => {

      const paymentId =
        cleanString(
          req.params.id,
          200
        );

      if (!paymentId) {
        return res
          .status(400)
          .json({
            success:
              false,

            error:
              'Pagamento inválido.'
          });
      }

      const query = {
        provider:
          'appypay'
      };

      if (
        isValidObjectId(
          paymentId
        )
      ) {

        query._id =
          paymentId;

      } else {

        query.providerPaymentId =
          paymentId;
      }

      const payment =
        await Payment.findOne(
          query
        ).lean();

      if (!payment) {
        return res
          .status(404)
          .json({
            success:
              false,

            error:
              'Pagamento não encontrado.'
          });
      }

      return res.json({

        success:
          true,

        payment: {

          id:
            String(
              payment._id
            ),

          status:
            payment.status,

          provider:
            payment.provider,

          providerPaymentId:
            payment.providerPaymentId,

          providerStatus:
            payment.providerRawStatus,

          paymentMethod:
            payment.paymentMethod,

          amount:
            payment.amount,

          currency:
            payment.currency,

          reference: {

            entity:
              payment.providerReferenceEntity,

            number:
              payment.providerReferenceNumber
          },

          checkoutUrl:
            payment.checkoutUrl,

          qrCode:
            payment.providerQrCode,

          paidAt:
            payment.paidAt
        }
      });
    }
  )
);

/* =========================================================
   BANK ACCOUNTS API
   ========================================================= */

/*
GET BANK ACCOUNTS
*/

app.get(
  '/api/bank-accounts',

  authenticate,

  requireMerchant,

  asyncHandler(
    async (
      req,
      res
    ) => {

      const accounts =
        await BankAccount
          .find({
            merchantId:
              req.merchantId
          })
          .sort({
            isDefault: -1,
            createdAt: -1
          })
          .lean();

      return res.json({
        success:
          true,

        accounts
      });
    }
  )
);


/*
CREATE BANK ACCOUNT
*/

app.post(
  '/api/bank-accounts',

  authenticate,

  requireMerchant,

  asyncHandler(
    async (
      req,
      res
    ) => {

      const bankName =
        cleanString(
          req.body.bankName,
          120
        );

      const accountNumber =
        cleanString(
          req.body.accountNumber,
          80
        );

      const iban =
        cleanString(
          req.body.iban,
          80
        );

      const accountHolder =
        cleanString(
          req.body.accountHolder,
          160
        );

      const alias =
        cleanString(
          req.body.alias,
          120
        );

      const isDefault =
        Boolean(
          req.body.isDefault
        );

      if (
        !bankName ||
        !accountHolder ||
        (
          !accountNumber &&
          !iban
        )
      ) {

        return res
          .status(400)
          .json({
            success:
              false,

            error:
              'Banco, titular e número da conta ou IBAN são obrigatórios.'
          });
      }

      if (isDefault) {

        await BankAccount.updateMany(
          {
            merchantId:
              req.merchantId,

            active:
              true
          },

          {
            $set: {
              isDefault:
                false
            }
          }
        );
      }

      const account =
        await BankAccount.create({

          merchantId:
            req.merchantId,

          bankName,

          accountNumber,

          iban,

          accountHolder,

          alias,

          isDefault,

          active:
            true
        });

      return res
        .status(201)
        .json({
          success:
            true,

          account
        });
    }
  )
);


/*
UPDATE BANK ACCOUNT
*/
app.put(
  '/api/bank-accounts/:id',

  authenticate,

  requireMerchant,

  asyncHandler(
    async (
      req,
      res
    ) => {

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
              'Conta bancária inválida.'
          });
      }

      const account =
        await BankAccount.findOne({
          _id:
            req.params.id,

          merchantId:
            req.merchantId
        });

      if (!account) {
        return res
          .status(404)
          .json({
            success: false,
            error:
              'Conta bancária não encontrada.'
          });
      }

      const bankName =
        cleanString(
          req.body.bankName,
          120
        );

      const accountNumber =
        cleanString(
          req.body.accountNumber,
          80
        );

      const iban =
        cleanString(
          req.body.iban,
          80
        );

      const accountHolder =
        cleanString(
          req.body.accountHolder,
          160
        );

      const alias =
        cleanString(
          req.body.alias ||
          req.body.displayName,
          120
        );

      const phone =
        cleanString(
          req.body.phone,
          40
        );

      const active =
        req.body.active !== undefined
          ? Boolean(req.body.active)
          : true;

      if (
        !bankName ||
        !accountHolder ||
        (
          !accountNumber &&
          !iban
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,
            error:
              'Banco, titular e número da conta ou IBAN são obrigatórios.'
          });
      }

      account.bankName =
        bankName;

      account.accountNumber =
        accountNumber;

      account.iban =
        iban;

      account.accountHolder =
        accountHolder;

      account.alias =
        alias;

      account.phone =
        phone;

      account.active =
        active;

      await account.save();

      return res.json({
        success: true,
        account
      });
    }
  )
);
app.patch(
  '/api/bank-accounts/:id',

  authenticate,

  requireMerchant,

  asyncHandler(
    async (
      req,
      res
    ) => {

      if (
        !isValidObjectId(
          req.params.id
        )
      ) {

        return res
          .status(400)
          .json({
            success:
              false,

            error:
              'Conta bancária inválida.'
          });
      }

      const account =
        await BankAccount.findOne({
          _id:
            req.params.id,

          merchantId:
            req.merchantId
        });

      if (!account) {

        return res
          .status(404)
          .json({
            success:
              false,

            error:
              'Conta bancária não encontrada.'
          });
      }

      const bankName =
        cleanString(
          req.body.bankName ??
            account.bankName,
          120
        );

      const accountNumber =
        cleanString(
          req.body.accountNumber ??
            account.accountNumber,
          80
        );

      const iban =
        cleanString(
          req.body.iban ??
            account.iban,
          80
        );

      const accountHolder =
        cleanString(
          req.body.accountHolder ??
            account.accountHolder,
          160
        );

      const alias =
        cleanString(
          req.body.alias ??
            account.alias,
          120
        );

      const isDefault =
        req.body.isDefault !==
        undefined
          ? Boolean(
              req.body.isDefault
            )
          : account.isDefault;

      if (
        !bankName ||
        !accountHolder ||
        (
          !accountNumber &&
          !iban
        )
      ) {

        return res
          .status(400)
          .json({
            success:
              false,

            error:
              'Banco, titular e número da conta ou IBAN são obrigatórios.'
          });
      }

      if (isDefault) {

        await BankAccount.updateMany(
          {
            merchantId:
              req.merchantId,

            _id: {
              $ne:
                account._id
            },

            active:
              true
          },

          {
            $set: {
              isDefault:
                false
            }
          }
        );
      }

      account.bankName =
        bankName;

      account.accountNumber =
        accountNumber;

      account.iban =
        iban;

      account.accountHolder =
        accountHolder;

      account.alias =
        alias;

      account.isDefault =
        isDefault;

      await account.save();

      return res.json({
        success:
          true,

        account
      });
    }
  )
);


/*
DELETE / DEACTIVATE BANK ACCOUNT
*/

app.delete(
  '/api/bank-accounts/:id',

  authenticate,

  requireMerchant,

  asyncHandler(
    async (
      req,
      res
    ) => {

      if (
        !isValidObjectId(
          req.params.id
        )
      ) {

        return res
          .status(400)
          .json({
            success:
              false,

            error:
              'Conta bancária inválida.'
          });
      }

      const account =
        await BankAccount.findOneAndUpdate(
          {
            _id:
              req.params.id,

            merchantId:
              req.merchantId
          },

          {
            $set: {
              active:
                false,

              isDefault:
                false
            }
          },

          {
            new:
              true
          }
        );

      if (!account) {

        return res
          .status(404)
          .json({
            success:
              false,

            error:
              'Conta bancária não encontrada.'
          });
      }

      return res.json({
        success:
          true,

        account
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
    async (
      req,
      res
    ) => {
      const links =
        await PaymentLink.find({
          merchantId:
            req.merchantId
        })
          .sort({
            createdAt:
              -1
          })
          .lean();

      return res.json({
        success:
          true,

        links
      });
    }
  )
);

    
/* =========================================================
   CREATE REAL HONEY PAY PAYMENT LINK
   ========================================================= */

app.post(
  '/api/payment-links',

  authenticate,

  requireMerchant,

  asyncHandler(
    async (
      req,
      res
    ) => {

      const title =
        cleanString(
          req.body.title,
          150
        );

      const description =
        cleanString(
          req.body.description,
          2000
        );
      const amount =
        Number(
          req.body.amount
        );
      const productId =
        cleanString(
          req.body.productId,
          100
        );
const requestedPaymentMethods =
  normalizePaymentMethods(
    req.body.paymentMethods
  );

const paymentMethods =
  requestedPaymentMethods.length
    ? requestedPaymentMethods
    : [
        PAYMENT_METHODS.MULTICAIXA_EXPRESS,
        PAYMENT_METHODS.REFERENCE,
        PAYMENT_METHODS.UNITEL_MONEY
      ];

const checkoutMode =
  req.body.checkoutMode ===
  'single_method'
    ? 'single_method'
    : 'customer_choice';

const selectedPaymentMethod =
  checkoutMode === 'single_method'
    ? normalizePaymentMethod(
        req.body.selectedPaymentMethod
      )
    : '';

const qrEnabled =
  req.body.qrEnabled !== false;
    if (
  checkoutMode === 'single_method' &&
  !selectedPaymentMethod
) {
  return res
    .status(400)
    .json({
      success: false,
      error:
        'Selecione o método de pagamento.'
    });
}

if (
  checkoutMode === 'single_method' &&
  !paymentMethods.includes(
    selectedPaymentMethod
  )
) {
  return res
    .status(400)
    .json({
      success: false,
      error:
        'O método selecionado não está entre os métodos permitidos.'
    });
}

      let product = null;

      if (productId) {

        if (
          !isValidObjectId(
            productId
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

        product =
          await Product.findOne({
            _id:
              productId,

            merchantId:
              req.merchantId,

            active:
              true
          });

        if (!product) {
          return res
            .status(404)
            .json({
              success: false,
              error:
                'Produto não encontrado.'
            });
        }
      }

      /*
=========================================================
CREATE PAYMENT LINK
=========================================================
Honey Pay mantém o seu próprio token comercial.

O link Honey Pay continua sendo a URL pública oficial.
=========================================================
*/

const bankAccountId =
  cleanString(
    req.body.bankAccountId,
    100
  );

let bankAccount = null;

if (bankAccountId) {
  if (!isValidObjectId(bankAccountId)) {
    return res.status(400).json({
      success: false,
      error: 'Conta bancária inválida.'
    });
  }

  bankAccount =
    await BankAccount.findOne({
      _id: bankAccountId,
      merchantId: req.merchantId,
      active: true
    });

  if (!bankAccount) {
    return res.status(404).json({
      success: false,
      error:
        'Conta bancária não encontrada ou inativa.'
    });
  }
}

const token =
  generateToken();

const link =
  await PaymentLink.create({
    merchantId:
      req.merchantId,

    token,

    title,

    description,

    amount:
      Math.round(amount),

    currency:
      'AOA',

    active:
      true,

    productId:
      product
        ? product._id
        : null,

    bankAccountId:
      bankAccount
        ? bankAccount._id
        : null,
    paymentMethods,

checkoutMode,

selectedPaymentMethod,

qrEnabled,

qrType: 'appypay',
  });

const honeyUrl =
  `${APP_BASE_URL}/pay/${link.token}`;

      return res
        .status(201)
        .json({
          success:
            true,

          link: {
            id:
              String(
                link._id
              ),

            token:
              link.token,

            url:
              honeyUrl,

            title:
              link.title,

            description:
              link.description,

            amount:
              link.amount,

            currency:
              link.currency,

            paymentMethods:
              link.paymentMethods,

            checkoutMode:
              link.checkoutMode,

            selectedPaymentMethod:
              link.selectedPaymentMethod,

            qrEnabled:
              link.qrEnabled,

            qrType:
              link.qrType
          }
        });
    }
  )
);
app.delete(
  '/api/payment-links/:id',

  authenticate,

  requireMerchant,

  asyncHandler(
    async (
      req,
      res
    ) => {
      if (
        !isValidObjectId(
          req.params.id
        )
      ) {
        return res
          .status(400)
          .json({
            success:
              false,

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
              active:
                false
            }
          },

          {
            new:
              true
          }
        );

      if (!link) {
        return res
          .status(404)
          .json({
            success:
              false,

            error:
              'Link não encontrado.'
          });
      }

      return res.json({
        success:
          true
      });
    }
  )
);
/* =========================================================
   PRESENTIAL PAYMENT -> MULTI-GATEWAY
   ---------------------------------------------------------
   Honey Pay suporta:
   - AppyPay
   - BitPay

   O provider pode ser enviado no body:
   provider: "bitpay"
   provider: "appypay"

   Se não for enviado:
   - usa BITPAY como fallback se estiver configurado;
   - caso contrário usa APPYPAY.
========================================================= */

app.post(
  '/api/merchant/payments/presential',

  authenticate,

  requireMerchant,

  asyncHandler(
    async (
      req,
      res
    ) => {

      /*
      --------------------------------------------------------
      DADOS DA COBRANÇA
      --------------------------------------------------------
      */

      const title =
        cleanString(
          req.body.title,
          150
        );

      const description =
        cleanString(
          req.body.description,
          500
        );

      const amount =
        Number(
          req.body.amount
        );

      const requestedProvider =
        cleanString(
          req.body.provider,
          30
        ).toLowerCase();

      const requestedMethod =
        cleanString(
          req.body.paymentMethod,
          50
        ).toLowerCase();

      const customerMobile =
        cleanString(
          req.body.customerMobile,
          30
        );

      /*
      --------------------------------------------------------
      NORMALIZAÇÃO DO MÉTODO
      --------------------------------------------------------
      */

      let paymentMethod =
        normalizePaymentMethod(
          requestedMethod
        );

      /*
      BitPay usa:
      multicaixa_reference

      Honey Pay continua usando:
      reference
      */

      if (
        requestedMethod ===
          'reference' ||
        requestedMethod ===
          'referencia' ||
        requestedMethod ===
          'referência'
      ) {
        paymentMethod =
          'reference';
      }

      /*
      --------------------------------------------------------
      VALIDAÇÕES
      --------------------------------------------------------
      */

      if (!title) {
        return res
          .status(400)
          .json({
            success: false,

            code:
              'TITLE_REQUIRED',

            error:
              'Informe o título da cobrança.'
          });
      }

      if (
        !Number.isFinite(amount) ||
        amount <= 0
      ) {
        return res
          .status(400)
          .json({
            success: false,

            code:
              'INVALID_AMOUNT',

            error:
              'O valor da cobrança deve ser superior a zero.'
          });
      }

      if (!paymentMethod) {
        return res
          .status(400)
          .json({
            success: false,

            code:
              'PAYMENT_METHOD_REQUIRED',

            error:
              'Selecione um método de pagamento.'
          });
      }

      /*
      --------------------------------------------------------
      MÉTODOS QUE EXIGEM TELEMÓVEL
      --------------------------------------------------------
      */

      if (
        (
          paymentMethod ===
            PAYMENT_METHODS.MULTICAIXA_EXPRESS ||

          paymentMethod ===
            PAYMENT_METHODS.UNITEL_MONEY
        ) &&
        !customerMobile
      ) {
        return res
          .status(400)
          .json({
            success: false,

            code:
              'CUSTOMER_MOBILE_REQUIRED',

            error:
              'O número de telemóvel do cliente é obrigatório para este método.'
          });
      }

      /*
      --------------------------------------------------------
      MERCHANT
      --------------------------------------------------------
      */

      const merchant =
        await Merchant.findById(
          req.merchantId
        ).lean();

      if (!merchant) {
        return res
          .status(404)
          .json({
            success: false,

            code:
              'MERCHANT_NOT_FOUND',

            error:
              'Comerciante não encontrado.'
          });
      }

      /*
      --------------------------------------------------------
      ESCOLHA DO PROVIDER
      --------------------------------------------------------
      */

      let provider =
        requestedProvider;

      if (
        provider !== 'bitpay' &&
        provider !== 'appypay'
      ) {
        if (
          isBitPayConfigured()
        ) {
          provider =
            'bitpay';
        } else if (
          isAppyPayConfigured()
        ) {
          provider =
            'appypay';
        } else {
          return res
            .status(503)
            .json({
              success: false,

              code:
                'NO_PAYMENT_PROVIDER',

              error:
                'Nenhum gateway de pagamento está configurado.'
            });
        }
      }

      /*
      --------------------------------------------------------
      VERIFICAR PROVIDER
      --------------------------------------------------------
      */

      if (
        provider === 'bitpay' &&
        !isBitPayConfigured()
      ) {
        return res
          .status(503)
          .json({
            success: false,

            code:
              'BITPAY_NOT_CONFIGURED',

            error:
              'Os pagamentos BitPay ainda não estão configurados na Honey Pay.'
          });
      }

      if (
        provider === 'appypay' &&
        !isAppyPayConfigured()
      ) {
        return res
          .status(503)
          .json({
            success: false,

            code:
              'APPYPAY_NOT_CONFIGURED',

            error:
              'Os pagamentos AppyPay ainda não estão configurados na Honey Pay.'
          });
      }

      /*
      --------------------------------------------------------
      VALIDAR MÉTODOS SUPORTADOS PELO PROVIDER
      --------------------------------------------------------
      */

      if (
        provider === 'bitpay'
      ) {

        if (
          paymentMethod !==
            PAYMENT_METHODS.MULTICAIXA_EXPRESS &&
          paymentMethod !==
            'reference'
        ) {
          return res
            .status(400)
            .json({
              success: false,

              code:
                'BITPAY_METHOD_NOT_SUPPORTED',

              error:
                'Este método ainda não está disponível através da BitPay.'
            });
        }

      }

      /*
      --------------------------------------------------------
      ORDER REFERENCE
      --------------------------------------------------------
      */

      const orderReference =
        generateReference(
          'HP'
        );

      /*
      --------------------------------------------------------
      ORDER
      --------------------------------------------------------
      */

      const order =
        await Order.create({

          merchantId:
            req.merchantId,

          customerId:
            null,

          reference:
            orderReference,

          items: [
            {
              productId:
                null,

              name:
                title,

              quantity:
                1,

              unitPrice:
                amount,

              total:
                amount
            }
          ],

          subtotal:
            amount,

          total:
            amount,

          currency:
            'AOA',

          status:
            'PAYMENT_PROCESSING',

          customerSnapshot: {
            name:
              'Cliente presencial',

            email:
              '',

            phone:
              customerMobile
          }
        });

      /*
      --------------------------------------------------------
      METADATA
      --------------------------------------------------------
      */

      const metadata = {

        honey_pay:
          true,

        honey_pay_version:
          '4.0.0',

        payment_mode:
          'in_person',

        order_id:
          String(
            order._id
          ),

        order_reference:
          orderReference,

        merchant_id:
          String(
            req.merchantId
          ),

        merchant_user_id:
          String(
            req.userId
          ),

        provider:
          provider
      };

      /*
      --------------------------------------------------------
      PROVIDER VARIABLES
      --------------------------------------------------------
      */

      let providerResponse =
        null;

      let providerPaymentId =
        '';

      let providerMethod =
        paymentMethod;

      let providerRawStatus =
        'PENDING';

      let checkoutUrl =
        '';

      let providerQrCode =
        '';

      let referenceEntity =
        '';

      let referenceNumber =
        '';

      /*
      --------------------------------------------------------
      BITPAY
      --------------------------------------------------------
      */

      if (
        provider === 'bitpay'
      ) {

        try {

          const bitPayMethod =
            paymentMethod ===
              'reference'
              ? BITPAY_PAYMENT_METHODS.MULTICAIXA_REFERENCE
              : BITPAY_PAYMENT_METHODS.MULTICAIXA_EXPRESS;

          const bitPayResponse =
            await createBitPayPaymentIntent({

              amount:
                Math.round(
                  amount
                ),

              currency:
                'AOA',

              paymentMethod:
                bitPayMethod,

              mobile:
                customerMobile,

              merchantReference:
                orderReference,

              metadata:

                metadata,

              idempotencyKey:
                orderReference
            });

          providerResponse =
            bitPayResponse;

          providerPaymentId =
            String(
              bitPayResponse?.id ||
              ''
            );

          providerMethod =
            bitPayMethod;

          providerRawStatus =
            String(
              bitPayResponse?.status ||
              'PENDING'
            ).toUpperCase();

          /*
          ------------------------------------------------------
          REFERÊNCIA BITPAY
          ------------------------------------------------------
          */

          const bitPayReference =
            bitPayResponse?.reference ||
            null;

          if (
            bitPayReference &&
            typeof bitPayReference ===
              'object'
          ) {

            referenceEntity =
              String(
                bitPayReference.entity ||
                bitPayReference.entityNumber ||
                ''
              );

            referenceNumber =
              String(
                bitPayReference.number ||
                bitPayReference.referenceNumber ||
                bitPayReference.reference ||
                ''
              );

          } else if (
            bitPayReference
          ) {

            referenceNumber =
              String(
                bitPayReference
              );

          }

                 /*
          ------------------------------------------------------
          QR CODE HONEY PAY
          ------------------------------------------------------
          */

          try {
            const qrResponse =
  await createBitPayQRCode({
    amount:
      Math.round(
        amount
      ),

    description:
      description ||
      title,

    /*
     * Cada cobrança Honey Pay
     * possui uma chave diferente.
     *
     * Isto impede conflitos entre
     * duas cobranças diferentes.
     */
    idempotencyKey:
      `${orderReference}-qr`
  });

            providerQrCode =
              qrResponse?.qrCode ||
              '';

            if (
              qrResponse?.url
            ) {
              checkoutUrl =
                qrResponse.url;
            }

          } catch (
            qrError
          ) {
            /*
             * O QR é complementar.
             * Se a cobrança principal foi criada,
             * não devemos destruir a cobrança só porque
             * o QR falhou.
             */

            console.warn(
              'Honey Pay: QR Code não disponível:',
              qrError?.message ||
              qrError
            );
          }
        } catch (
          error
        ) {

          console.error(
            'BitPay presential createPaymentIntent:',
            error
          );

          await Order.findByIdAndUpdate(
            order._id,
            {
              $set: {
                status:
                  'FAILED'
              }
            }
          );

          return res
            .status(
              error?.status >= 400 &&
              error?.status < 600
                ? error.status
                : 503
            )
            .json({

              success:
                false,

              code:
                'BITPAY_PAYMENT_ERROR',

              error:
                error.message ||
                'Não foi possível criar a cobrança BitPay.'
            });
        }
      }

      /*
      --------------------------------------------------------
      APPYPAY
      --------------------------------------------------------
      */

      if (
        provider === 'appypay'
      ) {

        try {

          providerResponse =
            await createAppyPayCharge({

              amount:
                Math.round(
                  amount
                ),

              currency:
                'AOA',

              paymentMethod:
                paymentMethod,

              merchantTransactionId:
                orderReference,

              description:
                description ||
                title,

              customer: {

                name:
                  'Cliente presencial',

                email:
                  '',

                mobile:
                  customerMobile
              },

              metadata:
                metadata
            });

          providerPaymentId =
            String(
              providerResponse?.id ||
              providerResponse?.chargeId ||
              providerResponse?.charge_id ||
              providerResponse?.paymentId ||
              providerResponse?.payment_id ||
              ''
            );

          providerRawStatus =
            String(
              providerResponse?.status ||
              providerResponse?.responseStatus?.status ||
              'PENDING'
            ).toUpperCase();

          const providerReference =
            providerResponse?.reference ||
            providerResponse?.multicaixa_reference ||
            null;

          referenceEntity =
            providerReference?.entity ||
            providerResponse?.entity ||
            '';

          referenceNumber =
            providerReference?.number ||
            providerReference?.reference ||
            providerResponse?.reference_number ||
            providerResponse?.number ||
            '';

          checkoutUrl =
            providerResponse?.checkout_url ||
            providerResponse?.checkoutUrl ||
            providerResponse?.url ||
            '';

          providerQrCode =
            providerResponse?.qrCode ||
            providerResponse?.qr_code ||
            providerResponse?.qr ||
            '';

        } catch (
          error
        ) {

          console.error(
            'AppyPay presential createCharge:',
            error
          );

          await Order.findByIdAndUpdate(
            order._id,
            {
              $set: {
                status:
                  'FAILED'
              }
            }
          );

          return res
            .status(
              error?.status >= 400 &&
              error?.status < 600
                ? error.status
                : 503
            )
            .json({

              success:
                false,

              code:
                'APPYPAY_PAYMENT_ERROR',

              error:
                error.message ||
                'Não foi possível criar a cobrança AppyPay.'
            });
        }
      }

      /*
      --------------------------------------------------------
      PROVIDER ID OBRIGATÓRIO
      --------------------------------------------------------
      */

      if (
        !providerPaymentId
      ) {

        await Order.findByIdAndUpdate(
          order._id,
          {
            $set: {
              status:
                'FAILED'
            }
          }
        );

        return res
          .status(502)
          .json({

            success:
              false,

            code:
              'PROVIDER_ID_MISSING',

            error:
              `O gateway ${provider} não devolveu o identificador da cobrança.`
          });
      }

      /*
      --------------------------------------------------------
      STATUS LOCAL
      --------------------------------------------------------
      */

      const localStatus =
        (
          providerRawStatus ===
            'PAID' ||

          providerRawStatus ===
            'SUCCESS' ||

          providerRawStatus ===
            'SUCCEEDED'
        )

          ? 'PAID'

          : (
              providerRawStatus ===
                'FAILED' ||

              providerRawStatus ===
                'REJECTED' ||

              providerRawStatus ===
                'CANCELLED'
            )

              ? 'FAILED'

              : 'PROCESSING';

      /*
      --------------------------------------------------------
      PAYMENT LOCAL
      --------------------------------------------------------
      */

      const payment =
        await Payment.create({

          merchantId:
            req.merchantId,

          orderId:
            order._id,

          customerId:
            null,

          reference:
            orderReference,
           idempotencyKey:
      `payment-${orderReference}`,

          provider:
            provider,

          providerPaymentId:
            providerPaymentId,

          providerMethod:
            providerMethod,

          paymentMethod:
            paymentMethod,

          amount:
            amount,

          feeAmount:
            calculateFee(
              amount
            ),

          netAmount:
            calculateNet(
              amount
            ),

          currency:
            'AOA',

          status:
            localStatus,

          providerRawStatus:
            providerRawStatus,

          providerReferenceEntity:
            referenceEntity,

          providerReferenceNumber:
            referenceNumber,

          checkoutUrl:
            checkoutUrl,

          providerQrCode:
            providerQrCode,

          providerResponse:
            providerResponse,

          metadata:
            metadata
        });

      /*
      --------------------------------------------------------
      ATUALIZAR ORDER
      --------------------------------------------------------
      */

      if (
        payment.status ===
        'PAID'
      ) {

        await Order.findByIdAndUpdate(
          order._id,
          {
            $set: {

              status:
                'PAID',

              paidAt:
                new Date()
            }
          }
        );

      } else {

        await Order.findByIdAndUpdate(
          order._id,
          {
            $set: {

              status:
                'PAYMENT_PROCESSING'
            }
          }
        );
      }

      /*
      --------------------------------------------------------
      RESPOSTA
      --------------------------------------------------------
      */

      return res
        .status(201)
        .json({

          success:
            true,

          payment: {

            id:
              String(
                payment._id
              ),

            orderId:
              String(
                order._id
              ),

            reference:
              payment.reference,

            status:
              payment.status,

            amount:
              payment.amount,

            currency:
              payment.currency,

            paymentMethod:
              payment.paymentMethod,

            provider:
              payment.provider,

            providerPaymentId:
              payment.providerPaymentId,

            providerStatus:
              payment.providerRawStatus,

            multicaixaReference: {

              entity:
                payment.providerReferenceEntity,

              number:
                payment.providerReferenceNumber
            },

            checkoutUrl:
              payment.checkoutUrl,

            qrCode:
              payment.providerQrCode
          },

          honeyPayFee: {

            bps:
              HONEY_PAY_FEE_BPS,

            percent:
              HONEY_PAY_FEE_BPS /
              100,

            amount:
              calculateFee(
                amount
              )
          }
        });
    }
  )
);
/* =========================================================
   HONEY PAY — ESTADO DA COBRANÇA PRESENCIAL
   ========================================================= */

app.get(
  '/api/merchant/payments/presential/:paymentId',

  authenticate,

  requireMerchant,

  asyncHandler(
    async (
      req,
      res
    ) => {

      const payment =
        await Payment.findOne({
          _id:
            req.params.paymentId,

          merchantId:
            req.merchantId
        });

      if (!payment) {
        return res
          .status(404)
          .json({
            success:
              false,

            error:
              'Cobrança não encontrada.'
          });
      }

      /*
      --------------------------------------------------------
      SE FOR BITPAY, CONSULTAMOS O ESTADO REAL
      --------------------------------------------------------
      */

      if (
        payment.provider ===
          'bitpay' &&
        payment.providerPaymentId
      ) {

        const currentStatus =
          String(
            payment.providerRawStatus ||
            ''
          ).toUpperCase();

        const terminalStates = [
          'SUCCEEDED',
          'FAILED',
          'EXPIRED',
          'CANCELLED',
          'REFUNDED'
        ];

        if (
          !terminalStates.includes(
            currentStatus
          )
        ) {

          try {

            const intent =
              await getBitPayPaymentIntent(
                payment.providerPaymentId
              );

            const rawStatus =
              String(
                intent?.status ||
                'PENDING'
              ).toUpperCase();

            let localStatus =
              'PROCESSING';

            if (
              rawStatus ===
                'SUCCEEDED'
            ) {
              localStatus =
                'PAID';
            }

            if (
              [
                'FAILED',
                'EXPIRED',
                'CANCELLED'
              ].includes(
                rawStatus
              )
            ) {
              localStatus =
                'FAILED';
            }

            payment.providerRawStatus =
              rawStatus;

            payment.status =
              localStatus;

            payment.providerResponse =
              intent?.providerResponse ||
              intent;

            if (
              localStatus ===
              'PAID' &&
              !payment.paidAt
            ) {
              payment.paidAt =
                new Date();
            }

            await payment.save();

            /*
            ------------------------------------------------
            ATUALIZAR ORDER
            ------------------------------------------------
            */

            if (
              payment.orderId
            ) {

              await Order.findByIdAndUpdate(
                payment.orderId,

                {
                  $set: {
                    status:
                      localStatus ===
                      'PAID'
                        ? 'PAID'
                        : 'PAYMENT_PROCESSING',

                    ...(localStatus ===
                    'PAID'
                      ? {
                          paidAt:
                            payment.paidAt ||
                            new Date()
                        }
                      : {})
                  }
                }
              );
            }

          } catch (
            providerError
          ) {

            console.warn(
              'Honey Pay: não foi possível atualizar o estado BitPay:',
              providerError?.message ||
              providerError
            );

          }
        }
      }

      return res.json({
        success:
          true,

        payment: {
          id:
            String(
              payment._id
            ),

          reference:
            payment.reference,

          status:
            payment.status,

          providerStatus:
            payment.providerRawStatus,

          amount:
            payment.amount,

          currency:
            payment.currency,

          paymentMethod:
            payment.paymentMethod,

          multicaixaReference: {
            entity:
              payment.providerReferenceEntity,

            number:
              payment.providerReferenceNumber
          },

          checkoutUrl:
            payment.checkoutUrl,

          qrCode:
            payment.providerQrCode,

          paidAt:
            payment.paidAt
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
    async (
      req,
      res
    ) => {
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
            success:
              false,

            error:
              'Link de pagamento não encontrado.'
          });
      }

      if (
        link.expiresAt &&
        new Date(
          link.expiresAt
        ).getTime() <
          Date.now()
      ) {
        return res
          .status(410)
          .json({
            success:
              false,

            error:
              'Este link expirou.'
          });
      }

      const merchant =
        await Merchant.findById(
          link.merchantId
        ).lean();
let bankAccount = null;

if (link.bankAccountId) {
  bankAccount =
    await BankAccount.findOne({
      _id:
        link.bankAccountId,

      merchantId:
        link.merchantId,

      active:
        true
    }).lean();
}
      return res.json({
        success:
          true,
bankAccount:
  bankAccount
    ? {
        id:
          String(
            bankAccount._id
          ),

        bankName:
          bankAccount.bankName,

        accountNumber:
          bankAccount.accountNumber,

        iban:
          bankAccount.iban,

        accountHolder:
          bankAccount.accountHolder,

        alias:
          bankAccount.alias
      }
    : null,
        link: {
          id:
            String(
              link._id
            ),

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
          ,
paymentMethods:
  normalizePaymentMethods(
    link.paymentMethods
  ),

checkoutMode:
  link.checkoutMode ||
  'customer_choice',

selectedPaymentMethod:
  link.selectedPaymentMethod ||
  null,

qrEnabled:
  Boolean(
    link.qrEnabled
  ),

qrType:
  link.qrType ||
  'appypay',

qrUrl:
  link.qrUrl ||
  link.appypayQrUrl ||
  null
        },

        merchant:
          merchant
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
   PUBLIC PAYMENT LINK -> APPYPAY PAYMENT
   ========================================================= */

app.post(
  '/api/public/payment-links/:token/pay',

  asyncHandler(
    async (
      req,
      res
    ) => {

      const token =
        cleanString(
          req.params.token,
          200
        );

      if (!token) {
        return res
          .status(400)
          .json({
            success:
              false,

            error:
              'Token de pagamento inválido.'
          });
      }

      const link =
        await PaymentLink.findOne({
          token,

          active:
            true
        });

      if (!link) {
        return res
          .status(404)
          .json({
            success:
              false,

            error:
              'Link de pagamento não encontrado.'
          });
      }

      if (
        link.expiresAt &&
        new Date(
          link.expiresAt
        ).getTime() <
          Date.now()
      ) {
        return res
          .status(410)
          .json({
            success:
              false,

            error:
              'Este link expirou.'
          });
      }

      /*
      --------------------------------------------------------
      APPYPAY DEVE ESTAR CONFIGURADO PARA CRIAR UMA COBRANÇA
      --------------------------------------------------------
      */

      if (!isAppyPayConfigured()) {
        return res
          .status(503)
          .json({
            success:
              false,

            code:
              'APPYPAY_NOT_CONFIGURED',

            error:
              'Os pagamentos AppyPay ainda não estão configurados na Honey Pay.'
          });
      }

      /*
      --------------------------------------------------------
      CLIENTE
      --------------------------------------------------------
      */

      const customerName =
        cleanString(
          req.body.customerName,
          150
        );

      const customerEmail =
        normalizeEmail(
          req.body.customerEmail
        );

      const customerMobile =
        cleanString(
          req.body.customerMobile,
          30
        );

      let paymentMethod =
        normalizePaymentMethod(
          req.body.paymentMethod
        );

      if (!customerName) {
        return res
          .status(400)
          .json({
            success:
              false,

            error:
              'Nome do cliente é obrigatório.'
          });
      }

      /*
      --------------------------------------------------------
      MÉTODOS PERMITIDOS PELO COMERCIANTE
      --------------------------------------------------------
      */

      const allowedMethods =
        normalizePaymentMethods(
          link.paymentMethods
        );

      const fallbackMethods = [
        PAYMENT_METHODS.MULTICAIXA_EXPRESS,
        PAYMENT_METHODS.REFERENCE,
        PAYMENT_METHODS.UNITEL_MONEY
      ];

      const availableMethods =
        allowedMethods.length
          ? allowedMethods
          : fallbackMethods;

      /*
      --------------------------------------------------------
      SE O COMERCIANTE DEFINIU UM ÚNICO MÉTODO,
      O CLIENTE NÃO PODE ALTERÁ-LO.
      --------------------------------------------------------
      */

      if (
        link.checkoutMode ===
          'single_method'
      ) {
        paymentMethod =
          normalizePaymentMethod(
            link.selectedPaymentMethod
          );
      }

      if (!paymentMethod) {
        return res
          .status(400)
          .json({
            success:
              false,

            code:
              'PAYMENT_METHOD_REQUIRED',

            error:
              'Selecione um método de pagamento.'
          });
      }

      if (
        !availableMethods.includes(
          paymentMethod
        )
      ) {
        return res
          .status(400)
          .json({
            success:
              false,

            code:
              'PAYMENT_METHOD_NOT_ALLOWED',

            error:
              'Este método de pagamento não está disponível para este link.'
          });
      }

      /*
      --------------------------------------------------------
      REGRAS POR MÉTODO
      --------------------------------------------------------
      */

      if (
        (
          paymentMethod ===
            PAYMENT_METHODS.MULTICAIXA_EXPRESS ||
          paymentMethod ===
            PAYMENT_METHODS.UNITEL_MONEY
        ) &&
        !customerMobile
      ) {
        return res
          .status(400)
          .json({
            success:
              false,

            code:
              'CUSTOMER_MOBILE_REQUIRED',

            error:
              'O número de telemóvel é obrigatório para este método.'
          });
      }

      /*
      --------------------------------------------------------
      MERCHANT
      --------------------------------------------------------
      */

      const merchant =
        await Merchant.findById(
          link.merchantId
        ).lean();

      if (!merchant) {
        return res
          .status(404)
          .json({
            success:
              false,

            error:
              'Comerciante não encontrado.'
          });
      }

      /*
      --------------------------------------------------------
      CUSTOMER
      --------------------------------------------------------
      */

      let customer = null;

      if (customerEmail) {
        customer =
          await Customer.findOne({
            merchantId:
              link.merchantId,

            email:
              customerEmail
          });
      }

      if (!customer) {

        customer =
          await Customer.create({
            merchantId:
              link.merchantId,

            name:
              customerName,

            email:
              customerEmail,

            phone:
              customerMobile
          });

      } else {

        customer.name =
          customerName ||
          customer.name;

        customer.phone =
          customerMobile ||
          customer.phone;

        await customer.save();
      }

      /*
      --------------------------------------------------------
      ORDER
      --------------------------------------------------------
      */

      const orderReference =
        generateReference(
          'HP'
        );

      const order =
        await Order.create({
          merchantId:
            link.merchantId,

          customerId:
            customer._id,

          reference:
            orderReference,

          items: [
            {
              productId:
                link.productId ||
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
              customerMobile
          }
        });

      /*
      --------------------------------------------------------
      APPYPAY METADATA
      --------------------------------------------------------
      */

      const metadata = {

        honey_pay:
          true,

        honey_pay_version:
          '4.0.0',

        order_id:
          String(
            order._id
          ),

        order_reference:
          orderReference,

        merchant_id:
          String(
            link.merchantId
          ),

        payment_link_id:
          String(
            link._id
          ),

        payment_link_token:
          link.token
      };

      /*
      --------------------------------------------------------
      APPYPAY CHARGE
      --------------------------------------------------------
      */

      let appyPayResponse;

      try {

        appyPayResponse =
          await createAppyPayCharge({

            amount:
              Math.round(
                link.amount
              ),

            currency:
              'AOA',

            paymentMethod,

            merchantTransactionId:
              orderReference,

            description:
              link.description
                ? `${link.title} - ${link.description}`
                : link.title,

            customer: {
              name:
                customerName,

              email:
                customerEmail,

              mobile:
                customerMobile
            },

            metadata
          });

      } catch (error) {

        console.error(
          'AppyPay createCharge:',
          error
        );

        await Order.findByIdAndUpdate(
          order._id,

          {
            $set: {
              status:
                'FAILED'
            }
          }
        );

        return res
          .status(
            error?.status >= 400 &&
            error?.status < 600
              ? error.status
              : 503
          )
          .json({
            success:
              false,

            code:
              'APPYPAY_PAYMENT_ERROR',

            error:
              error.message ||
              'Não foi possível criar o pagamento AppyPay.'
          });
      }

      /*
      --------------------------------------------------------
      PROVIDER DATA
      --------------------------------------------------------
      */

      const providerPaymentId =
        String(
          appyPayResponse?.id ||
          appyPayResponse?.chargeId ||
          appyPayResponse?.charge_id ||
          appyPayResponse?.paymentId ||
          appyPayResponse?.payment_id ||
          ''
        );

      if (!providerPaymentId) {

        await Order.findByIdAndUpdate(
          order._id,

          {
            $set: {
              status:
                'FAILED'
            }
          }
        );

        return res
          .status(502)
          .json({
            success:
              false,

            code:
              'APPYPAY_ID_MISSING',

            error:
              'A AppyPay não devolveu o identificador da cobrança.'
          });
      }

      const providerReference =
        appyPayResponse?.reference ||
        appyPayResponse?.multicaixa_reference ||
        null;

      const referenceEntity =
        providerReference?.entity ||
        appyPayResponse?.entity ||
        '';

      const referenceNumber =
        providerReference?.number ||
        providerReference?.reference ||
        appyPayResponse?.reference_number ||
        appyPayResponse?.number ||
        '';

      const checkoutUrl =
        appyPayResponse?.checkout_url ||
        appyPayResponse?.checkoutUrl ||
        appyPayResponse?.url ||
        '';

      const providerQrCode =
        appyPayResponse?.qrCode ||
        appyPayResponse?.qr_code ||
        appyPayResponse?.qr ||
        '';

      const rawStatus =
        String(
          appyPayResponse?.status ||
          'PENDING'
        ).toUpperCase();

      const localStatus =
        (
          rawStatus ===
            'PAID' ||
          rawStatus ===
            'SUCCESS' ||
          rawStatus ===
            'SUCCEEDED'
        )
          ? 'PAID'
          : (
              rawStatus ===
                'FAILED' ||
              rawStatus ===
                'REJECTED' ||
              rawStatus ===
                'CANCELLED'
            )
              ? 'FAILED'
              : 'PROCESSING';

      /*
      --------------------------------------------------------
      PAYMENT LOCAL
      --------------------------------------------------------
      */

      const payment =
        await Payment.create({

          merchantId:
            link.merchantId,

          orderId:
            order._id,

          customerId:
            customer._id,

          reference:
            orderReference,

          provider:
            'appypay',

          providerPaymentId,

          providerMethod:
            paymentMethod,

          paymentMethod,

          amount:
            link.amount,

          feeAmount:
            calculateFee(
              link.amount
            ),

          netAmount:
            calculateNet(
              link.amount
            ),

          currency:
            'AOA',

          status:
            localStatus,

          providerRawStatus:
            rawStatus,

          providerReferenceEntity:
            referenceEntity,

          providerReferenceNumber:
            referenceNumber,

          checkoutUrl,

          providerQrCode,

          providerResponse:
            appyPayResponse,

          metadata
        });

      /*
      --------------------------------------------------------
      SE A APPYPAY JÁ DEVOLVEU PAID
      --------------------------------------------------------
      */

      if (
        payment.status ===
        'PAID'
      ) {

        await Order.findByIdAndUpdate(
          order._id,

          {
            $set: {
              status:
                'PAID',

              paidAt:
                new Date()
            }
          }
        );

      } else {

        await Order.findByIdAndUpdate(
          order._id,

          {
            $set: {
              status:
                'PAYMENT_PROCESSING'
            }
          }
        );
      }

      /*
      --------------------------------------------------------
      RESPOSTA
      --------------------------------------------------------
      */

      return res
        .status(201)
        .json({

          success:
            true,

          payment: {

            id:
              String(
                payment._id
              ),

            reference:
              payment.reference,

            status:
              payment.status,

            amount:
              payment.amount,

            currency:
              payment.currency,

            paymentMethod:
              payment.paymentMethod,

            provider:
              'appypay',

            providerPaymentId:
              payment.providerPaymentId,

            providerStatus:
              payment.providerRawStatus,

            multicaixaReference: {

              entity:
                payment.providerReferenceEntity,

              number:
                payment.providerReferenceNumber
            },

            checkoutUrl:
              payment.checkoutUrl,

            qrCode:
              payment.providerQrCode
          },

          honeyPayFee: {

            bps:
              HONEY_PAY_FEE_BPS,

            percent:
              HONEY_PAY_FEE_BPS /
              100,

            amount:
              calculateFee(
                link.amount
              )
          }
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
    async (
      req,
      res
    ) => {
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
                  $sum:
                    1
                },

                amount: {
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
                  $sum:
                    1
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
        success:
          true,

        reports: {
          payments,

          orders,

          currency:
            req.merchant.currency ||
            'AOA',

          honeyPayFeeBps:
            HONEY_PAY_FEE_BPS,

          honeyPayFeePercent:
            HONEY_PAY_FEE_BPS /
            100
        }
      });
    }
  )
);

/* =========================================================
   APPYPAY CONFIG STATUS
   ========================================================= */

app.get(
  '/api/appypay/status',

  authenticate,

  requireMerchant,

  (
    req,
    res
  ) => {

    return res.json({

      success:
        true,

      provider:
        'appypay',

      configured:
        isAppyPayConfigured(),

      environment:
        process.env.APPYPAY_ENV ||
        'sandbox',

      feeBps:
        HONEY_PAY_FEE_BPS,

      feePercent:
        HONEY_PAY_FEE_BPS /
        100,

      methods: [
        {
          id:
            'multicaixa_express',

          name:
            'Multicaixa Express',

          available:
            true
        },

        {
          id:
            'reference',

          name:
            'Pagamento por Referência',

          available:
            true
        },

        {
          id:
            'unitel_money',

          name:
            'UNITEL Money',

          available:
            true
        },

        {
          id:
            'direct_debit',

          name:
            'Débito Directo',

          available:
            true
        }
      ],

      qr:
        true
    });
  }
);
/* =========================================================
   BITPAY STATUS
   ========================================================= */

app.get(
  '/api/bitpay/status',

  authenticate,

  requireMerchant,

  asyncHandler(
    async (
      req,
      res
    ) => {

      return res.json({
        success: true,

        provider: 'bitpay',

        enabled:
          isBitPayConfigured(),

        environment:
          process.env.BITPAY_ENV ||
          'sandbox',

        apiUrl:
          process.env.BITPAY_API_URL ||
          (
            String(
              process.env.BITPAY_ENV ||
              'sandbox'
            ).toLowerCase() ===
            'production'
              ? 'https://api.bitpay.ao/v1'
              : 'https://api-sandbox.bitpay.ao/v1'
          ),

        webhookConfigured:
          Boolean(
            process.env.BITPAY_WEBHOOK_SECRET
          ),

        methods: [
          'multicaixa_express',
          'multicaixa_reference'
        ]
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
    async (
      req,
      res
    ) => {
      if (
        fs.existsSync(
          CHECKOUT_FILE
        )
      ) {
        return res.sendFile(
          CHECKOUT_FILE
        );
      }

      return res
        .status(404)
        .send(
          'Checkout não configurado.'
        );
    }
  )
);
/* =========================================================
   PROTECTED DASHBOARD ENTRY
========================================================= */

app.get(
  '/index.html',

  authenticate,

  asyncHandler(
    async (
      req,
      res
    ) => {

      const merchant =
        await Merchant.findOne({
          userId:
            req.userId
        }).lean();

      if (!merchant) {
        return res.redirect(
          '/login'
        );
      }

      if (
        !merchant.onboardingCompleted
      ) {
        return res.redirect(
          '/onboarding.html'
        );
      }

      return res.sendFile(
        INDEX_FILE
      );
    }
  )
);
/* =========================================================
   PRIVATE DASHBOARD ENTRY
   /index.html nunca deve ser público
========================================================= */

app.get(
  '/index.html',
  requirePrivatePage,
  (req, res) => {
    return res.sendFile(
      INDEX_FILE
    );
  }
);
/* =========================================================
   STATIC FRONTEND
========================================================= */

app.use(
  express.static(
    FRONTEND_DIR,
    {
      index:
        false,

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

app.get(
  '/login',
  (
    req,
    res
  ) => {
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

  background:
    #080808;

  color:
    #fff;
}

body {
  display:
    flex;

  align-items:
    center;

  justify-content:
    center;

  padding:
    24px;
}

.login-card {
  width:
    100%;

  max-width:
    430px;

  padding:
    40px;

  border-radius:
    24px;

  background:
    #111;

  border:
    1px solid
    rgba(
      255,
      255,
      255,
      .09
    );

  box-shadow:
    0 30px 80px
    rgba(
      0,
      0,
      0,
      .45
    );
}

.logo {
  width:
    54px;

  height:
    54px;

  border-radius:
    16px;

  display:
    flex;

  align-items:
    center;

  justify-content:
    center;

  background:
    #f5c542;

  color:
    #111;

  font-size:
    27px;

  font-weight:
    900;

  margin-bottom:
    26px;
}

h1 {
  margin:
    0 0 10px;

  font-size:
    30px;
}

p {
  color:
    #999;

  line-height:
    1.6;

  margin:
    0 0 28px;
}

.google-button {
  width:
    100%;

  border:
    0;

  border-radius:
    14px;

  padding:
    15px 18px;

  background:
    #fff;

  color:
    #111;

  font-size:
    15px;

  font-weight:
    700;

  cursor:
    pointer;

  text-decoration:
    none;

  display:
    flex;

  align-items:
    center;

  justify-content:
    center;

  gap:
    10px;
}

.google-button:hover {
  opacity:
    .92;
}

.error {
  margin-bottom:
    20px;

  padding:
    13px 15px;

  border-radius:
    12px;

  background:
    rgba(
      255,
      70,
      70,
      .12
    );

  border:
    1px solid
    rgba(
      255,
      70,
      70,
      .2
    );

  color:
    #ff9b9b;

  font-size:
    14px;

  line-height:
    1.5;
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
/* =========================================================
   HONEY PAY — PUBLIC HOMEPAGE
   ========================================================= */

app.get(
  '/',
  (
    req,
    res
  ) => {

    if (
      fs.existsSync(
        HOME_FILE
      )
    ) {
      return res.sendFile(
        HOME_FILE
      );
    }

    return res
      .status(404)
      .send(
        'Homepage do Honey Pay não encontrada.'
      );
  }
);
/* =========================================================
   PRIVATE SPA ROUTES
========================================================= */

const SPA_ROUTES = [
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
    requirePrivatePage,
    (
      req,
      res
    ) => {
      return res.sendFile(
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
  (
    req,
    res
  ) => {
    return res
      .status(404)
      .json({
        success:
          false,

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
  (
    req,
    res
  ) => {
    if (
      req.method !==
      'GET'
    ) {
      return res
        .status(404)
        .send(
          'Not Found'
        );
    }

    return res
      .status(404)
      .send(
        'Página não encontrada.'
      );
  }
);

/* =========================================================
   ERROR HANDLER
========================================================= */

app.use(
  (err, req, res, next) => {
    console.error(
      "================================================"
    );

    console.error(
      "HONEY PAY INTERNAL ERROR"
    );

    console.error(
      "METHOD:",
      req.method
    );

    console.error(
      "URL:",
      req.originalUrl
    );

    console.error(
      "MESSAGE:",
      err?.message
    );

    console.error(
      "STATUS:",
      err?.status
    );

    console.error(
      "CODE:",
      err?.code
    );

    console.error(
      "PROVIDER RESPONSE:",
      err?.providerResponse
    );

    console.error(
      "STACK:",
      err?.stack
    );

    console.error(
      "================================================"
    );

    const status =
      Number.isInteger(
        err?.status
      ) &&
      err.status >= 400 &&
      err.status < 600
        ? err.status
        : 500;

    res
      .status(status)
      .json({
        success: false,

        code:
          err?.code ||
          "INTERNAL_SERVER_ERROR",

        error:
          err?.message ||
          "Erro interno do servidor.",

        /*
         * Apenas informação segura.
         * Nunca devolvemos secret key.
         */
        requestId:
          err?.providerResponse?.request_id ||
          null
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
          'HONEY PAY V4.0.0'
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
          `Honey Pay fee: ${HONEY_PAY_FEE_BPS} bps`
        );

        console.log(
          `Honey Pay fee: ${
            HONEY_PAY_FEE_BPS / 100
          }%`
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
  'Webhook: POST /api/webhooks/appypay'
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

module.exports =
  app;
