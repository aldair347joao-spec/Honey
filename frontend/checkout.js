/*
============================================================
HONEY PAY
PUBLIC CHECKOUT
V1.0.0
PRODUCTION CUSTOMER PAYMENT EXPERIENCE
============================================================

RESPONSABILIDADES
------------------------------------------------------------
- Detectar /pay/:publicToken
- Carregar checkout público
- Mostrar Invoice real
- Mostrar comerciante
- Mostrar conta bancária
- Criar Payment
- Upload de comprovativo
- Consultar estado
- Mostrar estados financeiros
- Não exigir autenticação
- Nunca confiar no valor enviado pelo cliente
============================================================
*/

"use strict";


/*
============================================================
CONFIGURATION
============================================================
*/

const CHECKOUT_CONFIG = {
    apiBase:
        "/api",

    proofMaxBytes:
        10 * 1024 * 1024,

    pollingInterval:
        5000,

    maxPollingAttempts:
        240
};


/*
============================================================
STATE
============================================================
*/

const checkoutState = {

    token:
        null,

    invoice:
        null,

    payment:
        null,

    loading:
        false,

    submitting:
        false,

    polling:
        false,

    pollTimer:
        null,

    pollAttempts:
        0,

    step:
        "loading",

    error:
        null

};


/*
============================================================
UTILITIES
============================================================
*/

