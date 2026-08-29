/*
============================================================
HONEY PAY
FRONTEND APPLICATION CONTROLLER
V1.0.0
============================================================

RESPONSABILIDADES
------------------------------------------------------------
- Inicialização da aplicação
- Autenticação por JWT
- Gestão da sessão
- Navegação entre páginas/views
- Carregamento do comerciante
- Comunicação segura com o backend
- Tratamento global de erros
- Logout
- Estado global da aplicação

SEGURANÇA
------------------------------------------------------------
- Nenhuma API secret no frontend
- Nenhuma chave BitPay no frontend
- Nenhuma credencial bancária no frontend
- Todas as operações sensíveis passam pelo backend
- JWT enviado apenas para endpoints protegidos

ARQUITETURA
------------------------------------------------------------

Browser
   ↓
app.js
   ↓
/api/...
   ↓
Backend Render
   ↓
MongoDB / Serviços
   ↓
BitPay apenas no backend
============================================================
*/


"use strict";


/*
============================================================
CONFIGURATION
============================================================
*/

const API_BASE =
    "";


const AUTH_TOKEN_KEY =
    "honey_pay_token";


const USER_CACHE_KEY =
    "honey_pay_user";


const DEFAULT_VIEW =
    "dashboard";


/*
============================================================
APPLICATION STATE
============================================================
*/

const state = {

    initialized:
        false,

    authenticated:
        false,

    token:
        null,

    merchant:
        null,

    currentView:
        DEFAULT_VIEW,

    loading:
        false,

    sidebarOpen:
        false

};


/*
============================================================
DOM HELPERS
============================================================
*/

function $(selector, root = document) {

    return root.querySelector(
        selector
    );

}


function $$(selector, root = document) {

    return Array.from(
        root.querySelectorAll(
            selector
        )
    );

}


/*
============================================================
SAFE JSON
============================================================
*/

async function parseResponse(response) {

    const contentType =
        response.headers.get(
            "content-type"
        ) || "";


    if (
        contentType.includes(
            "application/json"
        )
    ) {

        try {

            return await response.json();

        }

        catch {

            return {};

        }

    }


    const text =
        await response.text();


    return text
        ? {
            message:
                text
        }
        : {};

}


/*
============================================================
ERROR FACTORY
============================================================
*/

function createAppError(

    message,

    code = "APP_ERROR",

    status = 0,

    details = null

) {

    const error =
        new Error(
            message
        );


    error.code =
        code;


    error.status =
        status;


    error.details =
        details;


    return error;

}


/*
============================================================
TOKEN STORAGE
============================================================
*/

function getStoredToken() {

    try {

        return localStorage.getItem(
            AUTH_TOKEN_KEY
        );

    }

    catch {

        return null;

    }

}


function storeToken(token) {

    if (
        !token
    ) {

        return;

    }


    try {

        localStorage.setItem(
            AUTH_TOKEN_KEY,
            token
        );

    }

    catch {

        /*
         -----------------------------------------------------
         Não interromper a aplicação caso o storage esteja
         indisponível.
         -----------------------------------------------------
        */

    }

}


function removeStoredToken() {

    try {

        localStorage.removeItem(
            AUTH_TOKEN_KEY
        );

    }

    catch {

        // Ignore storage errors.

    }

}


function cacheMerchant(merchant) {

    if (
        !merchant
    ) {

        return;

    }


    try {

        localStorage.setItem(

            USER_CACHE_KEY,

            JSON.stringify(
                merchant
            )

        );

    }

    catch {

        // Cache is optional.

    }

}


function getCachedMerchant() {

    try {

        const value =
            localStorage.getItem(
                USER_CACHE_KEY
            );


        if (
            !value
        ) {

            return null;

        }


        return JSON.parse(
            value
        );

    }

    catch {

        return null;

    }

}


function clearMerchantCache() {

    try {

        localStorage.removeItem(
            USER_CACHE_KEY
        );

    }

    catch {

        // Ignore storage errors.

    }

}


