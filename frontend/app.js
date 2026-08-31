/*
============================================================
HONEY PAY
FRONTEND APPLICATION
V2.0.0
OPERATIONAL MERCHANT CONSOLE
============================================================

RESPONSABILIDADES
------------------------------------------------------------

- Sessão JWT
- Perfil do comerciante
- Dashboard real
- Faturas
- Criação de faturas
- Cancelamento de faturas
- Contas bancárias
- Comprovativos
- Aprovação/rejeição de comprovativos
- Plano e subscrição
- Checkout público
- Navegação SPA
- Modais
- Toasts
- Estados de carregamento
- Tratamento de erros
- Segurança de apresentação

SEPARAÇÃO FINANCEIRA
------------------------------------------------------------

SUBSCRIÇÃO HONEY PAY
    Comerciante
        ↓
    Honey Pay
        ↓
    Backend
        ↓
    BitPay

PAGAMENTO DO CLIENTE DO COMERCIANTE
    Cliente
        ↓
    Fatura Honey Pay
        ↓
    Banco escolhido
        ↓
    Transferência
        ↓
    Comprovativo
        ↓
    Comerciante verifica

BITPAY NÃO PARTICIPA NO SEGUNDO FLUXO.

============================================================
*/


"use strict";


/*
============================================================
CONFIGURATION
============================================================
*/

const API_BASE = "/api";

const TOKEN_KEY = "honey_pay_token";

const LEGACY_TOKEN_KEYS = [
    "honey_token",
    "token",
    "accessToken",
    "access_token"
];

const DEFAULT_VIEW = "dashboard";

const REQUEST_TIMEOUT = 30000;


/*
============================================================
STATE
============================================================
*/

const state = {

    initialized: false,

    loading: false,

    authenticated: false,

    token: null,

    merchant: null,

    subscription: null,

    plan: null,

    invoices: [],

    invoiceStatistics: null,

    bankAccounts: [],

    proofs: [],

    currentView: DEFAULT_VIEW,

    requestControllers: new Map(),

    requestCounter: 0

};


/*
============================================================
DOM
============================================================
*/

function $(selector) {

    return document.querySelector(selector);

}


function $$(selector) {

    return Array.from(
        document.querySelectorAll(selector)
    );

}


function getElement(id) {

    return document.getElementById(id);

}


/*
============================================================
ESCAPE HTML
============================================================
*/

function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


/*
============================================================
TOKEN
============================================================
*/

function getStoredToken() {

    const current =
        localStorage.getItem(TOKEN_KEY);

    if (current) {

        return current;

    }

    for (const key of LEGACY_TOKEN_KEYS) {

        const legacy =
            localStorage.getItem(key);

        if (legacy) {

            localStorage.setItem(
                TOKEN_KEY,
                legacy
            );

            return legacy;

        }

    }

    return null;

}


function setToken(token) {

    if (
        typeof token !== "string" ||
        !token.trim()
    ) {

        return false;

    }

    const normalized =
        token.trim();

    localStorage.setItem(
        TOKEN_KEY,
        normalized
    );

    state.token =
        normalized;

    return true;

}


function clearToken() {

    localStorage.removeItem(
        TOKEN_KEY
    );

    for (const key of LEGACY_TOKEN_KEYS) {

        localStorage.removeItem(key);

    }

    state.token = null;

}


/*
============================================================
API ERROR
============================================================
*/

class ApiError extends Error {

    constructor(
        message,
        status = 0,
        code = null,
        details = null,
        requestId = null
    ) {

        super(message);

        this.name = "ApiError";
        this.status = status;
        this.code = code;
        this.details = details;
        this.requestId = requestId;

    }

}


/*
============================================================
REQUEST ID
============================================================
*/

function createRequestId() {

    state.requestCounter += 1;

    return (

        Date.now().toString(36) +
        "-" +
        state.requestCounter.toString(36) +
        "-" +
        Math.random()
            .toString(36)
            .slice(2, 10)

    );

}


/*
============================================================
API RESPONSE
============================================================
*/

function getResponseMessage(
    payload,
    fallback
) {

    const messages = [

        payload?.message,

        payload?.error?.message,

        payload?.data?.message,

        payload?.result?.message

    ];

    for (const message of messages) {

        if (
            typeof message === "string" &&
            message.trim()
        ) {

            return message.trim();

        }

    }

    return fallback;

}


function extractData(payload) {

    if (
        payload &&
        Object.prototype.hasOwnProperty.call(
            payload,
            "data"
        )
    ) {

        return payload.data;

    }

    if (
        payload &&
        Object.prototype.hasOwnProperty.call(
            payload,
            "result"
        )
    ) {

        return payload.result;

    }

    return payload;

}


/*
============================================================
API REQUEST
============================================================
*/

async function apiRequest(
    path,
    options = {}
) {

    const requestId =
        createRequestId();

    const method =
        String(
            options.method || "GET"
        ).toUpperCase();

    const controller =
        new AbortController();

    const timeout =
        setTimeout(
            () => controller.abort(),
            REQUEST_TIMEOUT
        );

    state.requestControllers.set(
        requestId,
        controller
    );

    const headers = {

        Accept:
            "application/json",

        ...(options.headers || {})

    };

    let body =
        options.body;

    if (
        body !== undefined &&
        !(body instanceof FormData) &&
        typeof body !== "string"
    ) {

        headers["Content-Type"] =
            "application/json";

        body =
            JSON.stringify(body);

    }

    const token =
        state.token ||
        getStoredToken();

    if (token) {

        headers.Authorization =
            `Bearer ${token}`;

    }

    try {

        const response =
            await fetch(
                `${API_BASE}${path}`,
                {

                    method,

                    headers,

                    body,

                    credentials:
                        "same-origin",

                    cache:
                        "no-store",

                    signal:
                        controller.signal

                }
            );

        const contentType =
            response.headers.get(
                "content-type"
            ) || "";

        let payload = null;

        if (
            contentType.includes(
                "application/json"
            )
        ) {

            try {

                payload =
                    await response.json();

            } catch {

                payload = null;

            }

        } else {

            const text =
                await response.text();

            payload =
                text
                    ? { message: text }
                    : null;

        }

        if (!response.ok) {

            throw new ApiError(

                getResponseMessage(
                    payload,
                    `Pedido recusado (${response.status}).`
                ),

                response.status,

                payload?.code ||
                payload?.error?.code ||
                null,

                payload?.details ||
                payload?.error?.details ||
                null,

                payload?.requestId ||
                response.headers.get(
                    "x-request-id"
                )

            );

        }

        return payload;

    } catch (error) {

        if (
            error instanceof ApiError
        ) {

            throw error;

        }

        if (
            error?.name ===
            "AbortError"
        ) {

            throw new ApiError(
                "O pedido demorou demasiado tempo. Tente novamente.",
                408,
                "REQUEST_TIMEOUT"
            );

        }

        throw new ApiError(
            "Não foi possível comunicar com o servidor.",
            0,
            "NETWORK_ERROR",
            null,
            requestId
        );

    } finally {

        clearTimeout(timeout);

        state.requestControllers.delete(
            requestId
        );

    }

}


/*
============================================================
LOADING
============================================================
*/

function setGlobalLoading(active) {

    state.loading =
        Boolean(active);

    const loader =
        $(".global-loading");

    if (!loader) {

        return;

    }

    loader.hidden =
        !state.loading;

    loader.setAttribute(
        "aria-hidden",
        state.loading
            ? "false"
            : "true"
    );

}


/*
============================================================
TOAST
============================================================
*/

function getToastTitle(type) {

    switch (type) {

        case "success":
            return "Concluído";

        case "error":
            return "Erro";

        case "warning":
            return "Atenção";

        default:
            return "Honey Pay";

    }

}


