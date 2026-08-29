/*
============================================================
HONEY PAY
FRONTEND APPLICATION
V1.0.0
============================================================

RESPONSABILIDADES
------------------------------------------------------------

- Inicialização da aplicação
- Autenticação da sessão
- Comunicação segura com /api
- Navegação SPA
- Perfil do comerciante
- Plano/subscrição
- Contas bancárias
- Comprovativos
- Dashboard
- Logout
- Estados de carregamento
- Toasts
- Tratamento de erros
- Proteção contra respostas inválidas

SEGURANÇA
------------------------------------------------------------

- Nenhuma chave BitPay no frontend
- Nenhum segredo do servidor no frontend
- Apenas chamadas para /api
- Token somente para autenticação
- Todas as operações financeiras continuam no backend

SEPARAÇÃO FINANCEIRA
------------------------------------------------------------

HONEY PAY SUBSCRIPTION
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
    Checkout Honey Pay
        ↓
    Banco escolhido
        ↓
    Transferência
        ↓
    Comprovativo
        ↓
    Confirmação do comerciante

O BitPay NÃO é utilizado no segundo fluxo.

============================================================
*/


"use strict";


/*
============================================================
CONFIGURATION
============================================================
*/

const API_BASE =
    "/api";


const TOKEN_KEY =
    "honey_pay_token";


const LEGACY_TOKEN_KEYS = [

    "honey_token",

    "token",

    "accessToken",

    "access_token"

];


const DEFAULT_VIEW =
    "dashboard";


const REQUEST_TIMEOUT =
    30000;


/*
============================================================
APPLICATION STATE
============================================================
*/

const state = {

    initialized:
        false,

    loading:
        false,

    authenticated:
        false,

    token:
        null,

    merchant:
        null,

    plan:
        null,

    bankAccounts:
        [],

    proofs:
        [],

    currentView:
        DEFAULT_VIEW,

    notifications:
        [],

    requestControllers:
        new Map(),

    requestCounter:
        0

};


/*
============================================================
DOM HELPERS
============================================================
*/

function $(selector) {

    return document.querySelector(
        selector
    );

}


function $$(selector) {

    return Array.from(
        document.querySelectorAll(
            selector
        )
    );

}


function getElement(
    id
) {

    return document.getElementById(
        id
    );

}


/*
============================================================
SAFE TEXT
============================================================
*/