/*
============================================================
AUTH HEADER
============================================================
*/

function getAuthHeaders() {

    const headers = {

        "Accept":
            "application/json"

    };


    if (
        state.token
    ) {

        headers.Authorization =
            `Bearer ${state.token}`;

    }


    return headers;

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

    const {

        method =
            "GET",

        body,

        headers =
            {},

        auth =
            true,

        signal

    } =
        options;


    const requestHeaders = {

        ...(auth
            ? getAuthHeaders()
            : {
                "Accept":
                    "application/json"
            }),

        ...headers

    };


    let requestBody =
        body;


    if (
        body !== undefined &&
        body !== null &&
        !(body instanceof FormData) &&
        typeof body !== "string"
    ) {

        requestHeaders[
            "Content-Type"
        ] =
            "application/json";


        requestBody =
            JSON.stringify(
                body
            );

    }


    let response;


    try {

        response =
            await fetch(

                `${API_BASE}${path}`,

                {

                    method,

                    headers:
                        requestHeaders,

                    body:
                        requestBody,

                    signal,

                    credentials:
                        "same-origin"

                }

            );

    }

    catch (
        error
    ) {

        if (
            error?.name ===
            "AbortError"
        ) {

            throw error;

        }


        throw createAppError(

            "Não foi possível contactar o servidor.",

            "NETWORK_ERROR",

            0,

            error

        );

    }


    const data =
        await parseResponse(
            response
        );


    if (
        response.status ===
        401
    ) {

        handleUnauthorized();


        throw createAppError(

            data?.message ||
            "Sessão expirada.",

            data?.code ||
            "UNAUTHORIZED",

            401,

            data

        );

    }


    if (
        !response.ok
    ) {

        throw createAppError(

            data?.message ||
            data?.error ||
            "O servidor recusou o pedido.",

            data?.code ||
            "API_ERROR",

            response.status,

            data

        );

    }


    return data;

}


/*
============================================================
UNAUTHORIZED
============================================================
*/

function handleUnauthorized() {

    state.authenticated =
        false;

    state.token =
        null;

    state.merchant =
        null;


    removeStoredToken();

    clearMerchantCache();


    /*
     ---------------------------------------------------------
     Não redireccionar repetidamente se já estivermos na
     página de autenticação.
     ---------------------------------------------------------
    */

    if (
        document.body.dataset.page !==
        "auth"
    ) {

        window.location.href =
            "/login.html";

    }

}


/*
============================================================
AUTHENTICATION
============================================================
*/

async function restoreSession() {

    const token =
        getStoredToken();


    if (
        !token
    ) {

        return false;

    }


    state.token =
        token;


    const cached =
        getCachedMerchant();


    if (
        cached
    ) {

        state.merchant =
            cached;

    }


    try {

        const response =
            await apiRequest(

                "/api/auth/me",

                {

                    method:
                        "GET",

                    auth:
                        true

                }

            );


        const merchant =
            response?.merchant ||
            response?.user ||
            response?.data ||
            response;


        if (
            !merchant
        ) {

            throw createAppError(

                "Sessão inválida.",

                "INVALID_SESSION",

                401

            );

        }


        state.authenticated =
            true;


        state.merchant =
            merchant;


        cacheMerchant(
            merchant
        );


        return true;

    }

    catch (
        error
    ) {

        if (
            error?.status ===
            401
        ) {

            handleUnauthorized();

        }


        return false;

    }

}


/*
============================================================
LOGIN
============================================================
*/