function showToast(
    message,
    type = "info"
) {

    const container =
        $(".toast-container");

    if (!container) {

        return;

    }

    const toast =
        document.createElement("div");

    toast.className =
        `toast toast-${type}`;

    toast.innerHTML = `

        <div class="toast-content">

            <strong>
                ${escapeHtml(
                    getToastTitle(type)
                )}
            </strong>

            <span>
                ${escapeHtml(message)}
            </span>

        </div>

        <button
            type="button"
            class="toast-close"
            aria-label="Fechar"
        >
            ×
        </button>

    `;

    toast
        .querySelector(".toast-close")
        ?.addEventListener(
            "click",
            () => toast.remove()
        );

    container.appendChild(toast);

    setTimeout(
        () => toast.remove(),
        5000
    );

}


/*
============================================================
ERROR HANDLING
============================================================
*/

function handleError(
    error,
    options = {}
) {

    console.error(
        "[HONEY PAY]",
        error
    );

    if (
        error instanceof ApiError &&
        (
            error.status === 401 ||
            error.status === 403
        )
    ) {

        clearToken();

        state.authenticated = false;
        state.merchant = null;
        state.subscription = null;
        state.plan = null;

        if (!options.silentAuth) {

            showToast(
                "A sua sessão terminou. Entre novamente.",
                "warning"
            );

        }

        return;

    }

    if (options.silent) {

        return;

    }

    showToast(
        error?.message ||
        "Ocorreu um erro inesperado.",
        "error"
    );

}


/*
============================================================
PROFILE
============================================================
*/

function getMerchantName() {

    return (

        state.merchant?.businessName ||

        state.merchant?.name ||

        state.merchant?.companyName ||

        state.merchant?.merchantName ||

        "Comerciante"

    );

}


function getMerchantEmail() {

    return (

        state.merchant?.email ||

        state.merchant?.emailAddress ||

        "—"

    );

}


function getInitials(name) {

    const value =
        String(name || "HP")
            .trim();

    if (!value) {

        return "HP";

    }

    const parts =
        value
            .split(/\s+/)
            .filter(Boolean);

    if (parts.length === 1) {

        return parts[0]
            .slice(0, 2)
            .toUpperCase();

    }

    return (

        parts[0][0] +
        parts[parts.length - 1][0]

    ).toUpperCase();

}


function renderMerchantProfile() {

    const name =
        getMerchantName();

    const email =
        getMerchantEmail();

    $$("[data-merchant-name]")
        .forEach(
            element => {
                element.textContent =
                    name;
            }
        );

    $$("[data-merchant-email]")
        .forEach(
            element => {
                element.textContent =
                    email;
            }
        );

    $$("[data-merchant-initials]")
        .forEach(
            element => {
                element.textContent =
                    getInitials(name);
            }
        );

}


/*
============================================================
AUTH
============================================================
*/

async function loadMerchantProfile() {

    const response =
        await apiRequest(
            "/auth/me"
        );

    const data =
        extractData(response);

    state.merchant =
        data?.merchant ||
        data?.user ||
        data?.profile ||
        null;

    state.subscription =
        data?.subscription ||
        null;

    state.plan =
        data?.plan ||
        null;

    state.authenticated =
        true;

    renderMerchantProfile();

    renderPlan();

    return data;

}


/*
============================================================
PLAN
============================================================
*/

function formatDate(value) {

    if (!value) {

        return "—";

    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return String(value);

    }

    return new Intl.DateTimeFormat(
        "pt-PT",
        {

            day: "2-digit",

            month: "2-digit",

            year: "numeric"

        }
    ).format(date);

}


function formatDateTime(value) {

    if (!value) {

        return "—";

    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return String(value);

    }

    return new Intl.DateTimeFormat(
        "pt-PT",
        {

            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"

        }
    ).format(date);

}


function formatMoney(
    amount,
    currency = "AOA"
) {

    const numeric =
        Number(amount);

    if (
        !Number.isFinite(numeric)
    ) {

        return "0 Kz";

    }

    if (
        currency === "AOA"
    ) {

        return (

            new Intl.NumberFormat(
                "pt-PT",
                {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2
                }
            ).format(numeric)

            +

            " Kz"

        );

    }

    try {

        return new Intl.NumberFormat(
            "pt-PT",
            {

                style: "currency",

                currency

            }
        ).format(numeric);

    } catch {

        return `${numeric} ${currency}`;

    }

}


function normalizeStatusLabel(status) {

    const value =
        String(status || "")
            .toLowerCase();

    const labels = {

        active: "Ativo",

        inactive: "Inativo",

        pending: "Pendente",

        approved: "Aprovado",

        confirmed: "Confirmado",

        rejected: "Rejeitado",

        verified: "Verificado",

        submitted: "Enviado",

        paid: "Pago",

        unpaid: "Por pagar",

        cancelled: "Cancelado",

        expired: "Expirado",

        overdue: "Em atraso",

        draft: "Rascunho"

    };

    return (
        labels[value] ||
        status ||
        "—"
    );

}


async function loadPlan() {

    const response =
        await apiRequest(
            "/auth/plan"
        );

    const data =
        extractData(response);

    state.plan =
        data?.plan ||
        data ||
        null;

    state.subscription =
        data?.subscription ||
        state.subscription;

    renderPlan();

    return data;

}


function renderPlan() {

    const plan =
        state.plan || {};

    const subscription =
        state.subscription || {};

    const name =
        plan.name ||
        plan.planName ||
        (
            plan.id === "pro"
                ? "Profissional"
                : "Gratuito"
        );

    const status =
        subscription.status ||
        plan.status ||
        "active";

    const statusLabel =
        normalizeStatusLabel(status);

    const nameElement =
        getElement(
            "current-plan-name"
        );

    const statusElement =
        getElement(
            "subscription-status"
        );

    const stateElement =
        getElement(
            "subscription-state"
        );

    const billingElement =
        getElement(
            "subscription-next-billing"
        );

    if (nameElement) {

        nameElement.textContent =
            name;

    }

    if (statusElement) {

        statusElement.textContent =
            statusLabel;

    }

    if (stateElement) {

        stateElement.textContent =
            statusLabel;

    }

    if (billingElement) {

        billingElement.textContent =
            formatDate(
                subscription.expiresAt ||
                plan.currentPeriodEnd ||
                plan.nextBillingAt
            );

    }

    $$("[data-plan-price]")
        .forEach(
            element => {

                element.textContent =
                    plan.priceKz != null
                        ? formatMoney(
                            plan.priceKz
                        )
                        : "—";

            }
        );

}


/*
============================================================
GENERIC COLLECTION
============================================================
*/

function normalizeCollection(
    data,
    keys = []
) {

    if (
        Array.isArray(data)
    ) {

        return data;

    }

    for (const key of keys) {

        if (
            Array.isArray(
                data?.[key]
            )
        ) {

            return data[key];

        }

    }

    return [];

}


/*
============================================================
BANK ACCOUNTS
============================================================
*/

async function loadBankAccounts() {

    const response =
        await apiRequest(
            "/bank-accounts"
        );

    const data =
        extractData(response);

    state.bankAccounts =
        normalizeCollection(
            data,
            [
                "items",
                "accounts",
                "bankAccounts"
            ]
        );

    renderBankAccounts();

    updateDashboardCounters();

    return state.bankAccounts;

}


function getBankAccountId(account) {

    return (
        account?._id ||
        account?.id ||
        account?.accountId ||
        null
    );

}


function getBankName(account) {

    return (
        account?.bankName ||
        account?.bank ||
        "Banco"
    );

}


