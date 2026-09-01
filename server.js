'use strict';

/*
============================================================
HONEY PAY
BACKEND V1.0.0
REAL PAYMENT ENGINE
============================================================

- Node.js / Express
- MongoDB Atlas
- JWT authentication
- BitPay real API
- Payment Intents
- Idempotency
- Signed webhooks
- Payment state machine
- 0.80% Honey Pay fee
- Orders
- Customers
- Products
- Payment Links
- Public checkout
- Audit logs
- Rate limiting
- Security headers

IMPORTANT:
BitPay secrets NEVER go to frontend.

============================================================
*/

require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const path = require('path');

const app = express();

/* =========================================================
   CONFIG
========================================================= */

const PORT = Number(process.env.PORT || 10000);

const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET;

const APP_BASE_URL =
  process.env.APP_BASE_URL ||
  `http://localhost:${PORT}`;

const BITPAY_BASE_URL =
  process.env.BITPAY_BASE_URL ||
  'https://api-sandbox.bitpay.ao/v1';

const BITPAY_SECRET_KEY =
  process.env.BITPAY_SECRET_KEY || '';

const BITPAY_WEBHOOK_SECRET =
  process.env.BITPAY_WEBHOOK_SECRET || '';

const HONEY_PAY_FEE_BPS =
  Number(process.env.HONEY_PAY_FEE_BPS || 80);

const HONEY_PAY_CURRENCY =
  process.env.HONEY_PAY_CURRENCY || 'AOA';

const BITPAY_MULTI_MERCHANT_ENABLED =
  String(process.env.BITPAY_MULTI_MERCHANT_ENABLED)
    .toLowerCase() === 'true';

if (!MONGODB_URI) {
  console.error('MONGODB_URI não configurada.');
  process.exit(1);
}

if (!JWT_SECRET) {
  console.error('JWT_SECRET não configurado.');
  process.exit(1);
}

/* =========================================================
   SECURITY
========================================================= */

app.disable('x-powered-by');

app.use(
  helmet({
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

/*
IMPORTANT:
Webhook precisa receber o corpo RAW para validação HMAC.
*/
app.post(
  '/api/webhooks/bitpay',
  express.raw({
    type: 'application/json',
    limit: '1mb'
  }),
  handleBitPayWebhook
);

app.use(
  express.json({
    limit: '1mb'
  })
);

app.use(
  express.urlencoded({
    extended: false,
    limit: '1mb'
  })
);

/* =========================================================
   RATE LIMIT
========================================================= */

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 500,
  standardHeaders: true,
  legacyHeaders: false
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false
});

const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api', globalLimiter);

/* =========================================================
   DATABASE
========================================================= */

mongoose.set('strictQuery', true);

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('MongoDB conectado.');
  })
  .catch((error) => {
    console.error('Erro MongoDB:', error);
    process.exit(1);
  });

/* =========================================================
   SCHEMAS
========================================================= */

const MerchantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
      index: true
    },

    passwordHash: {
      type: String,
      required: true,
      select: false
    },

    phone: {
      type: String,
      trim: true,
      maxlength: 30
    },

    businessName: {
      type: String,
      trim: true,
      maxlength: 150
    },

    taxId: {
      type: String,
      trim: true,
      maxlength: 50
    },

    status: {
      type: String,
      enum: ['PENDING', 'ACTIVE', 'SUSPENDED'],
      default: 'ACTIVE',
      index: true
    },

    currency: {
      type: String,
      default: 'AOA'
    },

    feeBps: {
      type: Number,
      default: HONEY_PAY_FEE_BPS
    },

    /*
    Future provider mapping.
    NÃO assume que este campo por si só cria
    uma subconta BitPay.
    */
    providerAccountId: {
      type: String,
      default: null,
      index: true
    },

    providerOnboardingStatus: {
      type: String,
      enum: [
        'NOT_STARTED',
        'PENDING',
        'APPROVED',
        'REJECTED'
      ],
      default: 'NOT_STARTED'
    }
  },
  {
    timestamps: true
  }
);

const CustomerSchema = new mongoose.Schema(
  {
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true
    },

    name: {
      type: String,
      trim: true,
      maxlength: 150
    },

    email: {
      type: String,
      trim: true,
      lowercase: true
    },

    phone: {
      type: String,
      trim: true,
      maxlength: 30
    },

    totalSpent: {
      type: Number,
      default: 0
    },

    totalOrders: {
      type: Number,
      default: 0
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

const ProductSchema = new mongoose.Schema(
  {
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },

    description: {
      type: String,
      trim: true,
      maxlength: 2000
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

    active: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

const OrderSchema = new mongoose.Schema(
  {
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true
    },

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true
    },

    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true
    },

    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
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

        subtotal: {
          type: Number,
          min: 0
        }
      }
    ],

    amount: {
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
        'PAID',
        'FAILED',
        'EXPIRED',
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
    }
  },
  {
    timestamps: true
  }
);

const PaymentSchema = new mongoose.Schema(
  {
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true
    },

    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true
    },

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true
    },

    provider: {
      type: String,
      enum: ['BITPAY'],
      default: 'BITPAY'
    },

    providerPaymentId: {
      type: String,
      unique: true,
      sparse: true,
      index: true
    },

    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
      index: true
    },

    amount: {
      type: Number,
      required: true,
      min: 1
    },

    feeBps: {
      type: Number,
      required: true
    },

    feeAmount: {
      type: Number,
      required: true,
      min: 0
    },

    netAmount: {
      type: Number,
      required: true,
      min: 0
    },

    currency: {
      type: String,
      default: 'AOA'
    },

    paymentMethod: {
      type: String,
      enum: [
        'multicaixa_express',
        'multicaixa_reference'
      ],
      required: true
    },

    status: {
      type: String,
      enum: [
        'CREATED',
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
      default: 'CREATED',
      index: true
    },

    providerRaw: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },

    reference: {
      entity: String,
      number: String,
      expiresAt: Date
    },

    checkoutUrl: {
      type: String,
      default: null
    },

    settlementStatus: {
      type: String,
      enum: [
        'NOT_APPLICABLE',
        'PENDING',
        'SETTLED',
        'UNKNOWN'
      ],
      default: 'PENDING'
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

const PaymentLinkSchema = new mongoose.Schema(
  {
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true
    },

    token: {
      type: String,
      required: true,
      unique: true,
      index: true
    },

    title: {
      type: String,
      required: true,
      maxlength: 200
    },

    description: {
      type: String,
      maxlength: 2000
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

const WebhookEventSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      default: 'BITPAY'
    },

    eventId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },

    eventType: {
      type: String,
      required: true
    },

    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },

    processed: {
      type: Boolean,
      default: false
    },

    processedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