async function login(

    email,

    password

) {

    if (
        typeof email !==
        "string" ||
        !email.trim()
    ) {

        throw createAppError(

            "Introduza o seu email.",

            "EMAIL_REQUIRED",

            400

        );

    }


    if (
        typeof password !==
        "string" ||
        !password
    ) {

        throw createAppError(

            "Introduza a sua palavra-passe.",

            "PASSWORD_REQUIRED",

            400

        );

    }


    const response =
        await apiRequest(

            "/api/auth/login",

            {

                method:
                    "POST",

                auth:
                    false,

                body: {

                    email:
                        email
                            .trim()
                            .toLowerCase(),

                    password

                }

            }

        );


    const token =
        response?.token ||
        response?.accessToken ||
        response?.data?.token;


    if (
        !token
    ) {

        throw createAppError(

            "O servidor não devolveu uma sessão válida.",

            "TOKEN_MISSING",

            500,

            response

        );

    }


    state.token =
        token;


    storeToken(
        token
    );


    const merchant =
        response?.merchant ||
        response?.user ||
        response?.data?.merchant ||
        null;


    if (
        merchant
    ) {

        state.merchant =
            merchant;

        cacheMerchant(
            merchant
        );

    }

    else {

        await restoreSession();

    }


    state.authenticated =
        true;


    return {

        token,

        merchant:
            state.merchant

    };

}


/*
============================================================
LOGOUT
============================================================
*/

async function logout() {

    try {

        if (
            state.token
        ) {

            await apiRequest(

                "/api/auth/logout",

                {

                    method:
                        "POST",

                    auth:
                        true

                }

            );

        }

    }

    catch {

        /*
         -----------------------------------------------------
         Mesmo que o backend esteja indisponível, o frontend
         deve limpar a sessão local.
         -----------------------------------------------------
        */

    }


    state.token =
        null;

    state.merchant =
        null;

    state.authenticated =
        false;


    removeStoredToken();

    clearMerchantCache();


    window.location.href =
        "/login.html";

}


/*
============================================================
REGISTER
============================================================
*/

async function register(

    payload

) {

    if (
        !payload ||
        typeof payload !==
        "object"
    ) {

        throw createAppError(

            "Dados de registo inválidos.",

            "INVALID_REGISTER_DATA",

            400

        );

    }


    const response =
        await apiRequest(

            "/api/auth/register",

            {

                method:
                    "POST",

                auth:
                    false,

                body:
                    payload

            }

        );


    const token =
        response?.token ||
        response?.accessToken ||
        response?.data?.token;


    if (
        token
    ) {

        state.token =
            token;

        storeToken(
            token
        );


        const merchant =
            response?.merchant ||
            response?.user ||
            response?.data?.merchant ||
            null;


        if (
            merchant
        ) {

            state.merchant =
                merchant;

            state.authenticated =
                true;

            cacheMerchant(
                merchant
            );

        }

    }


    return response;

}


/*
============================================================
MERCHANT
============================================================
*/

async function loadMerchant() {

    const response =
        await apiRequest(

            "/api/auth/me",

            {

                method:
                    "GET",

                auth:
                    true

            }

        );


    const merchant =
        response?.merchant ||
        response?.user ||
        response?.data ||
        response;


    if (
        !merchant
    ) {

        throw createAppError(

            "Não foi possível carregar os dados do comerciante.",

            "MERCHANT_NOT_FOUND",

            404

        );

    }


    state.merchant =
        merchant;


    state.authenticated =
        true;


    cacheMerchant(
        merchant
    );


    renderMerchant();

    return merchant;

}


/*
============================================================
MERCHANT UI
============================================================
*/

function getMerchantName() {

    if (
        !state.merchant
    ) {

        return "Comerciante";

    }


    return (

        state.merchant.businessName ||

        state.merchant.storeName ||

        state.merchant.name ||

        state.merchant.fullName ||

        state.merchant.email ||

        "Comerciante"

    );

}


function getMerchantEmail() {

    return (

        state.merchant?.email ||

        ""

    );

}


function getInitials(

    value

) {

    const text =
        String(
            value ||
            ""
        )
            .trim();


    if (
        !text
    ) {

        return "HP";

    }


    const words =
        text
            .split(/\s+/)
            .filter(Boolean);


    if (
        words.length ===
        1
    ) {

        return words[0]
            .slice(0, 2)
            .toUpperCase();

    }


    return (

        words[0][0] +
        words[1][0]

    )
        .toUpperCase();

}


