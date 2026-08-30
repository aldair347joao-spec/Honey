/*
============================================================
HONEY PAY
AUTHENTICATION UI
V1.0.0
PRODUCTION AUTHENTICATION GATE
============================================================

RESPONSABILIDADES
------------------------------------------------------------
- Login
- Registo
- Logout
- JWT
- Proteção da consola
- Recuperação de sessão
- Estados de loading
- Erros de autenticação
- Validação client-side
- Não expõe dados financeiros
============================================================
*/

"use strict";

const AUTH_TOKEN_KEY = "honey_pay_token";

const LEGACY_TOKEN_KEYS = [
    "honey_token",
    "token",
    "accessToken",
    "access_token"
];

const AUTH_API = "/api";

const state = {
    mode: "login",
    loading: false,
    initialized: false
};


/*
============================================================
UTILITIES
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


function getStoredToken() {

    const current =
        localStorage.getItem(
            AUTH_TOKEN_KEY
        );

    if (current) {

        return current;

    }

    for (
        const key of LEGACY_TOKEN_KEYS
    ) {

        const legacy =
            localStorage.getItem(
                key
            );

        if (legacy) {

            localStorage.setItem(
                AUTH_TOKEN_KEY,
                legacy
            );

            return legacy;

        }

    }

    return null;

}


function storeToken(token) {

    if (
        typeof token !== "string" ||
        !token.trim()
    ) {

        return false;

    }

    const normalized =
        token.trim();

    localStorage.setItem(
        AUTH_TOKEN_KEY,
        normalized
    );

    for (
        const key of LEGACY_TOKEN_KEYS
    ) {

        localStorage.removeItem(
            key
        );

    }

    return true;

}


function clearStoredToken() {

    localStorage.removeItem(
        AUTH_TOKEN_KEY
    );

    for (
        const key of LEGACY_TOKEN_KEYS
    ) {

        localStorage.removeItem(
            key
        );

    }

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


function extractMessage(
    payload,
    fallback
) {

    return (
        payload?.message ||
        payload?.error?.message ||
        payload?.data?.message ||
        fallback
    );

}


/*
============================================================
API
============================================================
*/