function getAccountName(account) {

    return (
        account?.accountName ||
        account?.name ||
        "Conta bancária"
    );

}


function getHolderName(account) {

    return (
        account?.holderName ||
        account?.accountHolder ||
        "Titular"
    );

}


function getIban(account) {

    return (
        account?.iban ||
        account?.IBAN ||
        "—"
    );

}


function renderBankAccounts() {

    const container =
        getElement(
            "bank-accounts-content"
        );

    if (!container) {

        return;

    }

    if (
        !state.bankAccounts.length
    ) {

        container.innerHTML = `

            <div class="empty-state">

                <div class="empty-icon">
                    +
                </div>

                <h4>
                    Nenhuma conta bancária
                </h4>

                <p>
                    Adicione a primeira conta bancária
                    para começar a receber pagamentos.
                </p>

            </div>

        `;

        return;

    }

    container.innerHTML =
        state.bankAccounts
            .map(account => {

                const id =
                    getBankAccountId(account);

                const active =
                    account.active !== false;

                const primary =
                    Boolean(
                        account.isPrimary ||
                        account.primary
                    );

                return `

                    <article
                        class="bank-account-card"
                        data-bank-account-id="${escapeHtml(id)}"
                    >

                        <div class="bank-account-card-header">

                            <div>

                                <span class="bank-account-bank">
                                    ${escapeHtml(
                                        getBankName(account)
                                    )}
                                </span>

                                <h3>
                                    ${escapeHtml(
                                        getAccountName(account)
                                    )}
                                </h3>

                            </div>

                            <div class="bank-account-badges">

                                ${
                                    primary
                                        ? `
                                            <span class="badge badge-primary">
                                                Principal
                                            </span>
                                          `
                                        : ""
                                }

                                <span class="badge ${
                                    active
                                        ? "badge-success"
                                        : "badge-muted"
                                }">

                                    ${
                                        active
                                            ? "Ativa"
                                            : "Inativa"
                                    }

                                </span>

                            </div>

                        </div>

                        <div class="bank-account-details">

                            <div>
                                <span>Titular</span>
                                <strong>
                                    ${escapeHtml(
                                        getHolderName(account)
                                    )}
                                </strong>
                            </div>

                            <div>
                                <span>IBAN</span>
                                <strong>
                                    ${escapeHtml(
                                        getIban(account)
                                    )}
                                </strong>
                            </div>

                            <div>
                                <span>Moeda</span>
                                <strong>
                                    ${escapeHtml(
                                        account.currency ||
                                        "AOA"
                                    )}
                                </strong>
                            </div>

                        </div>

                        <div class="bank-account-actions">

                            ${
                                !primary && id
                                    ? `
                                        <button
                                            type="button"
                                            class="button button-secondary"
                                            data-bank-primary="${escapeHtml(id)}"
                                        >
                                            Tornar principal
                                        </button>
                                      `
                                    : ""
                            }

                            ${
                                id
                                    ? `
                                        <button
                                            type="button"
                                            class="button button-secondary"
                                            data-bank-toggle="${escapeHtml(id)}"
                                            data-bank-active="${active}"
                                        >
                                            ${
                                                active
                                                    ? "Desativar"
                                                    : "Ativar"
                                            }
                                        </button>

                                        <button
                                            type="button"
                                            class="button button-danger-outline"
                                            data-bank-delete="${escapeHtml(id)}"
                                        >
                                            Eliminar
                                        </button>
                                      `
                                    : ""
                            }

                        </div>

                    </article>

                `;

            })
            .join("");

}


/*
============================================================
BANK ACCOUNT ACTIONS
============================================================
*/

async function setPrimaryBankAccount(
    accountId
) {

    if (!accountId) {

        return;

    }

    setGlobalLoading(true);

    try {

        await apiRequest(
            `/bank-accounts/${encodeURIComponent(accountId)}/primary`,
            {
                method: "PATCH"
            }
        );

        await loadBankAccounts();

        showToast(
            "Conta definida como principal.",
            "success"
        );

    } catch (error) {

        handleError(error);

    } finally {

        setGlobalLoading(false);

    }

}


async function toggleBankAccount(
    accountId,
    active
) {

    if (!accountId) {

        return;

    }

    setGlobalLoading(true);

    try {

        await apiRequest(
            `/bank-accounts/${encodeURIComponent(accountId)}/status`,
            {

                method: "PATCH",

                body: {
                    active: !active
                }

            }
        );

        await loadBankAccounts();

        showToast(
            active
                ? "Conta desativada."
                : "Conta ativada.",
            "success"
        );

    } catch (error) {

        handleError(error);

    } finally {

        setGlobalLoading(false);

    }

}


async function deleteBankAccount(
    accountId
) {

    if (!accountId) {

        return;

    }

    if (
        !window.confirm(
            "Tem a certeza de que pretende eliminar esta conta bancária?"
        )
    ) {

        return;

    }

    setGlobalLoading(true);

    try {

        await apiRequest(
            `/bank-accounts/${encodeURIComponent(accountId)}`,
            {
                method: "DELETE"
            }
        );

        await loadBankAccounts();

        showToast(
            "Conta bancária eliminada.",
            "success"
        );

    } catch (error) {

        handleError(error);

    } finally {

        setGlobalLoading(false);

    }

}


/*
============================================================
INVOICES
============================================================
*/

async function loadInvoices() {

    const response =
        await apiRequest(
            "/invoices?limit=100&skip=0"
        );

    const data =
        extractData(response);

    state.invoices =
        normalizeCollection(
            data,
            [
                "items",
                "invoices",
                "results"
            ]
        );

    renderInvoices();

    updateDashboardCounters();

    return state.invoices;

}


async function loadInvoiceStatistics() {

    const response =
        await apiRequest(
            "/invoices/statistics"
        );

    state.invoiceStatistics =
        extractData(response);

    renderInvoiceStatistics();

    updateDashboardCounters();

    return state.invoiceStatistics;

}


function getInvoiceId(invoice) {

    return (
        invoice?._id ||
        invoice?.id ||
        invoice?.invoiceId ||
        null
    );

}


function getInvoiceAmount(invoice) {

    return (
        invoice?.amount ??
        invoice?.total ??
        invoice?.totalAmount ??
        0
    );

}


function getInvoiceCurrency(invoice) {

    return (
        invoice?.currency ||
        "AOA"
    );

}


function getInvoiceStatus(invoice) {

    return String(
        invoice?.status ||
        invoice?.paymentStatus ||
        "pending"
    ).toLowerCase();

}


function getInvoiceCustomer(invoice) {

    const customer =
        invoice?.customer ||
        invoice?.payer ||
        {};

    return (
        customer?.name ||
        invoice?.customerName ||
        invoice?.payerName ||
        "Cliente"
    );

}


function getInvoicePublicToken(invoice) {

    return (
        invoice?.publicToken ||
        invoice?.token ||
        invoice?.paymentToken ||
        null
    );

}


