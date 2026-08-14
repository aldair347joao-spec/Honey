/*
==========================================================
HONEY IA STUDIO
APPLICATION CONTROLLER
V14.0

COMPATÍVEL COM:
----------------------------------------------------------
• index.html atual
• auth.js
• login.js
• dashboard.js
• agents-ui.js
• agentstudio.js
• chat.js
• liveclient.js
• components.js
• userprofile.js

RESPONSIBILITIES
----------------------------------------------------------
• Application boot
• Authentication lifecycle
• User session
• Workspace lifecycle
• Navigation
• Sidebar
• Chat integration
• Agent integration
• Agent Studio integration
• Live Mode
• Global search
• Notifications
• Toast system
• HTML preview
• Markdown configuration
• UI state synchronization
• Runtime cleanup

IMPORTANT
----------------------------------------------------------
O studioApp começa com:

<div id="studioApp" class="studio" hidden>

Por isso o controller remove explicitamente o atributo
hidden antes de mostrar o workspace.

==========================================================
*/


/* ========================================================
   CORE MODULES
======================================================== */

import liveclient from "./liveclient.js";
import agentstudio from "./agentstudio.js";
import { components } from "./components.js";
import agentsui from "./agents-ui.js";
import dashboard from "./dashboard.js";
import authmanager from "./auth.js";
import logincontroller from "./login.js";
import userprofile from "./userprofile.js";


/* ========================================================
   APPLICATION CONSTANTS
======================================================== */

const APP_VERSION = "14.0";

const DEFAULT_AGENT = "general";

const DEFAULT_WORKSPACE = "dashboard";

const CHAT_API_BASE = "/api/chat";

const LOADER_HIDE_DELAY = 450;

const TOAST_DURATION = 3500;


/* ========================================================
   APPLICATION SESSION
======================================================== */

const APPLICATION_SESSION_ID =
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"

        ? crypto.randomUUID()

        : `honey-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}`;


/* ========================================================
   EVENT BUS
======================================================== */

class EventBus {

    constructor(){

        this.events = new Map();

    }


    on(event, callback){

        if(
            !event ||
            typeof callback !== "function"
        ){

            return () => {};

        }


        if(!this.events.has(event)){

            this.events.set(
                event,
                new Set()
            );

        }


        const listeners =
            this.events.get(event);


        listeners.add(callback);


        return () => {

            this.off(
                event,
                callback
            );

        };

    }


    off(event, callback){

        const listeners =
            this.events.get(event);


        if(!listeners){

            return;

        }


        listeners.delete(callback);


        if(listeners.size === 0){

            this.events.delete(event);

        }

    }


    emit(event, data){

        const listeners =
            this.events.get(event);


        if(!listeners){

            return;

        }


        [...listeners].forEach(
            callback => {

                try{

                    callback(data);

                }

                catch(error){

                    console.error(
                        `Honey IA EventBus error [${event}]:`,
                        error
                    );

                }

            }
        );

    }


    clear(event){

        if(event){

            this.events.delete(event);

            return;

        }


        this.events.clear();

    }

}


/* ========================================================
   GLOBAL EVENT BUS
======================================================== */

export const EventBusInstance =
    new EventBus();


/* ========================================================
   GLOBAL STORE
======================================================== */

export const Store = {

    state: {

        sessionId:
            APPLICATION_SESSION_ID,

        conversation:
            [],

        loading:
            false,

        selectedFileBase64:
            null,

        selectedFileName:
            null,

        selectedAgent:
            DEFAULT_AGENT,

        isAuthenticated:
            false,

        workspace:
            DEFAULT_WORKSPACE,

        user:
            null,

        chatInitialized:
            false,

        currentChatId:
            null,

        currentMode:
            "chat",

        liveConnected:
            false

    },


    setState(key, value){

        if(!key){

            return;

        }


        const previousValue =
            this.state[key];


        this.state[key] =
            value;


        EventBusInstance.emit(
            "stateChanged",
            {
                key,
                value,
                previousValue,
                state: this.state
            }
        );

    },


    getState(key){

        return this.state[key];

    },


    patch(values = {}){

        Object.entries(values)
            .forEach(
                ([key, value]) => {

                    this.setState(
                        key,
                        value
                    );

                }
            );

    }

};


/* ========================================================
   HONEY AI APPLICATION
======================================================== */

class HoneyAIApp {


    constructor(){

        /* -------------------------------------------------
           Runtime
        ------------------------------------------------- */

        this.initialized =
            false;

        this.authInitialized =
            false;

        this.workspaceInitialized =
            false;

        this.navigationInitialized =
            false;

        this.chatInitialized =
            false;

        this.chatEventsInitialized =
            false;

        this.agentsInitialized =
            false;

        this.agentStudioInitialized =
            false;

        this.domInitialized =
            false;


        /* -------------------------------------------------
           Chat
        ------------------------------------------------- */

        this.chatModule =
            null;

        this.chatInstance =
            null;


        /* -------------------------------------------------
           Live
        ------------------------------------------------- */

        this.liveMode =
            false;

        this.voiceActive =
            false;

        this.voiceRecognition =
            null;

        this.currentMode =
            "chat";


        /* -------------------------------------------------
           Authentication
        ------------------------------------------------- */

        this.authSubscription =
            null;


        /* -------------------------------------------------
           Cleanup
        ------------------------------------------------- */

        this.cleanupCallbacks =
            [];


        /* -------------------------------------------------
           DOM
        ------------------------------------------------- */

        this.initDOMReferences();


        /* -------------------------------------------------
           Authentication
        ------------------------------------------------- */

        this.bindAuthEvents();

    }


    /* ====================================================
       DOM REFERENCES
    ==================================================== */

    initDOMReferences(){

        this.appLoader =
            document.getElementById(
                "appLoader"
            );


        this.studioApp =
            document.getElementById(
                "studioApp"
            );


        this.btnChatMode =
            document.getElementById(
                "btnChatMode"
            );


        this.btnLiveMode =
            document.getElementById(
                "btnLiveMode"
            );


        this.chatFeed =
            document.getElementById(
                "chatMessages"
            );


        this.promptTextarea =
            document.getElementById(
                "chatInput"
            );


        this.btnSend =
            document.getElementById(
                "btnSend"
            );


        this.btnVoice =
            document.getElementById(
                "btnVoice"
            );


        this.fileUploadInput =
            document.getElementById(
                "fileInput"
            );


        this.btnAttach =
            document.getElementById(
                "btnAttach"
            );


        this.attachmentBar =
            document.getElementById(
                "attachment-bar"
            );


        this.attachedFileName =
            document.getElementById(
                "attached-file-name"
            );


        this.btnRemoveAttachment =
            document.getElementById(
                "btn-remove-attachment"
            );


        this.btnToggleMenu =
            document.getElementById(
                "btnMobileMenu"
            );


        this.btnCloseSidebar =
            document.getElementById(
                "btnCloseSidebar"
            );


        this.sidebar =
            document.getElementById(
                "sidebar"
            );


        this.sidebarOverlay =
            document.getElementById(
                "sidebarOverlay"
            );


        this.previewPane =
            document.getElementById(
                "preview-pane"
            );


        this.livePreviewIframe =
            document.getElementById(
                "live-preview-iframe"
            );


        this.btnClosePreview =
            document.getElementById(
                "btn-close-preview"
            );


        this.toastContainer =
            document.getElementById(
                "toastContainer"
            );


        this.globalSearch =
            document.getElementById(
                "globalSearch"
            );


        this.btnNotifications =
            document.getElementById(
                "btnNotifications"
            );


        this.domInitialized =
            true;

    }


