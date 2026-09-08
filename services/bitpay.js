'use strict';

/**
 * Honey Pay
 * BitPay Angola Gateway Adapter
 *
 * Métodos preparados:
 * - multicaixa_express
 * - multicaixa_reference
 *
 * Sandbox:
 * https://api-sandbox.bitpay.ao/v1
 *
 * Produção:
 * https://api.bitpay.ao/v1
 */

const crypto = require('crypto');

const BITPAY_ENABLED =
  String(
    process.env.BITPAY_ENABLED ??
    process.env.BITPAY_MULTI_MERCHANT_ENABLED ??
    'true'
  ).toLowerCase() === 'true';
const BITPAY_ENV =
  String(process.env.BITPAY_ENV || 'sandbox').toLowerCase();

const BITPAY_SECRET_KEY =
  process.env.BITPAY_SECRET_KEY || '';
const BITPAY_WEBHOOK_SECRET =
  process.env.BITPAY_WEBHOOK_SECRET || '';

const BITPAY_BASE_URL =
  process.env.BITPAY_API_URL ||
  (
    BITPAY_ENV === 'production'
      ? 'https://api.bitpay.ao/v1'
      : 'https://api-sandbox.bitpay.ao/v1'
  );

const BITPAY_TIMEOUT =
  Number(process.env.BITPAY_TIMEOUT || 15000);

const PAYMENT_METHODS = Object.freeze({
  MULTICAIXA_EXPRESS: 'multicaixa_express',
  MULTICAIXA_REFERENCE: 'multicaixa_reference'
});

const tokenlessMethods = new Set([
  PAYMENT_METHODS.MULTICAIXA_EXPRESS,
  PAYMENT_METHODS.MULTICAIXA_REFERENCE
]);

function normalizePaymentMethod(method) {
  const value = String(method || '')
    .trim()
    .toLowerCase();

  if (
    value === 'multicaixa_express' ||
    value === 'express' ||
    value === 'multicaixa express'
  ) {
    return PAYMENT_METHODS.MULTICAIXA_EXPRESS;
  }

  if (
    value === 'multicaixa_reference' ||
    value === 'reference' ||
    value === 'referencia' ||
    value === 'referência'
  ) {
    return PAYMENT_METHODS.MULTICAIXA_REFERENCE;
  }

  return null;
}

function normalizePaymentMethods(methods) {
  if (!Array.isArray(methods)) {
    return [];
  }

  return [
    ...new Set(
      methods
        .map(normalizePaymentMethod)
        .filter(Boolean)
    )
  ];
}

function isConfigured() {
  return Boolean(
    BITPAY_ENABLED &&
    BITPAY_SECRET_KEY
  );
}

function createIdempotencyKey(seed = '') {
  const normalizedSeed =
    String(seed || '').trim();

  if (normalizedSeed) {
    return normalizedSeed;
  }

  return `hp-${Date.now()}-${crypto
    .randomBytes(16)
    .toString('hex')}`;
}