const AuditLogSchema = new mongoose.Schema(
  {
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true
    },

    action: {
      type: String,
      required: true,
      index: true
    },

    entityType: String,

    entityId: String,

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },

    ip: String,

    userAgent: String
  },
  {
    timestamps: true
  }
);

const Merchant =
  mongoose.model('Merchant', MerchantSchema);

const Customer =
  mongoose.model('Customer', CustomerSchema);

const Product =
  mongoose.model('Product', ProductSchema);

const Order =
  mongoose.model('Order', OrderSchema);

const Payment =
  mongoose.model('Payment', PaymentSchema);

const PaymentLink =
  mongoose.model('PaymentLink', PaymentLinkSchema);

const WebhookEvent =
  mongoose.model('WebhookEvent', WebhookEventSchema);

const AuditLog =
  mongoose.model('AuditLog', AuditLogSchema);

/* =========================================================
   HELPERS
========================================================= */

function roundMoney(value) {
  return Math.round(Number(value));
}

function calculateFee(amount, feeBps) {
  return Math.floor(
    (Number(amount) * Number(feeBps)) / 10000
  );
}

function calculateNet(amount, feeBps) {
  const fee = calculateFee(amount, feeBps);

  return {
    fee,
    net: Number(amount) - fee
  };
}

function generateOrderNumber() {
  const timestamp =
    Date.now().toString(36).toUpperCase();

  const random =
    crypto.randomBytes(4)
      .toString('hex')
      .toUpperCase();

  return `HP-${timestamp}-${random}`;
}

function generateToken(bytes = 24) {
  return crypto.randomBytes(bytes).toString('hex');
}

function normalizePhone(phone) {
  if (!phone) return null;

  let value = String(phone)
    .replace(/\s+/g, '')
    .replace(/-/g, '');

  if (value.startsWith('+244')) {
    value = value.substring(4);
  }

  if (value.startsWith('244')) {
    value = value.substring(3);
  }

  return value;
}

function safeEqualHex(a, b) {
  try {
    const aa = Buffer.from(a, 'hex');
    const bb = Buffer.from(b, 'hex');

    if (aa.length !== bb.length) {
      return false;
    }

    return crypto.timingSafeEqual(aa, bb);
  } catch {
    return false;
  }
}

function verifyBitPaySignature(rawBody, signature) {
  if (!BITPAY_WEBHOOK_SECRET) {
    return false;
  }

  if (!signature) {
    return false;
  }

  const match =
    String(signature).match(
      /^t=(\d+),v1=([a-f0-9]+)$/i
    );

  if (!match) {
    return false;
  }

  const timestamp = Number(match[1]);
  const received = match[2];

  const now = Math.floor(Date.now() / 1000);

  if (
    !Number.isFinite(timestamp) ||
    Math.abs(now - timestamp) > 600
  ) {
    return false;
  }

  const signedPayload =
    `${timestamp}.${rawBody.toString('utf8')}`;

  const expected =
    crypto
      .createHmac(
        'sha256',
        BITPAY_WEBHOOK_SECRET
      )
      .update(signedPayload)
      .digest('hex');

  return safeEqualHex(expected, received);
}

async function writeAudit({
  merchantId = null,
  action,
  entityType = null,
  entityId = null,
  metadata = {},
  req = null
}) {
  try {
    await AuditLog.create({
      merchantId,
      action,
      entityType,
      entityId,
      metadata,
      ip: req?.ip || null,
      userAgent:
        req?.headers?.['user-agent'] || null
    });
  } catch (error) {
    console.error(
      'Audit error:',
      error.message
    );
  }
}

function createToken(merchant) {
  return jwt.sign(
    {
      merchantId: merchant._id.toString(),
      email: merchant.email
    },
    JWT_SECRET,
    {
      expiresIn: '7d',
      issuer: 'honey-pay'
    }
  );
}

function requireAuth(req, res, next) {
  try {
    const header =
      req.headers.authorization || '';

    if (!header.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'AUTH_REQUIRED'
      });
    }

    const token =
      header.substring(7);

    const decoded =
      jwt.verify(token, JWT_SECRET, {
        issuer: 'honey-pay'
      });

    req.merchantId = decoded.merchantId;

    next();
  } catch {
    return res.status(401).json({
      error: 'INVALID_TOKEN'
    });
  }
}

/* =========================================================
   BITPAY CLIENT
========================================================= */

async function bitPayRequest(
  endpoint,
  {
    method = 'GET',
    body = null,
    idempotencyKey = null
  } = {}
) {
  if (!BITPAY_SECRET_KEY) {
    throw new Error(
      'BITPAY_SECRET_KEY não configurada'
    );
  }

  const url =
    `${BITPAY_BASE_URL}${endpoint}`;

  const headers = {
    Authorization:
      `Bearer ${BITPAY_SECRET_KEY}`,

    Accept:
      'application/json'
  };

  if (body !== null) {
    headers['Content-Type'] =
      'application/json';
  }

  if (idempotencyKey) {
    headers['Idempotency-Key'] =
      idempotencyKey;
  }

  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () => controller.abort(),
      20000
    );

  try {
    const response =
      await fetch(url, {
        method,
        headers,
        body:
          body === null
            ? undefined
            : JSON.stringify(body),
        signal: controller.signal
      });

    const text =
      await response.text();

    let data = {};

    try {
      data =
        text ? JSON.parse(text) : {};
    } catch {
      data = {
        raw: text
      };
    }

    if (!response.ok) {
      const error =
        new Error(
          data?.message ||
          data?.error ||
          `BitPay HTTP ${response.status}`
        );

      error.status =
        response.status;

      error.data = data;

      throw error;
    }

    return data;
  } finally {
    clearTimeout(timeout);
  }
}