function escapeHtml(
    value
) {

    return String(
        value ??
        ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


/*
============================================================
TOKEN MANAGEMENT
============================================================
*/

function getStoredToken() {

    let token =
        localStorage.getItem(
            TOKEN_KEY
        );

    if (
        token
    ) {

        return token;

    }


    for (
        const key of LEGACY_TOKEN_KEYS
    ) {

        const legacy =
            localStorage.getItem(
                key
            );

        if (
            legacy
        ) {

            localStorage.setItem(
                TOKEN_KEY,
                legacy
            );

            return legacy;

        }

    }


    return null;

}


function setToken(
    token
) {

    if (
        !token ||
        typeof token !==
        "string"
    ) {

        return false;

    }


    const normalized =
        token.trim();


    if (
        !normalized
    ) {

        return false;

    }


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


    for (
        const key of LEGACY_TOKEN_KEYS
    ) {

        localStorage.removeItem(
            key
        );

    }


    state.token =
        null;

}


/*
============================================================
TOKEN EXTRACTION
============================================================
*/

function extractToken(
    payload
) {

    if (
        !payload
    ) {

        return null;

    }


    const candidates = [

        payload.token,

        payload.accessToken,

        payload.access_token,

        payload.data?.token,

        payload.data?.accessToken,

        payload.data?.access_token,

        payload.result?.token,

        payload.result?.accessToken,

        payload.result?.access_token

    ];


    for (
        const candidate of candidates
    ) {

        if (
            typeof candidate ===
            "string" &&
            candidate.trim()
        ) {

            return candidate.trim();

        }

    }


    return null;

}


/*
============================================================
REQUEST ID
============================================================
*/

function createRequestId() {

    state.requestCounter += 1;


    return (

        Date.now()
            .toString(36)

        +

        "-"

        +

        state.requestCounter
            .toString(36)

        +

        "-"

        +

        Math.random()
            .toString(36)
            .slice(
                2,
                10
            )

    );

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

        super(
            message
        );

        this.name =
            "ApiError";

        this.status =
            status;

        this.code =
            code;

        this.details =
            details;

        this.requestId =
            requestId;

    }

}


/*
============================================================
RESPONSE MESSAGE
============================================================
*/

function getResponseMessage(
    payload,
    fallback
) {

    if (
        typeof payload?.message ===
        "string" &&
        payload.message.trim()
    ) {

        return payload.message;

    }


    if (
        typeof payload?.error?.message ===
        "string" &&
        payload.error.message.trim()
    ) {

        return payload.error.message;

    }


    if (
        typeof payload?.data?.message ===
        "string" &&
        payload.data.message.trim()
    ) {

        return payload.data.message;

    }


    return fallback;

}


/*
============================================================
NORMALIZE API DATA
============================================================
*/

function extractData(
    payload
) {

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
            options.method ||
            "GET"
        ).toUpperCase();


    const controller =
        new AbortController();


    const timeout =
        setTimeout(
            () => {

                controller.abort();

            },
            REQUEST_TIMEOUT
        );


    state.requestControllers.set(
        requestId,
        controller
    );


    const headers = {

        Accept:
            "application/json",

        ...(options.headers ||
            {})

    };


    if (
        options.body !==
        undefined &&
        !(options.body instanceof FormData)
    ) {

        headers[
            "Content-Type"
        ] =
            "application/json";

    }


    const token =
        state.token ||
        getStoredToken();


    if (
        token
    ) {

        headers.Authorization =
            `Bearer ${token}`;

    }


    let body =
        options.body;


    if (
        body !==
        undefined &&
        !(body instanceof FormData) &&
        typeof body !==
        "string"
    ) {

        body =
            JSON.stringify(
                body
            );

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
            ) ||
            "";


        let payload =
            null;


        if (
            contentType.includes(
                "application/json"
            )
        ) {

            try {

                payload =
                    await response.json();

            }

            catch {

                payload =
                    null;

            }

        }

        else {

            const text =
                await response.text();


            if (
                text
            ) {

                payload = {

                    message:
                        text

                };

            }

        }


        if (
            !response.ok
        ) {

            const message =
                getResponseMessage(
                    payload,
                    `Pedido recusado (${response.status}).`
                );


            throw new ApiError(

                message,

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

    }

    catch (
        error
    ) {

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

    }

    finally {

        clearTimeout(
            timeout
        );


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

function setGlobalLoading(
    active
) {

    state.loading =
        Boolean(
            active
        );


    const element =
        $(".global-loading");


    if (
        !element
    ) {

        return;

    }


    element.hidden =
        !active;


    element.setAttribute(
        "aria-hidden",
        active
            ? "false"
            : "true"
    );

}


/*
============================================================
TOAST
============================================================
*/

function showToast(
    message,
    type = "info"
) {

    const container =
        $(".toast-container");


    if (
        !container
    ) {

        return;

    }


    const toast =
        document.createElement(
            "div"
        );


    toast.className =
        `toast toast-${escapeHtml(type)}`;


    toast.innerHTML = `

        <div class="toast-content">

            <strong>
                ${escapeHtml(
                    getToastTitle(
                        type
                    )
                )}
            </strong>

            <span>
                ${escapeHtml(
                    message
                )}
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


    const closeButton =
        toast.querySelector(
            ".toast-close"
        );


    closeButton?.addEventListener(
        "click",
        () => {

            toast.remove();

        }
    );


    container.appendChild(
        toast
    );


    setTimeout(
        () => {

            toast.remove();

        },
        5000
    );

}


function getToastTitle(
    type
) {

    switch (
        type
    ) {

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


/*
============================================================
ERROR HANDLER
============================================================
*/

function handleError(
    error,
    options = {}
) {

    console.error(
        "[HONEY PAY FRONTEND]",
        error
    );


    if (
        error instanceof ApiError &&
        (
            error.status ===
            401 ||
            error.status ===
            403
        )
    ) {

        state.authenticated =
            false;

        state.merchant =
            null;

        clearToken();


        if (
            options.silentAuth !==
            true
        ) {

            showToast(
                "A sua sessão terminou. Entre novamente.",
                "warning"
            );

        }


        return;

    }


    if (
        options.silent
    ) {

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

        state.merchant?.name ||

        state.merchant?.businessName ||

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


function getInitials(
    name
) {

    const value =
        String(
            name ||
            "HP"
        )
            .trim();


    if (
        !value
    ) {

        return "HP";

    }


    const parts =
        value
            .split(
                /\s+/
            )
            .filter(
                Boolean
            );


    if (
        parts.length ===
        1
    ) {

        return parts[0]
            .slice(
                0,
                2
            )
            .toUpperCase();

    }


    return (

        parts[0][0] +

        parts[
            parts.length - 1
        ][0]

    )
        .toUpperCase();

}


function renderMerchantProfile() {

    const name =
        getMerchantName();


    const email =
        getMerchantEmail();


    $$(
        "[data-merchant-name]"
    )
        .forEach(
            element => {

                element.textContent =
                    name;

            }
        );


    $$(
        "[data-merchant-email]"
    )
        .forEach(
            element => {

                element.textContent =
                    email;

            }
        );


    $$(
        "[data-merchant-initials]"
    )
        .forEach(
            element => {

                element.textContent =
                    getInitials(
                        name
                    );

            }
        );

}


/*
============================================================
AUTHENTICATED PROFILE
============================================================
*/

async function loadMerchantProfile() {

    const response =
        await apiRequest(
            "/auth/me"
        );


    const data =
        extractData(
            response
        );


    state.merchant =
        data?.merchant ||
        data?.user ||
        data?.profile ||
        data ||
        null;


    state.authenticated =
        true;


    renderMerchantProfile();


    return state.merchant;

}


/*
============================================================
PLAN
============================================================
*/

function normalizePlan(
    data
) {

    return (

        data?.plan ||

        data?.subscription ||

        data ||

        {}

    );

}


function formatDate(
    value
) {

    if (
        !value
    ) {

        return "—";

    }


    const date =
        new Date(
            value
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return String(
            value
        );

    }


    return new Intl.DateTimeFormat(
        "pt-PT",
        {

            day:
                "2-digit",

            month:
                "2-digit",

            year:
                "numeric"

        }
    )
        .format(
            date
        );

}


function formatMoney(
    amount,
    currency = "AOA"
) {

    const numeric =
        Number(
            amount
        );


    if (
        !Number.isFinite(
            numeric
        )
    ) {

        return "0 Kz";

    }


    if (
        currency ===
        "AOA"
    ) {

        return (

            new Intl.NumberFormat(
                "pt-PT",
                {
                    maximumFractionDigits:
                        2
                }
            )
                .format(
                    numeric
                )

            +

            " Kz"

        );

    }


    try {

        return new Intl.NumberFormat(
            "pt-PT",
            {

                style:
                    "currency",

                currency

            }
        )
            .format(
                numeric
            );

    }

    catch {

        return `${numeric} ${currency}`;

    }

}


async function loadPlan() {

    const response =
        await apiRequest(
            "/auth/plan"
        );


    const data =
        extractData(
            response
        );


    state.plan =
        normalizePlan(
            data
        );


    renderPlan();


    return state.plan;

}


function renderPlan() {

    const plan =
        state.plan ||
        {};


    const name =
        plan.name ||
        plan.planName ||
        plan.title ||
        "Gratuito";


    const status =
        plan.status ||
        plan.subscriptionStatus ||
        "active";


    const statusLabel =
        normalizeStatusLabel(
            status
        );


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


    const nextBilling =
        getElement(
            "subscription-next-billing"
        );


    if (
        nameElement
    ) {

        nameElement.textContent =
            name;

    }


    if (
        statusElement
    ) {

        statusElement.textContent =
            statusLabel;

    }


    if (
        stateElement
    ) {

        stateElement.textContent =
            statusLabel;

    }


    if (
        nextBilling
    ) {

        nextBilling.textContent =
            formatDate(
                plan.nextBillingAt ||
                plan.nextBillingDate ||
                plan.currentPeriodEnd
            );

    }

}


/*
============================================================
BANK ACCOUNTS
============================================================
*/

function normalizeCollection(
    data,
    keys = []
) {

    if (
        Array.isArray(
            data
        )
    ) {

        return data;

    }


    for (
        const key of keys
    ) {

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


async function loadBankAccounts() {

    const response =
        await apiRequest(
            "/bank-accounts"
        );


    const data =
        extractData(
            response
        );


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


    updateDashboardBankCount();


    return state.bankAccounts;

}


function getBankAccountId(
    account
) {

    return (

        account?._id ||

        account?.id ||

        account?.accountId ||

        null

    );

}


function getBankName(
    account
) {

    return (

        account?.bankName ||

        account?.bank ||

        "Banco"

    );

}


function getAccountName(
    account
) {

    return (

        account?.accountName ||

        account?.name ||

        "Conta bancária"

    );

}


function getHolderName(
    account
) {

    return (

        account?.holderName ||

        account?.accountHolder ||

        "Titular"

    );

}


function getIban(
    account
) {

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


    if (
        !container
    ) {

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
                    Adicione uma conta bancária para disponibilizá-la
                    nas suas cobranças.
                </p>

            </div>

        `;


        return;

    }


    container.innerHTML =
        state.bankAccounts
            .map(
                account => {

                    const id =
                        getBankAccountId(
                            account
                        );


                    const active =
                        account.active !==
                        false;


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
                                            getBankName(
                                                account
                                            )
                                        )}
                                    </span>

                                    <h3>
                                        ${escapeHtml(
                                            getAccountName(
                                                account
                                            )
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

                                    <span>
                                        Titular
                                    </span>

                                    <strong>
                                        ${escapeHtml(
                                            getHolderName(
                                                account
                                            )
                                        )}
                                    </strong>

                                </div>


                                <div>

                                    <span>
                                        IBAN
                                    </span>

                                    <strong>
                                        ${escapeHtml(
                                            getIban(
                                                account
                                            )
                                        )}
                                    </strong>

                                </div>


                                <div>

                                    <span>
                                        Moeda
                                    </span>

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

                }
            )
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

    if (
        !accountId
    ) {

        return;

    }


    setGlobalLoading(
        true
    );


    try {

        await apiRequest(

            `/bank-accounts/${encodeURIComponent(accountId)}/primary`,

            {
                method:
                    "PATCH"
            }

        );


        await loadBankAccounts();


        showToast(
            "A conta foi definida como principal.",
            "success"
        );

    }

    catch (
        error
    ) {

        handleError(
            error
        );

    }

    finally {

        setGlobalLoading(
            false
        );

    }

}


async function toggleBankAccount(
    accountId,
    active
) {

    if (
        !accountId
    ) {

        return;

    }


    setGlobalLoading(
        true
    );


    try {

        await apiRequest(

            `/bank-accounts/${encodeURIComponent(accountId)}/status`,

            {

                method:
                    "PATCH",

                body: {

                    active:
                        !active

                }

            }

        );


        await loadBankAccounts();


        showToast(
            active
                ? "A conta foi desativada."
                : "A conta foi ativada.",
            "success"
        );

    }

    catch (
        error
    ) {

        handleError(
            error
        );

    }

    finally {

        setGlobalLoading(
            false
        );

    }

}


async function deleteBankAccount(
    accountId
) {

    if (
        !accountId
    ) {

        return;

    }


    const confirmed =
        window.confirm(
            "Tem a certeza de que pretende eliminar esta conta bancária?"
        );


    if (
        !confirmed
    ) {

        return;

    }


    setGlobalLoading(
        true
    );


    try {

        await apiRequest(

            `/bank-accounts/${encodeURIComponent(accountId)}`,

            {

                method:
                    "DELETE"

            }

        );


        await loadBankAccounts();


        showToast(
            "Conta bancária eliminada.",
            "success"
        );

    }

    catch (
        error
    ) {

        handleError(
            error
        );

    }

    finally {

        setGlobalLoading(
            false
        );

    }

}


/*
============================================================
PROOFS
============================================================
*/

async function loadProofs() {

    const response =
        await apiRequest(
            "/proofs?page=1&limit=50"
        );


    const data =
        extractData(
            response
        );


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


    return state.proofs;

}


function normalizeStatusLabel(
    status
) {

    const value =
        String(
            status ||
            ""
        )
            .toLowerCase();


    const labels = {

        active:
            "Ativo",

        inactive:
            "Inativo",

        pending:
            "Pendente",

        approved:
            "Aprovado",

        confirmed:
            "Confirmado",

        rejected:
            "Rejeitado",

        verified:
            "Verificado",

        submitted:
            "Enviado",

        cancelled:
            "Cancelado"

    };


    return (
        labels[value] ||
        status ||
        "—"
    );

}


function renderProofs() {

    const container =
        getElement(
            "proofs-content"
        );


    if (
        !container
    ) {

        return;

    }


    if (
        !state.proofs.length
    ) {

        container.innerHTML = `

            <div class="empty-state">

                <div class="empty-icon">
                    ✓
                </div>

                <h4>
                    Nenhum comprovativo
                </h4>

                <p>
                    Os comprovativos enviados pelos seus clientes
                    aparecerão aqui.
                </p>

            </div>

        `;


        return;

    }


    container.innerHTML = `

        <div class="data-table">

            <div class="data-table-head">

                <span>
                    Ficheiro
                </span>

                <span>
                    Estado
                </span>

                <span>
                    Data
                </span>

            </div>


            ${state.proofs
                .map(
                    proof => `

                        <div
                            class="data-table-row"
                            data-proof-id="${escapeHtml(
                                proof.id ||
                                proof._id ||
                                ""
                            )}"
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
                                    ${escapeHtml(
                                        proof.mimeType ||
                                        ""
                                    )}
                                </small>

                            </span>


                            <span>

                                <span class="badge">

                                    ${escapeHtml(
                                        normalizeStatusLabel(
                                            proof.status
                                        )
                                    )}

                                </span>

                            </span>


                            <span>

                                ${escapeHtml(
                                    formatDate(
                                        proof.createdAt ||
                                        proof.uploadedAt
                                    )
                                )}

                            </span>

                        </div>

                    `
                )
                .join("")}

        </div>

    `;

}