function renderMerchant() {

    const name =
        getMerchantName();


    const email =
        getMerchantEmail();


    const initials =
        getInitials(
            name
        );


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
                    initials;

            }
        );

}


/*
============================================================
NAVIGATION
============================================================
*/

function normalizeView(

    view

) {

    return String(
        view ||
        DEFAULT_VIEW
    )
        .trim()
        .toLowerCase()
        .replace(
            /[^a-z0-9_-]/g,
            ""
        );

}


function navigate(

    view,

    options = {}

) {

    const normalized =
        normalizeView(
            view
        );


    state.currentView =
        normalized;


    const views =
        $$(
            "[data-view]"
        );


    let found =
        false;


    views.forEach(
        element => {

            const active =
                element.dataset.view ===
                normalized;


            element.hidden =
                !active;


            element.classList.toggle(

                "active-view",

                active

            );


            if (
                active
            ) {

                found =
                    true;

            }

        }
    );


    $$(
        "[data-nav]"
    )
        .forEach(
            element => {

                const active =
                    element.dataset.nav ===
                    normalized;


                element.classList.toggle(

                    "active",

                    active

                );


                element.setAttribute(

                    "aria-current",

                    active
                        ? "page"
                        : "false"

                );

            }
        );


    if (
        !found &&
        !options.silent
    ) {

        /*
         -----------------------------------------------------
         Se o HTML ainda não possuir a view, não quebramos
         a aplicação. Mantemos o estado para o próximo módulo.
         -----------------------------------------------------
        */

    }


    if (
        options.updateUrl !==
        false
    ) {

        const url =
            new URL(
                window.location.href
            );


        url.searchParams.set(
            "view",
            normalized
        );


        window.history.pushState(

            {
                view:
                    normalized

            },

            "",

            url

        );

    }


    closeSidebar();


    window.scrollTo({

        top:
            0,

        behavior:
            "smooth"

    });


    document.dispatchEvent(

        new CustomEvent(

            "honeypay:navigation",

            {

                detail: {

                    view:
                        normalized

                }

            }

        )

    );

}


/*
============================================================
INITIAL VIEW
============================================================
*/