async function authRequest(
    path,
    options = {}
) {

    const headers = {
        Accept:
            "application/json",

        "Content-Type":
            "application/json"
    };

    const token =
        getStoredToken();

    if (token) {

        headers.Authorization =
            `Bearer ${token}`;

    }

    const response =
        await fetch(
            `${AUTH_API}${path}`,
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

    let payload = null;

    try {

        payload =
            await response.json();

    }

    catch {

        payload = null;

    }

    if (!response.ok) {

        const error =
            new Error(
                extractMessage(
                    payload,
                    "Não foi possível concluir a operação."
                )
            );

        error.status =
            response.status;

        error.code =
            payload?.code ||
            payload?.error?.code ||
            null;

        error.details =
            payload?.details ||
            payload?.error?.details ||
            null;

        throw error;

    }

    return payload;

}


/*
============================================================
AUTHENTICATION CHECK
============================================================
*/

async function validateExistingSession() {

    const token =
        getStoredToken();

    if (!token) {

        return false;

    }

    try {

        const response =
            await authRequest(
                "/auth/me"
            );

        const data =
            extractData(
                response
            );

        if (
            !data
        ) {

            throw new Error(
                "Sessão inválida."
            );

        }

        return true;

    }

    catch {

        clearStoredToken();

        return false;

    }

}


/*
============================================================
STYLES
============================================================
*/

function injectStyles() {

    if (
        document.getElementById(
            "honey-auth-styles"
        )
    ) {

        return;

    }

    const style =
        document.createElement(
            "style"
        );

    style.id =
        "honey-auth-styles";

    style.textContent = `
        #honey-auth-gate {
            position: fixed;
            inset: 0;
            z-index: 999999;
            display: none;
            align-items: center;
            justify-content: center;
            padding: 24px;
            background:
                radial-gradient(
                    circle at top right,
                    rgba(245, 190, 52, .10),
                    transparent 32%
                ),
                #080a0f;
            color: #f5f7fb;
            overflow-y: auto;
        }

        #honey-auth-gate.is-visible {
            display: flex;
        }

        .honey-auth-shell {
            width: min(100%, 460px);
        }

        .honey-auth-brand {
            text-align: center;
            margin-bottom: 28px;
        }

        .honey-auth-mark {
            width: 52px;
            height: 52px;
            margin: 0 auto 14px;
            display: grid;
            place-items: center;
            border-radius: 16px;
            background: #f5be34;
            color: #111318;
            font-size: 22px;
            font-weight: 900;
            box-shadow:
                0 12px 35px rgba(245, 190, 52, .18);
        }

        .honey-auth-brand strong {
            display: block;
            font-size: 25px;
            letter-spacing: -.04em;
        }

        .honey-auth-brand span {
            display: block;
            margin-top: 6px;
            color: #8f98aa;
            font-size: 13px;
        }

        .honey-auth-card {
            border: 1px solid #252a35;
            border-radius: 24px;
            padding: 30px;
            background: #10131a;
            box-shadow:
                0 30px 80px rgba(0,0,0,.35);
        }

        .honey-auth-heading {
            margin-bottom: 24px;
        }

        .honey-auth-heading h1 {
            margin: 0;
            font-size: 25px;
            letter-spacing: -.035em;
        }

        .honey-auth-heading p {
            margin: 8px 0 0;
            color: #8f98aa;
            line-height: 1.6;
            font-size: 14px;
        }

        .honey-auth-form {
            display: grid;
            gap: 16px;
        }

        .honey-auth-field {
            display: grid;
            gap: 7px;
        }

        .honey-auth-field label {
            font-size: 13px;
            font-weight: 700;
            color: #cdd3df;
        }

        .honey-auth-field input {
            width: 100%;
            box-sizing: border-box;
            min-height: 50px;
            padding: 0 15px;
            border: 1px solid #2a303c;
            border-radius: 12px;
            outline: none;
            background: #0b0e14;
            color: #f5f7fb;
            font: inherit;
            transition:
                border-color .18s ease,
                box-shadow .18s ease;
        }

        .honey-auth-field input:focus {
            border-color: #f5be34;
            box-shadow:
                0 0 0 3px rgba(245,190,52,.10);
        }

        .honey-auth-submit {
            min-height: 52px;
            border: 0;
            border-radius: 12px;
            background: #f5be34;
            color: #111318;
            font: inherit;
            font-weight: 850;
            cursor: pointer;
            transition:
                transform .18s ease,
                opacity .18s ease;
        }

        .honey-auth-submit:hover {
            transform: translateY(-1px);
        }

        .honey-auth-submit:disabled {
            opacity: .55;
            cursor: wait;
            transform: none;
        }

        .honey-auth-error {
            display: none;
            padding: 12px 14px;
            border: 1px solid rgba(239,93,93,.25);
            border-radius: 11px;
            background: rgba(239,93,93,.08);
            color: #ff9b9b;
            font-size: 13px;
            line-height: 1.5;
        }

        .honey-auth-error.is-visible {
            display: block;
        }

        .honey-auth-switch {
            margin-top: 22px;
            text-align: center;
            color: #8f98aa;
            font-size: 13px;
        }

        .honey-auth-switch button {
            border: 0;
            padding: 0;
            background: transparent;
            color: #f5be34;
            font: inherit;
            font-weight: 750;
            cursor: pointer;
        }

        .honey-auth-security {
            margin-top: 18px;
            text-align: center;
            color: #687184;
            font-size: 11px;
            line-height: 1.6;
        }

        @media (max-width: 520px) {

            #honey-auth-gate {
                padding: 16px;
            }

            .honey-auth-card {
                padding: 22px;
                border-radius: 20px;
            }

        }
    `;

    document.head.appendChild(
        style
    );

}


/*
============================================================
AUTH HTML
============================================================
*/

function createAuthGate() {

    if (
        document.getElementById(
            "honey-auth-gate"
        )
    ) {

        return document.getElementById(
            "honey-auth-gate"
        );

    }

    const gate =
        document.createElement(
            "div"
        );

    gate.id =
        "honey-auth-gate";

    gate.setAttribute(
        "aria-hidden",
        "true"
    );

    gate.innerHTML = `
        <div class="honey-auth-shell">

            <div class="honey-auth-brand">

                <div class="honey-auth-mark">
                    H
                </div>

                <strong>
                    Honey Pay
                </strong>

                <span>
                    Plataforma profissional de cobranças
                </span>

            </div>

            <section
                class="honey-auth-card"
                aria-labelledby="honey-auth-title"
            >

                <div class="honey-auth-heading">

                    <h1 id="honey-auth-title">
                        Entrar na sua conta
                    </h1>

                    <p id="honey-auth-description">
                        Aceda ao seu espaço de gestão.
                    </p>

                </div>

                <div
                    id="honey-auth-error"
                    class="honey-auth-error"
                    role="alert"
                    aria-live="polite"
                ></div>

                <form
                    id="honey-auth-form"
                    class="honey-auth-form"
                    novalidate
                >

                    <div
                        id="honey-auth-name-field"
                        class="honey-auth-field"
                        hidden
                    >

                        <label for="honey-auth-name">
                            Nome / Empresa
                        </label>

                        <input
                            id="honey-auth-name"
                            name="name"
                            type="text"
                            autocomplete="organization"
                            maxlength="160"
                        >

                    </div>

                    <div class="honey-auth-field">

                        <label for="honey-auth-email">
                            Email
                        </label>

                        <input
                            id="honey-auth-email"
                            name="email"
                            type="email"
                            autocomplete="email"
                            inputmode="email"
                            maxlength="180"
                            required
                        >

                    </div>

                    <div class="honey-auth-field">

                        <label for="honey-auth-password">
                            Palavra-passe
                        </label>

                        <input
                            id="honey-auth-password"
                            name="password"
                            type="password"
                            autocomplete="current-password"
                            minlength="8"
                            maxlength="128"
                            required
                        >

                    </div>

                    <div
                        id="honey-auth-confirm-field"
                        class="honey-auth-field"
                        hidden
                    >

                        <label for="honey-auth-confirm">
                            Confirmar palavra-passe
                        </label>

                        <input
                            id="honey-auth-confirm"
                            name="confirmPassword"
                            type="password"
                            autocomplete="new-password"
                            minlength="8"
                            maxlength="128"
                        >

                    </div>

                    <button
                        id="honey-auth-submit"
                        class="honey-auth-submit"
                        type="submit"
                    >
                        Entrar
                    </button>

                </form>

                <div class="honey-auth-switch">

                    <span id="honey-auth-switch-text">
                        Ainda não tem uma conta?
                    </span>

                    <button
                        id="honey-auth-switch-button"
                        type="button"
                    >
                        Criar conta
                    </button>

                </div>

                <div class="honey-auth-security">
                    A sua sessão é protegida por autenticação
                    segura do Honey Pay.
                </div>

            </section>

        </div>
    `;

    document.body.appendChild(
        gate
    );

    return gate;

}


/*
============================================================
UI STATE
============================================================
*/

function showGate() {

    const gate =
        document.getElementById(
            "honey-auth-gate"
        );

    if (!gate) {

        return;

    }

    gate.classList.add(
        "is-visible"
    );

    gate.setAttribute(
        "aria-hidden",
        "false"
    );

    document.body.classList.add(
        "honey-auth-active"
    );

}


function hideGate() {

    const gate =
        document.getElementById(
            "honey-auth-gate"
        );

    if (!gate) {

        return;

    }

    gate.classList.remove(
        "is-visible"
    );

    gate.setAttribute(
        "aria-hidden",
        "true"
    );

    document.body.classList.remove(
        "honey-auth-active"
    );

}


function setError(
    message
) {

    const element =
        document.getElementById(
            "honey-auth-error"
        );

    if (!element) {

        return;

    }

    element.textContent =
        message || "";

    element.classList.toggle(
        "is-visible",
        Boolean(
            message
        )
    );

}


function setLoading(
    loading
) {

    state.loading =
        Boolean(
            loading
        );

    const button =
        document.getElementById(
            "honey-auth-submit"
        );

    if (!button) {

        return;

    }

    button.disabled =
        state.loading;

    button.textContent =
        state.loading
            ? "A processar..."
            : state.mode === "login"
                ? "Entrar"
                : "Criar conta";

}


function renderMode() {

    const login =
        state.mode === "login";

    const title =
        document.getElementById(
            "honey-auth-title"
        );

    const description =
        document.getElementById(
            "honey-auth-description"
        );

    const nameField =
        document.getElementById(
            "honey-auth-name-field"
        );

    const confirmField =
        document.getElementById(
            "honey-auth-confirm-field"
        );

    const password =
        document.getElementById(
            "honey-auth-password"
        );

    const switchText =
        document.getElementById(
            "honey-auth-switch-text"
        );

    const switchButton =
        document.getElementById(
            "honey-auth-switch-button"
        );

    if (title) {

        title.textContent =
            login
                ? "Entrar na sua conta"
                : "Criar conta Honey Pay";

    }

    if (description) {

        description.textContent =
            login
                ? "Aceda ao seu espaço de gestão."
                : "Comece a receber pagamentos através do Honey Pay.";

    }

    if (nameField) {

        nameField.hidden =
            login;

    }

    if (confirmField) {

        confirmField.hidden =
            login;

    }

    if (password) {

        password.autocomplete =
            login
                ? "current-password"
                : "new-password";

    }

    if (switchText) {

        switchText.textContent =
            login
                ? "Ainda não tem uma conta?"
                : "Já tem uma conta?";

    }

    if (switchButton) {

        switchButton.textContent =
            login
                ? "Criar conta"
                : "Entrar";

    }

    setLoading(
        false
    );

}


/*
============================================================
VALIDATION
============================================================
*/

function validateForm(
    form
) {

    const data =
        new FormData(
            form
        );

    const email =
        String(
            data.get("email") ||
            ""
        )
            .trim()
            .toLowerCase();

    const password =
        String(
            data.get("password") ||
            ""
        );

    if (
        !email ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
            email
        )
    ) {

        throw new Error(
            "Introduza um email válido."
        );

    }

    if (
        password.length < 8
    ) {

        throw new Error(
            "A palavra-passe deve ter pelo menos 8 caracteres."
        );

    }

    if (
        password.length > 128
    ) {

        throw new Error(
            "A palavra-passe é demasiado longa."
        );

    }

    if (
        state.mode === "register"
    ) {

        const name =
            String(
                data.get("name") ||
                ""
            )
                .trim();

        const confirm =
            String(
                data.get("confirmPassword") ||
                ""
            );

        if (
            name.length < 2
        ) {

            throw new Error(
                "Introduza o nome ou nome da empresa."
            );

        }

        if (
            name.length > 160
        ) {

            throw new Error(
                "O nome indicado é demasiado longo."
            );

        }

        if (
            password !== confirm
        ) {

            throw new Error(
                "As palavras-passe não coincidem."
            );

        }

    }

    return {
        email,
        password,

        name:
            String(
                data.get("name") ||
                ""
            )
                .trim()
    };

}