/*
============================================================
DASHBOARD COUNTERS
============================================================
*/

function updateDashboardBankCount() {

    const element =
        getElement(
            "dashboard-bank-accounts"
        );


    if (
        element
    ) {

        element.textContent =
            String(
                state.bankAccounts.length
            );

    }

}


function updateDashboardProofCount() {

    const pending =
        state.proofs
            .filter(
                proof =>
                    String(
                        proof.status ||
                        ""
                    )
                        .toLowerCase() ===
                    "pending"
            )
            .length;


    const element =
        getElement(
            "dashboard-pending-payments"
        );


    if (
        element
    ) {

        element.textContent =
            String(
                pending
            );

    }

}


/*
============================================================
DASHBOARD
============================================================
*/

function renderDashboard() {

    const invoices =
        getElement(
            "dashboard-invoices"
        );


    if (
        invoices &&
        invoices.textContent.trim() ===
        "0"
    ) {

        invoices.textContent =
            "—";

    }


    const total =
        getElement(
            "dashboard-total-received"
        );


    if (
        total &&
        !total.dataset.loaded
    ) {

        total.textContent =
            "—";

    }


    updateDashboardBankCount();

    updateDashboardProofCount();

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


function normalizeView(
    view
) {

    if (
        VIEW_META[
            view
        ]
    ) {

        return view;

    }


    return DEFAULT_VIEW;

}


function getViewFromUrl() {

    const params =
        new URLSearchParams(
            window.location.search
        );


    return normalizeView(
        params.get(
            "view"
        ) ||
        DEFAULT_VIEW
    );

}


function updateUrl(
    view
) {

    const url =
        new URL(
            window.location.href
        );


    url.searchParams.set(
        "view",
        view
    );


    window.history.pushState(
        {
            view
        },
        "",
        url
    );

}


function navigate(
    view,
    pushState = true
) {

    const normalized =
        normalizeView(
            view
        );


    state.currentView =
        normalized;


    if (
        pushState
    ) {

        updateUrl(
            normalized
        );

    }


    $$(
        "[data-view]"
    )
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


    $$(
        "[data-nav]"
    )
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
        VIEW_META[
            normalized
        ];


    const title =
        getElement(
            "page-title"
        );


    const eyebrow =
        getElement(
            "page-eyebrow"
        );


    if (
        title
    ) {

        title.textContent =
            meta.title;

    }


    if (
        eyebrow
    ) {

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
VIEW ACTIVATION
============================================================
*/

const loadedViews =
    new Set();


async function onViewActivated(
    view
) {

    if (
        loadedViews.has(
            view
        )
    ) {

        return;

    }


    try {

        if (
            view ===
            "bank-accounts"
        ) {

            await loadBankAccounts();

        }


        if (
            view ===
            "proofs"
        ) {

            await loadProofs();

        }


        if (
            view ===
            "plans"
        ) {

            await loadPlan();

        }


        loadedViews.add(
            view
        );

    }

    catch (
        error
    ) {

        handleError(
            error
        );

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
LOGOUT
============================================================
*/

function logout(
    notify = true
) {

    clearToken();


    state.authenticated =
        false;

    state.merchant =
        null;

    state.plan =
        null;

    state.bankAccounts =
        [];

    state.proofs =
        [];


    if (
        notify
    ) {

        showToast(
            "Sessão terminada.",
            "success"
        );

    }


    /*
    --------------------------------------------------------
    Não redirecionamos para uma página inexistente.
    Quando o login frontend for integrado, esta função poderá
    redirecionar para a página de autenticação.
    --------------------------------------------------------
    */

    setTimeout(
        () => {

            window.location.reload();

        },
        notify
            ? 500
            : 0
    );

}


/*
============================================================
AUTH BOOTSTRAP
============================================================
*/

async function bootstrapAuthentication() {

    const token =
        getStoredToken();


    if (
        !token
    ) {

        state.authenticated =
            false;


        /*
        A interface continua carregável.
        O frontend de login será integrado na camada seguinte.
        */

        renderMerchantProfile();


        return false;

    }


    state.token =
        token;


    try {

        await loadMerchantProfile();


        return true;

    }

    catch (
        error
    ) {

        if (
            error instanceof ApiError &&
            (
                error.status ===
                401 ||
                error.status ===
                403
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
                silentAuth:
                    true
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

    if (
        !state.authenticated
    ) {

        renderDashboard();

        return;

    }


    const jobs = [

        loadPlan(),

        loadBankAccounts(),

        loadProofs()

    ];


    const results =
        await Promise.allSettled(
            jobs
        );


    results.forEach(
        result => {

            if (
                result.status ===
                "rejected"
            ) {

                handleError(
                    result.reason,
                    {
                        silent:
                            true
                    }
                );

            }

        }
    );


    renderDashboard();


    loadedViews.add(
        "dashboard"
    );


    loadedViews.add(
        "plans"
    );


    loadedViews.add(
        "bank-accounts"
    );


    loadedViews.add(
        "proofs"
    );

}


/*
============================================================
EVENT DELEGATION
============================================================
*/

function setupEvents() {

    document.addEventListener(
        "click",
        event => {

            const nav =
                event.target.closest(
                    "[data-nav]"
                );


            if (
                nav
            ) {

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


            if (
                route
            ) {

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


            if (
                action
            ) {

                event.preventDefault();


                if (
                    action.dataset.action ===
                    "logout"
                ) {

                    logout();

                }


                return;

            }


            const primary =
                event.target.closest(
                    "[data-bank-primary]"
                );


            if (
                primary
            ) {

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


            if (
                toggle
            ) {

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


            if (
                remove
            ) {

                event.preventDefault();


                deleteBankAccount(
                    remove.dataset.bankDelete
                );


                return;

            }


            const sidebarButton =
                event.target.closest(
                    "#mobile-menu-button"
                );


            if (
                sidebarButton
            ) {

                openSidebar();

                return;

            }


            const sidebarClose =
                event.target.closest(
                    "#sidebar-close"
                );


            if (
                sidebarClose
            ) {

                closeSidebar();

                return;

            }


            const overlay =
                event.target.closest(
                    "#sidebar-overlay"
                );


            if (
                overlay
            ) {

                closeSidebar();

                return;

            }


            const managePlan =
                event.target.closest(
                    "#manage-plan-button"
                );


            if (
                managePlan
            ) {

                navigate(
                    "plans"
                );


                showToast(
                    "A gestão da subscrição será ligada ao checkout da Honey Pay.",
                    "info"
                );


                return;

            }


            const createInvoice =
                event.target.closest(
                    "#create-invoice-button"
                );


            if (
                createInvoice
            ) {

                showToast(
                    "O módulo de criação de cobranças será ligado à rota de faturação quando essa API estiver exposta pelo backend.",
                    "info"
                );


                return;

            }


            const addBank =
                event.target.closest(
                    "#add-bank-account-button"
                );


            if (
                addBank
            ) {

                openBankAccountModal();

                return;

            }


            const notifications =
                event.target.closest(
                    "#notification-button"
                );


            if (
                notifications
            ) {

                showToast(
                    "Não existem novas notificações.",
                    "info"
                );


                return;

            }

        }
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
                event.key ===
                "Escape"
            ) {

                closeSidebar();

                closeModal();

            }

        }
    );

}


/*
============================================================
BANK ACCOUNT MODAL
============================================================
*/

function openBankAccountModal() {

    const root =
        getElement(
            "modal-root"
        );


    if (
        !root
    ) {

        return;

    }


    root.hidden =
        false;


    root.innerHTML = `

        <div
            class="modal-backdrop"
            data-modal-close
        >

            <div
                class="modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="bank-modal-title"
            >

                <div class="modal-header">

                    <div>

                        <span class="modal-kicker">
                            Recebimentos
                        </span>

                        <h2 id="bank-modal-title">
                            Adicionar conta bancária
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
                            placeholder="Ex.: Conta Principal"
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

                        <select
                            name="currency"
                        >

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


    const form =
        getElement(
            "bank-account-form"
        );


    form?.addEventListener(
        "submit",
        handleBankAccountSubmit
    );


    root.addEventListener(
        "click",
        handleModalClick,
        {
            once:
                true
        }
    );

}


async function handleBankAccountSubmit(
    event
) {

    event.preventDefault();


    const form =
        event.currentTarget;


    const formData =
        new FormData(
            form
        );


    const payload = {

        bankName:
            String(
                formData.get(
                    "bankName"
                ) ||
                ""
            )
                .trim(),

        accountName:
            String(
                formData.get(
                    "accountName"
                ) ||
                ""
            )
                .trim(),

        holderName:
            String(
                formData.get(
                    "holderName"
                ) ||
                ""
            )
                .trim(),

        iban:
            String(
                formData.get(
                    "iban"
                ) ||
                ""
            )
                .trim()
                .replace(
                    /\s+/g,
                    ""
                )
                .toUpperCase(),

        currency:
            String(
                formData.get(
                    "currency"
                ) ||
                "AOA"
            ),

        active:
            formData.get(
                "active"
            ) ===
            "on"

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


    setGlobalLoading(
        true
    );


    try {

        await apiRequest(

            "/bank-accounts",

            {

                method:
                    "POST",

                body:
                    payload

            }

        );


        closeModal();


        await loadBankAccounts();


        showToast(
            "Conta bancária adicionada com sucesso.",
            "success"
        );

    }

    catch (
        error
    ) {

        handleError(
            error
        );

    }

    finally {

        setGlobalLoading(
            false
        );

    }

}


/*
============================================================
MODAL
============================================================
*/

function handleModalClick(
    event
) {

    if (
        event.target.closest(
            "[data-modal-close]"
        )
    ) {

        closeModal();

    }

}


function closeModal() {

    const root =
        getElement(
            "modal-root"
        );


    if (
        !root
    ) {

        return;

    }


    root.hidden =
        true;


    root.innerHTML =
        "";

}


/*
============================================================
PUBLIC CHECKOUT HELPERS
============================================================

Estas funções não utilizam BitPay.

Servem somente para o checkout público da Honey Pay,
onde o cliente de um comerciante consulta uma cobrança.

============================================================
*/

export async function getPublicCheckout(
    publicToken
) {

    if (
        !publicToken
    ) {

        throw new ApiError(
            "Token público de checkout inválido.",
            400,
            "INVALID_PUBLIC_TOKEN"
        );

    }


    const response =
        await apiRequest(

            `/checkout/${encodeURIComponent(publicToken)}`

        );


    return extractData(
        response
    );

}


export async function createPublicPaymentIntent(
    publicToken,
    payload
) {

    if (
        !publicToken
    ) {

        throw new ApiError(
            "Token público de checkout inválido.",
            400,
            "INVALID_PUBLIC_TOKEN"
        );

    }


    const response =
        await apiRequest(

            `/checkout/${encodeURIComponent(publicToken)}/payment-intent`,

            {

                method:
                    "POST",

                body:
                    payload ||
                    {}

            }

        );


    return extractData(
        response
    );

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


    return extractData(
        response
    );

}


/*
============================================================
SUBSCRIPTION CHECKOUT SEPARATION
============================================================

IMPORTANTE:

O frontend NÃO chama BitPay.

O frontend deverá chamar futuramente uma rota interna
do backend responsável por criar a sessão de subscrição.

Exemplo futuro:

POST /api/subscription/checkout

O backend será responsável por:

1. Validar o comerciante
2. Validar o plano
3. Calcular o valor
4. Criar o checkout
5. Comunicar com BitPay
6. Receber a resposta
7. Devolver somente os dados públicos necessários

Nenhuma chave BitPay será enviada para este arquivo.

============================================================
*/


export async function createSubscriptionCheckout(
    planId
) {

    if (
        !planId
    ) {

        throw new ApiError(
            "Plano inválido.",
            400,
            "INVALID_PLAN"
        );

    }


    /*
    --------------------------------------------------------
    A rota de subscrição BitPay não será inventada aqui.
    Ela será ligada quando o backend disponibilizar a rota
    oficial correspondente.
    --------------------------------------------------------
    */

    throw new ApiError(

        "O checkout da subscrição ainda não está exposto pelo backend.",

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

                    method:
                        "GET",

                    headers: {

                        Accept:
                            "application/json"

                    },

                    cache:
                        "no-store"

                }
            );


        if (
            !response.ok
        ) {

            return false;

        }


        const data =
            await response.json();


        return (
            data?.success ===
            true
        );

    }

    catch {

        return false;

    }

}


/*
============================================================
GLOBAL FRONTEND API
============================================================
*/

window.HoneyPay =
    {

        state,

        api:

            {

                request:
                    apiRequest,

                health:
                    checkApiHealth,

                getPublicCheckout,

                createPublicPaymentIntent,

                getPublicPaymentStatus,

                createSubscriptionCheckout

            },

        auth:

            {

                getToken:
                    getStoredToken,

                setToken,

                clearToken,

                logout

            },

        navigation:

            {

                navigate,

                current:
                    () =>
                        state.currentView

            },

        merchant:

            {

                get:
                    () =>
                        state.merchant

            },

        plan:

            {

                get:
                    () =>
                        state.plan,

                reload:
                    loadPlan

            },

        bankAccounts:

            {

                list:
                    () =>
                        state.bankAccounts,

                reload:
                    loadBankAccounts,

                setPrimary:
                    setPrimaryBankAccount,

                toggle:
                    toggleBankAccount,

                remove:
                    deleteBankAccount

            },

        proofs:

            {

                list:
                    () =>
                        state.proofs,

                reload:
                    loadProofs

            }

    };


/*
============================================================
APPLICATION INITIALIZATION
============================================================
*/

async function initializeApplication() {

    if (
        state.initialized
    ) {

        return;

    }


    state.initialized =
        true;


    const loader =
        getElement(
            "app-loader"
        );


    try {

        setupEvents();


        const authenticated =
            await bootstrapAuthentication();


        if (
            authenticated
        ) {

            await loadInitialData();

        }

        else {

            renderDashboard();

        }


        const initialView =
            getViewFromUrl();


        navigate(
            initialView,
            false
        );


        /*
        ----------------------------------------------------
        A aplicação frontend está pronta.
        ----------------------------------------------------
        */

        document.body.classList.add(
            "app-ready"
        );


        if (
            loader
        ) {

            loader.classList.add(
                "loaded"
            );


            setTimeout(
                () => {

                    loader.remove();

                },
                350
            );

        }

    }

    catch (
        error
    ) {

        console.error(
            "[HONEY PAY] Initialization error:",
            error
        );


        if (
            loader
        ) {

            loader.classList.add(
                "loaded"
            );

        }


        showToast(
            "A aplicação foi carregada, mas alguns dados não puderam ser obtidos.",
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
            once:
                true
        }
    );

}

else {

    initializeApplication();

}


/*
============================================================
END
============================================================
*/