function escapeHtml(
    value
) {

    return String(
        value ?? ""
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


function formatAmount(
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

        return "—";

    }

    try {

        return new Intl.NumberFormat(
            "pt-PT",
            {
                style:
                    "currency",

                currency:
                    currency,

                minimumFractionDigits:
                    2,

                maximumFractionDigits:
                    2
            }
        ).format(
            numeric
        );

    }

    catch {

        return `${numeric.toLocaleString(
            "pt-PT"
        )} ${currency}`;

    }

}


function formatDate(
    value
) {

    if (!value) {

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

        return "—";

    }

    return new Intl.DateTimeFormat(
        "pt-PT",
        {
            dateStyle:
                "medium",

            timeStyle:
                "short"
        }
    ).format(
        date
    );

}


function getPublicToken() {

    const path =
        window.location.pathname
            .replace(
                /\/+$/,
                ""
            );

    const parts =
        path.split(
            "/"
        ).filter(
            Boolean
        );

    const payIndex =
        parts.findIndex(
            part =>
                part.toLowerCase() ===
                "pay"
        );

    if (
        payIndex === -1 ||
        !parts[payIndex + 1]
    ) {

        return null;

    }

    return decodeURIComponent(
        parts[
            payIndex + 1
        ]
    );

}


function isCheckoutRoute() {

    return Boolean(
        getPublicToken()
    );

}


/*
============================================================
API
============================================================
*/

async function request(
    path,
    options = {}
) {

    const headers = {
        Accept:
            "application/json"
    };

    if (
        options.body !== undefined
    ) {

        headers[
            "Content-Type"
        ] =
            "application/json";

    }

    const response =
        await fetch(
            `${CHECKOUT_CONFIG.apiBase}${path}`,
            {
                method:
                    options.method ||
                    "GET",

                headers,

                body:
                    options.body !== undefined
                        ? JSON.stringify(
                            options.body
                        )
                        : undefined,

                credentials:
                    "same-origin",

                cache:
                    "no-store"
            }
        );

    let payload =
        null;

    try {

        payload =
            await response.json();

    }

    catch {

        payload =
            null;

    }

    if (
        !response.ok
    ) {

        const error =
            new Error(
                payload?.message ||
                payload?.error?.message ||
                "Não foi possível concluir a operação."
            );

        error.status =
            response.status;

        error.code =
            payload?.code ||
            payload?.error?.code ||
            null;

        throw error;

    }

    return payload;

}


function unwrap(
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
STYLES
============================================================
*/

function injectStyles() {

    if (
        document.getElementById(
            "honey-public-checkout-styles"
        )
    ) {

        return;

    }

    const style =
        document.createElement(
            "style"
        );

    style.id =
        "honey-public-checkout-styles";

    style.textContent = `

        :root {
            --hp-bg: #07090d;
            --hp-card: #10141b;
            --hp-card-2: #0c1016;
            --hp-border: #252b35;
            --hp-text: #f5f7fb;
            --hp-muted: #8e98a9;
            --hp-gold: #f5be34;
            --hp-success: #49d18d;
            --hp-danger: #ff7777;
            --hp-warning: #f2bd55;
            --hp-radius: 22px;
        }

        body.honey-public-checkout {
            margin: 0;
            background: var(--hp-bg);
            color: var(--hp-text);
            min-height: 100vh;
            font-family:
                Inter,
                "Plus Jakarta Sans",
                system-ui,
                -apple-system,
                BlinkMacSystemFont,
                "Segoe UI",
                sans-serif;
        }

        body.honey-public-checkout * {
            box-sizing: border-box;
        }

        .hp-page {
            min-height: 100vh;
            padding: 28px 18px 60px;
            background:
                radial-gradient(
                    circle at 50% -10%,
                    rgba(245,190,52,.10),
                    transparent 38%
                ),
                var(--hp-bg);
        }

        .hp-container {
            width: min(
                100%,
                760px
            );
            margin: 0 auto;
        }

        .hp-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            margin-bottom: 28px;
        }

        .hp-brand {
            display: flex;
            align-items: center;
            gap: 11px;
        }

        .hp-logo {
            width: 42px;
            height: 42px;
            display: grid;
            place-items: center;
            border-radius: 13px;
            background: var(--hp-gold);
            color: #111318;
            font-size: 17px;
            font-weight: 900;
            box-shadow:
                0 10px 30px rgba(245,190,52,.16);
        }

        .hp-brand strong {
            display: block;
            font-size: 17px;
            letter-spacing: -.03em;
        }

        .hp-brand span {
            display: block;
            margin-top: 2px;
            color: var(--hp-muted);
            font-size: 11px;
        }

        .hp-secure {
            display: flex;
            align-items: center;
            gap: 7px;
            color: var(--hp-muted);
            font-size: 11px;
        }

        .hp-secure-dot {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background: var(--hp-success);
            box-shadow:
                0 0 0 4px rgba(73,209,141,.08);
        }

        .hp-card {
            border:
                1px solid var(--hp-border);
            border-radius:
                var(--hp-radius);
            background:
                linear-gradient(
                    180deg,
                    rgba(255,255,255,.025),
                    transparent
                ),
                var(--hp-card);
            box-shadow:
                0 30px 90px rgba(0,0,0,.35);
            overflow: hidden;
        }

        .hp-content {
            padding: 30px;
        }

        .hp-merchant {
            color: var(--hp-muted);
            font-size: 13px;
            margin-bottom: 8px;
        }

        .hp-title {
            margin: 0;
            font-size: clamp(
                25px,
                5vw,
                34px
            );
            line-height: 1.1;
            letter-spacing: -.045em;
        }

        .hp-description {
            margin: 12px 0 0;
            color: var(--hp-muted);
            line-height: 1.65;
            font-size: 14px;
        }

        .hp-amount {
            margin-top: 28px;
            padding: 22px;
            border: 1px solid var(--hp-border);
            border-radius: 17px;
            background: var(--hp-card-2);
        }

        .hp-amount-label {
            color: var(--hp-muted);
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: .08em;
            font-weight: 800;
        }

        .hp-amount-value {
            margin-top: 7px;
            font-size: clamp(
                31px,
                8vw,
                48px
            );
            line-height: 1;
            font-weight: 850;
            letter-spacing: -.055em;
        }

        .hp-meta {
            display: grid;
            grid-template-columns:
                repeat(2, minmax(0, 1fr));
            gap: 12px;
            margin-top: 13px;
        }

        .hp-meta-item {
            padding: 14px;
            border:
                1px solid var(--hp-border);
            border-radius: 13px;
            background: var(--hp-card-2);
        }

        .hp-meta-label {
            color: var(--hp-muted);
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: .07em;
            font-weight: 800;
        }

        .hp-meta-value {
            margin-top: 5px;
            font-size: 13px;
            word-break: break-word;
        }

        .hp-section {
            margin-top: 26px;
        }

        .hp-section-title {
            margin: 0 0 12px;
            font-size: 16px;
            letter-spacing: -.02em;
        }

        .hp-bank {
            padding: 19px;
            border:
                1px solid rgba(245,190,52,.22);
            border-radius: 17px;
            background:
                rgba(245,190,52,.045);
        }

        .hp-bank-name {
            font-weight: 800;
            font-size: 16px;
        }

        .hp-bank-grid {
            display: grid;
            gap: 12px;
            margin-top: 16px;
        }

        .hp-bank-row {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 15px;
            padding-bottom: 12px;
            border-bottom:
                1px solid rgba(255,255,255,.06);
        }

        .hp-bank-row:last-child {
            border-bottom: 0;
            padding-bottom: 0;
        }

        .hp-bank-label {
            color: var(--hp-muted);
            font-size: 11px;
        }

        .hp-bank-value {
            text-align: right;
            font-size: 13px;
            font-weight: 700;
            word-break: break-word;
        }

        .hp-copy {
            margin-top: 5px;
            border: 0;
            background: transparent;
            color: var(--hp-gold);
            cursor: pointer;
            font-size: 11px;
            font-weight: 750;
        }

        .hp-form {
            display: grid;
            gap: 15px;
        }

        .hp-field {
            display: grid;
            gap: 7px;
        }

        .hp-field label {
            color: #cdd3df;
            font-size: 12px;
            font-weight: 700;
        }

        .hp-field input,
        .hp-field textarea {
            width: 100%;
            border:
                1px solid var(--hp-border);
            border-radius: 12px;
            background: #090c11;
            color: var(--hp-text);
            outline: none;
            padding: 13px 14px;
            font: inherit;
        }

        .hp-field textarea {
            min-height: 95px;
            resize: vertical;
        }

        .hp-field input:focus,
        .hp-field textarea:focus {
            border-color:
                var(--hp-gold);
            box-shadow:
                0 0 0 3px rgba(245,190,52,.09);
        }

        .hp-file {
            position: relative;
            padding: 20px;
            border:
                1px dashed #3b4350;
            border-radius: 15px;
            text-align: center;
            background: #0a0d12;
            cursor: pointer;
        }

        .hp-file:hover {
            border-color:
                rgba(245,190,52,.6);
        }

        .hp-file input {
            position: absolute;
            width: 1px;
            height: 1px;
            opacity: 0;
        }

        .hp-file-title {
            font-size: 14px;
            font-weight: 750;
        }

        .hp-file-info {
            margin-top: 6px;
            color: var(--hp-muted);
            font-size: 11px;
            line-height: 1.5;
        }

        .hp-file-name {
            margin-top: 9px;
            color: var(--hp-gold);
            font-size: 12px;
            word-break: break-word;
        }

        .hp-submit {
            width: 100%;
            min-height: 54px;
            border: 0;
            border-radius: 13px;
            background: var(--hp-gold);
            color: #111318;
            font: inherit;
            font-weight: 850;
            cursor: pointer;
            transition:
                transform .18s ease,
                opacity .18s ease;
        }

        .hp-submit:hover {
            transform: translateY(-1px);
        }

        .hp-submit:disabled {
            opacity: .5;
            cursor: wait;
            transform: none;
        }

        .hp-alert {
            display: none;
            margin-bottom: 18px;
            padding: 13px 15px;
            border-radius: 12px;
            font-size: 13px;
            line-height: 1.55;
        }

        .hp-alert.is-visible {
            display: block;
        }

        .hp-alert.error {
            border:
                1px solid rgba(255,119,119,.25);
            background:
                rgba(255,119,119,.07);
            color: #ffadad;
        }

        .hp-alert.warning {
            border:
                1px solid rgba(242,189,85,.25);
            background:
                rgba(242,189,85,.07);
            color: #f5cc82;
        }

        .hp-alert.success {
            border:
                1px solid rgba(73,209,141,.25);
            background:
                rgba(73,209,141,.07);
            color: #8de9b9;
        }

        .hp-state {
            padding: 45px 25px;
            text-align: center;
        }

        .hp-state-icon {
            width: 58px;
            height: 58px;
            margin: 0 auto 18px;
            display: grid;
            place-items: center;
            border-radius: 50%;
            background: #1b2029;
            font-size: 22px;
            font-weight: 900;
        }

        .hp-state.success .hp-state-icon {
            background:
                rgba(73,209,141,.11);
            color:
                var(--hp-success);
        }

        .hp-state.error .hp-state-icon {
            background:
                rgba(255,119,119,.11);
            color:
                var(--hp-danger);
        }

        .hp-state.warning .hp-state-icon {
            background:
                rgba(242,189,85,.11);
            color:
                var(--hp-warning);
        }

        .hp-state h1 {
            margin: 0;
            font-size: 24px;
            letter-spacing: -.035em;
        }

        .hp-state p {
            max-width: 480px;
            margin: 10px auto 0;
            color: var(--hp-muted);
            line-height: 1.65;
            font-size: 14px;
        }

        .hp-footer {
            margin-top: 22px;
            text-align: center;
            color: #687184;
            font-size: 10px;
            line-height: 1.6;
        }

        .hp-loading {
            padding: 70px 25px;
            text-align: center;
        }

        .hp-spinner {
            width: 38px;
            height: 38px;
            margin: 0 auto 18px;
            border:
                3px solid #292f39;
            border-top-color:
                var(--hp-gold);
            border-radius: 50%;
            animation:
                hp-spin .8s linear infinite;
        }

        @keyframes hp-spin {
            to {
                transform: rotate(360deg);
            }
        }

        @media (max-width: 600px) {

            .hp-page {
                padding:
                    17px 12px 35px;
            }

            .hp-content {
                padding: 21px;
            }

            .hp-header {
                margin-bottom: 18px;
            }

            .hp-secure {
                display: none;
            }

            .hp-meta {
                grid-template-columns: 1fr;
            }

            .hp-bank-row {
                display: grid;
                gap: 5px;
            }

            .hp-bank-value {
                text-align: left;
            }

        }

    `;

    document.head.appendChild(
        style
    );

}


/*
============================================================
ROOT
============================================================
*/

function ensureRoot() {

    let root =
        document.getElementById(
            "honey-public-checkout"
        );

    if (
        root
    ) {

        return root;

    }

    root =
        document.createElement(
            "div"
        );

    root.id =
        "honey-public-checkout";

    document.body.innerHTML = "";

    document.body.appendChild(
        root
    );

    return root;

}


/*
============================================================
LAYOUT
============================================================
*/

function renderShell(
    content
) {

    const root =
        ensureRoot();

    root.innerHTML = `
        <main class="hp-page">

            <div class="hp-container">

                <header class="hp-header">

                    <div class="hp-brand">

                        <div class="hp-logo">
                            H
                        </div>

                        <div>
                            <strong>
                                Honey Pay
                            </strong>

                            <span>
                                Pagamento seguro
                            </span>
                        </div>

                    </div>

                    <div class="hp-secure">
                        <span class="hp-secure-dot"></span>
                        Ligação segura
                    </div>

                </header>

                <section class="hp-card">
                    ${content}
                </section>

                <div class="hp-footer">
                    Este pagamento é processado através da
                    plataforma Honey Pay. A confirmação do
                    pagamento depende da verificação do
                    comprovativo enviado.
                </div>

            </div>

        </main>
    `;

}


/*
============================================================
LOADING
============================================================
*/

function renderLoading() {

    renderShell(`
        <div class="hp-loading">

            <div class="hp-spinner"></div>

            <strong>
                A carregar a cobrança...
            </strong>

            <p style="
                color:#8e98a9;
                font-size:13px;
                margin:8px 0 0;
            ">
                Estamos a validar o link de pagamento.
            </p>

        </div>
    `);

}


/*
============================================================
ERROR
============================================================
*/

function renderError(
    title,
    message
) {

    renderShell(`
        <div class="hp-state error">

            <div class="hp-state-icon">
                !
            </div>

            <h1>
                ${escapeHtml(title)}
            </h1>

            <p>
                ${escapeHtml(message)}
            </p>

        </div>
    `);

}


/*
============================================================
STATUS STATE
============================================================
*/

function renderStatusState(
    type,
    icon,
    title,
    message,
    secondary = ""
) {

    renderShell(`
        <div class="hp-state ${escapeHtml(type)}">

            <div class="hp-state-icon">
                ${escapeHtml(icon)}
            </div>

            <h1>
                ${escapeHtml(title)}
            </h1>

            <p>
                ${escapeHtml(message)}
            </p>

            ${
                secondary
                    ? `
                        <p style="
                            margin-top:14px;
                            font-size:12px;
                        ">
                            ${escapeHtml(
                                secondary
                            )}
                        </p>
                    `
                    : ""
            }

        </div>
    `);

}


/*
============================================================
BANK ACCOUNT
============================================================
*/

function renderBankAccount(
    account
) {

    if (
        !account
    ) {

        return `
            <div class="hp-alert error is-visible">
                O comerciante não possui uma conta bancária
                disponível para esta cobrança.
            </div>
        `;

    }

    const rows = [];

    if (
        account.accountName
    ) {

        rows.push(`
            <div class="hp-bank-row">
                <div class="hp-bank-label">
                    Titular
                </div>

                <div class="hp-bank-value">
                    ${escapeHtml(
                        account.accountName
                    )}
                </div>
            </div>
        `);

    }

    if (
        account.bankName
    ) {

        rows.push(`
            <div class="hp-bank-row">
                <div class="hp-bank-label">
                    Banco
                </div>

                <div class="hp-bank-value">
                    ${escapeHtml(
                        account.bankName
                    )}
                </div>
            </div>
        `);

    }

    if (
        account.iban
    ) {

        rows.push(`
            <div class="hp-bank-row">
                <div class="hp-bank-label">
                    IBAN
                </div>

                <div class="hp-bank-value">
                    <div>
                        ${escapeHtml(
                            account.iban
                        )}
                    </div>

                    <button
                        type="button"
                        class="hp-copy"
                        data-copy="${escapeHtml(
                            account.iban
                        )}"
                    >
                        Copiar IBAN
                    </button>
                </div>
            </div>
        `);

    }

    if (
        account.accountNumber
    ) {

        rows.push(`
            <div class="hp-bank-row">
                <div class="hp-bank-label">
                    Número da conta
                </div>

                <div class="hp-bank-value">
                    <div>
                        ${escapeHtml(
                            account.accountNumber
                        )}
                    </div>

                    <button
                        type="button"
                        class="hp-copy"
                        data-copy="${escapeHtml(
                            account.accountNumber
                        )}"
                    >
                        Copiar número
                    </button>
                </div>
            </div>
        `);

    }

    return `
        <div class="hp-bank">

            <div class="hp-bank-name">
                Dados para transferência
            </div>

            <div class="hp-bank-grid">
                ${rows.join("")}
            </div>

        </div>
    `;

}


/*
============================================================
CHECKOUT FORM
============================================================
*/

function renderCheckout() {

    const invoice =
        checkoutState.invoice;

    const payment =
        checkoutState.payment;

    if (
        !invoice
    ) {

        renderError(
            "Cobrança indisponível",
            "Não foi possível carregar os dados desta cobrança."
        );

        return;

    }

    if (
        invoice.status ===
        "paid" ||
        payment?.status ===
        "confirmed"
    ) {

        renderStatusState(
            "success",
            "✓",
            "Pagamento confirmado",
            "Esta cobrança já foi paga e confirmada.",
            payment?.paidAt
                ? `Confirmado em ${formatDate(
                    payment.paidAt
                )}.`
                : ""
        );

        return;

    }

    if (
        invoice.status ===
        "expired"
    ) {

        renderStatusState(
            "warning",
            "!",
            "Cobrança expirada",
            "Este link de pagamento já não está disponível.",
            invoice.expiresAt
                ? `Expirou em ${formatDate(
                    invoice.expiresAt
                )}.`
                : ""
        );

        return;

    }

    if (
        invoice.status ===
        "cancelled"
    ) {

        renderStatusState(
            "error",
            "×",
            "Cobrança cancelada",
            "O comerciante cancelou esta cobrança."
        );

        return;

    }

    if (
        payment?.status ===
        "pending_review" ||
        invoice.status ===
        "payment_submitted"
    ) {

        renderStatusState(
            "warning",
            "…",
            "Pagamento em análise",
            "Recebemos o comprovativo. O comerciante precisa verificar o pagamento antes da confirmação.",
            "Não é necessário enviar o comprovativo novamente."
        );

        startPolling();

        return;

    }

    const merchantName =
        invoice.merchant?.businessName ||
        "Comerciante";

    renderShell(`
        <div class="hp-content">

            <div class="hp-merchant">
                Pagamento para
                <strong>
                    ${escapeHtml(
                        merchantName
                    )}
                </strong>
            </div>

            <h1 class="hp-title">
                ${escapeHtml(
                    invoice.description ||
                    "Cobrança Honey Pay"
                )}
            </h1>

            ${
                invoice.customerName
                    ? `
                        <p class="hp-description">
                            Olá ${escapeHtml(
                                invoice.customerName
                            )}.
                        </p>
                    `
                    : `
                        <p class="hp-description">
                            Faça a transferência para os dados
                            indicados abaixo e depois envie o
                            comprovativo.
                        </p>
                    `
            }

            <div class="hp-amount">

                <div class="hp-amount-label">
                    Valor a pagar
                </div>

                <div class="hp-amount-value">
                    ${escapeHtml(
                        formatAmount(
                            invoice.amount,
                            invoice.currency
                        )
                    )}
                </div>

            </div>

            <div class="hp-meta">

                <div class="hp-meta-item">

                    <div class="hp-meta-label">
                        Referência
                    </div>

                    <div class="hp-meta-value">
                        ${escapeHtml(
                            invoice.invoiceNumber ||
                            invoice.publicId ||
                            "—"
                        )}
                    </div>

                </div>

                <div class="hp-meta-item">

                    <div class="hp-meta-label">
                        Válida até
                    </div>

                    <div class="hp-meta-value">
                        ${escapeHtml(
                            formatDate(
                                invoice.expiresAt
                            )
                        )}
                    </div>

                </div>

            </div>

            <div class="hp-section">

                <h2 class="hp-section-title">
                    1. Faça a transferência
                </h2>

                ${renderBankAccount(
                    invoice.bankAccount
                )}

            </div>

            <div class="hp-section">

                <h2 class="hp-section-title">
                    2. Envie o comprovativo
                </h2>

                <div
                    id="hp-alert"
                    class="hp-alert"
                    role="alert"
                    aria-live="polite"
                ></div>

                <form
                    id="hp-proof-form"
                    class="hp-form"
                    novalidate
                >

                    <div class="hp-field">

                        <label for="hp-payer-name">
                            Nome do pagador
                        </label>

                        <input
                            id="hp-payer-name"
                            name="payerName"
                            type="text"
                            maxlength="180"
                            autocomplete="name"
                            placeholder="Nome completo"
                        >

                    </div>

                    <div class="hp-field">

                        <label for="hp-payer-phone">
                            Telefone
                        </label>

                        <input
                            id="hp-payer-phone"
                            name="payerPhone"
                            type="tel"
                            maxlength="40"
                            autocomplete="tel"
                            placeholder="+244 ..."
                        >

                    </div>

                    <div class="hp-field">

                        <label for="hp-reference">
                            Referência da transferência
                        </label>

                        <input
                            id="hp-reference"
                            name="reference"
                            type="text"
                            maxlength="180"
                            placeholder="Opcional"
                        >

                    </div>

                    <div class="hp-field">

                        <label>
                            Comprovativo
                        </label>

                        <label class="hp-file">

                            <input
                                id="hp-proof-file"
                                name="proof"
                                type="file"
                                accept="
                                    image/jpeg,
                                    image/png,
                                    image/webp,
                                    application/pdf
                                "
                                required
                            >

                            <div class="hp-file-title">
                                Selecionar comprovativo
                            </div>

                            <div class="hp-file-info">
                                PDF, JPG, PNG ou WebP.
                                Máximo 10 MB.
                            </div>

                            <div
                                id="hp-file-name"
                                class="hp-file-name"
                            >
                                Nenhum ficheiro selecionado
                            </div>

                        </label>

                    </div>

                    <div class="hp-field">

                        <label for="hp-note">
                            Observação
                        </label>

                        <textarea
                            id="hp-note"
                            name="note"
                            maxlength="1000"
                            placeholder="Opcional"
                        ></textarea>

                    </div>

                    <button
                        id="hp-submit"
                        class="hp-submit"
                        type="submit"
                    >
                        Enviar comprovativo
                    </button>

                </form>

            </div>

        </div>
    `);

    bindCheckoutEvents();

}


/*
============================================================
EVENTS
============================================================
*/

function bindCheckoutEvents() {

    document
        .querySelectorAll(
            "[data-copy]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    async () => {

                        const value =
                            button.dataset.copy;

                        try {

                            await navigator.clipboard.writeText(
                                value
                            );

                            const original =
                                button.textContent;

                            button.textContent =
                                "Copiado";

                            setTimeout(
                                () => {
                                    button.textContent =
                                        original;
                                },
                                1500
                            );

                        }

                        catch {

                            window.prompt(
                                "Copie o valor:",
                                value
                            );

                        }

                    }
                );

            }
        );


    const file =
        document.getElementById(
            "hp-proof-file"
        );

    const fileName =
        document.getElementById(
            "hp-file-name"
        );

    file?.addEventListener(
        "change",
        () => {

            const selected =
                file.files?.[0];

            if (!selected) {

                fileName.textContent =
                    "Nenhum ficheiro selecionado";

                return;

            }

            fileName.textContent =
                `${selected.name} — ${formatFileSize(
                    selected.size
                )}`;

        }
    );


    const form =
        document.getElementById(
            "hp-proof-form"
        );

    form?.addEventListener(
        "submit",
        submitProof
    );

}