function renderInvoices() {

    const container =
        getElement(
            "invoices-content"
        );

    if (!container) {

        return;

    }

    if (!state.invoices.length) {

        container.innerHTML = `

            <div class="empty-state">

                <div class="empty-icon">
                    +
                </div>

                <h4>
                    Ainda não existem faturas
                </h4>

                <p>
                    Crie a primeira cobrança para começar
                    a receber pagamentos dos seus clientes.
                </p>

                <button
                    type="button"
                    class="button button-primary"
                    data-action="create-invoice"
                >
                    Criar primeira cobrança
                </button>

            </div>

        `;

        return;

    }

    container.innerHTML = `

        <div class="data-table">

            <div class="data-table-head">

                <span>
                    Cliente
                </span>

                <span>
                    Valor
                </span>

                <span>
                    Estado
                </span>

                <span>
                    Data
                </span>

                <span>
                    Ações
                </span>

            </div>

            ${state.invoices
                .map(invoice => {

                    const id =
                        getInvoiceId(invoice);

                    const status =
                        getInvoiceStatus(invoice);

                    const publicToken =
                        getInvoicePublicToken(
                            invoice
                        );

                    return `

                        <div
                            class="data-table-row"
                            data-invoice-id="${escapeHtml(id)}"
                        >

                            <span>

                                <strong>
                                    ${escapeHtml(
                                        getInvoiceCustomer(invoice)
                                    )}
                                </strong>

                                <small>
                                    ${escapeHtml(
                                        invoice.description ||
                                        "Cobrança"
                                    )}
                                </small>

                            </span>

                            <span>

                                <strong>
                                    ${escapeHtml(
                                        formatMoney(
                                            getInvoiceAmount(invoice),
                                            getInvoiceCurrency(invoice)
                                        )
                                    )}
                                </strong>

                            </span>

                            <span>

                                <span class="badge">
                                    ${escapeHtml(
                                        normalizeStatusLabel(
                                            status
                                        )
                                    )}
                                </span>

                            </span>

                            <span>

                                ${escapeHtml(
                                    formatDateTime(
                                        invoice.createdAt ||
                                        invoice.issueDate ||
                                        invoice.created
                                    )
                                )}

                            </span>

                            <span class="table-actions">

                                ${
                                    publicToken
                                        ? `
                                            <button
                                                type="button"
                                                class="button button-secondary"
                                                data-invoice-copy="${escapeHtml(publicToken)}"
                                            >
                                                Copiar link
                                            </button>
                                          `
                                        : ""
                                }

                                ${
                                    ![
                                        "paid",
                                        "cancelled",
                                        "canceled",
                                        "expired"
                                    ].includes(status) && id
                                        ? `
                                            <button
                                                type="button"
                                                class="button button-danger-outline"
                                                data-invoice-cancel="${escapeHtml(id)}"
                                            >
                                                Cancelar
                                            </button>
                                          `
                                        : ""
                                }

                            </span>

                        </div>

                    `;

                })
                .join("")}

        </div>

    `;

}


function renderInvoiceStatistics() {

    const stats =
        state.invoiceStatistics ||
        {};

    const values = {

        total:
            stats.total ??
            stats.totalInvoices ??
            stats.count ??
            0,

        paid:
            stats.paid ??
            stats.paidInvoices ??
            stats.confirmed ??
            0,

        pending:
            stats.pending ??
            stats.pendingInvoices ??
            0,

        cancelled:
            stats.cancelled ??
            stats.cancelledInvoices ??
            0,

        received:
            stats.totalReceived ??
            stats.received ??
            stats.paidAmount ??
            0

    };

    const map = {

        "dashboard-invoices":
            values.total,

        "dashboard-paid-invoices":
            values.paid,

        "dashboard-pending-payments":
            values.pending,

        "dashboard-cancelled-invoices":
            values.cancelled

    };

    for (
        const [id, value] of Object.entries(map)
    ) {

        const element =
            getElement(id);

        if (element) {

            element.textContent =
                String(value);

        }

    }

    const total =
        getElement(
            "dashboard-total-received"
        );

    if (total) {

        total.textContent =
            formatMoney(
                values.received
            );

        total.dataset.loaded =
            "true";

    }

}


/*
============================================================
CREATE INVOICE
============================================================
*/

function openCreateInvoiceModal() {

    const root =
        getElement("modal-root");

    if (!root) {

        return;

    }

    const activeAccounts =
        state.bankAccounts
            .filter(
                account =>
                    account.active !== false
            );

    if (!activeAccounts.length) {

        showToast(
            "Adicione pelo menos uma conta bancária ativa antes de criar uma cobrança.",
            "warning"
        );

        navigate("bank-accounts");

        return;

    }

    root.hidden = false;

    root.innerHTML = `

        <div
            class="modal-backdrop"
            data-modal-close
        >

            <div
                class="modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="create-invoice-title"
            >

                <div class="modal-header">

                    <div>

                        <span class="modal-kicker">
                            Nova cobrança
                        </span>

                        <h2 id="create-invoice-title">
                            Criar fatura
                        </h2>

                    </div>

                    <button
                        type="button"
                        class="modal-close"
                        data-modal-close
                        aria-label="Fechar"
                    >
                        ×
                    </button>

                </div>

                <form
                    id="create-invoice-form"
                    class="modal-form"
                >

                    <label>

                        <span>
                            Valor
                        </span>

                        <input
                            name="amount"
                            type="number"
                            min="0.01"
                            step="0.01"
                            required
                            placeholder="15000"
                        >

                    </label>

                    <label>

                        <span>
                            Descrição
                        </span>

                        <input
                            name="description"
                            type="text"
                            maxlength="500"
                            required
                            placeholder="Ex.: Venda de produto"
                        >

                    </label>

                    <label>

                        <span>
                            Nome do cliente
                        </span>

                        <input
                            name="customerName"
                            type="text"
                            maxlength="160"
                            required
                            placeholder="Nome do cliente"
                        >

                    </label>

                    <label>

                        <span>
                            Telefone
                        </span>

                        <input
                            name="customerPhone"
                            type="tel"
                            maxlength="40"
                            placeholder="+244..."
                        >

                    </label>

                    <label>

                        <span>
                            Email
                        </span>

                        <input
                            name="customerEmail"
                            type="email"
                            maxlength="180"
                            placeholder="cliente@email.com"
                        >

                    </label>

                    <div>

                        <span>
                            Contas para pagamento
                        </span>

                        <div class="bank-selection">

                            ${activeAccounts
                                .map(
                                    account => {

                                        const id =
                                            getBankAccountId(
                                                account
                                            );

                                        return `

                                            <label class="checkbox-field">

                                                <input
                                                    type="checkbox"
                                                    name="bankAccountIds"
                                                    value="${escapeHtml(id)}"
                                                    checked
                                                >

                                                <span>

                                                    ${escapeHtml(
                                                        getBankName(
                                                            account
                                                        )
                                                    )}

                                                    —

                                                    ${escapeHtml(
                                                        getIban(
                                                            account
                                                        )
                                                    )}

                                                </span>

                                            </label>

                                        `;

                                    }
                                )
                                .join("")}

                        </div>

                    </div>

                    <div class="modal-actions">

                        <button
                            type="button"
                            class="button button-secondary"
                            data-modal-close
                        >
                            Cancelar
                        </button>

                        <button
                            type="submit"
                            class="button button-primary"
                        >
                            Criar cobrança
                        </button>

                    </div>

                </form>

            </div>

        </div>

    `;

    getElement(
        "create-invoice-form"
    )?.addEventListener(
        "submit",
        handleCreateInvoiceSubmit
    );

}


