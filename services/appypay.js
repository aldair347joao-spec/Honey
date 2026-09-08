'use strict';

/**
 * ============================================================
 * HONEY PAY
 * APPYPAY SERVICE
 * ============================================================
 *
 * Integração AppyPay:
 *
 * - OAuth2 Client Credentials
 * - GPO / Multicaixa Express
 * - REF / Referência Bancária
 * - Consulta de cobrança
 * - Reembolso
 *
 * As credenciais devem existir APENAS nas Environment Variables.
 *
 * Nunca colocar Client Secret ou API Keys no GitHub.
 * ============================================================
 */

const APPYPAY_ENABLED =
  String(
    process.env.APPYPAY_ENABLED || 'false'
  ).toLowerCase() === 'true';

const APPYPAY_ENV =
  String(
    process.env.APPYPAY_ENV || 'sandbox'
  ).toLowerCase();

const APPYPAY_BASE_URL =
  process.env.APPYPAY_BASE_URL ||
  (
    APPYPAY_ENV === 'production'
      ? 'https://gwy-api.appypay.co.ao/v2.0'
      : 'https://gwy-api-tst.appypay.co.ao/v2.0'
  );

/*
 * ============================================================
 * CREDENCIAIS
 * ============================================================
 */

const APPYPAY_CLIENT_ID =
  String(
    process.env.APPYPAY_CLIENT_ID || ''
  ).trim();

const APPYPAY_CLIENT_SECRET =
  String(
    process.env.APPYPAY_CLIENT_SECRET || ''
  ).trim();

const APPYPAY_GPO_API_KEY =
  String(
    process.env.APPYPAY_GPO_API_KEY || ''
  ).trim();

const APPYPAY_REF_API_KEY =
  String(
    process.env.APPYPAY_REF_API_KEY || ''
  ).trim();

const APPYPAY_TIMEOUT =
  Number(
    process.env.APPYPAY_TIMEOUT || 15000
  );

/*
 * ============================================================
 * OAUTH2
 * ============================================================
 *
 * O endpoint de token é separado do endpoint de charges.
 *
 * Mantemos a URL configurável para não prender a aplicação
 * a um endpoint incorreto caso a AppyPay forneça uma URL
 * diferente para a conta.
 */

const APPYPAY_TOKEN_URL =
  process.env.APPYPAY_TOKEN_URL ||
  (
    APPYPAY_ENV === 'production'
      ? 'https://login.microsoftonline.com/appypay.onmicrosoft.com/oauth2/token'
      : 'https://login.microsoftonline.com/appypaydev.onmicrosoft.com/oauth2/token'
  );

const APPYPAY_RESOURCE =
  process.env.APPYPAY_RESOURCE ||
  '2aed7612-de64-46b5-9e59-1f48f8902d14';

/*
 * Cache do Access Token.
 *
 * Não persistimos o token na base de dados.
 * Ele permanece apenas na memória do processo.
 */

let accessTokenCache = {
  token: null,
  expiresAt: 0
};

/*
 * Evita que vários pedidos simultâneos gerem vários tokens.
 */

let tokenRequestPromise = null;

/*
 * ============================================================
 * MÉTODOS
 * ============================================================
 */

const PAYMENT_METHODS = Object.freeze({
  MULTICAIXA_EXPRESS:
    'multicaixa_express',

  REFERENCE:
    'reference',

  UNITEL_MONEY:
    'unitel_money',

  DIRECT_DEBIT:
    'direct_debit',

  QR:
    'qr'
});

const PAYMENT_METHOD_LIST =
  Object.freeze(
    Object.values(
      PAYMENT_METHODS
    )
  );

/*
 * ============================================================
 * NORMALIZAÇÃO
 * ============================================================
 */

