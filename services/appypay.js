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

  const numericAmount =
    Number(amount);

  if (
    !Number.isFinite(
      numericAmount
    ) ||
    numericAmount <= 0
  ) {
    throw new Error(
      'Valor de pagamento inválido.'
    );
  }

  if (
    String(currency)
      .toUpperCase() !== 'AOA'
  ) {
    throw new Error(
      'A AppyPay aceita apenas AOA nesta integração.'
    );
  }

  /*
  ------------------------------------------------------------
  CONFIGURAÇÃO
  ------------------------------------------------------------
  */

  assertConfigured();

  /*
  ------------------------------------------------------------
  merchantTransactionId
  ------------------------------------------------------------

  A AppyPay exige:

  - máximo 15 caracteres
  - apenas caracteres alfanuméricos
  - identificador único
  */

  const transactionId =
    String(
      merchantTransactionId || ''
    )
      .replace(
        /[^a-zA-Z0-9]/g,
        ''
      )
      .slice(
        0,
        15
      );

  if (!transactionId) {
    throw new Error(
      'merchantTransactionId é obrigatório para criar uma cobrança AppyPay.'
    );
  }

  /*
  ------------------------------------------------------------
  PAYMENT METHOD ID
  ------------------------------------------------------------

  A Honey Pay trabalha com nomes internos:

  multicaixa_express
  reference
  unitel_money
  direct_debit

  A AppyPay trabalha com IDs:

  GPO_{API_KEY}
  REF_{API_KEY}

  ------------------------------------------------------------

  UNITEL MONEY e DÉBITO DIRECTO ficam protegidos até termos
  os respectivos IDs/contratos técnicos fornecidos pela AppyPay.
  */

  let appyPayPaymentMethod;

  switch (method) {

    case PAYMENT_METHODS.MULTICAIXA_EXPRESS:

      appyPayPaymentMethod =
        `GPO_${APPYPAY_API_KEY}`;

      break;

    case PAYMENT_METHODS.REFERENCE:

      appyPayPaymentMethod =
        `REF_${APPYPAY_API_KEY}`;

      break;

    case PAYMENT_METHODS.UNITEL_MONEY:

      throw new Error(
        'UNITEL Money ainda não está configurado no contrato técnico AppyPay da Honey Pay.'
      );

    case PAYMENT_METHODS.DIRECT_DEBIT:

      throw new Error(
        'Débito Directo ainda não está configurado no contrato técnico AppyPay da Honey Pay.'
      );

    case PAYMENT_METHODS.QR:

      throw new Error(
        'QR não é tratado como método financeiro independente. Deve ser utilizado como canal de apresentação de uma cobrança AppyPay.'
      );

    default:

      throw new Error(
        'Método de pagamento AppyPay não suportado.'
      );
  }

  if (
    !APPYPAY_API_KEY
  ) {
    throw new Error(
      'APPYPAY_API_KEY não configurado.'
    );
  }

  /*
  ------------------------------------------------------------
  PAYMENT INFO
  ------------------------------------------------------------
  */

  const paymentInfo = {};

  if (
    method ===
      PAYMENT_METHODS.MULTICAIXA_EXPRESS
  ) {

    const phoneNumber =
      String(
        customer?.mobile ||
        customer?.phone ||
        customer?.phoneNumber ||
        ''
      )
        .trim();

    if (!phoneNumber) {
      throw new Error(
        'O número de telemóvel é obrigatório para pagamentos Multicaixa Express.'
      );
    }

    paymentInfo.phoneNumber =
      phoneNumber;
  }

  /*
  ------------------------------------------------------------
  REFERÊNCIA
  ------------------------------------------------------------

  Para REF a AppyPay exige referenceNumber e dueDate.

  A Honey Pay pode utilizar o seu identificador interno como
  referência desde que o formato final seja aceite pela conta
  AppyPay.

  Mantemos apenas caracteres numéricos para maior compatibilidade.
  */

  if (
    method ===
      PAYMENT_METHODS.REFERENCE
  ) {

    const referenceNumber =
      transactionId
        .replace(
          /[^0-9]/g,
          ''
        )
        .slice(
          0,
          9
        );

    if (
      !referenceNumber
    ) {
      throw new Error(
        'Não foi possível gerar o número da referência AppyPay.'
      );
    }

    const dueDate =
      new Date(
        Date.now() +
        (
          24 *
          60 *
          60 *
          1000
        )
      ).toISOString();

    paymentInfo.referenceNumber =
      referenceNumber;

    paymentInfo.dueDate =
      dueDate;
  }

  /*
  ------------------------------------------------------------
  DESCRIPTION
  ------------------------------------------------------------

  A documentação AppyPay recomenda descrição curta e sem
  caracteres especiais.

  */

  const safeDescription =
    String(
      description ||
      'Pagamento Honey Pay'
    )
      .replace(
        /[^a-zA-Z0-9À-ÿ ._-]/g,
        ''
      )
      .trim()
      .slice(
        0,
        100
      );

  /*
  ------------------------------------------------------------
  PAYLOAD APPYPAY
  ------------------------------------------------------------
  */

  const payload = {

    amount:
      numericAmount,

    currency:
      'AOA',

    description:
      safeDescription ||
      'Pagamento Honey Pay',

    merchantTransactionId:
      transactionId,

    paymentMethod:
      appyPayPaymentMethod,

    paymentInfo
  };

  /*
  ------------------------------------------------------------
  REQUEST
  ------------------------------------------------------------
  */

  const response =
    await request(
      '/charges',
      {
        method:
          'POST',

        body:
          JSON.stringify(
            payload
          )
      }
    );

  /*
  ------------------------------------------------------------
  NORMALIZAÇÃO DA RESPOSTA
  ------------------------------------------------------------

  Mantemos a resposta original da AppyPay intacta.

  O server.js pode utilizar os campos normalizados abaixo,
  enquanto providerRawResponse continua disponível para
  auditoria/debug.
  */

  return {

    ...response,

    id:
      response?.id ||
      response?.chargeId ||
      response?.charge_id ||
      null,

    status:
      response?.status ||
      response?.responseStatus?.status ||
      'PENDING',

    reference:
      response?.reference ||
      response?.responseStatus?.reference ||
      (
        response?.responseStatus?.reference
          ? response.responseStatus.reference
          : null
      ),

    checkoutUrl:
      response?.checkoutUrl ||
      response?.checkout_url ||
      response?.url ||
      null,

    qrCode:
      response?.qrCode ||
      response?.qr_code ||
      response?.qr ||
      null,

    providerRawResponse:
      response,

    honeyPayMetadata:
      metadata
  };
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