async function handleCreateInvoiceSubmit(
    event
) {

    event.preventDefault();

    const form =
        event.currentTarget;

    const formData =
        new FormData(form);

    const bankAccountIds =
        formData.getAll(
            "bankAccountIds"
        )
            .filter(Boolean);

    const amount =
        Number(
            formData.get("amount")
        );

    const description =
        String(
            formData.get("description") ||
            ""
        ).trim();

    const customerName =
        String(
            formData.get("customerName") ||
            ""
        ).trim();

    const customerPhone =
        String(
            formData.get("customerPhone") ||
            ""
        ).trim();

    const customerEmail =
        String(
            formData.get("customerEmail") ||
            ""
        ).trim();

    if (
        !Number.isFinite(amount) ||
        amount <= 0
    ) {

        showToast(
            "Indique um valor válido.",
            "warning"
        );

        return;

    }

    if (!description) {

        showToast(
            "A descrição é obrigatória.",
            "warning"
        );

        return;

    }

    if (!customerName) {

        showToast(
            "O nome do cliente é obrigatório.",
            "warning"
        );

        return;

    }

    if (!bankAccountIds.length) {

        showToast(
            "Selecione pelo menos uma conta bancária.",
            "warning"
        );

        return;

    }

    setGlobalLoading(true);

    try {

        const response =
            await apiRequest(
                "/invoices",
                {

                    method: "POST",

                    body: {

                        amount,

                        description,

                        customer: {

                            name:
                                customerName,

                            phone:
                                customerPhone,

                            email:
                                customerEmail

                        },

                        bankAccountIds

                    }

                }
            );

        const invoice =
            extractData(response);

        closeModal();

        await Promise.allSettled([

            loadInvoices(),

            loadInvoiceStatistics()

        ]);

        showToast(
            "Cobrança criada com sucesso.",
            "success"
        );

        if (
            invoice?.publicToken ||
            invoice?.token
        ) {

            setTimeout(
                () => {

                    copyInvoiceLink(
                        invoice.publicToken ||
                        invoice.token
                    );

                },
                250
            );

        }

    } catch (error) {

        handleError(error);

    } finally {

        setGlobalLoading(false);

    }

}


/*
============================================================
CANCEL INVOICE
============================================================
*/

async function cancelInvoice(
    invoiceId
) {

    if (!invoiceId) {

        return;

    }

    if (
        !window.confirm(
            "Tem a certeza de que pretende cancelar esta cobrança?"
        )
    ) {

        return;

    }

    setGlobalLoading(true);

    try {

        await apiRequest(
            `/invoices/${encodeURIComponent(invoiceId)}/cancel`,
            {
                method: "POST"
            }
        );

        await Promise.allSettled([

            loadInvoices(),

            loadInvoiceStatistics()

        ]);

        showToast(
            "Cobrança cancelada.",
            "success"
        );

    } catch (error) {

        handleError(error);

    } finally {

        setGlobalLoading(false);

    }

}


/*
============================================================
COPY PAYMENT LINK
============================================================
*/

function buildPublicPaymentUrl(
    publicToken
) {

    if (!publicToken) {

        return null;

    }

    return (
        `${window.location.origin}/pay/` +
        encodeURIComponent(publicToken)
    );

}


async function copyInvoiceLink(
    publicToken
) {

    const url =
        buildPublicPaymentUrl(
            publicToken
        );

    if (!url) {

        showToast(
            "Esta cobrança não possui link público.",
            "warning"
        );

        return;

    }

    try {

        await navigator.clipboard.writeText(
            url
        );

        showToast(
            "Link de pagamento copiado.",
            "success"
        );

    } catch {

        window.prompt(
            "Copie o link de pagamento:",
            url
        );

    }

}


/*
============================================================
PROOFS
============================================================
*/

async function loadProofs(
    options = {}
) {

    const params =
        new URLSearchParams();

    params.set("page", "1");
    params.set(
        "limit",
        String(
            options.limit || 100
        )
    );

    if (options.status) {

        params.set(
            "status",
            options.status
        );

    }

    if (options.search) {

        params.set(
            "search",
            options.search
        );

    }

    if (options.invoiceId) {

        params.set(
            "invoiceId",
            options.invoiceId
        );

    }

    const response =
        await apiRequest(
            `/proofs?${params.toString()}`
        );

    const data =
        extractData(response);

    state.proofs =
        normalizeCollection(
            data,
            [
                "items",
                "proofs",
                "receipts"
            ]
        );

    renderProofs();

    updateDashboardCounters();

    return state.proofs;

}


function renderProofs() {

    const container =
        getElement(
            "proofs-content"
        );

    if (!container) {

        return;

    }

    if (!state.proofs.length) {

        container.innerHTML = `

            <div class="empty-state">

                <div class="empty-icon">
                    ✓
                </div>

                <h4>
                    Nenhum comprovativo
                </h4>

                <p>
                    Os comprovativos enviados pelos
                    seus clientes aparecerão aqui.
                </p>

            </div>

        `;

        return;

    }

    container.innerHTML = `

        <div class="data-table">

            <div class="data-table-head">

                <span>
                    Cliente / ficheiro
                </span>

                <span>
                    Estado
                </span>

                <span>
                    Data
                </span>

                <span>
                    Ações
                </span>

            </div>

            ${state.proofs
                .map(proof => {

                    const id =
                        proof.id ||
                        proof._id ||
                        proof.proofId;

                    const status =
                        String(
                            proof.status || ""
                        ).toLowerCase();

                    return `

                        <div
                            class="data-table-row"
                            data-proof-id="${escapeHtml(id)}"
                        >

                            <span>

                                <strong>
                                    ${escapeHtml(
                                        proof.fileName ||
                                        proof.originalName ||
                                        "Comprovativo"
                                    )}
                                </strong>

                                <small>

                                    ${
                                        proof.payerName ||
                                        proof.customerName ||
                                        proof.invoiceId ||
                                        proof.paymentId ||
                                        ""
                                    }

                                </small>

                            </span>

                            <span>

                                <span class="badge">
                                    ${escapeHtml(
                                        normalizeStatusLabel(
                                            status
                                        )
                                    )}
                                </span>

                            </span>

                            <span>

                                ${escapeHtml(
                                    formatDateTime(
                                        proof.createdAt ||
                                        proof.uploadedAt
                                    )
                                )}

                            </span>

                            <span class="table-actions">

                                ${
                                    status === "pending"
                                        ? `
                                            <button
                                                type="button"
                                                class="button button-primary"
                                                data-proof-review="${escapeHtml(id)}"
                                                data-proof-decision="approved"
                                            >
                                                Aprovar
                                            </button>

                                            <button
                                                type="button"
                                                class="button button-danger-outline"
                                                data-proof-review="${escapeHtml(id)}"
                                                data-proof-decision="rejected"
                                            >
                                                Rejeitar
                                            </button>
                                          `
                                        : ""
                                }

                            </span>

                        </div>

                    `;

                })
                .join("")}

        </div>

    `;

}


/*
============================================================
PROOF REVIEW
============================================================
*/

async function reviewProof(
    proofId,
    decision
) {

    if (!proofId) {

        return;

    }

    let reason = "";

    if (
        decision === "rejected"
    ) {

        reason =
            window.prompt(
                "Indique o motivo da rejeição:"
            );

        if (!reason?.trim()) {

            showToast(
                "O motivo da rejeição é obrigatório.",
                "warning"
            );

            return;

        }

    }

    if (
        !window.confirm(
            decision === "approved"
                ? "Confirmar aprovação deste comprovativo?"
                : "Confirmar rejeição deste comprovativo?"
        )
    ) {

        return;

    }

    setGlobalLoading(true);

    try {

        await apiRequest(
            `/proofs/${encodeURIComponent(proofId)}/review`,
            {

                method: "PATCH",

                body: {

                    decision,

                    ...(decision === "rejected"
                        ? {
                            reason:
                                reason.trim()
                          }
                        : {})

                }

            }
        );

        await Promise.allSettled([

            loadProofs(),

            loadInvoices(),

            loadInvoiceStatistics()

        ]);

        showToast(
            decision === "approved"
                ? "Comprovativo aprovado."
                : "Comprovativo rejeitado.",
            "success"
        );

    } catch (error) {

        handleError(error);

    } finally {

        setGlobalLoading(false);

    }

}


/*
============================================================
DASHBOARD
============================================================
*/