async function request(path, options = {}) {
  if (!isConfigured()) {
    throw new Error(
      'BitPay não está configurada. Verifique BITPAY_ENABLED e BITPAY_SECRET_KEY.'
    );
  }

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, BITPAY_TIMEOUT);

  try {
    const response = await fetch(
      `${BITPAY_BASE_URL}${path}`,
      {
        ...options,
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${BITPAY_SECRET_KEY}`,
          ...(options.headers || {})
        }
      }
    );

    const text = await response.text();

    let data = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = {
        raw: text
      };
    }

    if (!response.ok) {
      const errorCode =
        data?.error?.code ||
        data?.code ||
        `http_${response.status}`;

      const errorMessage =
        data?.error?.message ||
        data?.message ||
        data?.error_description ||
        'Erro desconhecido da BitPay.';

      const error = new Error(
        `BitPay ${response.status} (${errorCode}): ${errorMessage}`
      );

      error.status = response.status;
      error.code = errorCode;
      error.providerResponse = data;

      throw error;
    }

    return data;
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeAmount(amount) {
  const value = Number(amount);

  if (!Number.isFinite(value) || value <= 0) {
    throw new Error('O valor da cobrança BitPay deve ser maior que zero.');
  }

  return Math.round(value);
}

function normalizeMobile(phone) {
  if (!phone) {
    return null;
  }

  let value = String(phone)
    .replace(/\D/g, '');

  if (value.startsWith('244')) {
    value = value.slice(3);
  }

  if (value.startsWith('0')) {
    value = value.slice(1);
  }

  if (value.length !== 9) {
    return null;
  }

  return value;
}

function extractPaymentIntent(data) {
  const intent =
    data?.payment_intent ||
    data?.paymentIntent ||
    data;

  return {
    id:
      intent?.id ||
      data?.id ||
      null,

    status:
      intent?.status ||
      data?.status ||
      null,

    amount:
      intent?.amount ??
      data?.amount ??
      null,

    currency:
      intent?.currency ||
      data?.currency ||
      'AOA',

    paymentMethod:
      intent?.payment_method ||
      data?.payment_method ||
      null,

    merchantReference:
      intent?.merchant_reference ||
      data?.merchant_reference ||
      null,

    customer:
      intent?.customer ||
      data?.customer ||
      null,

    reference:
      intent?.reference ||
      data?.reference ||
      null,

    providerResponse: data
  };
}

async function createPaymentIntent({
  amount,
  currency = 'AOA',
  paymentMethod,
  mobile,
  merchantReference,
  metadata = {},
  idempotencyKey
}) {
  const normalizedMethod =
    normalizePaymentMethod(paymentMethod);

  if (!normalizedMethod) {
    throw new Error(
      `Método de pagamento BitPay inválido: ${paymentMethod}`
    );
  }

  if (!tokenlessMethods.has(normalizedMethod)) {
    throw new Error(
      `Método BitPay ainda não configurado: ${normalizedMethod}`
    );
  }

  const normalizedAmount =
    normalizeAmount(amount);

  const body = {
    amount: normalizedAmount,
    currency: String(currency || 'AOA').toUpperCase(),
    payment_method: normalizedMethod,
    merchant_reference:
      String(
        merchantReference ||
        `HP-${Date.now()}`
      ).slice(0, 255),
    metadata:
      metadata && typeof metadata === 'object'
        ? metadata
        : {}
  };

  if (
    normalizedMethod ===
    PAYMENT_METHODS.MULTICAIXA_EXPRESS
  ) {
    const normalizedMobile =
      normalizeMobile(mobile);

    if (!normalizedMobile) {
      throw new Error(
        'O número de telemóvel é obrigatório para Multicaixa Express.'
      );
    }

    body.customer = {
      mobile: normalizedMobile
    };
  }

  const response = await request(
    '/payment_intents',
    {
      method: 'POST',
      headers: {
        'Idempotency-Key':
          createIdempotencyKey(idempotencyKey)
      },
      body: JSON.stringify(body)
    }
  );

  return extractPaymentIntent(response);
}
async function createQRCode({
  amount,
  description = 'Pagamento Honey Pay',
  idempotencyKey
}) {
  const normalizedAmount =
    normalizeAmount(amount);

  const key =
    createIdempotencyKey(
      idempotencyKey
    );

  const response =
    await request(
      '/qr_codes',
      {
        method: 'POST',

        headers: {
          'Idempotency-Key': key
        },

        body: JSON.stringify({
          amount:
            normalizedAmount,

          description:
            String(
              description ||
              'Pagamento Honey Pay'
            )
              .trim()
              .slice(0, 255)
        })
      }
    );

  return {
    qrCode:
      response?.qr_code ||
      response?.qrCode ||
      response?.svg ||
      response?.data?.qr_code ||
      response?.data?.qrCode ||
      response?.data?.svg ||
      response?.data ||
      '',

    url:
      response?.url ||
      response?.payment_url ||
      response?.paymentUrl ||
      response?.checkout_url ||
      response?.checkoutUrl ||
      response?.data?.url ||
      response?.data?.payment_url ||
      '',

    providerResponse:
      response
  };
}
async function getPaymentIntent(paymentIntentId) {
  if (!paymentIntentId) {
    throw new Error(
      'paymentIntentId é obrigatório.'
    );
  }

  const response = await request(
    `/payment_intents/${encodeURIComponent(paymentIntentId)}`,
    {
      method: 'GET'
    }
  );

  return extractPaymentIntent(response);
}

async function cancelPaymentIntent(paymentIntentId) {
  if (!paymentIntentId) {
    throw new Error(
      'paymentIntentId é obrigatório.'
    );
  }

  const response = await request(
    `/payment_intents/${encodeURIComponent(paymentIntentId)}/cancel`,
    {
      method: 'POST'
    }
  );

  return extractPaymentIntent(response);
}

async function createRefund({
  paymentIntentId,
  amount,
  idempotencyKey
}) {
  if (!paymentIntentId) {
    throw new Error(
      'paymentIntentId é obrigatório para reembolso.'
    );
  }

  const body = {
    payment_intent: paymentIntentId
  };

  if (
    amount !== undefined &&
    amount !== null
  ) {
    body.amount = normalizeAmount(amount);
  }

  return request(
    '/refunds',
    {
      method: 'POST',
      headers: {
        'Idempotency-Key':
          createIdempotencyKey(idempotencyKey)
      },
      body: JSON.stringify(body)
    }
  );
}

module.exports = {
  PAYMENT_METHODS,
  normalizePaymentMethod,
  normalizePaymentMethods,
  isConfigured,
  createPaymentIntent,
  getPaymentIntent,
    createQRCode,
  cancelPaymentIntent,
  createRefund,

  config: {
  enabled: BITPAY_ENABLED,
  environment: BITPAY_ENV,
  baseUrl: BITPAY_BASE_URL,
  timeout: BITPAY_TIMEOUT,
  webhookConfigured: Boolean(
    BITPAY_WEBHOOK_SECRET
  )
}
};