/*
============================================================
LOGIN
============================================================
*/

async function login(
    payload
) {

    const response =
        await authRequest(
            "/auth/login",
            {
                method:
                    "POST",

                body:
                    {
                        email:
                            payload.email,

                        password:
                            payload.password
                    }
            }
        );

    const data =
        extractData(
            response
        );

    const token =
        data?.token ||
        data?.accessToken ||
        data?.access_token;

    if (
        !token
    ) {

        throw new Error(
            "O servidor não devolveu uma sessão válida."
        );

    }

    storeToken(
        token
    );

    return data;

}


/*
============================================================
REGISTER
============================================================
*/

async function register(
    payload
) {

    const response =
        await authRequest(
            "/auth/register",
            {
                method:
                    "POST",

                body:
                    {
                        name:
                            payload.name,

                        businessName:
                            payload.name,

                        email:
                            payload.email,

                        password:
                            payload.password
                    }
            }
        );

    const data =
        extractData(
            response
        );

    /*
    --------------------------------------------------------
    Alguns backends devolvem token imediatamente.
    Se não devolverem, fazemos login automaticamente.
    --------------------------------------------------------
    */

    const token =
        data?.token ||
        data?.accessToken ||
        data?.access_token;

    if (token) {

        storeToken(
            token
        );

        return data;

    }

    return await login(
        payload
    );

}