    /* ====================================================
       AUTHENTICATION EVENTS
    ==================================================== */

    bindAuthEvents(){

        if(
            authmanager &&
            typeof authmanager.subscribe ===
            "function"
        ){

            try{

                this.authSubscription =
                    authmanager.subscribe(
                        user => {

                            if(
                                user &&
                                typeof authmanager.isAuthenticated ===
                                "function" &&
                                authmanager.isAuthenticated()
                            ){

                                this.handleAuthenticatedUser(
                                    user,
                                    false
                                );

                                return;

                            }


                            this.handleUnauthenticatedUser();

                        }
                    );

            }

            catch(error){

                console.error(
                    "HONEY IA AUTH SUBSCRIPTION ERROR:",
                    error
                );

            }

        }


        const loginHandler =
            event => {

                const user =
                    event?.detail ||
                    (
                        authmanager &&
                        typeof authmanager.getUser ===
                        "function"

                            ? authmanager.getUser()

                            : null
                    );


                if(!user){

                    return;

                }


                this.handleAuthenticatedUser(
                    user,
                    true
                );

            };


        document.addEventListener(
            "user-login",
            loginHandler
        );


        this.cleanupCallbacks.push(
            () => {

                document.removeEventListener(
                    "user-login",
                    loginHandler
                );

            }
        );


        const logoutHandler =
            async () => {

                await this.logout();

            };


        document.addEventListener(
            "user-logout",
            logoutHandler
        );


        this.cleanupCallbacks.push(
            () => {

                document.removeEventListener(
                    "user-logout",
                    logoutHandler
                );

            }
        );

    }


    /* ====================================================
       AUTHENTICATION START
    ==================================================== */

    async startAuthentication(){

        if(this.authInitialized){

            return;

        }


        this.authInitialized =
            true;


        console.log(
            `🔐 Honey IA ${APP_VERSION}: verificando sessão...`
        );


        try{

            if(
                authmanager &&
                typeof authmanager.waitUntilReady ===
                "function"
            ){

                await Promise.race([

                    authmanager.waitUntilReady(),

                    new Promise(
                        resolve => {

                            setTimeout(
                                resolve,
                                6000
                            );

                        }
                    )

                ]);

            }

        }

        catch(error){

            console.error(
                "AUTH READY ERROR:",
                error
            );

        }


        let authenticated =
            false;


        let user =
            null;


        try{

            authenticated =
                !!(
                    authmanager &&
                    typeof authmanager.isAuthenticated ===
                    "function" &&
                    authmanager.isAuthenticated()
                );


            user =
                authmanager &&
                typeof authmanager.getUser ===
                "function"

                    ? authmanager.getUser()

                    : null;

        }

        catch(error){

            console.error(
                "AUTH SESSION READ ERROR:",
                error
            );

        }


        if(
            authenticated &&
            user
        ){

            this.handleAuthenticatedUser(
                user,
                false
            );

            return;

        }


        /*
         * Sem sessão válida, mantemos o workspace
         * oculto e inicializamos o login se disponível.
         */

        this.handleUnauthenticatedUser();


        try{

            if(
                logincontroller &&
                typeof logincontroller.init ===
                "function"
            ){

                await logincontroller.init();

            }

        }

        catch(error){

            console.error(
                "LOGIN INITIALIZATION ERROR:",
                error
            );

        }


        /*
         * Nunca deixar o loader preso.
         */

        this.hideLoader();

    }


    /* ====================================================
       AUTHENTICATED USER
    ==================================================== */

    handleAuthenticatedUser(
        user,
        showWelcome = false
    ){

        if(!user){

            return;

        }


        Store.patch({

            isAuthenticated:
                true,

            user:
                user

        });


        this.updateUserInterface(
            user
        );


        /*
         * PRIMEIRO:
         * mostrar o workspace corretamente.
         */

        this.showWorkspace();


        /*
         * DEPOIS:
         * inicializar os módulos.
         *
         * Nenhum módulo secundário pode impedir
         * a abertura visual da aplicação.
         */

        this.initializeWorkspace();


        if(showWelcome){

            this.showToast(
                `Bem-vindo, ${this.getUserName(user)}!`,
                "success"
            );

        }


        EventBusInstance.emit(
            "authenticated",
            user
        );

    }


    /* ====================================================
       UNAUTHENTICATED USER
    ==================================================== */

    handleUnauthenticatedUser(){

        Store.patch({

            isAuthenticated:
                false,

            user:
                null

        });


        this.hideWorkspace();


        EventBusInstance.emit(
            "unauthenticated"
        );

    }


    /* ====================================================
       WORKSPACE VISIBILITY
    ==================================================== */

    showWorkspace(){

        const studioApp =
            document.getElementById(
                "studioApp"
            );


        const loginApp =
            document.getElementById(
                "loginApp"
            );


        /*
         * =================================================
         * CRITICAL FIX
         * =================================================
         *
         * O index.html possui:
         *
         * <div id="studioApp" class="studio" hidden>
         *
         * style.display = "flex" NÃO remove o atributo
         * hidden.
         *
         * Portanto removemos explicitamente o hidden.
         * =================================================
         */

        if(studioApp){

            studioApp.hidden =
                false;


            studioApp.removeAttribute(
                "hidden"
            );


            studioApp.style.display =
                "flex";


            studioApp.classList.add(
                "auth-ready"
            );


            studioApp.setAttribute(
                "aria-hidden",
                "false"
            );

        }


        if(loginApp){

            loginApp.hidden =
                true;


            loginApp.style.display =
                "none";


            loginApp.setAttribute(
                "aria-hidden",
                "true"
            );

        }


        this.hideLoader();

    }


    /* ====================================================
       WORKSPACE HIDE
    ==================================================== */

    hideWorkspace(){

        const studioApp =
            document.getElementById(
                "studioApp"
            );


        if(studioApp){

            studioApp.hidden =
                true;


            studioApp.setAttribute(
                "hidden",
                ""
            );


            studioApp.style.display =
                "none";


            studioApp.setAttribute(
                "aria-hidden",
                "true"
            );


            studioApp.classList.remove(
                "auth-ready"
            );

        }

    }


    /* ====================================================
       LOADER
    ==================================================== */