function getInitialView() {

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


/*
============================================================
SIDEBAR
============================================================
*/

function openSidebar() {

    state.sidebarOpen =
        true;


    const sidebar =
        $(
            ".sidebar"
        );


    if (
        sidebar
    ) {

        sidebar.classList.add(
            "open"
        );

    }

}


function closeSidebar() {

    state.sidebarOpen =
        false;


    const sidebar =
        $(
            ".sidebar"
        );


    if (
        sidebar
    ) {

        sidebar.classList.remove(
            "open"
        );

    }

}


function toggleSidebar() {

    if (
        state.sidebarOpen
    ) {

        closeSidebar();

    }

    else {

        openSidebar();

    }

}


/*
============================================================
TOAST
============================================================
*/

function showToast(

    message,

    type = "info",

    title = ""

) {

    const container =
        $(
            ".toast-container"
        );


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
        `toast ${type}`;


    const icon =
        type === "success"
            ? "✓"
            : type === "error"
                ? "!"
                : type === "warning"
                    ? "!"
                    : "i";


    const safeTitle =
        title ||
        (
            type === "success"
                ? "Concluído"
                : type === "error"
                    ? "Erro"
                    : type === "warning"
                        ? "Atenção"
                        : "Informação"
        );


    toast.innerHTML = `

        <div class="toast-icon">
            ${icon}
        </div>

        <div class="toast-content">

            <strong></strong>

            <span></span>

        </div>

    `;


    const strong =
        toast.querySelector(
            "strong"
        );


    const span =
        toast.querySelector(
            "span"
        );


    strong.textContent =
        safeTitle;


    span.textContent =
        String(
            message ||
            ""
        );


    container.appendChild(
        toast
    );


    window.setTimeout(
        () => {

            toast.remove();

        },

        4500

    );

}


/*
============================================================
GLOBAL ERROR HANDLING
============================================================
*/

function handleError(

    error,

    options = {}

) {

    console.error(
        "[Honey Pay]",
        error
    );


    if (
        error?.name ===
        "AbortError"
    ) {

        return;

    }


    const message =
        error?.message ||
        "Ocorreu um erro inesperado.";


    if (
        options.toast !==
        false
    ) {

        showToast(

            message,

            "error"

        );

    }


    document.dispatchEvent(

        new CustomEvent(

            "honeypay:error",

            {

                detail: {
                    error
                }

            }

        )

    );

}


/*
============================================================
GLOBAL LOADING
============================================================
*/

function setLoading(

    loading

) {

    state.loading =
        Boolean(
            loading
        );


    const element =
        $(
            ".global-loading"
        );


    if (
        element
    ) {

        element.hidden =
            !state.loading;

    }


    document.body.classList.toggle(

        "is-loading",

        state.loading

    );

}


/*
============================================================
AUTH PAGE HANDLING
============================================================
*/

function isAuthPage() {

    return (
        document.body.dataset.page ===
        "auth"
    );

}


function bindAuthForms() {

    const loginForm =
        $(
            "#login-form"
        );


    if (
        loginForm
    ) {

        loginForm.addEventListener(

            "submit",

            async event => {

                event.preventDefault();


                const email =
                    loginForm
                        .querySelector(
                            '[name="email"]'
                        )
                        ?.value ||
                    "";


                const password =
                    loginForm
                        .querySelector(
                            '[name="password"]'
                        )
                        ?.value ||
                    "";


                const submitButton =
                    loginForm.querySelector(
                        'button[type="submit"]'
                    );


                try {

                    if (
                        submitButton
                    ) {

                        submitButton.disabled =
                            true;

                    }


                    setLoading(
                        true
                    );


                    await login(

                        email,

                        password

                    );


                    showToast(

                        "Sessão iniciada com sucesso.",

                        "success"

                    );


                    const destination =
                        loginForm.dataset.redirect ||
                        "/";


                    window.location.href =
                        destination;

                }

                catch (
                    error
                ) {

                    handleError(
                        error
                    );

                }

                finally {

                    setLoading(
                        false
                    );


                    if (
                        submitButton
                    ) {

                        submitButton.disabled =
                            false;

                    }

                }

            }

        );

    }


    const registerForm =
        $(
            "#register-form"
        );


    if (
        registerForm
    ) {

        registerForm.addEventListener(

            "submit",

            async event => {

                event.preventDefault();


                const formData =
                    new FormData(
                        registerForm
                    );


                const payload =
                    Object.fromEntries(
                        formData.entries()
                    );


                const submitButton =
                    registerForm.querySelector(
                        'button[type="submit"]'
                    );


                try {

                    if (
                        submitButton
                    ) {

                        submitButton.disabled =
                            true;

                    }


                    setLoading(
                        true
                    );


                    const response =
                        await register(
                            payload
                        );


                    showToast(

                        response?.message ||
                        "Conta criada com sucesso.",

                        "success"

                    );


                    if (
                        state.authenticated
                    ) {

                        window.location.href =
                            "/";

                    }

                    else {

                        window.location.href =
                            "/login.html";

                    }

                }

                catch (
                    error
                ) {

                    handleError(
                        error
                    );

                }

                finally {

                    setLoading(
                        false
                    );


                    if (
                        submitButton
                    ) {

                        submitButton.disabled =
                            false;

                    }

                }

            }

        );

    }

}


/*
============================================================
NAVIGATION EVENTS
============================================================
*/

function bindNavigation() {

    $$(
        "[data-nav]"
    )
        .forEach(
            element => {

                element.addEventListener(

                    "click",

                    event => {

                        event.preventDefault();


                        navigate(

                            element.dataset.nav

                        );

                    }

                );

            }
        );


    $$(
        "[data-route]"
    )
        .forEach(
            element => {

                element.addEventListener(

                    "click",

                    event => {

                        const route =
                            element.dataset.route;


                        if (
                            route
                        ) {

                            event.preventDefault();

                            navigate(
                                route
                            );

                        }

                    }

                );

            }
        );


    const menuButton =
        $(
            ".mobile-menu-button"
        );


    if (
        menuButton
    ) {

        menuButton.addEventListener(

            "click",

            toggleSidebar

        );

    }


    document.addEventListener(

        "click",

        event => {

            const sidebar =
                $(
                    ".sidebar"
                );


            if (
                !state.sidebarOpen ||
                !sidebar
            ) {

                return;

            }


            if (
                sidebar.contains(
                    event.target
                ) ||
                event.target.closest(
                    ".mobile-menu-button"
                )
            ) {

                return;

            }


            closeSidebar();

        }

    );


    window.addEventListener(

        "popstate",

        event => {

            navigate(

                event.state?.view ||
                getInitialView(),

                {

                    updateUrl:
                        false,

                    silent:
                        true

                }

            );

        }

    );

}


/*
============================================================
LOGOUT EVENTS
============================================================
*/

function bindLogout() {

    $$(
        "[data-action='logout']"
    )
        .forEach(
            element => {

                element.addEventListener(

                    "click",

                    async event => {

                        event.preventDefault();


                        await logout();

                    }

                );

            }

        );

}


/*
============================================================
KEYBOARD SHORTCUTS
============================================================
*/

function bindKeyboardShortcuts() {

    document.addEventListener(

        "keydown",

        event => {

            if (
                event.key !==
                "Escape"
            ) {

                return;

            }


            if (
                state.sidebarOpen
            ) {

                closeSidebar();

            }


            const modal =
                $(
                    ".modal-root:not([hidden])"
                );


            if (
                modal
            ) {

                modal.hidden =
                    true;

            }

        }

    );

}


/*
============================================================
APPLICATION READY EVENT
============================================================
*/

function dispatchReady() {

    document.dispatchEvent(

        new CustomEvent(

            "honeypay:ready",

            {

                detail: {

                    authenticated:
                        state.authenticated,

                    merchant:
                        state.merchant,

                    view:
                        state.currentView

                }

            }

        )

    );

}


/*
============================================================
APPLICATION INITIALIZATION
============================================================
*/

async function initializeApp() {

    if (
        state.initialized
    ) {

        return;

    }


    state.initialized =
        true;


    bindNavigation();

    bindLogout();

    bindKeyboardShortcuts();

    bindAuthForms();


    /*
     ---------------------------------------------------------
     Página pública de autenticação
     ---------------------------------------------------------
    */

    if (
        isAuthPage()
    ) {

        const restored =
            await restoreSession();


        if (
            restored
        ) {

            window.location.href =
                "/";

            return;

        }


        dispatchReady();

        return;

    }


    /*
     ---------------------------------------------------------
     Área protegida
     ---------------------------------------------------------
    */

    setLoading(
        true
    );


    try {

        const authenticated =
            await restoreSession();


        if (
            !authenticated
        ) {

            window.location.href =
                "/login.html";

            return;

        }


        renderMerchant();


        navigate(

            getInitialView(),

            {

                updateUrl:
                    false,

                silent:
                    true

            }

        );


        dispatchReady();

    }

    catch (
        error
    ) {

        handleError(
            error
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
PUBLIC API
============================================================

Os restantes módulos da Honey Pay podem utilizar estas
funções sem precisar de duplicar a lógica de autenticação.

Exemplo:

window.HoneyPay.apiRequest(...)
window.HoneyPay.navigate(...)
window.HoneyPay.getMerchant()
============================================================
*/

window.HoneyPay = {

    state,

    $, 

    $$,

    apiRequest,

    login,

    register,

    logout,

    loadMerchant,

    navigate,

    showToast,

    handleError,

    setLoading,

    getMerchantName,

    getMerchantEmail,

    getInitials

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

        initializeApp,

        {

            once:
                true

        }

    );

}

else {

    initializeApp();

}