function normalizePaymentMethod(
  value
) {
  const method =
    String(
      value || ''
    )
      .trim()
      .toLowerCase();

  const aliases = {

    multicaixa:
      PAYMENT_METHODS.MULTICAIXA_EXPRESS,

    multicaixa_express:
      PAYMENT_METHODS.MULTICAIXA_EXPRESS,

    gpo:
      PAYMENT_METHODS.MULTICAIXA_EXPRESS,

    express:
      PAYMENT_METHODS.MULTICAIXA_EXPRESS,

    reference:
      PAYMENT_METHODS.REFERENCE,

    referencia:
      PAYMENT_METHODS.REFERENCE,

    referência:
      PAYMENT_METHODS.REFERENCE,

    pagamento_referencia:
      PAYMENT_METHODS.REFERENCE,

    ref:
      PAYMENT_METHODS.REFERENCE,

    unitel:
      PAYMENT_METHODS.UNITEL_MONEY,

    unitel_money:
      PAYMENT_METHODS.UNITEL_MONEY,

    umm:
      PAYMENT_METHODS.UNITEL_MONEY,

    direct_debit:
      PAYMENT_METHODS.DIRECT_DEBIT,

    debito_directo:
      PAYMENT_METHODS.DIRECT_DEBIT,

    débito_directo:
      PAYMENT_METHODS.DIRECT_DEBIT,

    sdd:
      PAYMENT_METHODS.DIRECT_DEBIT,

    qr:
      PAYMENT_METHODS.QR,

    qr_code:
      PAYMENT_METHODS.QR
  };

  return (
    aliases[method] ||
    null
  );
}

function normalizePaymentMethods(
  methods
) {
  if (
    !Array.isArray(methods)
  ) {
    return [];
  }

  const result = [];

  for (
    const value of methods
  ) {
    const method =
      normalizePaymentMethod(
        value
      );

    if (
      method &&
      !result.includes(method)
    ) {
      result.push(method);
    }
  }

  return result;
}

/*
 * ============================================================
 * CONFIGURAÇÃO
 * ============================================================
 */

function isConfigured() {

  return Boolean(
    APPYPAY_ENABLED &&
    APPYPAY_CLIENT_ID &&
    APPYPAY_CLIENT_SECRET &&
    (
      APPYPAY_GPO_API_KEY ||
      APPYPAY_REF_API_KEY
    )
  );
}

function assertConfigured() {

  if (
    !APPYPAY_ENABLED
  ) {
    throw new Error(
      'A integração AppyPay está desativada.'
    );
  }

  if (
    !APPYPAY_CLIENT_ID
  ) {
    throw new Error(
      'APPYPAY_CLIENT_ID não configurado.'
    );
  }

  if (
    !APPYPAY_CLIENT_SECRET
  ) {
    throw new Error(
      'APPYPAY_CLIENT_SECRET não configurado.'
    );
  }

  if (
    !APPYPAY_GPO_API_KEY &&
    !APPYPAY_REF_API_KEY
  ) {
    throw new Error(
      'Nenhuma API Key GPO/REF da AppyPay foi configurada.'
    );
  }
}

/*
 * ============================================================
 * HTTP HELPER
 * ============================================================
 */

async function fetchWithTimeout(
  url,
  options = {}
) {

  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () => {
        controller.abort();
      },
      APPYPAY_TIMEOUT
    );

  try {

    return await fetch(
      url,
      {
        ...options,
        signal:
          controller.signal
      }
    );

  } finally {

    clearTimeout(
      timeout
    );
  }
}

/*
 * ============================================================
 * ACCESS TOKEN
 * ============================================================
 */

async function getAccessToken(forceRefresh = false) {
  if (!forceRefresh && tokenCache.accessToken && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.accessToken;
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: APPYPAY_CLIENT_ID,
    client_secret: APPYPAY_CLIENT_SECRET,
    resource: APPYPAY_RESOURCE
  });

  const response = await fetch(APPYPAY_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    },
    body: body.toString()
  });

  const text = await response.text();

  let data;

  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    throw new Error(
      `Falha na autenticação AppyPay (${response.status}): ${
        data?.error_description ||
        data?.error ||
        data?.message ||
        'resposta inválida'
      }`
    );
  }

  if (!data.access_token) {
    throw new Error('A AppyPay não devolveu access_token.');
  }

  const expiresIn = Number(data.expires_in || 3600);

  tokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + Math.max(expiresIn - 60, 60) * 1000
  };

  return tokenCache.accessToken;
}

