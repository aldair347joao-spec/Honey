'use strict';

/**
 * ============================================================
 * HONEY PAY
 * APPYPAY SERVICE
 * ============================================================
 *
 * Este módulo é a única camada que deverá conhecer detalhes
 * específicos da AppyPay.
 *
 * IMPORTANTE:
 * Enquanto as credenciais/API privadas da Honey Pay não forem
 * fornecidas pela AppyPay, este serviço permanece DESATIVADO.
 *
 * Não simulamos pagamentos reais.
 * ============================================================
 */

const APPYPAY_ENABLED =
  String(process.env.APPYPAY_ENABLED || 'false').toLowerCase() === 'true';

const APPYPAY_ENV =
  String(process.env.APPYPAY_ENV || 'sandbox').toLowerCase();

const APPYPAY_BASE_URL =
  process.env.APPYPAY_BASE_URL ||
  (
    APPYPAY_ENV === 'production'
      ? 'https://gwy-api.appypay.co.ao/v2.0'
      : 'https://gwy-api-tst.appypay.co.ao/v2.0'
  );

const APPYPAY_ACCESS_TOKEN =
  process.env.APPYPAY_ACCESS_TOKEN || '';

const APPYPAY_API_KEY =
  process.env.APPYPAY_API_KEY || '';

const APPYPAY_TIMEOUT =
  Number(process.env.APPYPAY_TIMEOUT || 15000);

/**
 * Métodos internos da Honey Pay.
 *
 * Não colocamos IDs privados da AppyPay aqui.
 * Os IDs/credenciais específicos serão configurados quando
 * a AppyPay entregar a configuração da conta.
 */
const PAYMENT_METHODS = Object.freeze({
  MULTICAIXA_EXPRESS: 'multicaixa_express',
  REFERENCE: 'reference',
  UNITEL_MONEY: 'unitel_money',
  DIRECT_DEBIT: 'direct_debit',
  QR: 'qr'
});

const PAYMENT_METHOD_LIST = Object.freeze(
  Object.values(PAYMENT_METHODS)
);

function normalizePaymentMethod(value) {
  const method =
    String(value || '')
      .trim()
      .toLowerCase();

  const aliases = {
    multicaixa: PAYMENT_METHODS.MULTICAIXA_EXPRESS,
    multicaixa_express: PAYMENT_METHODS.MULTICAIXA_EXPRESS,
    gpo: PAYMENT_METHODS.MULTICAIXA_EXPRESS,

    reference: PAYMENT_METHODS.REFERENCE,
    referencia: PAYMENT_METHODS.REFERENCE,
    pagamento_referencia: PAYMENT_METHODS.REFERENCE,

    unitel: PAYMENT_METHODS.UNITEL_MONEY,
    unitel_money: PAYMENT_METHODS.UNITEL_MONEY,
    umm: PAYMENT_METHODS.UNITEL_MONEY,

    direct_debit: PAYMENT_METHODS.DIRECT_DEBIT,
    debito_directo: PAYMENT_METHODS.DIRECT_DEBIT,
    sdd: PAYMENT_METHODS.DIRECT_DEBIT,

    qr: PAYMENT_METHODS.QR,
    qr_code: PAYMENT_METHODS.QR
  };

  return aliases[method] || null;
}

function normalizePaymentMethods(methods) {
  if (!Array.isArray(methods)) {
    return [];
  }

  const result = [];

  for (const value of methods) {
    const method =
      normalizePaymentMethod(value);

    if (
      method &&
      !result.includes(method)
    ) {
      result.push(method);
    }
  }

  return result;
}

function isConfigured() {
  return Boolean(
    APPYPAY_ENABLED &&
    APPYPAY_ACCESS_TOKEN
  );
}

function assertConfigured() {
  if (!APPYPAY_ENABLED) {
    throw new Error(
      'A integração AppyPay ainda está desativada.'
    );
  }

  if (!APPYPAY_ACCESS_TOKEN) {
    throw new Error(
      'APPYPAY_ACCESS_TOKEN não configurado.'
    );
  }
}

