/*
============================================================
HONEY PAY
AUTHENTICATION UI
V2.0.0
GOOGLE ONLY
============================================================

RESPONSABILIDADES
------------------------------------------------------------
- Login exclusivamente com Google
- Recuperação de sessão JWT
- Proteção da aplicação
- Logout
- Estados de loading
- Tratamento de erros
- Compatibilidade com app.js
- Compatibilidade com honey_pay_token
- Não utiliza email/password
- Não possui registo manual

FLUXO
------------------------------------------------------------

Utilizador
    ↓
Continuar com Google
    ↓
/api/auth/google
    ↓
Google OAuth
    ↓
/api/auth/google/callback
    ↓
JWT
    ↓
Honey Pay
    ↓
Dashboard

============================================================
*/

"use strict";


/*
============================================================
CONFIGURATION
============================================================
*/

const AUTH_TOKEN_KEY =
    "honey_pay_token";


const LEGACY_TOKEN_KEYS = [

    "honey_token",

    "token",

    "accessToken",

    "access_token"

];


const AUTH_API =
    "/api";


const GOOGLE_LOGIN_URL =
    "/api/auth/google";


const state = {

    loading:
        false,

    initialized:
        false,

    authenticated:
        false

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


/*
============================================================
TOKEN
============================================================
*/

function getStoredToken() {

    const current =
        localStorage.getItem(
            AUTH_TOKEN_KEY
        );


    if (
        current
    ) {

        return current;

    }


    /*
    --------------------------------------------------------
    Migração de tokens antigos.
    --------------------------------------------------------
    */

    for (
        const key of
        LEGACY_TOKEN_KEYS
    ) {

        const legacy =
            localStorage.getItem(
                key
            );


        if (
            legacy
        ) {

            localStorage.setItem(
                AUTH_TOKEN_KEY,
                legacy
            );


            /*
            ------------------------------------------------
            Remove imediatamente as chaves antigas.
            ------------------------------------------------
            */

            for (
                const oldKey of
                LEGACY_TOKEN_KEYS
            ) {

                localStorage.removeItem(
                    oldKey
                );

            }


            return legacy;

        }

    }


    return null;

}


function storeToken(
    token
) {

    if (
        typeof token !==
            "string" ||
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
        const key of
        LEGACY_TOKEN_KEYS
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
        const key of
        LEGACY_TOKEN_KEYS
    ) {

        localStorage.removeItem(
            key
        );

    }

}


/*
============================================================
RESPONSE HELPERS
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
AUTH API
============================================================
*/

async function authRequest(
    path,
    options = {}
) {

    const headers = {

        Accept:
            "application/json"

    };


    const token =
        getStoredToken();


    if (
        token
    ) {

        headers.Authorization =
            `Bearer ${token}`;

    }


    if (
        options.body !==
        undefined
    ) {

        headers[
            "Content-Type"
        ] =
            "application/json";

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
                    options.body !==
                    undefined

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
SESSION
============================================================
*/

async function validateExistingSession() {

    const token =
        getStoredToken();


    if (
        !token
    ) {

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


        state.authenticated =
            true;


        return true;

    }

    catch (
        error
    ) {

        clearStoredToken();


        state.authenticated =
            false;


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
                    circle at 15% 10%,
                    rgba(245,190,52,.10),
                    transparent 30%
                ),

                radial-gradient(
                    circle at 90% 90%,
                    rgba(245,190,52,.06),
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

            width:
                min(
                    100%,
                    460px
                );

        }


        .honey-auth-brand {

            text-align:
                center;

            margin-bottom:
                28px;

        }


        .honey-auth-mark {

            width:
                56px;

            height:
                56px;

            margin:
                0 auto 15px;

            display:
                grid;

            place-items:
                center;

            border-radius:
                17px;

            background:
                #f5be34;

            color:
                #111318;

            font-size:
                23px;

            font-weight:
                900;

            box-shadow:
                0 14px 40px
                rgba(
                    245,
                    190,
                    52,
                    .18
                );

        }


        .honey-auth-brand strong {

            display:
                block;

            font-size:
                26px;

            letter-spacing:
                -.045em;

        }


        .honey-auth-brand span {

            display:
                block;

            margin-top:
                6px;

            color:
                #8f98aa;

            font-size:
                13px;

        }


        .honey-auth-card {

            border:
                1px solid
                #252a35;

            border-radius:
                24px;

            padding:
                32px;

            background:
                #10131a;

            box-shadow:
                0 30px 80px
                rgba(
                    0,
                    0,
                    0,
                    .38
                );

        }


        .honey-auth-heading {

            text-align:
                center;

            margin-bottom:
                24px;

        }


        .honey-auth-heading h1 {

            margin:
                0;

            font-size:
                25px;

            letter-spacing:
                -.035em;

        }


        .honey-auth-heading p {

            margin:
                9px 0 0;

            color:
                #8f98aa;

            line-height:
                1.65;

            font-size:
                14px;

        }


        .honey-auth-google {

            width:
                100%;

            min-height:
                54px;

            display:
                flex;

            align-items:
                center;

            justify-content:
                center;

            gap:
                12px;

            border:
                1px solid
                #303642;

            border-radius:
                13px;

            background:
                #ffffff;

            color:
                #202124;

            font-family:
                Arial,
                sans-serif;

            font-size:
                15px;

            font-weight:
                700;

            cursor:
                pointer;

            transition:
                transform .18s ease,
                box-shadow .18s ease,
                background .18s ease;

        }


        .honey-auth-google:hover {

            transform:
                translateY(-1px);

            box-shadow:
                0 10px 28px
                rgba(
                    0,
                    0,
                    0,
                    .24
                );

            background:
                #f8f9fa;

        }


        .honey-auth-google:active {

            transform:
                translateY(0);

        }


        .honey-auth-google:disabled {

            opacity:
                .60;

            cursor:
                wait;

            transform:
                none;

        }


        .honey-google-icon {

            width:
                20px;

            height:
                20px;

            flex:
                0 0 20px;

        }


        .honey-auth-divider {

            display:
                flex;

            align-items:
                center;

            gap:
                12px;

            margin:
                22px 0;

            color:
                #687184;

            font-size:
                11px;

        }


        .honey-auth-divider::before,

        .honey-auth-divider::after {

            content:
                "";

            flex:
                1;

            height:
                1px;

            background:
                #252a35;

        }


        .honey-auth-security {

            margin-top:
                20px;

            text-align:
                center;

            color:
                #687184;

            font-size:
                11px;

            line-height:
                1.65;

        }


        .honey-auth-error {

            display:
                none;

            margin-bottom:
                16px;

            padding:
                12px 14px;

            border:
                1px solid
                rgba(
                    239,
                    93,
                    93,
                    .25
                );

            border-radius:
                11px;

            background:
                rgba(
                    239,
                    93,
                    93,
                    .08
                );

            color:
                #ff9b9b;

            font-size:
                13px;

            line-height:
                1.5;

        }


        .honey-auth-error.is-visible {

            display:
                block;

        }


        .honey-auth-loading {

            display:
                none;

            align-items:
                center;

            justify-content:
                center;

            gap:
                9px;

            margin-top:
                16px;

            color:
                #8f98aa;

            font-size:
                13px;

        }


        .honey-auth-loading.is-visible {

            display:
                flex;

        }


        .honey-auth-spinner {

            width:
                16px;

            height:
                16px;

            border:
                2px solid
                #303642;

            border-top-color:
                #f5be34;

            border-radius:
                50%;

            animation:
                honeyAuthSpin
                .75s linear infinite;

        }


        @keyframes honeyAuthSpin {

            to {

                transform:
                    rotate(
                        360deg
                    );

            }

        }


        @media (
            max-width: 520px
        ) {

            #honey-auth-gate {

                padding:
                    16px;

            }


            .honey-auth-card {

                padding:
                    23px;

                border-radius:
                    20px;

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

    const existing =
        document.getElementById(
            "honey-auth-gate"
        );


    if (
        existing
    ) {

        return existing;

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

        <div
            class="honey-auth-shell"
        >

            <div
                class="honey-auth-brand"
            >

                <div
                    class="honey-auth-mark"
                    aria-hidden="true"
                >
                    H
                </div>


                <strong>
                    Honey Pay
                </strong>


                <span>
                    Plataforma profissional
                    de cobranças
                </span>

            </div>


            <section
                class="honey-auth-card"
                aria-labelledby="honey-auth-title"
            >

                <div
                    class="honey-auth-heading"
                >

                    <h1
                        id="honey-auth-title"
                    >
                        Entre na sua conta
                    </h1>


                    <p
                        id="honey-auth-description"
                    >
                        Aceda ao seu espaço de
                        gestão de forma segura
                        através da sua conta Google.
                    </p>

                </div>


                <div
                    id="honey-auth-error"
                    class="honey-auth-error"
                    role="alert"
                    aria-live="polite"
                ></div>


                <button
                    id="honey-auth-google"
                    class="honey-auth-google"
                    type="button"
                    aria-label="Continuar com Google"
                >

                    <svg
                        class="honey-google-icon"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                    >

                        <path
                            fill="#4285F4"
                            d="M21.35 12.27c0-.71-.06-1.4-.18-2.05H12v3.88h5.24a4.48 4.48 0 0 1-1.95 2.94v2.45h3.15c1.85-1.7 2.91-4.2 2.91-7.22z"
                        />

                        <path
                            fill="#34A853"
                            d="M12 21.75c2.65 0 4.88-.88 6.5-2.36l-3.15-2.45c-.87.58-1.98.92-3.35.92-2.57 0-4.75-1.74-5.53-4.08H3.22v2.53A9.82 9.82 0 0 0 12 21.75z"
                        />

                        <path
                            fill="#FBBC05"
                            d="M6.47 13.78A5.9 5.9 0 0 1 6.16 12c0-.62.11-1.22.31-1.78V7.69H3.22A9.75 9.75 0 0 0 2.25 12c0 1.57.38 3.05.97 4.31l3.25-2.53z"
                        />

                        <path
                            fill="#EA4335"
                            d="M12 6.14c1.44 0 2.73.5 3.75 1.49l2.81-2.81C16.87 3.18 14.65 2.25 12 2.25a9.82 9.82 0 0 0-8.78 5.44l3.25 2.53C7.25 7.88 9.43 6.14 12 6.14z"
                        />

                    </svg>


                    <span>
                        Continuar com Google
                    </span>

                </button>


                <div
                    class="honey-auth-loading"
                    id="honey-auth-loading"
                    aria-live="polite"
                >

                    <span
                        class="honey-auth-spinner"
                        aria-hidden="true"
                    ></span>

                    <span>
                        A ligar à sua conta Google…
                    </span>

                </div>


                <div
                    class="honey-auth-divider"
                    aria-hidden="true"
                >

                    <span>
                        AUTENTICAÇÃO SEGURA
                    </span>

                </div>


                <div
                    class="honey-auth-security"
                >

                    O acesso ao Honey Pay é feito
                    exclusivamente através da
                    autenticação Google.
                    <br>
                    Não armazenamos palavras-passe.

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
UI
============================================================
*/

function showGate() {

    const gate =
        document.getElementById(
            "honey-auth-gate"
        );


    if (
        !gate
    ) {

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


    if (
        !gate
    ) {

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


    if (
        !element
    ) {

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
            "honey-auth-google"
        );


    const loadingElement =
        document.getElementById(
            "honey-auth-loading"
        );


    if (
        button
    ) {

        button.disabled =
            state.loading;

    }


    if (
        loadingElement
    ) {

        loadingElement.classList.toggle(
            "is-visible",
            state.loading
        );

    }

}


/*
============================================================
GOOGLE LOGIN
============================================================
*/

function startGoogleLogin() {

    if (
        state.loading
    ) {

        return;

    }


    setError(
        ""
    );


    setLoading(
        true
    );


    /*
    --------------------------------------------------------
    Não fazemos fetch aqui.

    O endpoint inicia o OAuth e redireciona
    o navegador para o Google.

    --------------------------------------------------------
    */

    window.location.assign(
        GOOGLE_LOGIN_URL
    );

}


/*
============================================================
LOGOUT
============================================================
*/

async function logout(
    options = {}
) {

    clearStoredToken();


    state.authenticated =
        false;


    /*
    --------------------------------------------------------
    Se o backend possuir endpoint de logout,
    tentamos utilizá-lo sem bloquear o logout local.
    --------------------------------------------------------
    */

    try {

        await authRequest(
            "/auth/logout",
            {
                method:
                    "POST"
            }
        );

    }

    catch {
        /*
        Logout local continua válido.
        */
    }


    if (
        options.redirect !==
        false
    ) {

        window.location.replace(
            "/"
        );

    }

}


/*
============================================================
HANDLE GOOGLE CALLBACK TOKEN
============================================================

Aceita token caso o callback do backend redirecione
para a aplicação utilizando:

/?token=JWT

ou:

/#token=JWT

O token é imediatamente removido da URL.

============================================================
*/

function consumeCallbackToken() {

    const url =
        new URL(
            window.location.href
        );


    let token =
        url.searchParams.get(
            "token"
        );


    if (
        !token
    ) {

        token =
            url.searchParams.get(
                "access_token"
            );

    }


    /*
    --------------------------------------------------------
    Também suporta hash:

    #token=...
    --------------------------------------------------------
    */

    if (
        !token &&
        window.location.hash
    ) {

        const hash =
            new URLSearchParams(
                window.location.hash
                    .replace(
                        /^#/,
                        ""
                    )
            );


        token =
            hash.get(
                "token"
            ) ||
            hash.get(
                "access_token"
            );

    }


    if (
        typeof token !==
            "string" ||
        !token.trim()
    ) {

        return null;

    }


    token =
        token.trim();


    storeToken(
        token
    );


    /*
    --------------------------------------------------------
    Remove o token da barra de endereço.
    --------------------------------------------------------
    */

    url.searchParams.delete(
        "token"
    );


    url.searchParams.delete(
        "access_token"
    );


    const cleanUrl =
        url.pathname +
        (
            url.searchParams.toString()
                ? `?${url.searchParams.toString()}`
                : ""
        );


    window.history.replaceState(
        {},
        document.title,
        cleanUrl
    );


    return token;

}


/*
============================================================
AUTH ERROR FROM CALLBACK
============================================================
*/

function consumeCallbackError() {

    const url =
        new URL(
            window.location.href
        );


    const error =
        url.searchParams.get(
            "auth_error"
        ) ||
        url.searchParams.get(
            "error"
        );


    if (
        !error
    ) {

        return null;

    }


    url.searchParams.delete(
        "auth_error"
    );


    url.searchParams.delete(
        "error"
    );


    url.searchParams.delete(
        "error_description"
    );


    const cleanUrl =
        url.pathname +
        (
            url.searchParams.toString()
                ? `?${url.searchParams.toString()}`
                : ""
        );


    window.history.replaceState(
        {},
        document.title,
        cleanUrl
    );


    const messages = {

        access_denied:
            "O acesso Google foi cancelado.",

        google_auth_failed:
            "Não foi possível autenticar com o Google.",

        account_not_active:
            "A sua conta Honey Pay não está ativa.",

        authentication_failed:
            "Não foi possível concluir a autenticação."

    };


    return (
        messages[error] ||
        "Não foi possível concluir o acesso com Google."
    );

}


/*
============================================================
INITIALIZE
============================================================
*/

async function initializeAuth() {

    if (
        state.initialized
    ) {

        return state.authenticated;

    }


    state.initialized =
        true;


    injectStyles();

    createAuthGate();


    /*
    --------------------------------------------------------
    Primeiro consumimos eventual token vindo
    do callback OAuth.
    --------------------------------------------------------
    */

    consumeCallbackToken();


    const callbackError =
        consumeCallbackError();


    if (
        callbackError
    ) {

        clearStoredToken();


        showGate();


        setError(
            callbackError
        );


        return false;

    }


    /*
    --------------------------------------------------------
    Sessão existente.
    --------------------------------------------------------
    */

    const authenticated =
        await validateExistingSession();


    if (
        authenticated
    ) {

        hideGate();


        /*
        ----------------------------------------------------
        Notifica o restante da aplicação.
        ----------------------------------------------------
        */

        window.dispatchEvent(
            new CustomEvent(
                "honey-authenticated"
            )
        );


        return true;

    }


    showGate();


    return false;

}


/*
============================================================
EVENTS
============================================================
*/

function bindEvents() {

    const googleButton =
        document.getElementById(
            "honey-auth-google"
        );


    if (
        googleButton &&
        !googleButton.dataset.bound
    ) {

        googleButton.dataset.bound =
            "true";


        googleButton.addEventListener(
            "click",
            startGoogleLogin
        );

    }


    /*
    --------------------------------------------------------
    Logout global.
    --------------------------------------------------------
    */

    document.addEventListener(
        "click",
        event => {

            const logoutButton =
                event.target.closest(
                    "[data-action='logout'], [data-logout], #logout-button, #logout"
                );


            if (
                !logoutButton
            ) {

                return;

            }


            event.preventDefault();


            logout();

        }
    );

}


/*
============================================================
BOOT
============================================================
*/

function boot() {

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            () => {

                bindEvents();

                initializeAuth();

            },
            {
                once:
                    true
            }
        );

    }

    else {

        bindEvents();

        initializeAuth();

    }

}


/*
============================================================
PUBLIC API
============================================================
*/

window.HoneyPayAuth = {

    getToken() {

        return getStoredToken();

    },


    isAuthenticated() {

        return Boolean(
            state.authenticated
        );

    },


    async validateSession() {

        return validateExistingSession();

    },


    async logout() {

        return logout();

    },


    showLogin() {

        showGate();

    },


    hideLogin() {

        hideGate();

    },


    startGoogleLogin() {

        startGoogleLogin();

    },


    getState() {

        return {

            ...state

        };

    }

};


/*
============================================================
GLOBAL EVENTS
============================================================
*/

window.addEventListener(
    "honey-auth-required",
    () => {

        clearStoredToken();

        state.authenticated =
            false;

        showGate();

    }
);


window.addEventListener(
    "storage",
    event => {

        if (
            event.key !==
            AUTH_TOKEN_KEY
        ) {

            return;

        }


        if (
            !event.newValue
        ) {

            state.authenticated =
                false;

            showGate();

        }

    }
);


/*
============================================================
START
============================================================
*/

boot();


/*
============================================================
EXPORT
============================================================
*/

export {

    initializeAuth,

    validateExistingSession,

    startGoogleLogin,

    logout,

    getStoredToken

};