    hideLoader(){

        const loader =
            document.getElementById(
                "appLoader"
            );


        if(!loader){

            return;

        }


        loader.classList.add(
            "hidden"
        );


        loader.classList.add(
            "is-hidden"
        );


        setTimeout(
            () => {

                if(
                    loader &&
                    loader.parentNode
                ){

                    loader.style.display =
                        "none";

                    loader.setAttribute(
                        "aria-hidden",
                        "true"
                    );

                }

            },
            LOADER_HIDE_DELAY
        );

    }


    /* ====================================================
       WORKSPACE INITIALIZATION
    ==================================================== */

    initializeWorkspace(){

        if(this.workspaceInitialized){

            return;

        }


        this.workspaceInitialized =
            true;


        console.log(
            "🐝 Inicializando Honey IA Workspace..."
        );


        this.initDOMReferences();


        /*
         * Cada módulo secundário possui proteção própria.
         * Uma falha não deve derrubar o workspace.
         */

        try{

            this.initUserSession();

        }

        catch(error){

            console.error(
                "User session initialization error:",
                error
            );

        }


        try{

            this.initDashboard();

        }

        catch(error){

            console.error(
                "Dashboard boot error:",
                error
            );

        }


        try{

            this.initEventListeners();

        }

        catch(error){

            console.error(
                "Event listeners boot error:",
                error
            );

        }


        try{

            this.initMarkdownEngine();

        }

        catch(error){

            console.error(
                "Markdown boot error:",
                error
            );

        }


        try{

            this.initModalsAndUiActions();

        }

        catch(error){

            console.error(
                "UI actions boot error:",
                error
            );

        }


        try{

            this.initAgents();

        }

        catch(error){

            console.error(
                "Agents boot error:",
                error
            );

        }


        try{

            this.initAgentStudio();

        }

        catch(error){

            console.error(
                "Agent Studio boot error:",
                error
            );

        }


        /*
         * Chat é inicializado de forma assíncrona.
         * Nunca bloqueia a abertura do workspace.
         */

        this.initChat().catch(
            error => {

                console.error(
                    "Workspace chat startup error:",
                    error
                );

            }
        );


        try{

            this.initializeInitialWorkspace();

        }

        catch(error){

            console.error(
                "Initial workspace error:",
                error
            );


            /*
             * Fallback absoluto para Dashboard.
             */

            try{

                this.showWorkspaceView(
                    DEFAULT_WORKSPACE,
                    false
                );

            }

            catch(fallbackError){

                console.error(
                    "Workspace fallback error:",
                    fallbackError
                );

            }

        }


        console.log(
            "🚀 Honey IA Workspace carregado."
        );


        EventBusInstance.emit(
            "workspaceReady"
        );

    }


    /* ====================================================
       INITIAL VIEW
    ==================================================== */

    initializeInitialWorkspace(){

        const hash =
            window.location.hash
                .replace(
                    "#",
                    ""
                )
                .trim();


        if(hash){

            const target =
                document.getElementById(
                    hash
                );


            if(
                target &&
                target.classList.contains(
                    "workspace-view"
                )
            ){

                this.showWorkspaceView(
                    hash,
                    false
                );


                return;

            }

        }


        this.showWorkspaceView(
            DEFAULT_WORKSPACE,
            false
        );

    }


    /* ====================================================
       USER SESSION
    ==================================================== */

    initUserSession(){

        if(
            !authmanager ||
            typeof authmanager.getUser !==
            "function"
        ){

            return;

        }


        const user =
            authmanager.getUser();


        if(!user){

            return;

        }


        Store.patch({

            isAuthenticated:
                typeof authmanager.isAuthenticated ===
                "function"

                    ? authmanager.isAuthenticated()

                    : false,

            user:
                user

        });


        this.updateUserInterface(
            user
        );

    }


    /* ====================================================
       USER INTERFACE
    ==================================================== */

    updateUserInterface(user){

        if(!user){

            return;

        }


        const userBox =
            document.getElementById(
                "userBox"
            );


        const planBadge =
            document.getElementById(
                "planBadge"
            );


        const displayName =
            this.getUserName(
                user
            );


        const plan =
            this.getPlanName(
                user.plan
            );


        if(userBox){

            const avatar =
                user.avatar ||
                user.picture ||
                displayName
                    .charAt(0)
                    .toUpperCase();


            const isImage =
                typeof avatar ===
                "string" &&
                (
                    avatar.startsWith(
                        "http"
                    ) ||
                    avatar.startsWith(
                        "data:image"
                    )
                );


            const avatarMarkup =
                isImage

                    ?

                    `<img src="${this.escapeHTML(avatar)}" alt="Avatar">`

                    :

                    this.escapeHTML(
                        avatar
                    );


            userBox.innerHTML = `

                <div class="avatar">
                    ${avatarMarkup}
                </div>

                <div class="user-meta">

                    <strong>
                        ${this.escapeHTML(displayName)}
                    </strong>

                    <small>
                        Plano ${this.escapeHTML(plan)}
                    </small>

                </div>

                <i
                    class="fa-solid fa-chevron-right user-chevron"
                    aria-hidden="true"
                ></i>

            `;

        }


        if(planBadge){

            const planName =
                document.getElementById(
                    "planBadgeName"
                );


            if(planName){

                planName.textContent =
                    plan;

            }

        }


        EventBusInstance.emit(
            "userInterfaceUpdated",
            user
        );

    }


    getUserName(user){

        if(!user){

            return "Utilizador";

        }


        const firstName =
            user.firstName ||
            "";


        const lastName =
            user.lastName ||
            "";


        const fullName =
            `${firstName} ${lastName}`
                .trim();


        return (
            fullName ||
            user.name ||
            user.email ||
            "Utilizador"
        );

    }


    getPlanName(plan){

        const plans = {

            free:
                "Gratuito",

            individual:
                "Individual",

            business:
                "Business"

        };


        return (
            plans[plan] ||
            plan ||
            "Gratuito"
        );

    }


    /* ====================================================
       SECURITY
    ==================================================== */