/*
============================================================
FILE SIZE
============================================================
*/

function formatFileSize(
    bytes
) {

    if (
        bytes < 1024
    ) {

        return `${bytes} B`;

    }

    if (
        bytes < 1024 * 1024
    ) {

        return `${(
            bytes / 1024
        ).toFixed(
            1
        )} KB`;

    }

    return `${(
        bytes /
        (1024 * 1024)
    ).toFixed(
        2
    )} MB`;

}


/*
============================================================
ALERT
============================================================
*/

function showAlert(
    message,
    type = "error"
) {

    const element =
        document.getElementById(
            "hp-alert"
        );

    if (!element) {

        return;

    }

    element.textContent =
        message;

    element.className =
        `hp-alert ${type} is-visible`;

}


/*
============================================================
FILE -> BASE64
============================================================
*/

function fileToBase64(
    file
) {

    return new Promise(
        (
            resolve,
            reject
        ) => {

            const reader =
                new FileReader();

            reader.onload =
                () => {

                    const result =
                        String(
                            reader.result ||
                            ""
                        );

                    const comma =
                        result.indexOf(
                            ","
                        );

                    resolve(
                        comma >= 0
                            ? result.slice(
                                comma + 1
                            )
                            : result
                    );

                };

            reader.onerror =
                () => {

                    reject(
                        new Error(
                            "Não foi possível ler o comprovativo."
                        )
                    );

                };

            reader.readAsDataURL(
                file
            );

        }
    );

}