function updateDashboardCounters() {

    const invoiceCount =
        state.invoiceStatistics?.total ??
        state.invoiceStatistics?.totalInvoices ??
        state.invoices.length;

    const pendingProofs =
        state.proofs.filter(
            proof =>
                String(
                    proof.status || ""
                ).toLowerCase() ===
                "pending"
        ).length;

    const pendingInvoices =
        state.invoiceStatistics?.pending ??
        state.invoiceStatistics?.pendingInvoices ??
        state.invoices.filter(
            invoice =>
                [
                    "pending",
                    "unpaid",
                    "submitted"
                ].includes(
                    getInvoiceStatus(invoice)
                )
        ).length;

    const bankCount =
        state.bankAccounts.length;

    const counters = {

        "dashboard-invoices":
            invoiceCount,

        "dashboard-bank-accounts":
            bankCount,

        "dashboard-pending-payments":
            pendingProofs ||
            pendingInvoices

    };

    for (
        const [id, value]
        of Object.entries(counters)
    ) {

        const element =
            getElement(id);

        if (element) {

            element.textContent =
                String(value);

        }

    }

}


function renderDashboard() {

    updateDashboardCounters();

    renderInvoiceStatistics();

}


/*
============================================================
NAVIGATION
============================================================
*/

const VIEW_META = {

    dashboard: {

        title:
            "Visão geral",

        eyebrow:
            "Honey Pay"

    },

    payments: {

        title:
            "Pagamentos",

        eyebrow:
            "Recebimentos"

    },

    invoices: {

        title:
            "Faturas e cobranças",

        eyebrow:
            "Cobranças"

    },

    "bank-accounts": {

        title:
            "Contas bancárias",

        eyebrow:
            "Recebimentos"

    },

    proofs: {

        title:
            "Comprovativos",

        eyebrow:
            "Verificação"

    },

    plans: {

        title:
            "O seu plano",

        eyebrow:
            "Honey Pay"

    },

    settings: {

        title:
            "Definições",

        eyebrow:
            "Conta"

    }

};


function normalizeView(view) {

    return VIEW_META[view]
        ? view
        : DEFAULT_VIEW;

}


/*
============================================================
REAL FRONTEND ROUTING
============================================================

ROTAS REAIS DA HONEY PAY

/
 /payments
 /invoices
 /bank-accounts
 /proofs
 /plans
 /settings

LEGACY ROUTES TAMBÉM SÃO ACEITES:

/dashboard
/merchant
/billing

A URL REAL É A FONTE PRINCIPAL.

Não usamos mais ?view= para criar
as rotas da aplicação.
============================================================
*/

const ROUTE_TO_VIEW = {

    "/":
        "dashboard",

    "/dashboard":
        "dashboard",

    "/merchant":
        "dashboard",

    "/payments":
        "payments",

    "/invoices":
        "invoices",

    "/bank-accounts":
        "bank-accounts",

    "/proofs":
        "proofs",

    "/plans":
        "plans",

    "/billing":
        "plans",

    "/settings":
        "settings"

};


const VIEW_TO_ROUTE = {

    dashboard:
        "/",

    payments:
        "/payments",

    invoices:
        "/invoices",

    "bank-accounts":
        "/bank-accounts",

    proofs:
        "/proofs",

    plans:
        "/plans",

    settings:
        "/settings"

};


function normalizePathname(pathname) {

    if (
        typeof pathname !==
        "string"
    ) {

        return "/";

    }


    let path =
        pathname.trim();


    if (
        !path
    ) {

        return "/";

    }


    if (
        !path.startsWith("/")
    ) {

        path =
            `/${path}`;

    }


    path =
        path.replace(
            /\/{2,}/g,
            "/"
        );


    if (
        path.length > 1 &&
        path.endsWith("/")
    ) {

        path =
            path.slice(
                0,
                -1
            );

    }


    return (
        path || "/"
    );

}


function getViewFromUrl() {

    const pathname =
        normalizePathname(
            window.location.pathname
        );


    /*
    --------------------------------------------------------
    REAL ROUTE
    --------------------------------------------------------
    */

    const realView =
        ROUTE_TO_VIEW[
            pathname
        ];


    if (
        realView
    ) {

        return normalizeView(
            realView
        );

    }


    /*
    --------------------------------------------------------
    LEGACY ?view=
    --------------------------------------------------------

    Mantemos compatibilidade temporária
    para URLs antigas.
    --------------------------------------------------------
    */

    const params =
        new URLSearchParams(
            window.location.search
        );


    const legacyView =
        params.get(
            "view"
        );


    if (
        legacyView
    ) {

        return normalizeView(
            legacyView
        );

    }


    return DEFAULT_VIEW;

}


function updateUrl(view) {

    const normalized =
        normalizeView(
            view
        );


    const route =
        VIEW_TO_ROUTE[
            normalized
        ] ||
        VIEW_TO_ROUTE.dashboard;


    const currentPath =
        normalizePathname(
            window.location.pathname
        );


    /*
    --------------------------------------------------------
    NÃO CRIAR NOVO HISTÓRICO SE JÁ ESTAMOS NA ROTA
    --------------------------------------------------------
    */

    if (
        currentPath ===
        route &&
        !window.location.search
    ) {

        return;

    }


    /*
    --------------------------------------------------------
    NAVEGAÇÃO REAL
    --------------------------------------------------------
    */

    window.history.pushState(

        {
            view:
                normalized,

            route:
                route

        },

        "",

        route

    );

}


function navigate(
    view,
    pushState = true
) {

    const normalized =
        normalizeView(view);

    state.currentView =
        normalized;

    if (pushState) {

        updateUrl(normalized);

    }

    $$("[data-view]")
        .forEach(
            section => {

                const active =
                    section.dataset.view ===
                    normalized;

                section.hidden =
                    !active;

                section.classList.toggle(
                    "active-view",
                    active
                );

            }
        );

    $$("[data-nav]")
        .forEach(
            item => {

                item.classList.toggle(
                    "active",
                    item.dataset.nav ===
                    normalized
                );

            }
        );

    const meta =
        VIEW_META[normalized];

    const title =
        getElement("page-title");

    const eyebrow =
        getElement("page-eyebrow");

    if (title) {

        title.textContent =
            meta.title;

    }

    if (eyebrow) {

        eyebrow.textContent =
            meta.eyebrow;

    }

    closeSidebar();

    onViewActivated(
        normalized
    );

}


/*
============================================================
VIEW DATA
============================================================
*/

const loadedViews =
    new Set();


async function onViewActivated(view) {

    try {

        if (
            view === "dashboard"
        ) {

            await Promise.allSettled([

                loadInvoices(),

                loadInvoiceStatistics(),

                loadBankAccounts(),

                loadProofs()

            ]);

        }

        if (
            view === "payments"
        ) {

            await Promise.allSettled([

                loadInvoices(),

                loadProofs()

            ]);

        }

        if (
            view === "invoices"
        ) {

            await Promise.all([

                loadInvoices(),

                loadInvoiceStatistics()

            ]);

        }

        if (
            view === "bank-accounts"
        ) {

            await loadBankAccounts();

        }

        if (
            view === "proofs"
        ) {

            await loadProofs();

        }

        if (
            view === "plans"
        ) {

            await loadPlan();

        }

        loadedViews.add(view);

    } catch (error) {

        handleError(error);

    }

}


/*
============================================================
SIDEBAR
============================================================
*/

function openSidebar() {

    document.body.classList.add(
        "sidebar-open"
    );

}


function closeSidebar() {

    document.body.classList.remove(
        "sidebar-open"
    );

}


/*
============================================================
MODAL
============================================================
*/

function closeModal() {

    const root =
        getElement("modal-root");

    if (!root) {

        return;

    }

    root.hidden = true;

    root.innerHTML = "";

}