/*
============================================================
FORM SUBMISSION
============================================================
*/

async function handleSubmit(
    event
) {

    event.preventDefault();

    if (
        state.loading
    ) {

        return;

    }

    const form =
        event.currentTarget;

    setError(
        ""
    );

    let payload;

    try {

        payload =
            validateForm(
                form
            );

    }

    catch (error) {

        setError(
            error.message
        );

        return;

    }

    setLoading(
        true
    );

    try {

        if (
            state.mode ===
            "login"
        ) {

            await login(
                payload
            );

        } else {

            await register(
                payload
            );

        }

        hideGate();

        /*
        ----------------------------------------------------
        O app.js existente já possui o bootstrap de sessão.
        Forçamos reload para que ele leia o novo JWT e
        carregue todos os dados reais do comerciante.
        ----------------------------------------------------
        */

        window.location.reload();

    }

    catch (error) {

        setError(
            error?.message ||
            "Não foi possível concluir a autenticação."
        );

    }

    finally {

        setLoading(
            false
        );

    }

}


/*
============================================================
SWITCH MODE
============================================================
*/

function switchMode() {

    if (
        state.loading
    ) {

        return;

    }

    state.mode =
        state.mode === "login"
            ? "register"
            : "login";

    setError(
        ""
    );

    const form =
        document.getElementById(
            "honey-auth-form"
        );

    if (form) {

        form.reset();

    }

    renderMode();

}