/*
============================================================
VALIDATE FILE
============================================================
*/

function validateFile(
    file
) {

    if (
        !file
    ) {

        throw new Error(
            "Selecione o comprovativo da transferência."
        );

    }

    if (
        file.size <= 0
    ) {

        throw new Error(
            "O ficheiro selecionado está vazio."
        );

    }

    if (
        file.size >
        CHECKOUT_CONFIG.proofMaxBytes
    ) {

        throw new Error(
            "O comprovativo não pode ultrapassar 10 MB."
        );

    }

    const allowed =
        new Set([
            "image/jpeg",
            "image/png",
            "image/webp",
            "application/pdf"
        ]);

    if (
        !allowed.has(
            file.type
        )
    ) {

        throw new Error(
            "Formato não suportado. Envie PDF, JPG, PNG ou WebP."
        );

    }

}


/*
============================================================
SUBMIT PROOF
============================================================
*/

async function submitProof(
    event
) {

    event.preventDefault();

    if (
        checkoutState.submitting
    ) {

        return;

    }

    const form =
        event.currentTarget;

    const fileInput =
        document.getElementById(
            "hp-proof-file"
        );

    const submit =
        document.getElementById(
            "hp-submit"
        );

    try {

        const file =
            fileInput?.files?.[0];

        validateFile(
            file
        );

        if (
            !checkoutState.payment?.id
        ) {

            throw new Error(
                "O pagamento ainda não foi iniciado."
            );

        }

        checkoutState.submitting =
            true;

        if (submit) {

            submit.disabled =
                true;

            submit.textContent =
                "A enviar comprovativo...";

        }

        showAlert(
            "A preparar o comprovativo...",
            "warning"
        );

        const fileData =
            await fileToBase64(
                file
            );

        const payerName =
            document.getElementById(
                "hp-payer-name"
            )?.value
                ?.trim() ||
            "";

        const payerPhone =
            document.getElementById(
                "hp-payer-phone"
            )?.value
                ?.trim() ||
            "";

        const reference =
            document.getElementById(
                "hp-reference"
            )?.value
                ?.trim() ||
            "";

        const note =
            document.getElementById(
                "hp-note"
            )?.value
                ?.trim() ||
            "";

        showAlert(
            "A enviar o comprovativo...",
            "warning"
        );

        const response =
            await request(
                `/pay/${encodeURIComponent(
                    checkoutState.token
                )}/proof`,
                {
                    method:
                        "POST",

                    body:
                        {
                            paymentId:
                                checkoutState.payment.id,

                            fileName:
                                file.name,

                            mimeType:
                                file.type,

                            fileSize:
                                file.size,

                            fileData,

                            payerName,

                            payerPhone,

                            reference,

                            note
                        }
                }
            );

        const data =
            unwrap(
                response
            );

        if (
            data?.payment
        ) {

            checkoutState.payment =
                {
                    ...checkoutState.payment,
                    ...data.payment
                };

        }

        checkoutState.submitting =
            false;

        renderStatusState(
            "warning",
            "…",
            "Comprovativo enviado",
            "Recebemos o seu comprovativo. O comerciante irá verificar o pagamento.",
            "Pode fechar esta página. Não envie o comprovativo novamente."
        );

        startPolling();

    }

    catch (
        error
    ) {

        checkoutState.submitting =
            false;

        if (submit) {

            submit.disabled =
                false;

            submit.textContent =
                "Enviar comprovativo";

        }

        showAlert(
            error?.message ||
            "Não foi possível enviar o comprovativo.",
            "error"
        );

    }

}