function handleModalClick(event) {

    if (
        event.target.closest(
            "[data-modal-close]"
        )
    ) {

        closeModal();

    }

}


/*
============================================================
BANK ACCOUNT MODAL
============================================================
*/

function openBankAccountModal() {

    const root =
        getElement("modal-root");

    if (!root) {

        return;

    }

    root.hidden = false;

    root.innerHTML = `

        <div
            class="modal-backdrop"
            data-modal-close
        >

            <div
                class="modal"
                role="dialog"
                aria-modal="true"
            >

                <div class="modal-header">

                    <div>

                        <span class="modal-kicker">
                            Recebimentos
                        </span>

                        <h2>
                            Adicionar conta bancária
                        </h2>

                    </div>

                    <button
                        type="button"
                        class="modal-close"
                        data-modal-close
                    >
                        ×
                    </button>

                </div>

                <form
                    id="bank-account-form"
                    class="modal-form"
                >

                    <label>

                        <span>
                            Banco
                        </span>

                        <input
                            name="bankName"
                            type="text"
                            required
                            maxlength="120"
                            placeholder="Ex.: BAI"
                        >

                    </label>

                    <label>

                        <span>
                            Nome da conta
                        </span>

                        <input
                            name="accountName"
                            type="text"
                            required
                            maxlength="120"
                            placeholder="Conta Principal"
                        >

                    </label>

                    <label>

                        <span>
                            Titular
                        </span>

                        <input
                            name="holderName"
                            type="text"
                            required
                            maxlength="160"
                        >

                    </label>

                    <label>

                        <span>
                            IBAN
                        </span>

                        <input
                            name="iban"
                            type="text"
                            required
                            maxlength="64"
                            autocomplete="off"
                            placeholder="AO..."
                        >

                    </label>

                    <label>

                        <span>
                            Moeda
                        </span>

                        <select name="currency">

                            <option value="AOA">
                                AOA — Kwanza
                            </option>

                        </select>

                    </label>

                    <label class="checkbox-field">

                        <input
                            name="active"
                            type="checkbox"
                            checked
                        >

                        <span>
                            Conta ativa
                        </span>

                    </label>

                    <div class="modal-actions">

                        <button
                            type="button"
                            class="button button-secondary"
                            data-modal-close
                        >
                            Cancelar
                        </button>

                        <button
                            type="submit"
                            class="button button-primary"
                        >
                            Adicionar conta
                        </button>

                    </div>

                </form>

            </div>

        </div>

    `;

    getElement(
        "bank-account-form"
    )?.addEventListener(
        "submit",
        handleBankAccountSubmit
    );

}


async function handleBankAccountSubmit(
    event
) {

    event.preventDefault();

    const form =
        event.currentTarget;

    const data =
        new FormData(form);

    const payload = {

        bankName:
            String(
                data.get("bankName") ||
                ""
            ).trim(),

        accountName:
            String(
                data.get("accountName") ||
                ""
            ).trim(),

        holderName:
            String(
                data.get("holderName") ||
                ""
            ).trim(),

        iban:
            String(
                data.get("iban") ||
                ""
            )
                .trim()
                .replace(/\s+/g, "")
                .toUpperCase(),

        currency:
            String(
                data.get("currency") ||
                "AOA"
            ),

        active:
            data.get("active") === "on"

    };

    if (
        !payload.bankName ||
        !payload.accountName ||
        !payload.holderName ||
        !payload.iban
    ) {

        showToast(
            "Preencha todos os campos obrigatórios.",
            "warning"
        );

        return;

    }

    setGlobalLoading(true);

    try {

        await apiRequest(
            "/bank-accounts",
            {

                method: "POST",

                body: payload

            }
        );

        closeModal();

        await loadBankAccounts();

        showToast(
            "Conta bancária adicionada.",
            "success"
        );

    } catch (error) {

        handleError(error);

    } finally {

        setGlobalLoading(false);

    }

}


/*
============================================================
AUTH BOOTSTRAP
============================================================
*/

async function bootstrapAuthentication() {

    const token =
        getStoredToken();

    if (!token) {

        state.authenticated =
            false;

        return false;

    }

    state.token =
        token;

    try {

        await loadMerchantProfile();

        return true;

    } catch (error) {

        if (
            error instanceof ApiError &&
            (
                error.status === 401 ||
                error.status === 403
            )
        ) {

            clearToken();

            state.authenticated =
                false;

            return false;

        }

        handleError(
            error,
            {
                silentAuth: true
            }
        );

        return false;

    }

}


/*
============================================================
INITIAL DATA
============================================================
*/

async function loadInitialData() {

    if (!state.authenticated) {

        renderDashboard();

        return;

    }

    await Promise.allSettled([

        loadPlan(),

        loadInvoices(),

        loadInvoiceStatistics(),

        loadBankAccounts(),

        loadProofs()

    ]);

    renderDashboard();

}


/*
============================================================
LOGOUT
============================================================
*/

function logout() {

    clearToken();

    state.authenticated =
        false;

    state.merchant =
        null;

    state.subscription =
        null;

    state.plan =
        null;

    state.invoices =
        [];

    state.bankAccounts =
        [];

    state.proofs =
        [];

    showToast(
        "Sessão terminada.",
        "success"
    );

    setTimeout(
        () => window.location.reload(),
        500
    );

}


/*
============================================================
PUBLIC CHECKOUT
============================================================
*/

export async function getPublicCheckout(
    publicToken
) {

    if (!publicToken) {

        throw new ApiError(
            "Token público inválido.",
            400,
            "INVALID_PUBLIC_TOKEN"
        );

    }

    const response =
        await apiRequest(
            `/checkout/${encodeURIComponent(publicToken)}`
        );

    return extractData(response);

}


export async function createPublicPaymentIntent(
    publicToken,
    payload
) {

    if (!publicToken) {

        throw new ApiError(
            "Token público inválido.",
            400,
            "INVALID_PUBLIC_TOKEN"
        );

    }

    const response =
        await apiRequest(
            `/checkout/${encodeURIComponent(publicToken)}/payment-intent`,
            {

                method: "POST",

                body:
                    payload || {}

            }
        );

    return extractData(response);

}


export async function getPublicPaymentStatus(
    publicToken,
    paymentId
) {

    if (
        !publicToken ||
        !paymentId
    ) {

        throw new ApiError(
            "Dados de pagamento inválidos.",
            400,
            "INVALID_PAYMENT_REFERENCE"
        );

    }

    const response =
        await apiRequest(
            `/checkout/${encodeURIComponent(publicToken)}/payment/${encodeURIComponent(paymentId)}`
        );

    return extractData(response);

}


/*
============================================================
SUBSCRIPTION
============================================================

BITPAY CONTINUA EXCLUSIVAMENTE NO BACKEND.

Não existe chave BitPay neste frontend.

Como a API atual do repositório não expõe ainda uma rota
pública de criação do checkout de subscrição, NÃO simulamos
um pagamento nem inventamos uma rota.

============================================================
*/

export async function createSubscriptionCheckout() {

    throw new ApiError(

        "O checkout da subscrição ainda não está exposto pela API.",
        501,
        "SUBSCRIPTION_CHECKOUT_NOT_EXPOSED"

    );

}


/*
============================================================
HEALTH
============================================================
*/

export async function checkApiHealth() {

    try {

        const response =
            await fetch(
                "/health",
                {

                    method: "GET",

                    headers: {
                        Accept:
                            "application/json"
                    },

                    cache: "no-store"

                }
            );

        if (!response.ok) {

            return false;

        }

        const data =
            await response.json();

        return (
            data?.success === true ||
            data?.data?.status === "operational" ||
            data?.status === "operational"
        );

    } catch {

        return false;

    }

}