function buildHeaders(extra = {}) {
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...extra
  };

  if (APPYPAY_ACCESS_TOKEN) {
    headers.Authorization =
      `Bearer ${APPYPAY_ACCESS_TOKEN}`;
  }

  if (APPYPAY_API_KEY) {
    headers['X-API-Key'] =
      APPYPAY_API_KEY;
  }

  return headers;
}

async function request(
  path,
  options = {}
) {
  assertConfigured();

  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () => controller.abort(),
      APPYPAY_TIMEOUT
    );

  try {
    const response =
      await fetch(
        `${APPYPAY_BASE_URL}${path}`,
        {
          ...options,
          headers:
            buildHeaders(
              options.headers || {}
            ),
          signal:
            controller.signal
        }
      );

    const text =
      await response.text();

    let data = null;

    try {
      data =
        text
          ? JSON.parse(text)
          : null;
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
          `AppyPay HTTP ${response.status}`
        );

      error.status =
        response.status;

      error.providerResponse =
        data;

      throw error;
    }

    return data;

  } finally {
    clearTimeout(timeout);
  }
}

/**
 * ------------------------------------------------------------
 * CREATE CHARGE
 * ------------------------------------------------------------
 *
 * O payload final da AppyPay será adaptado aqui quando a
 * documentação/credenciais da conta Honey Pay estiverem
 * disponíveis.
 *
 * O restante da Honey Pay não deverá conhecer esse formato.
 */
async function createCharge({
  amount,
  currency = 'AOA',
  paymentMethod,
  merchantTransactionId,
  description,
  customer = {},
  metadata = {}
}) {
  const method =
    normalizePaymentMethod(
      paymentMethod
    );

  if (!method) {
    throw new Error(
      'Método de pagamento AppyPay inválido.'
    );
  }

  if (
    !Number.isFinite(
      Number(amount)
    ) ||
    Number(amount) <= 0
  ) {
    throw new Error(
      'Valor de pagamento inválido.'
    );
  }

  /**
   * NÃO inventamos aqui o payload final.
   *
   * A AppyPay disponibiliza documentação técnica privada
   * no portal de developers.
   *
   * Até termos esse contrato, recusamos a chamada em vez
   * de criar uma cobrança incorreta.
   */
  throw new Error(
    'AppyPay está preparada, mas o contrato técnico de criação de cobrança ainda não foi configurado.'
  );
}

/**
 * ------------------------------------------------------------
 * GET CHARGE
 * ------------------------------------------------------------
 */
async function getCharge(
  providerPaymentId
) {
  if (!providerPaymentId) {
    throw new Error(
      'providerPaymentId é obrigatório.'
    );
  }

  return request(
    `/charges/${encodeURIComponent(
      providerPaymentId
    )}`,
    {
      method: 'GET'
    }
  );
}

/**
 * ------------------------------------------------------------
 * REFUND
 * ------------------------------------------------------------
 */
async function refundCharge(
  providerPaymentId,
  amount = null
) {
  if (!providerPaymentId) {
    throw new Error(
      'providerPaymentId é obrigatório.'
    );
  }

  const body = {};

  if (
    amount !== null &&
    Number.isFinite(Number(amount))
  ) {
    body.amount =
      Number(amount);
  }

  return request(
    `/charges/${encodeURIComponent(
      providerPaymentId
    )}/refund`,
    {
      method: 'POST',
      body:
        JSON.stringify(body)
    }
  );
}

module.exports = {
  APPYPAY_ENABLED,
  APPYPAY_ENV,
  APPYPAY_BASE_URL,

  PAYMENT_METHODS,
  PAYMENT_METHOD_LIST,

  normalizePaymentMethod,
  normalizePaymentMethods,

  isConfigured,

  createCharge,
  getCharge,
  refundCharge
};