/*
============================================================
BOOT
============================================================
*/

async function initializeAuthUI() {

    if (
        state.initialized
    ) {

        return;

    }

    state.initialized =
        true;

    injectStyles();

    const gate =
        createAuthGate();

    renderMode();

    const form =
        document.getElementById(
            "honey-auth-form"
        );

    const switchButton =
        document.getElementById(
            "honey-auth-switch-button"
        );

    form?.addEventListener(
        "submit",
        handleSubmit
    );

    switchButton?.addEventListener(
        "click",
        switchMode
    );

    /*
    --------------------------------------------------------
    Se não existe sessão, bloquear imediatamente a consola.
    --------------------------------------------------------
    */

    const token =
        getStoredToken();

    if (!token) {

        showGate();

        return;

    }

    /*
    --------------------------------------------------------
    Existe token. Validar antes de liberar a consola.
    --------------------------------------------------------
    */

    const valid =
        await validateExistingSession();

    if (!valid) {

        showGate();

        return;

    }

    hideGate();

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
        initializeAuthUI,
        {
            once: true
        }
    );

} else {

    initializeAuthUI();

}


/*
============================================================
GLOBAL API
============================================================
*/

window.HoneyPayAuth = {

    login,

    register,

    logout() {

        clearStoredToken();

        window.location.reload();

    },

    getToken() {

        return getStoredToken();

    }

};