/*
============================================================
LOAD CHECKOUT
============================================================
*/

async function loadCheckout() {

    checkoutState.loading =
        true;

    checkoutState.step =
        "loading";

    renderLoading();

    try {

        const response =
            await request(
                `/checkout/${encodeURIComponent(
                    checkoutState.token
                )}`
            );

        const data =
            unwrap(
                response
            );

        if (
            !data?.invoice
        ) {

            throw new Error(
                "A cobrança não devolveu dados válidos."
            );

        }

        checkoutState.invoice =
            data.invoice;

        checkoutState.payment =
            data.payment ||
            null;

        /*
        ----------------------------------------------------
        Se já existe um pagamento pending, usamos esse.
        Caso contrário, criamos a intenção.
        ----------------------------------------------------
        */

        if (
            checkoutState.payment?.status ===
            "confirmed"
        ) {

            checkoutState.step =
                "success";

            renderCheckout();

            return;

        }

        if (
            checkoutState.payment?.status ===
            "pending_review" ||
            checkoutState.invoice.status ===
            "payment_submitted"
        ) {

            checkoutState.step =
                "review";

            renderCheckout();

            return;

        }

        if (
            !data.available
        ) {

            renderCheckout();

            return;

        }

        await createPayment();

        checkoutState.step =
            "ready";

        renderCheckout();

    }

    catch (
        error
    ) {

        checkoutState.step =
            "error";

        renderError(
            getErrorTitle(
                error
            ),
            error?.message ||
            "Não foi possível carregar esta cobrança."
        );

    }

    finally {

        checkoutState.loading =
            false;

    }

}