/* =========================================================
   HEALTH
========================================================= */

app.get('/health', async (req, res) => {
  const mongoReady =
    mongoose.connection.readyState === 1;

  res.json({
    ok:
      mongoReady &&
      Boolean(BITPAY_SECRET_KEY),

    service: 'honey-pay',

    environment:
      process.env.NODE_ENV || 'development',

    database:
      mongoReady
        ? 'connected'
        : 'disconnected',

    bitpay:
      Boolean(BITPAY_SECRET_KEY)
        ? 'configured'
        : 'missing',

    bitpayEnvironment:
      BITPAY_BASE_URL.includes('sandbox')
        ? 'sandbox'
        : 'production',

    timestamp:
      new Date().toISOString()
  });
});

/* =========================================================
   AUTH
========================================================= */

app.post(
  '/api/auth/register',
  authLimiter,
  async (req, res, next) => {
    try {
      const {
        name,
        email,
        password,
        phone,
        businessName
      } = req.body;

      if (
        !name ||
        !email ||
        !password
      ) {
        return res.status(400).json({
          error: 'MISSING_FIELDS'
        });
      }

      if (password.length < 8) {
        return res.status(400).json({
          error: 'PASSWORD_TOO_SHORT'
        });
      }

      const normalizedEmail =
        String(email)
          .trim()
          .toLowerCase();

      const exists =
        await Merchant.findOne({
          email: normalizedEmail
        });

      if (exists) {
        return res.status(409).json({
          error: 'EMAIL_ALREADY_EXISTS'
        });
      }

      const passwordHash =
        await bcrypt.hash(
          password,
          12
        );

      const merchant =
        await Merchant.create({
          name,
          email: normalizedEmail,
          passwordHash,
          phone,
          businessName,
          feeBps:
            HONEY_PAY_FEE_BPS,
          currency:
            HONEY_PAY_CURRENCY
        });

      const token =
        createToken(merchant);

      await writeAudit({
        merchantId: merchant._id,
        action: 'MERCHANT_REGISTERED',
        entityType: 'Merchant',
        entityId:
          merchant._id.toString(),
        req
      });

      return res.status(201).json({
        token,

        merchant: {
          id: merchant._id,
          name: merchant.name,
          email: merchant.email,
          businessName:
            merchant.businessName,
          feeBps:
            merchant.feeBps,
          currency:
            merchant.currency
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

app.post(
  '/api/auth/login',
  authLimiter,
  async (req, res, next) => {
    try {
      const {
        email,
        password
      } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          error: 'MISSING_CREDENTIALS'
        });
      }

      const merchant =
        await Merchant
          .findOne({
            email:
              String(email)
                .trim()
                .toLowerCase()
          })
          .select('+passwordHash');

      if (!merchant) {
        return res.status(401).json({
          error: 'INVALID_CREDENTIALS'
        });
      }

      const valid =
        await bcrypt.compare(
          password,
          merchant.passwordHash
        );

      if (!valid) {
        return res.status(401).json({
          error: 'INVALID_CREDENTIALS'
        });
      }

      if (
        merchant.status !== 'ACTIVE'
      ) {
        return res.status(403).json({
          error: 'MERCHANT_NOT_ACTIVE'
        });
      }

      const token =
        createToken(merchant);

      return res.json({
        token,

        merchant: {
          id: merchant._id,
          name: merchant.name,
          email: merchant.email,
          businessName:
            merchant.businessName,
          feeBps:
            merchant.feeBps,
          currency:
            merchant.currency
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

app.get(
  '/api/auth/me',
  requireAuth,
  async (req, res, next) => {
    try {
      const merchant =
        await Merchant.findById(
          req.merchantId
        );

      if (!merchant) {
        return res.status(404).json({
          error: 'MERCHANT_NOT_FOUND'
        });
      }

      res.json({
        merchant: {
          id: merchant._id,
          name: merchant.name,
          email: merchant.email,
          phone: merchant.phone,
          businessName:
            merchant.businessName,
          taxId: merchant.taxId,
          feeBps:
            merchant.feeBps,
          currency:
            merchant.currency,
          providerOnboardingStatus:
            merchant.providerOnboardingStatus
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   PRODUCTS
========================================================= */

app.post(
  '/api/products',
  requireAuth,
  async (req, res, next) => {
    try {
      const {
        name,
        description,
        price
      } = req.body;

      const amount =
        roundMoney(price);

      if (
        !name ||
        !Number.isFinite(amount) ||
        amount <= 0
      ) {
        return res.status(400).json({
          error: 'INVALID_PRODUCT'
        });
      }

      const product =
        await Product.create({
          merchantId:
            req.merchantId,
          name,
          description,
          price: amount,
          currency:
            HONEY_PAY_CURRENCY
        });

      res.status(201).json({
        product
      });
    } catch (error) {
      next(error);
    }
  }
);

app.get(
  '/api/products',
  requireAuth,
  async (req, res, next) => {
    try {
      const products =
        await Product.find({
          merchantId:
            req.merchantId
        }).sort({
          createdAt: -1
        });

      res.json({
        products
      });
    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   CUSTOMERS
========================================================= */

app.post(
  '/api/customers',
  requireAuth,
  async (req, res, next) => {
    try {
      const {
        name,
        email,
        phone
      } = req.body;

      const customer =
        await Customer.create({
          merchantId:
            req.merchantId,
          name,
          email:
            email
              ? String(email)
                  .trim()
                  .toLowerCase()
              : undefined,
          phone
        });

      res.status(201).json({
        customer
      });
    } catch (error) {
      next(error);
    }
  }
);

app.get(
  '/api/customers',
  requireAuth,
  async (req, res, next) => {
    try {
      const customers =
        await Customer.find({
          merchantId:
            req.merchantId
        }).sort({
          createdAt: -1
        });

      res.json({
        customers
      });
    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   ORDERS
========================================================= */

app.post(
  '/api/orders',
  requireAuth,
  async (req, res, next) => {
    try {
      const {
        customer,
        items,
        amount
      } = req.body;

      const total =
        roundMoney(amount);

      if (
        !Number.isFinite(total) ||
        total <= 0
      ) {
        return res.status(400).json({
          error: 'INVALID_AMOUNT'
        });
      }

      if (
        !Array.isArray(items) ||
        items.length === 0
      ) {
        return res.status(400).json({
          error: 'ORDER_REQUIRES_ITEMS'
        });
      }

      let customerId = null;

      if (customer?.id) {
        const found =
          await Customer.findOne({
            _id: customer.id,
            merchantId:
              req.merchantId
          });

        if (!found) {
          return res.status(404).json({
            error: 'CUSTOMER_NOT_FOUND'
          });
        }

        customerId =
          found._id;
      }

      const order =
        await Order.create({
          merchantId:
            req.merchantId,

          customerId,

          orderNumber:
            generateOrderNumber(),

          items,

          amount: total,

          currency:
            HONEY_PAY_CURRENCY,

          customerSnapshot: {
            name:
              customer?.name || '',
            email:
              customer?.email || '',
            phone:
              customer?.phone || ''
          }
        });

      res.status(201).json({
        order
      });
    } catch (error) {
      next(error);
    }
  }
);

app.get(
  '/api/orders',
  requireAuth,
  async (req, res, next) => {
    try {
      const orders =
        await Order.find({
          merchantId:
            req.merchantId
        })
          .sort({
            createdAt: -1
          })
          .limit(200);

      res.json({
        orders
      });
    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   CREATE PAYMENT
========================================================= */

app.post(
  '/api/payments',
  requireAuth,
  paymentLimiter,
  async (req, res, next) => {
    try {
      const {
        orderId,
        paymentMethod,
        customerMobile
      } = req.body;

      if (
        !orderId ||
        ![
          'multicaixa_express',
          'multicaixa_reference'
        ].includes(paymentMethod)
      ) {
        return res.status(400).json({
          error:
            'INVALID_PAYMENT_REQUEST'
        });
      }

      const order =
        await Order.findOne({
          _id: orderId,
          merchantId:
            req.merchantId
        });

      if (!order) {
        return res.status(404).json({
          error: 'ORDER_NOT_FOUND'
        });
      }

      if (
        [
          'PAID',
          'REFUNDED'
        ].includes(order.status)
      ) {
        return res.status(409).json({
          error:
            'ORDER_ALREADY_PROCESSED'
        });
      }

      const merchant =
        await Merchant.findById(
          req.merchantId
        );

      if (!merchant) {
        return res.status(404).json({
          error: 'MERCHANT_NOT_FOUND'
        });
      }

      /*
      NÃO permitir produção multi-merchant
      sem a autorização/estrutura correspondente
      do provedor.
      */
      if (
        !BITPAY_MULTI_MERCHANT_ENABLED &&
        !merchant.providerAccountId
      ) {
        /*
        Isto não impede sandbox.
        Em produção, a conta BitPay usada pela
        aplicação deve estar corretamente enquadrada.
        */
      }

      if (
        paymentMethod ===
          'multicaixa_express' &&
        !normalizePhone(customerMobile)
      ) {
        return res.status(400).json({
          error:
            'CUSTOMER_MOBILE_REQUIRED'
        });
      }

      const idempotencyKey =
        `hp_${order._id}_${paymentMethod}`;

      const existing =
        await Payment.findOne({
          idempotencyKey
        });

      if (existing) {
        return res.status(200).json({
          payment: existing,
          reused: true
        });
      }

      const {
        fee,
        net
      } =
        calculateNet(
          order.amount,
          merchant.feeBps
        );

      const payment =
        await Payment.create({
          merchantId:
            merchant._id,

          orderId:
            order._id,

          customerId:
            order.customerId,

          idempotencyKey,

          amount:
            order.amount,

          feeBps:
            merchant.feeBps,

          feeAmount:
            fee,

          netAmount:
            net,

          currency:
            order.currency,

          paymentMethod,

          status:
            'CREATED'
        });

      const bitpayPayload = {
        amount:
          order.amount,

        currency:
          'AOA',

        payment_method:
          paymentMethod,

        merchant_reference:
          order.orderNumber,

        metadata: {
          honey_pay_payment_id:
            payment._id.toString(),

          honey_pay_order_id:
            order._id.toString(),

          honey_pay_merchant_id:
            merchant._id.toString()
        }
      };

      if (
        paymentMethod ===
        'multicaixa_express'
      ) {
        bitpayPayload.customer = {
          mobile:
            normalizePhone(
              customerMobile
            )
        };
      }

      let providerResponse;

      try {
        providerResponse =
          await bitPayRequest(
            '/payment_intents',
            {
              method: 'POST',
              body:
                bitpayPayload,
              idempotencyKey
            }
          );
      } catch (providerError) {
        await Payment.findByIdAndUpdate(
          payment._id,
          {
            status:
              'UNKNOWN',
            providerRaw:
              providerError.data || {
                message:
                  providerError.message
              }
          }
        );

        await writeAudit({
          merchantId:
            merchant._id,
          action:
            'PAYMENT_PROVIDER_UNKNOWN',
          entityType:
            'Payment',
          entityId:
            payment._id.toString(),
          metadata: {
            message:
              providerError.message
          },
          req
        });

        return res.status(502).json({
          error:
            'PAYMENT_PROVIDER_UNKNOWN',

          paymentId:
            payment._id,

          message:
            'O provedor não confirmou o resultado da criação. Não foi criada uma segunda cobrança.'
        });
      }

      const providerPaymentId =
        providerResponse.id ||
        providerResponse.payment_intent_id;

      const providerStatus =
        providerResponse.status ||
        'PENDING';

      const update = {
        providerPaymentId,
        providerRaw:
          providerResponse,

        status:
          providerStatus,

        settlementStatus:
          'PENDING'
      };

      if (
        providerResponse.reference
      ) {
        update.reference = {
          entity:
            providerResponse.reference.entity,

          number:
            providerResponse.reference.number,

          expiresAt:
            providerResponse.reference.expires_at
              ? new Date(
                  providerResponse.reference.expires_at
                )
              : null
        };
      }

      if (
        providerResponse.checkout_url
      ) {
        update.checkoutUrl =
          providerResponse.checkout_url;
      }

      if (
        providerStatus ===
        'SUCCEEDED'
      ) {
        update.succeededAt =
          new Date();

        update.settlementStatus =
          'SETTLED';

        await Order.findByIdAndUpdate(
          order._id,
          {
            status: 'PAID'
          }
        );
      }

      const savedPayment =
        await Payment.findByIdAndUpdate(
          payment._id,
          update,
          {
            new: true
          }
        );

      await writeAudit({
        merchantId:
          merchant._id,
        action:
          'PAYMENT_CREATED',
        entityType:
          'Payment',
        entityId:
          payment._id.toString(),
        metadata: {
          providerPaymentId,
          amount:
            order.amount,
          fee,
          net,
          paymentMethod
        },
        req
      });

      return res.status(201).json({
        payment:
          savedPayment
      });
    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   PAYMENT BY ID
========================================================= */

app.get(
  '/api/payments/:id',
  requireAuth,
  async (req, res, next) => {
    try {
      const payment =
        await Payment.findOne({
          _id: req.params.id,
          merchantId:
            req.merchantId
        });

      if (!payment) {
        return res.status(404).json({
          error: 'PAYMENT_NOT_FOUND'
        });
      }

      res.json({
        payment
      });
    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   PAYMENT LIST
========================================================= */

app.get(
  '/api/payments',
  requireAuth,
  async (req, res, next) => {
    try {
      const query = {
        merchantId:
          req.merchantId
      };

      if (req.query.status) {
        query.status =
          req.query.status;
      }

      if (req.query.method) {
        query.paymentMethod =
          req.query.method;
      }

      const payments =
        await Payment.find(query)
          .sort({
            createdAt: -1
          })
          .limit(500);

      res.json({
        payments
      });
    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   CANCEL PAYMENT
========================================================= */

app.post(
  '/api/payments/:id/cancel',
  requireAuth,
  async (req, res, next) => {
    try {
      const payment =
        await Payment.findOne({
          _id: req.params.id,
          merchantId:
            req.merchantId
        });

      if (!payment) {
        return res.status(404).json({
          error: 'PAYMENT_NOT_FOUND'
        });
      }

      if (
        !payment.providerPaymentId
      ) {
        return res.status(400).json({
          error:
            'PROVIDER_PAYMENT_NOT_CREATED'
        });
      }

      if (
        [
          'SUCCEEDED',
          'REFUNDED',
          'PARTIALLY_REFUNDED'
        ].includes(
          payment.status
        )
      ) {
        return res.status(409).json({
          error:
            'PAYMENT_CANNOT_BE_CANCELLED'
        });
      }

      const providerResponse =
        await bitPayRequest(
          `/payment_intents/${encodeURIComponent(
            payment.providerPaymentId
          )}/cancel`,
          {
            method: 'POST'
          }
        );

      payment.status =
        'CANCELLED';

      payment.providerRaw =
        providerResponse;

      await payment.save();

      await Order.findByIdAndUpdate(
        payment.orderId,
        {
          status: 'CANCELLED'
        }
      );

      res.json({
        payment
      });
    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   PAYMENT LINK
========================================================= */

app.post(
  '/api/payment-links',
  requireAuth,
  async (req, res, next) => {
    try {
      const {
        title,
        description,
        amount,
        expiresAt
      } = req.body;

      const value =
        roundMoney(amount);

      if (
        !title ||
        !Number.isFinite(value) ||
        value <= 0
      ) {
        return res.status(400).json({
          error:
            'INVALID_PAYMENT_LINK'
        });
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
            value,

          currency:
            HONEY_PAY_CURRENCY,

          expiresAt:
            expiresAt
              ? new Date(expiresAt)
              : null
        });

      res.status(201).json({
        link,

        url:
          `${APP_BASE_URL}/pay/${token}`
      });
    } catch (error) {
      next(error);
    }
  }
);

app.get(
  '/api/payment-links',
  requireAuth,
  async (req, res, next) => {
    try {
      const links =
        await PaymentLink.find({
          merchantId:
            req.merchantId
        }).sort({
          createdAt: -1
        });

      res.json({
        links: links.map((link) => ({
          ...link.toObject(),
          url:
            `${APP_BASE_URL}/pay/${link.token}`
        }))
      });
    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   PUBLIC CHECKOUT
========================================================= */

app.get(
  '/api/public/payment-links/:token',
  async (req, res, next) => {
    try {
      const link =
        await PaymentLink.findOne({
          token:
            req.params.token,
          active: true
        });

      if (!link) {
        return res.status(404).json({
          error:
            'PAYMENT_LINK_NOT_FOUND'
        });
      }

      if (
        link.expiresAt &&
        link.expiresAt <= new Date()
      ) {
        return res.status(410).json({
          error:
            'PAYMENT_LINK_EXPIRED'
        });
      }

      const merchant =
        await Merchant.findById(
          link.merchantId
        ).select(
          'businessName name currency'
        );

      res.json({
        link: {
          id: link._id,
          title: link.title,
          description:
            link.description,
          amount: link.amount,
          currency:
            link.currency,
          expiresAt:
            link.expiresAt
        },

        merchant
      });
    } catch (error) {
      next(error);
    }
  }
);

/*
Cliente paga através do link.
*/
app.post(
  '/api/public/payment-links/:token/pay',
  paymentLimiter,
  async (req, res, next) => {
    try {
      const {
        paymentMethod,
        customerName,
        customerEmail,
        customerMobile
      } = req.body;

      const link =
        await PaymentLink.findOne({
          token:
            req.params.token,
          active: true
        });

      if (!link) {
        return res.status(404).json({
          error:
            'PAYMENT_LINK_NOT_FOUND'
        });
      }

      if (
        link.expiresAt &&
        link.expiresAt <= new Date()
      ) {
        return res.status(410).json({
          error:
            'PAYMENT_LINK_EXPIRED'
        });
      }

      const merchant =
        await Merchant.findById(
          link.merchantId
        );

      if (!merchant) {
        return res.status(404).json({
          error:
            'MERCHANT_NOT_FOUND'
        });
      }

      let customerDoc = null;

      if (
        customerEmail ||
        customerMobile
      ) {
        const normalizedEmail =
          customerEmail
            ? String(
                customerEmail
              )
                .trim()
                .toLowerCase()
            : null;

        customerDoc =
          await Customer.findOne({
            merchantId:
              merchant._id,

            $or: [
              ...(normalizedEmail
                ? [
                    {
                      email:
                        normalizedEmail
                    }
                  ]
                : []),

              ...(customerMobile
                ? [
                    {
                      phone:
                        normalizePhone(
                          customerMobile
                        )
                    }
                  ]
                : [])
            ]
          });

        if (!customerDoc) {
          customerDoc =
            await Customer.create({
              merchantId:
                merchant._id,

              name:
                customerName,

              email:
                normalizedEmail,

              phone:
                normalizePhone(
                  customerMobile
                )
            });
        }
      }

      const order =
        await Order.create({
          merchantId:
            merchant._id,

          customerId:
            customerDoc?._id ||
            null,

          orderNumber:
            generateOrderNumber(),

          items: [
            {
              name:
                link.title,

              quantity: 1,

              unitPrice:
                link.amount,

              subtotal:
                link.amount
            }
          ],

          amount:
            link.amount,

          currency:
            link.currency,

          customerSnapshot: {
            name:
              customerName || '',
            email:
              customerEmail || '',
            phone:
              customerMobile || ''
          }
        });

      /*
      Reutiliza o mesmo motor de pagamento.
      */

      const {
        fee,
        net
      } =
        calculateNet(
          order.amount,
          merchant.feeBps
        );

      const idempotencyKey =
        `hp_link_${order._id}_${paymentMethod}`;

      const payment =
        await Payment.create({
          merchantId:
            merchant._id,

          orderId:
            order._id,

          customerId:
            customerDoc?._id ||
            null,

          idempotencyKey,

          amount:
            order.amount,

          feeBps:
            merchant.feeBps,

          feeAmount:
            fee,

          netAmount:
            net,

          currency:
            order.currency,

          paymentMethod,

          status:
            'CREATED'
        });

      const payload = {
        amount:
          order.amount,

        currency:
          'AOA',

        payment_method:
          paymentMethod,

        merchant_reference:
          order.orderNumber,

        metadata: {
          honey_pay_payment_id:
            payment._id.toString(),

          honey_pay_order_id:
            order._id.toString(),

          honey_pay_merchant_id:
            merchant._id.toString(),

          payment_link:
            link._id.toString()
        }
      };

      if (
        paymentMethod ===
        'multicaixa_express'
      ) {
        const mobile =
          normalizePhone(
            customerMobile
          );

        if (!mobile) {
          await Payment.deleteOne({
            _id: payment._id
          });

          await Order.deleteOne({
            _id: order._id
          });

          return res.status(400).json({
            error:
              'CUSTOMER_MOBILE_REQUIRED'
          });
        }

        payload.customer = {
          mobile
        };
      }

      let providerResponse;

      try {
        providerResponse =
          await bitPayRequest(
            '/payment_intents',
            {
              method: 'POST',
              body: payload,
              idempotencyKey
            }
          );
      } catch (providerError) {
        await Payment.findByIdAndUpdate(
          payment._id,
          {
            status: 'UNKNOWN',
            providerRaw:
              providerError.data || {
                message:
                  providerError.message
              }
          }
        );

        return res.status(502).json({
          error:
            'PAYMENT_PROVIDER_UNKNOWN',

          paymentId:
            payment._id
        });
      }

      payment.providerPaymentId =
        providerResponse.id ||
        providerResponse.payment_intent_id;

      payment.providerRaw =
        providerResponse;

      payment.status =
        providerResponse.status ||
        'PENDING';

      if (
        providerResponse.reference
      ) {
        payment.reference = {
          entity:
            providerResponse.reference.entity,

          number:
            providerResponse.reference.number,

          expiresAt:
            providerResponse.reference.expires_at
              ? new Date(
                  providerResponse.reference.expires_at
                )
              : null
        };
      }

      if (
        providerResponse.checkout_url
      ) {
        payment.checkoutUrl =
          providerResponse.checkout_url;
      }

      await payment.save();

      res.status(201).json({
        orderId:
          order._id,

        payment
      });
    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   DASHBOARD
========================================================= */

app.get(
  '/api/dashboard',
  requireAuth,
  async (req, res, next) => {
    try {
      const merchantId =
        new mongoose.Types.ObjectId(
          req.merchantId
        );

      const [
        totalPayments,
        successfulPayments,
        pendingPayments,
        failedPayments,
        revenueResult,
        feesResult,
        recentPayments
      ] = await Promise.all([
        Payment.countDocuments({
          merchantId
        }),

        Payment.countDocuments({
          merchantId,
          status:
            'SUCCEEDED'
        }),

        Payment.countDocuments({
          merchantId,
          status: {
            $in: [
              'CREATED',
              'PENDING',
              'PROCESSING',
              'UNKNOWN'
            ]
          }
        }),

        Payment.countDocuments({
          merchantId,
          status: {
            $in: [
              'FAILED',
              'EXPIRED',
              'CANCELLED'
            ]
          }
        }),

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
              _id: null,
              total: {
                $sum: '$amount'
              }
            }
          }
        ]),

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
              _id: null,
              total: {
                $sum: '$feeAmount'
              }
            }
          }
        ]),

        Payment.find({
          merchantId
        })
          .sort({
            createdAt: -1
          })
          .limit(10)
      ]);

      res.json({
        stats: {
          totalPayments,
          successfulPayments,
          pendingPayments,
          failedPayments,

          grossVolume:
            revenueResult[0]?.total ||
            0,

          honeyPayFees:
            feesResult[0]?.total ||
            0
        },

        recentPayments
      });
    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   REAL BITPAY WEBHOOK
========================================================= */

async function handleBitPayWebhook(
  req,
  res
) {
  try {
    const rawBody =
      Buffer.isBuffer(req.body)
        ? req.body
        : Buffer.from(
            req.body || ''
          );

    const signature =
      req.headers[
        'bitpay-signature'
      ];

    if (
      !verifyBitPaySignature(
        rawBody,
        signature
      )
    ) {
      return res.status(401).json({
        error:
          'INVALID_WEBHOOK_SIGNATURE'
      });
    }

    let event;

    try {
      event =
        JSON.parse(
          rawBody.toString('utf8')
        );
    } catch {
      return res.status(400).json({
        error:
          'INVALID_WEBHOOK_JSON'
      });
    }

    /*
    Aceita diferentes formas de event_id
    para manter compatibilidade.
    */
    const eventId =
      event.id ||
      event.event_id ||
      event.data?.id;

    const eventType =
      event.type ||
      event.event_type ||
      event.event ||
      'unknown';

    if (!eventId) {
      return res.status(400).json({
        error:
          'WEBHOOK_EVENT_ID_REQUIRED'
      });
    }

    /*
    DEDUPLICAÇÃO
    */
    try {
      await WebhookEvent.create({
        provider:
          'BITPAY',

        eventId,

        eventType,

        payload:
          event
      });
    } catch (error) {
      if (
        error?.code === 11000
      ) {
        return res.status(200).json({
          received: true,
          duplicate: true
        });
      }

      throw error;
    }

    /*
    Localiza o payment.
    */
    const providerPaymentId =
      event.data?.payment_id ||
      event.data?.payment_intent_id ||
      event.payment_id ||
      event.payment_intent_id ||
      event.data?.id;

    let payment = null;

    if (providerPaymentId) {
      payment =
        await Payment.findOne({
          providerPaymentId
        });
    }

    /*
    Fallback pelo merchant_reference.
    */
    if (!payment) {
      const merchantReference =
        event.data?.merchant_reference ||
        event.merchant_reference;

      if (merchantReference) {
        const order =
          await Order.findOne({
            orderNumber:
              merchantReference
          });

        if (order) {
          payment =
            await Payment.findOne({
              orderId:
                order._id
            }).sort({
              createdAt: -1
            });
        }
      }
    }

    if (!payment) {
      await WebhookEvent.updateOne(
        {
          eventId
        },
        {
          processed: true,
          processedAt:
            new Date()
        }
      );

      return res.status(200).json({
        received: true,
        matched: false
      });
    }

    /*
    Determina o novo estado.
    */
    const providerStatus =
      event.data?.status ||
      event.status;

    let newStatus =
      providerStatus;

    /*
    Alguns eventos possuem tipo sem status.
    */
    if (
      !newStatus &&
      eventType ===
        'payment.succeeded'
    ) {
      newStatus =
        'SUCCEEDED';
    }

    if (
      !newStatus &&
      eventType ===
        'payment.failed'
    ) {
      newStatus =
        'FAILED';
    }

    if (
      !newStatus &&
      eventType ===
        'payment.unknown'
    ) {
      newStatus =
        'UNKNOWN';
    }

    if (
      !newStatus &&
      eventType ===
        'payment.reconciled'
    ) {
      newStatus =
        event.data?.reconciled_status ||
        'SUCCEEDED';
    }

    /*
    Nunca fazemos downgrade de SUCCEEDED.
    */
    if (
      payment.status ===
        'SUCCEEDED' &&
      newStatus !==
        'REFUNDED' &&
      newStatus !==
        'PARTIALLY_REFUNDED'
    ) {
      newStatus =
        'SUCCEEDED';
    }

    const oldStatus =
      payment.status;

    if (
      [
        'CREATED',
        'PENDING',
        'PROCESSING',
        'SUCCEEDED',
        'FAILED',
        'EXPIRED',
        'UNKNOWN',
        'CANCELLED',
        'PARTIALLY_REFUNDED',
        'REFUNDED'
      ].includes(
        newStatus
      )
    ) {
      payment.status =
        newStatus;
    }

    payment.providerRaw =
      event;

    if (
      payment.status ===
      'SUCCEEDED'
    ) {
      payment.succeededAt =
        payment.succeededAt ||
        new Date();

      payment.settlementStatus =
        'SETTLED';

      await Order.findByIdAndUpdate(
        payment.orderId,
        {
          status:
            'PAID'
        }
      );

      /*
      Atualiza estatísticas do cliente
      somente quando a transação passa
      efetivamente para SUCCEEDED.
      */
      if (
        oldStatus !==
          'SUCCEEDED' &&
        payment.customerId
      ) {
        await Customer.findByIdAndUpdate(
          payment.customerId,
          {
            $inc: {
              totalSpent:
                payment.amount,

              totalOrders: 1
            }
          }
        );
      }
    }

    if (
      payment.status ===
      'FAILED'
    ) {
      await Order.findByIdAndUpdate(
        payment.orderId,
        {
          status:
            'FAILED'
        }
      );
    }

    if (
      payment.status ===
      'EXPIRED'
    ) {
      await Order.findByIdAndUpdate(
        payment.orderId,
        {
          status:
            'EXPIRED'
        }
      );
    }

    if (
      payment.status ===
      'CANCELLED'
    ) {
      await Order.findByIdAndUpdate(
        payment.orderId,
        {
          status:
            'CANCELLED'
        }
      );
    }

    await payment.save();

    await WebhookEvent.updateOne(
      {
        eventId
      },
      {
        processed: true,
        processedAt:
          new Date()
      }
    );

    await writeAudit({
      merchantId:
        payment.merchantId,

      action:
        'BITPAY_WEBHOOK_PROCESSED',

      entityType:
        'Payment',

      entityId:
        payment._id.toString(),

      metadata: {
        eventId,
        eventType,
        oldStatus,
        newStatus:
          payment.status
      }
    });

    return res.status(200).json({
      received: true,
      processed: true
    });
  } catch (error) {
    console.error(
      'BitPay webhook error:',
      error
    );

    return res.status(500).json({
      error:
        'WEBHOOK_PROCESSING_ERROR'
    });
  }
}

/* =========================================================
   ADMIN / RECONCILIATION
========================================================= */

/*
Reconcilia pagamentos UNKNOWN consultando
a BitPay. Nunca cria uma nova cobrança.
*/
app.post(
  '/api/payments/:id/reconcile',
  requireAuth,
  async (req, res, next) => {
    try {
      const payment =
        await Payment.findOne({
          _id:
            req.params.id,

          merchantId:
            req.merchantId
        });

      if (!payment) {
        return res.status(404).json({
          error:
            'PAYMENT_NOT_FOUND'
        });
      }

      if (
        !payment.providerPaymentId
      ) {
        return res.status(400).json({
          error:
            'PROVIDER_PAYMENT_ID_MISSING'
        });
      }

      if (
        payment.status !==
        'UNKNOWN'
      ) {
        return res.json({
          payment,
          reconciled: false,
          reason:
            'PAYMENT_IS_NOT_UNKNOWN'
        });
      }

      const provider =
        await bitPayRequest(
          `/payment_intents/${encodeURIComponent(
            payment.providerPaymentId
          )}`
        );

      const status =
        provider.status;

      if (
        [
          'PENDING',
          'PROCESSING',
          'SUCCEEDED',
          'FAILED',
          'EXPIRED',
          'UNKNOWN',
          'CANCELLED'
        ].includes(status)
      ) {
        payment.status =
          status;

        payment.providerRaw =
          provider;

        if (
          status ===
          'SUCCEEDED'
        ) {
          payment.succeededAt =
            payment.succeededAt ||
            new Date();

          payment.settlementStatus =
            'SETTLED';

          await Order.findByIdAndUpdate(
            payment.orderId,
            {
              status:
                'PAID'
            }
          );
        }

        await payment.save();
      }

      res.json({
        payment,
        reconciled: true
      });
    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   REFUND
========================================================= */

app.post(
  '/api/payments/:id/refund',
  requireAuth,
  paymentLimiter,
  async (req, res, next) => {
    try {
      const payment =
        await Payment.findOne({
          _id:
            req.params.id,

          merchantId:
            req.merchantId
        });

      if (!payment) {
        return res.status(404).json({
          error:
            'PAYMENT_NOT_FOUND'
        });
      }

      if (
        payment.status !==
        'SUCCEEDED'
      ) {
        return res.status(409).json({
          error:
            'ONLY_SUCCEEDED_PAYMENTS_CAN_BE_REFUNDED'
        });
      }

      const requestedAmount =
        req.body.amount == null
          ? payment.amount
          : roundMoney(
              req.body.amount
            );

      if (
        requestedAmount <= 0 ||
        requestedAmount >
          payment.amount
      ) {
        return res.status(400).json({
          error:
            'INVALID_REFUND_AMOUNT'
        });
      }

      const refundKey =
        `refund_${payment._id}_${requestedAmount}`;

      const providerResponse =
        await bitPayRequest(
          '/refunds',
          {
            method: 'POST',

            body: {
              payment_id:
                payment.providerPaymentId,

              amount:
                requestedAmount,

              currency:
                'AOA'
            },

            idempotencyKey:
              refundKey
          }
        );

      if (
        requestedAmount ===
        payment.amount
      ) {
        payment.status =
          'REFUNDED';
      } else {
        payment.status =
          'PARTIALLY_REFUNDED';
      }

      payment.providerRaw =
        providerResponse;

      await payment.save();

      await Order.findByIdAndUpdate(
        payment.orderId,
        {
          status:
            requestedAmount ===
            payment.amount
              ? 'REFUNDED'
              : 'PARTIALLY_REFUNDED'
        }
      );

      await writeAudit({
        merchantId:
          req.merchantId,

        action:
          'REFUND_CREATED',

        entityType:
          'Payment',

        entityId:
          payment._id.toString(),

        metadata: {
          amount:
            requestedAmount
        },

        req
      });

      res.status(201).json({
        payment,
        refund:
          providerResponse
      });
    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   PUBLIC CHECKOUT PAGE
========================================================= */

app.get(
  '/pay/:token',
  (req, res) => {
    res.sendFile(
      path.join(
        __dirname,
        'public',
        'checkout.html'
      )
    );
  }
);

/* =========================================================
   FRONTEND
========================================================= */

const publicDir =
  path.join(
    __dirname,
    'public'
  );

app.use(
  express.static(
    publicDir,
    {
      extensions: ['html']
    }
  )
);

/* =========================================================
   API 404
========================================================= */

app.use(
  '/api',
  (req, res) => {
    res.status(404).json({
      error:
        'API_ROUTE_NOT_FOUND'
    });
  }
);

/* =========================================================
   FRONTEND FALLBACK
========================================================= */

app.get(
  '*splat',
  (req, res) => {
    if (
      req.path.startsWith('/api/')
    ) {
      return res.status(404).json({
        error:
          'API_ROUTE_NOT_FOUND'
      });
    }

    res.sendFile(
      path.join(
        publicDir,
        'index.html'
      )
    );
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
      error
    );

    if (
      res.headersSent
    ) {
      return next(error);
    }

    const status =
      Number(error.status) || 500;

    res.status(status).json({
      error:
        status >= 500
          ? 'INTERNAL_SERVER_ERROR'
          : error.message,

      ...(process.env.NODE_ENV !==
        'production' && {
        details:
          error.stack
      })
    });
  }
);

/* =========================================================
   START
========================================================= */

app.listen(
  PORT,
  () => {
    console.log(
      '=========================================='
    );

    console.log(
      'HONEY PAY'
    );

    console.log(
      `Port: ${PORT}`
    );

    console.log(
      `Environment: ${
        process.env.NODE_ENV ||
        'development'
      }`
    );

    console.log(
      `BitPay: ${
        BITPAY_BASE_URL
      }`
    );

    console.log(
      `Fee: ${
        HONEY_PAY_FEE_BPS /
        100
      }%`
    );

    console.log(
      '=========================================='
    );
  }
);