/*
============================================================
EVENTS
============================================================
*/

function setupEvents() {

    document.addEventListener(
        "click",
        event => {

            /*
------------------------------------------------------------
REAL ROUTE LINKS
------------------------------------------------------------
*/

const realLink =
    event.target.closest(
        'a[href]'
    );


if (
    realLink &&
    realLink.origin ===
        window.location.origin
) {

    const href =
        realLink.getAttribute(
            "href"
        );


    /*
    Não interceptar:
    - /pay/:token
    - APIs
    - ficheiros
    - âncoras
    */

    if (
        href &&
        href.startsWith("/") &&
        !href.startsWith("/api/") &&
        !href.startsWith("/pay/")
    ) {

        const targetUrl =
            new URL(
                href,
                window.location.origin
            );


        const targetPath =
            normalizePathname(
                targetUrl.pathname
            );


        if (
            ROUTE_TO_VIEW[
                targetPath
            ]
        ) {

            event.preventDefault();

            navigate(
                ROUTE_TO_VIEW[
                    targetPath
                ]
            );

            return;

        }

    }

}
            const nav =
                event.target.closest(
                    "[data-nav]"
                );

            if (nav) {

                event.preventDefault();

                navigate(
                    nav.dataset.nav
                );

                return;

            }

            const route =
                event.target.closest(
                    "[data-route]"
                );

            if (route) {

                event.preventDefault();

                navigate(
                    route.dataset.route
                );

                return;

            }

            const action =
                event.target.closest(
                    "[data-action]"
                );

            if (action) {

                event.preventDefault();

                switch (
                    action.dataset.action
                ) {

                    case "logout":

                        logout();

                        break;

                    case "create-invoice":

                        navigate("invoices");

                        openCreateInvoiceModal();

                        break;

                    case "open-invoices":

                        navigate("invoices");

                        break;

                    case "open-proofs":

                        navigate("proofs");

                        break;

                    case "open-bank-accounts":

                        navigate(
                            "bank-accounts"
                        );

                        break;

                    case "open-plans":

                        navigate("plans");

                        break;

                }

                return;

            }

            const primary =
                event.target.closest(
                    "[data-bank-primary]"
                );

            if (primary) {

                event.preventDefault();

                setPrimaryBankAccount(
                    primary.dataset.bankPrimary
                );

                return;

            }

            const toggle =
                event.target.closest(
                    "[data-bank-toggle]"
                );

            if (toggle) {

                event.preventDefault();

                toggleBankAccount(

                    toggle.dataset.bankToggle,

                    toggle.dataset.bankActive ===
                    "true"

                );

                return;

            }

            const remove =
                event.target.closest(
                    "[data-bank-delete]"
                );

            if (remove) {

                event.preventDefault();

                deleteBankAccount(
                    remove.dataset.bankDelete
                );

                return;

            }

            const cancelInvoiceButton =
                event.target.closest(
                    "[data-invoice-cancel]"
                );

            if (cancelInvoiceButton) {

                event.preventDefault();

                cancelInvoice(
                    cancelInvoiceButton.dataset.invoiceCancel
                );

                return;

            }

            const copyInvoiceButton =
                event.target.closest(
                    "[data-invoice-copy]"
                );

            if (copyInvoiceButton) {

                event.preventDefault();

                copyInvoiceLink(
                    copyInvoiceButton.dataset.invoiceCopy
                );

                return;

            }

            const reviewProofButton =
                event.target.closest(
                    "[data-proof-review]"
                );

            if (reviewProofButton) {

                event.preventDefault();

                reviewProof(

                    reviewProofButton.dataset.proofReview,

                    reviewProofButton.dataset.proofDecision

                );

                return;

            }

            const mobileMenu =
                event.target.closest(
                    "#mobile-menu-button"
                );

            if (mobileMenu) {

                openSidebar();

                return;

            }

            const sidebarClose =
                event.target.closest(
                    "#sidebar-close"
                );

            if (sidebarClose) {

                closeSidebar();

                return;

            }

            const overlay =
                event.target.closest(
                    "#sidebar-overlay"
                );

            if (overlay) {

                closeSidebar();

                return;

            }

            const createInvoiceButton =
                event.target.closest(
                    "#create-invoice-button"
                );

            if (createInvoiceButton) {

                navigate("invoices");

                openCreateInvoiceModal();

                return;

            }

            const addBank =
                event.target.closest(
                    "#add-bank-account-button"
                );

            if (addBank) {

                openBankAccountModal();

                return;

            }

            const managePlan =
                event.target.closest(
                    "#manage-plan-button"
                );

            if (managePlan) {

                navigate("plans");

                return;

            }

            const notification =
                event.target.closest(
                    "#notification-button"
                );

            if (notification) {

                showToast(
                    "As notificações serão apresentadas aqui quando existirem.",
                    "info"
                );

                return;

            }

        }
    );

    document.addEventListener(
        "click",
        handleModalClick
    );

    window.addEventListener(
        "popstate",
        () => {

            navigate(
                getViewFromUrl(),
                false
            );

        }
    );

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape"
            ) {

                closeSidebar();

                closeModal();

            }

        }
    );

}


/*
============================================================
GLOBAL API
============================================================
*/

window.HoneyPay = {

    state,

    api: {

        request:
            apiRequest,

        health:
            checkApiHealth,

        getPublicCheckout,

        createPublicPaymentIntent,

        getPublicPaymentStatus,

        createSubscriptionCheckout

    },

    auth: {

        getToken:
            getStoredToken,

        setToken,

        clearToken,

        logout

    },

    navigation: {

        navigate,

        current:
            () => state.currentView

    },

    merchant: {

        get:
            () => state.merchant

    },

    plan: {

        get:
            () => state.plan,

        reload:
            loadPlan

    },

    invoices: {

        list:
            () => state.invoices,

        reload:
            loadInvoices,

        statistics:
            loadInvoiceStatistics,

        create:
            openCreateInvoiceModal,

        cancel:
            cancelInvoice,

        copyLink:
            copyInvoiceLink

    },

    bankAccounts: {

        list:
            () => state.bankAccounts,

        reload:
            loadBankAccounts,

        create:
            openBankAccountModal,

        setPrimary:
            setPrimaryBankAccount,

        toggle:
            toggleBankAccount,

        remove:
            deleteBankAccount

    },

    proofs: {

        list:
            () => state.proofs,

        reload:
            loadProofs,

        review:
            reviewProof

    }

};


/*
============================================================
INITIALIZATION
============================================================
*/

async function initializeApplication() {

    if (state.initialized) {

        return;

    }

    state.initialized =
        true;

    const loader =
        getElement("app-loader");

    try {

        setupEvents();

        const authenticated =
            await bootstrapAuthentication();

        if (authenticated) {

            await loadInitialData();

        } else {

            renderDashboard();

        }

        navigate(
            getViewFromUrl(),
            false
        );

        document.body.classList.add(
            "app-ready"
        );

        if (loader) {

            loader.classList.add(
                "loaded"
            );

            setTimeout(
                () => loader.remove(),
                350
            );

        }

    } catch (error) {

        console.error(
            "[HONEY PAY INITIALIZATION]",
            error
        );

        if (loader) {

            loader.classList.add(
                "loaded"
            );

        }

        handleError(
            error,
            {
                silent: true
            }
        );

        showToast(
            "A plataforma abriu, mas alguns dados não puderam ser carregados.",
            "warning"
        );

    }

}


/*
============================================================
START
============================================================
*/

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeApplication,
        {
            once: true
        }
    );

} else {

    initializeApplication();

}


/*
============================================================
END
============================================================
*/