/*
============================================================
CREATE PAYMENT
============================================================
*/

async function createPayment() {

    const response =
        await request(
            `/checkout/${encodeURIComponent(
                checkoutState.token
            )}/payment-intent`,
            {
                method:
                    "POST",

                body:
                    {
                        customerName:
                            checkoutState.invoice
                                ?.customerName ||
                            null,

                        customerEmail:
                            null
                    }
            }
        );

    const data =
        unwrap(
            response
        );

    if (
        !data?.payment
    ) {

        throw new Error(
            "Não foi possível iniciar o pagamento."
        );

    }

    checkoutState.payment =
        data.payment;

}


/*
============================================================
GET PAYMENT STATUS
============================================================
*/

async function getPaymentStatus() {

    if (
        !checkoutState.payment?.id
    ) {

        return null;

    }

    const response =
        await request(
            `/checkout/${encodeURIComponent(
                checkoutState.token
            )}/payment/${encodeURIComponent(
                checkoutState.payment.id
            )}`
        );

    return unwrap(
        response
    );

}


/*
============================================================
POLLING
============================================================
*/

function startPolling() {

    stopPolling();

    if (
        !checkoutState.payment?.id
    ) {

        return;

    }

    checkoutState.polling =
        true;

    checkoutState.pollAttempts =
        0;

    checkoutState.pollTimer =
        setTimeout(
            pollPayment,
            CHECKOUT_CONFIG.pollingInterval
        );

}