    escapeHTML(value){

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


    /* ====================================================
       DASHBOARD
    ==================================================== */

    initDashboard(){

        const dashboardContainer =
            document.getElementById(
                "dashboardContainer"
            );


        if(!dashboardContainer){

            console.warn(
                "Dashboard container não encontrado."
            );


            return;

        }


        if(
            !dashboard ||
            typeof dashboard.init !==
            "function"
        ){

            console.warn(
                "Dashboard module não possui init()."
            );


            return;

        }


        try{

            dashboard.init(
                "dashboardContainer"
            );


            console.log(
                "📊 Dashboard carregado"
            );

        }

        catch(error){

            console.error(
                "Dashboard initialization error:",
                error
            );

        }

    }


    /* ====================================================
       AGENTS
    ==================================================== */

    initAgents(){

        if(this.agentsInitialized){

            return;

        }


        this.agentsInitialized =
            true;


        const container =
            document.getElementById(
                "agentsContainer"
            );


        if(
            container &&
            agentsui &&
            typeof agentsui.init ===
            "function"
        ){

            try{

                agentsui.init(
                    "agentsContainer"
                );


                console.log(
                    "🤖 Agents UI conectado"
                );

            }

            catch(error){

                console.error(
                    "Agents UI initialization error:",
                    error
                );

            }

        }


        const agentSelectedHandler =
            event => {

                const agent =
                    event?.detail;


                if(
                    !agent ||
                    !agent.id
                ){

                    return;

                }


                this.setChatAgent(
                    agent.id
                );

            };


        document.addEventListener(
            "agent-selected",
            agentSelectedHandler
        );


        this.cleanupCallbacks.push(
            () => {

                document.removeEventListener(
                    "agent-selected",
                    agentSelectedHandler
                );

            }
        );

    }


    /* ====================================================
       AGENT STUDIO
    ==================================================== */

    initAgentStudio(){

        if(this.agentStudioInitialized){

            return;

        }


        this.agentStudioInitialized =
            true;


        const studioContainer =
            document.getElementById(
                "agentStudioContainer"
            );


        if(
            studioContainer &&
            agentstudio &&
            typeof agentstudio.init ===
            "function"
        ){

            try{

                agentstudio.init(
                    "agentStudioContainer"
                );


                console.log(
                    "⚡ Agent Studio conectado"
                );

            }

            catch(error){

                console.error(
                    "Agent Studio initialization error:",
                    error
                );

            }

        }


        if(
            agentstudio &&
            typeof agentstudio.listenEvents ===
            "function"
        ){

            try{

                agentstudio.listenEvents();

            }

            catch(error){

                console.error(
                    "Agent Studio event error:",
                    error
                );

            }

        }

    }


    /* ====================================================
       CHAT INITIALIZATION
    ==================================================== */

    async initChat(){

        if(this.chatInitialized){

            return this.chatInstance;

        }


        const chatSection =
            document.getElementById(
                "chat"
            );


        if(!chatSection){

            console.warn(
                "⚠️ Chat section não encontrada."
            );


            return null;

        }


        try{

            const chatModule =
                await import(
                    "./chat.js"
                );


            this.chatModule =
                chatModule;


            let chatInstance =
                chatModule.default ||
                chatModule.chat ||
                chatModule.chatController ||
                chatModule.ChatController ||
                null;


            if(
                typeof chatInstance ===
                "function"
            ){

                try{

                    chatInstance =
                        new chatInstance();

                }

                catch(error){

                    console.warn(
                        "Chat exportado como classe não pôde ser instanciado:",
                        error
                    );


                    chatInstance =
                        null;

                }

            }


            this.chatInstance =
                chatInstance;


            const initOptions = {

                sessionId:
                    APPLICATION_SESSION_ID,

                user:
                    authmanager &&
                    typeof authmanager.getUser ===
                    "function"

                        ? authmanager.getUser()

                        : null,

                agentId:
                    Store.state.selectedAgent,

                workspace:
                    Store.state.workspace,

                apiBase:
                    CHAT_API_BASE

            };


            let initialized =
                false;


            if(
                this.chatInstance &&
                typeof this.chatInstance.init ===
                "function"
            ){

                await this.chatInstance.init(
                    initOptions
                );


                initialized =
                    true;

            }

            else if(
                chatModule &&
                typeof chatModule.init ===
                "function"
            ){

                await chatModule.init(
                    initOptions
                );


                initialized =
                    true;

            }


            if(!initialized){

                console.warn(
                    "⚠️ chat.js carregado, mas nenhum init() foi encontrado."
                );

            }


            this.chatInitialized =
                true;


            Store.setState(
                "chatInitialized",
                true
            );


            console.log(
                "💬 Chat Engine conectado"
            );


            this.bindChatEvents();


            if(
                this.chatInstance &&
                typeof this.chatInstance.setMode ===
                "function"
            ){

                try{

                    await this.chatInstance.setMode(
                        this.currentMode
                    );

                }

                catch(error){

                    console.warn(
                        "Chat mode synchronization error:",
                        error
                    );

                }

            }


            EventBusInstance.emit(
                "chatReady",
                {
                    instance:
                        this.chatInstance,

                    module:
                        this.chatModule
                }
            );


            return this.chatInstance;

        }

        catch(error){

            console.error(
                "❌ Chat initialization error:",
                error
            );


            this.chatInitialized =
                false;


            Store.setState(
                "chatInitialized",
                false
            );


            EventBusInstance.emit(
                "chatInitializationError",
                error
            );


            return null;

        }

    }


    /* ====================================================
       CHAT EVENTS
    ==================================================== */

    bindChatEvents(){

        if(this.chatEventsInitialized){

            return;

        }


        this.chatEventsInitialized =
            true;


        const chatStateHandler =
            event => {

                const state =
                    event?.detail;


                if(!state){

                    return;

                }


                if(
                    typeof state.loading ===
                    "boolean"
                ){

                    Store.setState(
                        "loading",
                        state.loading
                    );

                }


                if(
                    state.chatId !==
                    undefined
                ){

                    Store.setState(
                        "currentChatId",
                        state.chatId
                    );

                }


                if(
                    Array.isArray(
                        state.conversation
                    )
                ){

                    Store.setState(
                        "conversation",
                        state.conversation
                    );

                }


                if(state.agentId){

                    Store.setState(
                        "selectedAgent",
                        state.agentId
                    );

                }

            };


        document.addEventListener(
            "chat-state",
            chatStateHandler
        );


        const chatMessageHandler =
            event => {

                EventBusInstance.emit(
                    "chatMessage",
                    event.detail
                );

            };


        document.addEventListener(
            "chat-message",
            chatMessageHandler
        );


        const chatUpdatedHandler =
            event => {

                const data =
                    event?.detail;


                if(
                    data &&
                    Array.isArray(
                        data.conversation
                    )
                ){

                    Store.setState(
                        "conversation",
                        data.conversation
                    );

                }


                EventBusInstance.emit(
                    "conversationUpdated",
                    data
                );

            };


        document.addEventListener(
            "chat-updated",
            chatUpdatedHandler
        );


        const chatErrorHandler =
            event => {

                const error =
                    event?.detail;


                this.showToast(
                    error?.message ||
                    "Ocorreu um erro no Chat Honey IA.",
                    "error"
                );


                EventBusInstance.emit(
                    "chatError",
                    error
                );

            };


        document.addEventListener(
            "chat-error",
            chatErrorHandler
        );


        const chatAuthHandler =
            async () => {

                this.showToast(
                    "A sua sessão expirou. Faça login novamente.",
                    "error"
                );


                await this.handleSessionExpired();

            };


        document.addEventListener(
            "chat-auth-required",
            chatAuthHandler
        );


        const previewHandler =
            event => {

                const text =
                    event?.detail?.text ||
                    event?.detail?.content ||
                    "";


                if(text){

                    this.detectAndRenderPreview(
                        text
                    );

                }

            };


        document.addEventListener(
            "chat-preview",
            previewHandler
        );


        this.cleanupCallbacks.push(
            () => {

                document.removeEventListener(
                    "chat-state",
                    chatStateHandler
                );


                document.removeEventListener(
                    "chat-message",
                    chatMessageHandler
                );


                document.removeEventListener(
                    "chat-updated",
                    chatUpdatedHandler
                );


                document.removeEventListener(
                    "chat-error",
                    chatErrorHandler
                );


                document.removeEventListener(
                    "chat-auth-required",
                    chatAuthHandler
                );


                document.removeEventListener(
                    "chat-preview",
                    previewHandler
                );

            }
        );

    }


    /* ====================================================
       OPEN CHAT
    ==================================================== */

    openChat(){

        if(
            !authmanager ||
            typeof authmanager.isAuthenticated !==
            "function" ||
            !authmanager.isAuthenticated()
        ){

            this.showToast(
                "Faça login para utilizar o Chat Honey IA.",
                "error"
            );


            return false;

        }


        this.showWorkspaceView(
            "chat"
        );


        this.closeSidebar();


        this.updateURL(
            "chat"
        );


        EventBusInstance.emit(
            "chatOpened"
        );


        if(!this.chatInitialized){

            this.initChat().catch(
                error => {

                    console.error(
                        "Deferred chat initialization error:",
                        error
                    );

                }
            );

        }


        return true;

    }


    /* ====================================================
       NEW CHAT
    ==================================================== */

    async newChat(){

        if(!this.chatInitialized){

            await this.initChat();

        }


        try{

            if(
                this.chatInstance &&
                typeof this.chatInstance.newConversation ===
                "function"
            ){

                await this.chatInstance.newConversation();

                Store.patch({

                    conversation:
                        [],

                    currentChatId:
                        null

                });


                return true;

            }


            if(
                this.chatInstance &&
                typeof this.chatInstance.newChat ===
                "function"
            ){

                await this.chatInstance.newChat();

                Store.patch({

                    conversation:
                        [],

                    currentChatId:
                        null

                });


                return true;

            }


            if(
                this.chatInstance &&
                typeof this.chatInstance.reset ===
                "function"
            ){

                await this.chatInstance.reset();

                Store.patch({

                    conversation:
                        [],

                    currentChatId:
                        null

                });


                return true;

            }


            if(
                this.chatModule &&
                typeof this.chatModule.newChat ===
                "function"
            ){

                await this.chatModule.newChat();

                Store.patch({

                    conversation:
                        [],

                    currentChatId:
                        null

                });


                return true;

            }


            Store.patch({

                conversation:
                    [],

                currentChatId:
                    null

            });


            EventBusInstance.emit(
                "newChatRequested"
            );


            return true;

        }

        catch(error){

            console.error(
                "New chat error:",
                error
            );


            this.showToast(
                "Não foi possível iniciar uma nova conversa.",
                "error"
            );


            return false;

        }

    }


    /* ====================================================
       CHANGE CHAT AGENT
    ==================================================== */

    async setChatAgent(agentId){

        if(!agentId){

            return false;

        }


        Store.setState(
            "selectedAgent",
            agentId
        );


        try{

            if(
                this.chatInstance &&
                typeof this.chatInstance.setAgent ===
                "function"
            ){

                await this.chatInstance.setAgent(
                    agentId
                );

            }

            else if(
                this.chatModule &&
                typeof this.chatModule.setAgent ===
                "function"
            ){

                await this.chatModule.setAgent(
                    agentId
                );

            }


            EventBusInstance.emit(
                "agentChanged",
                {
                    id:
                        agentId
                }
            );


            EventBusInstance.emit(
                "chatAgentChanged",
                agentId
            );


            return true;

        }

        catch(error){

            console.error(
                "Chat agent change error:",
                error
            );


            return false;

        }

    }


    /* ====================================================
       SESSION EXPIRED
    ==================================================== */

    async handleSessionExpired(){

        try{

            if(
                authmanager &&
                typeof authmanager.clearSession ===
                "function"
            ){

                await authmanager.clearSession();

            }

        }

        catch(error){

            console.warn(
                "Session clear error:",
                error
            );

        }


        this.resetRuntimeState();


        this.hideWorkspace();


        try{

            if(
                logincontroller &&
                typeof logincontroller.init ===
                "function"
            ){

                await logincontroller.init();

            }

        }

        catch(error){

            console.error(
                "Login initialization error:",
                error
            );

        }


        this.hideLoader();


        EventBusInstance.emit(
            "sessionExpired"
        );

    }


    /* ====================================================
       EVENT LISTENERS
    ==================================================== */

    initEventListeners(){

        /*
        ----------------------------------------------------
        CHAT NAVIGATION
        ----------------------------------------------------
        */

        const chatNavigationHandler =
            event => {

                const trigger =
                    event.target.closest(
                        "[data-target='chat']"
                    );


                if(!trigger){

                    return;

                }


                event.preventDefault();


                this.openChat();

            };


        document.addEventListener(
            "click",
            chatNavigationHandler
        );


        /*
        ----------------------------------------------------
        NEW CHAT
        ----------------------------------------------------
        */

        const newChatHandler =
            event => {

                const button =
                    event.target.closest(
                        "#btnNewChat, #btnNewConversation"
                    );


                if(!button){

                    return;

                }


                event.preventDefault();


                if(this.openChat()){

                    this.newChat();

                }

            };


        document.addEventListener(
            "click",
            newChatHandler
        );


        /*
        ----------------------------------------------------
        PREVIEW CLOSE
        ----------------------------------------------------
        */

        if(this.btnClosePreview){

            this.btnClosePreview.addEventListener(
                "click",
                () => {

                    this.closePreview();

                }
            );

        }


        /*
        ----------------------------------------------------
        MOBILE MENU
        ----------------------------------------------------
        */

        if(this.btnToggleMenu){

            this.btnToggleMenu.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    event.stopPropagation();

                    this.openSidebar();

                }
            );

        }