/*
 * ============================================================
 * HEADERS
 * ============================================================
 */

async function buildHeaders(
  extra = {}
) {

  const token =
    await getAccessToken();

  return {

    Accept:
      'application/json',

    'Content-Type':
      'application/json',

    Authorization:
      `Bearer ${token}`,

    ...extra
  };
}

/*
 * ============================================================
 * REQUEST APPYPAY
 * ============================================================
 */

async function request(
  path,
  options = {},
  retryOn401 = true
) {

  assertConfigured();

  let headers =
    await buildHeaders(
      options.headers || {}
    );

  const response =
    await fetchWithTimeout(
      `${APPYPAY_BASE_URL}${path}`,
      {
        ...options,
        headers
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

  /*
   * Se o token expirou, obtemos outro
   * e repetimos a requisição uma única vez.
   */

  if (
    response.status === 401 &&
    retryOn401
  ) {

    await getAccessToken(
      true
    );

    headers =
      await buildHeaders(
        options.headers || {}
      );

    return request(
      path,
      {
        ...options,
        headers
      },
      false
    );
  }

  if (
    !response.ok
  ) {

    const error =
      new Error(
        data?.message ||
        data?.error ||
        data?.responseStatus?.message ||
        `AppyPay HTTP ${response.status}`
      );

    error.status =
      response.status;

    error.providerResponse =
      data;

    throw error;
  }

  return data;
}

/*
 * ============================================================
 * PAYMENT METHOD ID
 * ============================================================
 */

function getAppyPayPaymentMethod(
  method
) {

  switch (
    method
  ) {

    case PAYMENT_METHODS.MULTICAIXA_EXPRESS:

      if (
        !APPYPAY_GPO_API_KEY
      ) {
        throw new Error(
          'APPYPAY_GPO_API_KEY não configurado.'
        );
      }

      return `GPO_${APPYPAY_GPO_API_KEY}`;

    case PAYMENT_METHODS.REFERENCE:

      if (
        !APPYPAY_REF_API_KEY
      ) {
        throw new Error(
          'APPYPAY_REF_API_KEY não configurado.'
        );
      }

      return `REF_${APPYPAY_REF_API_KEY}`;

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
        'QR é um canal de apresentação e não um método financeiro independente nesta integração.'
      );

    default:

      throw new Error(
        'Método de pagamento AppyPay não suportado.'
      );
  }
}

/*
 * ============================================================
 * MERCHANT TRANSACTION ID
 * ============================================================
 */

function normalizeMerchantTransactionId(
  value
) {

  const result =
    String(
      value || ''
    )
      .replace(
        /[^a-zA-Z0-9]/g,
        ''
      )
      .slice(
        0,
        15
      );

  if (
    !result
  ) {

    throw new Error(
      'merchantTransactionId é obrigatório.'
    );
  }

  return result;
}

/*
 * ============================================================
 * DESCRIPTION
 * ============================================================
 */

function normalizeDescription(
  value
) {

  const result =
    String(
      value ||
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

  return (
    result ||
    'Pagamento Honey Pay'
  );
}

/*
 * ============================================================
 * CREATE CHARGE
 * ============================================================
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

  if (
    !method
  ) {

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
      .toUpperCase() !==
    'AOA'
  ) {

    throw new Error(
      'A AppyPay utiliza AOA nesta integração.'
    );
  }

  const transactionId =
    normalizeMerchantTransactionId(
      merchantTransactionId
    );

  const appyPayPaymentMethod =
    getAppyPayPaymentMethod(
      method
    );

  const paymentInfo = {};

  /*
   * ----------------------------------------------------------
   * GPO / MULTICAIXA EXPRESS
   * ----------------------------------------------------------
   */

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
      ).trim();

    if (
      !phoneNumber
    ) {

      throw new Error(
        'O número de telemóvel é obrigatório para Multicaixa Express.'
      );
    }

    paymentInfo.phoneNumber =
      phoneNumber;
  }

  /*
   * ----------------------------------------------------------
   * REFERÊNCIA
   * ----------------------------------------------------------
   */

  if (
    method ===
    PAYMENT_METHODS.REFERENCE
  ) {

    const referenceNumber =
      String(
        customer?.referenceNumber ||
        transactionId
      )
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
        'Não foi possível gerar o número da referência.'
      );
    }

    /*
     * Vencimento padrão: 24 horas.
     */

    const dueDate =
      customer?.dueDate ||
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
   * ----------------------------------------------------------
   * PAYLOAD
   * ----------------------------------------------------------
   */

  const payload = {

    amount:
      numericAmount,

    currency:
      'AOA',

    description:
      normalizeDescription(
        description
      ),

    merchantTransactionId:
      transactionId,

    paymentMethod:
      appyPayPaymentMethod,

    paymentInfo
  };

  /*
   * ----------------------------------------------------------
   * CHARGE
   * ----------------------------------------------------------
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
   * ----------------------------------------------------------
   * NORMALIZAÇÃO DA RESPOSTA
   * ----------------------------------------------------------
   */

  const responseStatus =
    response?.responseStatus ||
    {};

  const reference =
    response?.reference ||
    responseStatus?.reference ||
    null;

  return {

    ...response,

    id:
      response?.id ||
      response?.chargeId ||
      response?.charge_id ||
      null,

    status:
      response?.status ||
      responseStatus?.status ||
      'PENDING',

    successful:
      responseStatus?.successful ??
      response?.successful ??
      false,

    responseStatus,

    reference,

    referenceNumber:
      reference?.referenceNumber ||
      response?.referenceNumber ||
      null,

    entity:
      reference?.entity ||
      response?.entity ||
      null,

    dueDate:
      reference?.dueDate ||
      response?.dueDate ||
      null,

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

/*
 * ============================================================
 * GET CHARGE
 * ============================================================
 */

async function getCharge(
  providerPaymentId
) {

  if (
    !providerPaymentId
  ) {

    throw new Error(
      'providerPaymentId é obrigatório.'
    );
  }

  return request(
    `/charges/${encodeURIComponent(
      providerPaymentId
    )}`,
    {
      method:
        'GET'
    }
  );
}

/*
 * ============================================================
 * REFUND
 * ============================================================
 */

async function refundCharge(
  providerPaymentId,
  amount = null
) {

  if (
    !providerPaymentId
  ) {

    throw new Error(
      'providerPaymentId é obrigatório.'
    );
  }

  const body = {};

  if (
    amount !== null &&
    Number.isFinite(
      Number(amount)
    )
  ) {

    body.amount =
      Number(amount);
  }

  return request(
    `/charges/${encodeURIComponent(
      providerPaymentId
    )}/refund`,
    {
      method:
        'POST',

      body:
        JSON.stringify(
          body
        )
    }
  );
}

/*
 * ============================================================
 * CLEAR TOKEN
 * ============================================================
 *
 * Útil para testes e para situações em que queremos forçar
 * uma nova autenticação.
 * ============================================================
 */

function clearAccessToken() {

  accessTokenCache = {
    token: null,
    expiresAt: 0
  };
}

/*
 * ============================================================
 * EXPORTS
 * ============================================================
 */

module.exports = {

  APPYPAY_ENABLED,

  APPYPAY_ENV,

  APPYPAY_BASE_URL,

  PAYMENT_METHODS,

  PAYMENT_METHOD_LIST,

  normalizePaymentMethod,

  normalizePaymentMethods,

  isConfigured,

  getAccessToken,

  clearAccessToken,

  createCharge,

  getCharge,

  refundCharge
};