function stopPolling() {

    checkoutState.polling =
        false;

    checkoutState.pollAttempts =
        0;

    if (
        checkoutState.pollTimer
    ) {

        clearTimeout(
            checkoutState.pollTimer
        );

        checkoutState.pollTimer =
            null;

    }

}


async function pollPayment() {

    if (
        !checkoutState.polling
    ) {

        return;

    }

    if (
        checkoutState.pollAttempts >=
        CHECKOUT_CONFIG.maxPollingAttempts
    ) {

        stopPolling();

        return;

    }

    checkoutState.pollAttempts +=
        1;

    try {

        const status =
            await getPaymentStatus();

        if (
            status
        ) {

            checkoutState.payment =
                {
                    ...checkoutState.payment,
                    ...status
                };

            if (
                status.status ===
                "confirmed"
            ) {

                stopPolling();

                renderStatusState(
                    "success",
                    "✓",
                    "Pagamento confirmado",
                    "O comerciante confirmou o pagamento desta cobrança.",
                    status.paidAt
                        ? `Confirmado em ${formatDate(
                            status.paidAt
                        )}.`
                        : ""
                );

                return;

            }

            if (
                status.status ===
                "rejected"
            ) {

                stopPolling();

                renderStatusState(
                    "error",
                    "×",
                    "Comprovativo rejeitado",
                    "O comerciante rejeitou o comprovativo enviado.",
                    "Contacte o comerciante para saber como proceder."
                );

                return;

            }

        }

    }

    catch {
        /*
        ----------------------------------------------------
        Falhas temporárias de polling não interrompem
        o pagamento.
        ----------------------------------------------------
        */
    }

    checkoutState.pollTimer =
        setTimeout(
            pollPayment,
            CHECKOUT_CONFIG.pollingInterval
        );

}