        if(this.btnCloseSidebar){

            this.btnCloseSidebar.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    event.stopPropagation();

                    this.closeSidebar();

                }
            );

        }


        if(this.sidebarOverlay){

            this.sidebarOverlay.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    this.closeSidebar();

                }
            );

        }


        /*
        ----------------------------------------------------
        USER BOX
        ----------------------------------------------------
        */

        const userBox =
            document.getElementById(
                "userBox"
            );


        if(userBox){

            userBox.addEventListener(
                "click",
                () => {

                    EventBusInstance.emit(
                        "userMenuRequested"
                    );

                }
            );

        }


        /*
        ----------------------------------------------------
        CHAT MODE
        ----------------------------------------------------
        */

        if(this.btnChatMode){

            this.btnChatMode.addEventListener(
                "click",
                () => {

                    this.activateChatMode();

                }
            );

        }


        /*
        ----------------------------------------------------
        LIVE MODE
        ----------------------------------------------------
        */

        if(this.btnLiveMode){

            this.btnLiveMode.addEventListener(
                "click",
                () => {

                    this.startLiveMode();

                }
            );

        }


        /*
        ----------------------------------------------------
        GLOBAL SEARCH
        ----------------------------------------------------
        */

        if(this.globalSearch){

            this.globalSearch.addEventListener(
                "keydown",
                event => {

                    if(
                        event.key !==
                        "Enter"
                    ){

                        return;

                    }


                    const query =
                        this.globalSearch.value
                            .trim();


                    if(!query){

                        return;

                    }


                    EventBusInstance.emit(
                        "globalSearch",
                        query
                    );

                }
            );

        }


        /*
        ----------------------------------------------------
        NOTIFICATIONS
        ----------------------------------------------------
        */

        if(this.btnNotifications){

            this.btnNotifications.addEventListener(
                "click",
                () => {

                    EventBusInstance.emit(
                        "notificationsRequested"
                    );

                }
            );

        }


        /*
        ----------------------------------------------------
        NAVIGATION
        ----------------------------------------------------
        */

        this.initNavigation();


        /*
        ----------------------------------------------------
        ESC
        ----------------------------------------------------
        */

        const escapeHandler =
            event => {

                if(
                    event.key ===
                    "Escape"
                ){

                    this.closeSidebar();

                }

            };


        document.addEventListener(
            "keydown",
            escapeHandler
        );


        this.cleanupCallbacks.push(
            () => {

                document.removeEventListener(
                    "click",
                    chatNavigationHandler
                );


                document.removeEventListener(
                    "click",
                    newChatHandler
                );


                document.removeEventListener(
                    "keydown",
                    escapeHandler
                );

            }
        );

    }


    /* ====================================================
       NAVIGATION
    ==================================================== */

    initNavigation(){

        if(this.navigationInitialized){

            return;

        }


        this.navigationInitialized =
            true;


        const navigationHandler =
            event => {

                const targetElement =
                    event.target.closest(
                        "[data-target]"
                    );


                if(!targetElement){

                    return;

                }


                const studioApp =
                    document.getElementById(
                        "studioApp"
                    );


                if(
                    studioApp &&
                    !studioApp.contains(
                        targetElement
                    )
                ){

                    return;

                }


                const target =
                    targetElement.dataset.target;


                if(!target){

                    return;

                }


                if(
                    target ===
                    "chat"
                ){

                    event.preventDefault();

                    this.openChat();

                    return;

                }


                const targetView =
                    document.getElementById(
                        target
                    );


                if(
                    !targetView ||
                    !targetView.classList.contains(
                        "workspace-view"
                    )
                ){

                    return;

                }


                event.preventDefault();


                this.showWorkspaceView(
                    target
                );


                this.closeSidebar();


                this.updateURL(
                    target
                );

            };


        document.addEventListener(
            "click",
            navigationHandler
        );


        const createProjectHandler =
            event => {

                const button =
                    event.target.closest(
                        "#btnCreateProject"
                    );


                if(!button){

                    return;

                }


                event.preventDefault();


                this.showWorkspaceView(
                    "projects"
                );


                this.closeSidebar();


                this.updateURL(
                    "projects"
                );


                EventBusInstance.emit(
                    "createProjectRequested"
                );

            };


        document.addEventListener(
            "click",
            createProjectHandler
        );


        const actionHandler =
            event => {

                const button =
                    event.target.closest(
                        "[data-action]"
                    );


                if(!button){

                    return;

                }


                const action =
                    button.dataset.action;


                if(
                    action ===
                    "chat"
                ){

                    event.preventDefault();

                    this.openChat();

                    return;

                }


                if(
                    action ===
                    "project"
                ){

                    event.preventDefault();

                    this.showWorkspaceView(
                        "projects"
                    );

                    this.closeSidebar();

                    this.updateURL(
                        "projects"
                    );


                    EventBusInstance.emit(
                        "createProjectRequested"
                    );

                }

            };


        document.addEventListener(
            "click",
            actionHandler
        );


        this.cleanupCallbacks.push(
            () => {

                document.removeEventListener(
                    "click",
                    navigationHandler
                );


                document.removeEventListener(
                    "click",
                    createProjectHandler
                );


                document.removeEventListener(
                    "click",
                    actionHandler
                );

            }
        );

    }


    /* ====================================================
       UPDATE URL
    ==================================================== */

    updateURL(target){

        if(!target){

            return;

        }


        try{

            history.replaceState(
                null,
                "",
                `#${target}`
            );

        }

        catch(error){

            console.warn(
                "Navigation history error:",
                error
            );

        }

    }


    /* ====================================================
       WORKSPACE VIEW
    ==================================================== */

    showWorkspaceView(
        target,
        updateHistory = true
    ){

        if(!target){

            return;

        }


        const targetView =
            document.getElementById(
                target
            );


        if(
            !targetView ||
            !targetView.classList.contains(
                "workspace-view"
            )
        ){

            console.warn(
                `Workspace view não encontrada: ${target}`
            );


            return;

        }


        const views =
            document.querySelectorAll(
                ".workspace-view"
            );


        views.forEach(
            view => {

                const active =
                    view.id ===
                    target;


                /*
                 * Removemos o hidden para que o CSS possa
                 * controlar a visualização normalmente.
                 */

                if(active){

                    view.hidden =
                        false;

                    view.removeAttribute(
                        "hidden"
                    );

                }

                else{

                    view.hidden =
                        true;

                    view.setAttribute(
                        "hidden",
                        ""
                    );

                }


                view.style.display =
                    active
                        ? ""
                        : "none";


                view.setAttribute(
                    "aria-hidden",
                    active
                        ? "false"
                        : "true"
                );

            }
        );


        const navItems =
            document.querySelectorAll(
                ".nav-item[data-target]"
            );


        navItems.forEach(
            item => {

                item.classList.toggle(
                    "active",
                    item.dataset.target ===
                    target
                );


                if(
                    item.dataset.target ===
                    target
                ){

                    item.setAttribute(
                        "aria-current",
                        "page"
                    );

                }

                else{

                    item.removeAttribute(
                        "aria-current"
                    );

                }

            }
        );


        Store.setState(
            "workspace",
            target
        );


        if(updateHistory){

            this.updateURL(
                target
            );

        }


        EventBusInstance.emit(
            "workspaceChanged",
            target
        );


        if(
            target ===
            "chat"
        ){

            EventBusInstance.emit(
                "chatOpened"
            );


            if(!this.chatInitialized){

                this.initChat().catch(
                    error => {

                        console.error(
                            "Chat view initialization error:",
                            error
                        );

                    }
                );

            }

        }


        console.log(
            `📍 Workspace: ${target}`
        );

    }


    /* ====================================================
       SIDEBAR
    ==================================================== */

    openSidebar(){

        this.initDOMReferences();


        if(this.sidebar){

            this.sidebar.classList.add(
                "open"
            );


            this.sidebar.setAttribute(
                "aria-hidden",
                "false"
            );

        }


        if(this.sidebarOverlay){

            this.sidebarOverlay.classList.add(
                "active"
            );


            this.sidebarOverlay.setAttribute(
                "aria-hidden",
                "false"
            );

        }


        document.body.classList.add(
            "sidebar-open"
        );


        EventBusInstance.emit(
            "sidebarOpened"
        );

    }


    closeSidebar(){

        this.initDOMReferences();


        if(this.sidebar){

            this.sidebar.classList.remove(
                "open"
            );


            this.sidebar.setAttribute(
                "aria-hidden",
                "true"
            );

        }


        if(this.sidebarOverlay){

            this.sidebarOverlay.classList.remove(
                "active"
            );


            this.sidebarOverlay.setAttribute(
                "aria-hidden",
                "true"
            );

        }


        document.body.classList.remove(
            "sidebar-open"
        );


        EventBusInstance.emit(
            "sidebarClosed"
        );

    }


    /* ====================================================
       LIVE MODE
    ==================================================== */

    async startLiveMode(){

        if(
            !authmanager ||
            typeof authmanager.isAuthenticated !==
            "function" ||
            !authmanager.isAuthenticated()
        ){

            this.showToast(
                "Faça login para utilizar o modo Live.",
                "error"
            );


            return false;

        }


        if(this.liveMode){

            return true;

        }


        try{

            if(
                !liveclient ||
                typeof liveclient.start !==
                "function"
            ){

                throw new Error(
                    "Live Client não está disponível."
                );

            }


            const result =
                await liveclient.start();


            if(
                result &&
                result.success
            ){

                this.currentMode =
                    "live";


                this.liveMode =
                    true;


                Store.patch({

                    currentMode:
                        "live",

                    liveConnected:
                        true

                });


                this.updateModeButtons();


                if(
                    this.chatInstance &&
                    typeof this.chatInstance.setMode ===
                    "function"
                ){

                    try{

                        await this.chatInstance.setMode(
                            "live"
                        );

                    }

                    catch(error){

                        console.warn(
                            "Chat Live synchronization error:",
                            error
                        );

                    }

                }


                EventBusInstance.emit(
                    "liveStarted",
                    result
                );


                this.showToast(
                    "Modo Live conectado.",
                    "success"
                );


                return true;

            }


            throw new Error(
                result?.message ||
                "Não foi possível conectar ao modo Live."
            );

        }

        catch(error){

            console.error(
                "Live Mode error:",
                error
            );


            this.currentMode =
                "chat";


            this.liveMode =
                false;


            Store.patch({

                currentMode:
                    "chat",

                liveConnected:
                    false

            });


            this.updateModeButtons();


            this.showToast(
                error?.message ||
                "Não foi possível iniciar o modo Live.",
                "error"
            );


            return false;

        }

    }


    /* ====================================================
       STOP LIVE MODE
    ==================================================== */

    async stopLiveMode(){

        try{

            if(
                liveclient &&
                typeof liveclient.stop ===
                "function"
            ){

                await liveclient.stop();

            }

        }

        catch(error){

            console.warn(
                "Live stop error:",
                error
            );

        }


        this.currentMode =
            "chat";


        this.liveMode =
            false;


        Store.patch({

            currentMode:
                "chat",

            liveConnected:
                false

        });


        this.updateModeButtons();


        if(
            this.chatInstance &&
            typeof this.chatInstance.setMode ===
            "function"
        ){

            try{

                await this.chatInstance.setMode(
                    "chat"
                );

            }

            catch(error){

                console.warn(
                    "Chat mode restore error:",
                    error
                );

            }

        }


        EventBusInstance.emit(
            "liveStopped"
        );

    }


    /* ====================================================
       CHAT MODE
    ==================================================== */

    async activateChatMode(){

        if(this.liveMode){

            await this.stopLiveMode();

            return;

        }


        this.currentMode =
            "chat";


        this.liveMode =
            false;


        Store.patch({

            currentMode:
                "chat",

            liveConnected:
                false

        });


        this.updateModeButtons();


        EventBusInstance.emit(
            "chatModeActivated"
        );


        if(
            this.chatInstance &&
            typeof this.chatInstance.setMode ===
            "function"
        ){

            try{

                await this.chatInstance.setMode(
                    "chat"
                );

            }

            catch(error){

                console.warn(
                    "Chat mode error:",
                    error
                );

            }

        }

    }


    /* ====================================================
       MODE BUTTONS
    ==================================================== */

    updateModeButtons(){

        this.btnChatMode
            ?.classList
            .toggle(
                "active",
                this.currentMode ===
                "chat"
            );


        this.btnLiveMode
            ?.classList
            .toggle(
                "active",
                this.currentMode ===
                "live"
            );


        if(this.btnChatMode){

            this.btnChatMode.setAttribute(
                "aria-pressed",
                this.currentMode ===
                "chat"
                    ? "true"
                    : "false"
            );

        }


        if(this.btnLiveMode){

            this.btnLiveMode.setAttribute(
                "aria-pressed",
                this.currentMode ===
                "live"
                    ? "true"
                    : "false"
            );

        }

    }


    /* ====================================================
       MARKDOWN
    ==================================================== */

    initMarkdownEngine(){

        if(
            typeof window ===
            "undefined"
        ){

            return;

        }


        if(!window.marked){

            console.warn(
                "Marked.js não encontrado."
            );


            return;

        }


        try{

            window.marked.setOptions({

                breaks:
                    true,

                gfm:
                    true

            });

        }

        catch(error){

            console.warn(
                "Markdown configuration error:",
                error
            );

        }

    }


    /* ====================================================
       HTML PREVIEW
    ==================================================== */

    detectAndRenderPreview(text){

        if(
            !text ||
            !this.livePreviewIframe
        ){

            return false;

        }


        const match =
            text.match(
                /```html\s*([\s\S]*?)```/i
            );


        if(
            !match ||
            !match[1]
        ){

            return false;

        }


        const html =
            match[1].trim();


        try{

            const frameDocument =
                this.livePreviewIframe.contentDocument ||
                this.livePreviewIframe.contentWindow?.document;


            if(!frameDocument){

                return false;

            }


            frameDocument.open();


            frameDocument.write(
                html
            );


            frameDocument.close();


            if(this.previewPane){

                this.previewPane.hidden =
                    false;

                this.previewPane.removeAttribute(
                    "hidden"
                );


                this.previewPane.style.display =
                    "block";

            }


            EventBusInstance.emit(
                "previewUpdated",
                {
                    html
                }
            );


            return true;

        }

        catch(error){

            console.error(
                "Preview rendering error:",
                error
            );


            return false;

        }

    }


    /* ====================================================
       CLOSE PREVIEW
    ==================================================== */

    closePreview(){

        if(this.previewPane){

            this.previewPane.hidden =
                true;

            this.previewPane.setAttribute(
                "hidden",
                ""
            );


            this.previewPane.style.display =
                "none";

        }


        EventBusInstance.emit(
            "previewClosed"
        );

    }


    /* ====================================================
       TOAST
    ==================================================== */

    showToast(
        message,
        type = "info"
    ){

        if(!message){

            return;

        }


        if(!this.toastContainer){

            this.toastContainer =
                document.getElementById(
                    "toastContainer"
                );

        }


        if(!this.toastContainer){

            console.warn(
                message
            );


            return;

        }


        const allowedTypes = [

            "info",

            "success",

            "warning",

            "error"

        ];


        const safeType =
            allowedTypes.includes(
                type
            )
                ? type
                : "info";


        const toast =
            document.createElement(
                "div"
            );


        toast.className =
            `toast ${safeType}`;


        toast.setAttribute(
            "role",
            "status"
        );


        toast.setAttribute(
            "aria-live",
            "polite"
        );


        toast.textContent =
            String(message);


        this.toastContainer.appendChild(
            toast
        );


        requestAnimationFrame(
            () => {

                toast.classList.add(
                    "visible"
                );

            }
        );


        setTimeout(
            () => {

                toast.classList.add(
                    "removing"
                );


                setTimeout(
                    () => {

                        toast.remove();

                    },
                    250
                );

            },
            TOAST_DURATION
        );

    }


    /* ====================================================
       MODALS
    ==================================================== */

    initModalsAndUiActions(){

        document
            .querySelectorAll(
                "[data-close]"
            )
            .forEach(
                button => {

                    button.addEventListener(
                        "click",
                        () => {

                            const modalId =
                                button.dataset.close;


                            const modal =
                                document.getElementById(
                                    modalId
                                );


                            if(modal){

                                modal.remove();

                            }

                        }
                    );

                }
            );

    }


    /* ====================================================
       AUTH REQUIRED
    ==================================================== */

    requireAuthentication(){

        if(
            authmanager &&
            typeof authmanager.isAuthenticated ===
            "function" &&
            authmanager.isAuthenticated()
        ){

            return true;

        }


        this.hideWorkspace();


        if(
            logincontroller &&
            typeof logincontroller.init ===
            "function"
        ){

            try{

                logincontroller.init();

            }

            catch(error){

                console.error(
                    "Login initialization error:",
                    error
                );

            }

        }


        return false;

    }


    /* ====================================================
       RESET RUNTIME STATE
    ==================================================== */

    resetRuntimeState(){

        Store.patch({

            isAuthenticated:
                false,

            user:
                null,

            conversation:
                [],

            currentChatId:
                null,

            loading:
                false,

            selectedFileBase64:
                null,

            selectedFileName:
                null,

            chatInitialized:
                false,

            currentMode:
                "chat",

            liveConnected:
                false,

            selectedAgent:
                DEFAULT_AGENT

        });


        this.currentMode =
            "chat";


        this.liveMode =
            false;


        this.voiceActive =
            false;


        this.voiceRecognition =
            null;


        this.chatInstance =
            null;


        this.chatModule =
            null;


        this.chatInitialized =
            false;


        this.chatEventsInitialized =
            false;


        this.updateModeButtons();

    }


    /* ====================================================
       LOGOUT
    ==================================================== */

    async logout(){

        console.log(
            "🔐 A terminar sessão Honey IA..."
        );


        try{

            if(this.liveMode){

                await this.stopLiveMode();

            }

        }

        catch(error){

            console.warn(
                "Live shutdown error:",
                error
            );

        }


        try{

            if(
                authmanager &&
                typeof authmanager.logout ===
                "function"
            ){

                await authmanager.logout();

            }

        }

        catch(error){

            console.error(
                "Logout error:",
                error
            );

        }


        this.resetRuntimeState();


        this.closeSidebar();


        this.hideWorkspace();


        try{

            if(
                logincontroller &&
                typeof logincontroller.init ===
                "function"
            ){

                await logincontroller.init();

            }

        }

        catch(error){

            console.error(
                "Login initialization error:",
                error
            );

        }


        this.hideLoader();


        EventBusInstance.emit(
            "loggedOut"
        );


        console.log(
            "✅ Sessão encerrada."
        );

    }


    /* ====================================================
       APPLICATION START
    ==================================================== */

    async init(){

        if(this.initialized){

            return;

        }


        this.initialized =
            true;


        console.log(
            `🐝 Honey IA Studio V${APP_VERSION} iniciado`,
            APPLICATION_SESSION_ID
        );


        /*
         * Garantir referências DOM antes de qualquer
         * operação de inicialização.
         */

        this.initDOMReferences();


        /*
         * Garantir que o workspace começa escondido
         * até a autenticação ser resolvida.
         */

        if(this.studioApp){

            this.studioApp.hidden =
                true;

            this.studioApp.setAttribute(
                "hidden",
                ""
            );

        }


        try{

            await this.startAuthentication();

        }

        catch(error){

            console.error(
                "HONEY IA START ERROR:",
                error
            );


            /*
             * Não deixar o loader infinito.
             */

            this.hideLoader();


            this.showToast(
                "Não foi possível iniciar o Honey IA.",
                "error"
            );

        }

    }


    /* ====================================================
       DESTROY
    ==================================================== */

    destroy(){

        try{

            if(
                this.liveMode &&
                liveclient &&
                typeof liveclient.stop ===
                "function"
            ){

                liveclient.stop();

            }

        }

        catch(error){

            console.warn(
                "Live cleanup error:",
                error
            );

        }


        this.cleanupCallbacks.forEach(
            cleanup => {

                try{

                    cleanup();

                }

                catch(error){

                    console.warn(
                        "Cleanup error:",
                        error
                    );

                }

            }
        );


        this.cleanupCallbacks =
            [];


        if(
            this.authSubscription &&
            typeof this.authSubscription ===
            "function"
        ){

            try{

                this.authSubscription();

            }

            catch(error){

                console.warn(
                    "Auth subscription cleanup error:",
                    error
                );

            }

        }


        this.authSubscription =
            null;


        this.chatInstance =
            null;


        this.chatModule =
            null;


        this.chatInitialized =
            false;


        this.chatEventsInitialized =
            false;


        this.initialized =
            false;


        this.workspaceInitialized =
            false;


        this.navigationInitialized =
            false;


        this.agentsInitialized =
            false;


        this.agentStudioInitialized =
            false;


        EventBusInstance.emit(
            "applicationDestroyed"
        );

    }

}


/* ========================================================
   CREATE APPLICATION
======================================================== */

const honeyAI =
    new HoneyAIApp();


/* ========================================================
   APPLICATION START
======================================================== */

const startHoneyAI =
    async () => {

        try{

            await honeyAI.init();

        }

        catch(error){

            console.error(
                "HONEY IA START ERROR:",
                error
            );


            honeyAI.hideLoader();


            honeyAI.showToast(
                "Não foi possível iniciar o Honey IA.",
                "error"
            );

        }

    };


/* ========================================================
   DOM READY
======================================================== */

if(
    document.readyState ===
    "loading"
){

    document.addEventListener(
        "DOMContentLoaded",
        startHoneyAI,
        {
            once:
                true
        }
    );

}

else{

    startHoneyAI();

}


/* ========================================================
   GLOBAL EXPORT
======================================================== */

export default honeyAI;


/*
==========================================================
HONEY IA STUDIO
APPLICATION CONTROLLER V14.0
FINAL
==========================================================
*/