/*
============================================================
ERROR TITLE
============================================================
*/

function getErrorTitle(
    error
) {

    switch (
        error?.code
    ) {

        case "INVOICE_NOT_FOUND":
            return "Cobrança não encontrada.";

        case "INVOICE_EXPIRED":
            return "Cobrança expirada.";

        case "INVOICE_ALREADY_PAID":
            return "Cobrança já paga.";

        case "INVOICE_CANCELLED":
            return "Cobrança cancelada.";

        case "BANK_ACCOUNT_UNAVAILABLE":
            return "Pagamento indisponível.";

        case "PAYMENT_NOT_FOUND":
            return "Pagamento não encontrado.";

        default:
            return "Não foi possível continuar.";

    }

}


/*
============================================================
CLEANUP
============================================================
*/

function cleanup() {

    stopPolling();

}


/*
============================================================
BOOT
============================================================
*/

async function initializePublicCheckout() {

    if (
        !isCheckoutRoute()
    ) {

        return false;

    }

    /*
    --------------------------------------------------------
    Este é um contexto público.
    Não carregar dashboard.
    --------------------------------------------------------
    */

    document.body.classList.add(
        "honey-public-checkout"
    );

    injectStyles();

    checkoutState.token =
        getPublicToken();

    if (
        !checkoutState.token
    ) {

        renderError(
            "Link inválido",
            "O link de pagamento não é válido."
        );

        return true;

    }

    /*
    --------------------------------------------------------
    Impedir o Auth UI de tomar controlo desta página.
    --------------------------------------------------------
    */

    document.body.dataset.honeyPublicCheckout =
        "true";

    await loadCheckout();

    return true;

}


/*
============================================================
PUBLIC API
============================================================
*/

window.HoneyPublicCheckout = {

    init:
        initializePublicCheckout,

    getState() {

        return {
            ...checkoutState
        };

    },

    destroy:
        cleanup

};


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
        initializePublicCheckout,
        {
            once: true
        }
    );

}
else {

    initializePublicCheckout();

}
