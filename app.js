/*
==========================================================
HONEY IA
CORE ENGINE V11.0
Workspace + 30 Agents Integration
Enterprise Application Controller

AUTHENTICATION
JWT + MongoDB + Google
AUTH DELEGATED TO auth.js + login.js

CHAT
CHAT DELEGATED TO chat.js
API: /api/chat

PREMIUM AUTH FLOW
AUTH V6 COMPATIBLE

NAVIGATION ENGINE
Responsive Sidebar
Dynamic Workspace Navigation
Dashboard Actions
Agent Navigation
Project Navigation
Chat Navigation
==========================================================
*/


import liveclient from "./liveclient.js";

import agentstudio from "./agentstudio.js";

import { components } from "./components.js";

import agentsui from "./agents-ui.js";

import dashboard from "./dashboard.js";

import authmanager from "./auth.js";

import logincontroller from "./login.js";

import userprofile from "./userprofile.js";


/*
==========================================================
SESSION
==========================================================
*/


const SESSION_ID =

    crypto.randomUUID();


/*
==========================================================
EVENT BUS
==========================================================
*/


class EventBus {


    constructor(){


        this.events = {};


    }


    on(

        event,

        callback

    ){


        if(

            !this.events[event]

        ){


            this.events[event] = [];


        }


        if(

            typeof callback ===

            "function"

        ){


            this.events[event].push(

                callback

            );


        }


    }


    off(

        event,

        callback

    ){


        if(

            !this.events[event]

        )

        return;


        this.events[event] =

            this.events[event].filter(

                listener =>

                    listener !== callback

            );


    }


    emit(

        event,

        data

    ){


        if(

            !this.events[event]

        )

        return;


        this.events[event].forEach(

            callback => {


                try{


                    callback(

                        data

                    );


                }


                catch(error){


                    console.error(

                        "Event error:",

                        error

                    );


                }


            }

        );


    }


}


/*
==========================================================
GLOBAL EVENT BUS
==========================================================
*/


export const EventBusInstance =

    new EventBus();


/*
==========================================================
GLOBAL STORE
==========================================================
*/


export const Store = {


    state:{


        sessionId:

            SESSION_ID,


        conversation:

            [],


        loading:

            false,


        selectedFileBase64:

            null,


        selectedFileName:

            null,


        selectedAgent:

            "general",


        isAuthenticated:

            false,


        workspace:

            "dashboard",


        user:

            null,


        chatInitialized:

            false,


        currentChatId:

            null


    },


    setState(

        key,

        value

    ){


        this.state[key] =

            value;


        EventBusInstance.emit(

            "stateChanged",

            {

                key,

                value

            }

        );


    }


};


/*
==========================================================
HONEY IA APPLICATION
==========================================================
*/


class HoneyAIApp {


    constructor(){


        this.voiceActive =

            false;


        this.voiceRecognition =

            null;


        this.liveMode =

            false;


        this.currentMode =

            "chat";


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


        this.chatModule =

            null;


        this.authSubscription =

            null;


        this.initDOMReferences();


        this.bindAuthEvents();


    }


    /*
    ======================================================
    AUTHENTICATION BOOT
    ======================================================
    */


    async startAuthentication(){


        if(

            this.authInitialized

        )

        return;


        this.authInitialized =

            true;


        console.log(

            "🔐 A verificar sessão Honey IA..."

        );


        try{


            await Promise.race([

                authmanager.waitUntilReady(),

                new Promise(

                    resolve =>

                        setTimeout(

                            resolve,

                            6000

                        )

                )

            ]);


        }


        catch(error){


            console.error(

                "AUTH READY ERROR:",

                error

            );


        }


        const user =

            authmanager.getUser();


        if(

            authmanager.isAuthenticated()

        ){


            this.handleAuthenticatedUser(

                user,

                false

            );


            return;


        }


        this.handleUnauthenticatedUser();


        try{


            await logincontroller.init();


        }


        catch(error){


            console.error(

                "Login initialization error:",

                error

            );


        }


        this.hideLoader();


    }


    /*
    ======================================================
    AUTHENTICATED USER
    ======================================================
    */


    handleAuthenticatedUser(

        user,

        showWelcome = false

    ){


        if(!user)

        return;


        Store.setState(

            "isAuthenticated",

            true

        );


        Store.setState(

            "user",

            user

        );


        this.updateUserInterface(

            user

        );


        this.showWorkspace();


        this.initializeWorkspace();


        if(showWelcome){


            this.showToast(

                `Bem-vindo, ${this.getUserName(user)}!`,

                "success"

            );


        }


    }


    /*
    ======================================================
    UNAUTHENTICATED USER
    ======================================================
    */


    handleUnauthenticatedUser(){


        Store.setState(

            "isAuthenticated",

            false

        );


        Store.setState(

            "user",

            null

        );


        this.hideWorkspace();


    }


    /*
    ======================================================
    AUTH EVENTS
    ======================================================
    */


    bindAuthEvents(){


        this.authSubscription =

            authmanager.subscribe(

                user => {


                    if(

                        user &&

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


        document.addEventListener(

            "user-login",

            event => {


                const user =

                    event.detail ||

                    authmanager.getUser();


                if(!user)

                return;


                this.handleAuthenticatedUser(

                    user,

                    true

                );


            }

        );


        document.addEventListener(

            "user-logout",

            async () => {


                await this.logout();


            }

        );


    }


    /*
    ======================================================
    SHOW WORKSPACE
    ======================================================
    */


    showWorkspace(){


        const studioApp =

            document.getElementById(

                "studioApp"

            );


        const loginApp =

            document.getElementById(

                "loginApp"

            );


        if(studioApp){


            studioApp.style.display =

                "flex";


            studioApp.classList.add(

                "auth-ready"

            );


        }


        if(loginApp){


            loginApp.style.display =

                "none";


        }


        this.hideLoader();


    }


    /*
    ======================================================
    HIDE WORKSPACE
    ======================================================
    */


    hideWorkspace(){


        const studioApp =

            document.getElementById(

                "studioApp"

            );


        if(studioApp){


            studioApp.style.display =

                "none";


        }


    }


    /*
    ======================================================
    LOADER
    ======================================================
    */


    hideLoader(){


        const loader =

            document.getElementById(

                "appLoader"

            );


        if(!loader)

        return;


        loader.classList.add(

            "hidden"

        );


        loader.classList.add(

            "is-hidden"

        );


        setTimeout(

            () => {


                if(loader){

                    loader.style.display =

                        "none";

                }


            },

            450

        );


    }


    /*
    ======================================================
    WORKSPACE INITIALIZATION
    ======================================================
    */


    initializeWorkspace(){


        if(

            this.workspaceInitialized

        )

        return;


        this.workspaceInitialized =

            true;


        console.log(

            "🐝 Inicializando Honey IA Workspace..."

        );


        this.initDOMReferences();


        this.initUserSession();


        this.initDashboard();


        this.initEventListeners();


        this.initMarkdownEngine();


        this.initModalsAndUiActions();


        this.initAgents();


        this.initAgentStudio();


        this.initChat();


        this.initializeInitialWorkspace();


        console.log(

            "🚀 Honey IA Workspace carregado."

        );


    }


    /*
    ======================================================
    INITIAL WORKSPACE
    ======================================================
    */


    initializeInitialWorkspace(){


        const hash =

            window.location.hash

                .replace(

                    "#",

                    ""

                )

                .trim();


        const validView =

            document.getElementById(

                hash

            );


        if(

            hash &&

            validView &&

            validView.classList.contains(

                "workspace-view"

            )

        ){


            this.showWorkspaceView(

                hash

            );


            return;


        }


        this.showWorkspaceView(

            "dashboard"

        );


    }


    /*
    ======================================================
    USER SESSION
    ======================================================
    */


    initUserSession(){


        const user =

            authmanager.getUser();


        if(!user)

        return;


        Store.setState(

            "isAuthenticated",

            authmanager.isAuthenticated()

        );


        Store.setState(

            "user",

            user

        );


        this.updateUserInterface(

            user

        );


    }


    /*
    ======================================================
    USER INTERFACE
    ======================================================
    */


    updateUserInterface(

        user

    ){


        if(!user)

        return;


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


            const avatarMarkup =

                (

                    typeof avatar ===

                    "string" &&

                    (

                        avatar.startsWith(

                            "http"

                        ) ||

                        avatar.startsWith(

                            "data:image"

                        )

                    )

                )

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

                <div>

                    <strong>

                        ${this.escapeHTML(displayName)}

                    </strong>

                    <small>

                        Plano ${this.escapeHTML(plan)}

                    </small>

                </div>

            `;


        }


        if(planBadge){


            planBadge.innerHTML = `

                <span>

                    Plano

                </span>

                <strong>

                    ${this.escapeHTML(plan)}

                </strong>

            `;


        }


    }


    /*
    ======================================================
    GET USER NAME
    ======================================================
    */


    getUserName(

        user

    ){


        if(!user)

        return "Utilizador";


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


    /*
    ======================================================
    GET PLAN NAME
    ======================================================
    */


    getPlanName(

        plan

    ){


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


    /*
    ======================================================
    ESCAPE HTML
    ======================================================
    */


    escapeHTML(

        value

    ){


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
    ======================================================
    DASHBOARD
    ======================================================
    */


    initDashboard(){


        const dashboardContainer =

            document.getElementById(

                "dashboardContainer"

            );


        if(

            dashboardContainer &&

            dashboard &&

            typeof dashboard.init ===

            "function"

        ){


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


    }


    /*
    ======================================================
    AGENTS
    ======================================================
    */


    initAgents(){


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


        document.addEventListener(

            "agent-selected",

            event => {


                const agent =

                    event.detail;


                if(

                    agent &&

                    agent.id

                ){


                    Store.setState(

                        "selectedAgent",

                        agent.id

                    );


                    EventBusInstance.emit(

                        "agentChanged",

                        agent

                    );


                }


            }

        );


    }


    /*
    ======================================================
    AGENT STUDIO
    ======================================================
    */


    initAgentStudio(){


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


    /*
    ======================================================
    CHAT ENGINE
    ======================================================
    */


    async initChat(){


        if(

            this.chatInitialized

        )

        return;


        const chatSection =

            document.getElementById(

                "chat"

            );


        if(!chatSection){


            console.warn(

                "⚠️ Chat section não encontrada."

            );


            return;


        }


        try{


            /*
            --------------------------------------------------
            O chat.js já pode estar carregado pelo index.html.
            O import dinâmico utiliza o módulo em cache quando
            disponível e evita duplicação de carregamento.
            --------------------------------------------------
            */


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


            /*
            --------------------------------------------------
            Caso chat.js exporte uma classe
            --------------------------------------------------
            */


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

                        "Chat exportado como função/classe não pôde ser instanciado automaticamente:",

                        error

                    );

                }


            }


            this.chatInstance =

                chatInstance;


            /*
            --------------------------------------------------
            INICIALIZAÇÃO
            --------------------------------------------------
            */


            if(

                this.chatInstance &&

                typeof this.chatInstance.init ===

                "function"

            ){


                await this.chatInstance.init({

                    sessionId:

                        SESSION_ID,


                    user:

                        authmanager.getUser(),


                    agentId:

                        Store.state.selectedAgent,


                    workspace:

                        Store.state.workspace,


                    apiBase:

                        "/api/chat"


                });


            }


            else if(

                chatModule &&

                typeof chatModule.init ===

                "function"

            ){


                await chatModule.init({

                    sessionId:

                        SESSION_ID,


                    user:

                        authmanager.getUser(),


                    agentId:

                        Store.state.selectedAgent,


                    workspace:

                        Store.state.workspace,


                    apiBase:

                        "/api/chat"


                });


            }


            else{


                console.warn(

                    "⚠️ chat.js carregado, mas não foi encontrada uma função init()."

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


            /*
            --------------------------------------------------
            EVENTOS DO CHAT
            --------------------------------------------------
            */


            this.bindChatEvents();


        }


        catch(error){


            console.error(

                "❌ Chat initialization error:",

                error

            );


        }


    }


    /*
    ======================================================
    CHAT EVENTS
    ======================================================
    */


    bindChatEvents(){


        document.addEventListener(

            "chat-state",

            event => {


                const state =

                    event.detail;


                if(!state)

                return;


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


            }

        );


        document.addEventListener(

            "chat-message",

            event => {


                EventBusInstance.emit(

                    "chatMessage",

                    event.detail

                );


            }

        );


        document.addEventListener(

            "chat-updated",

            event => {


                EventBusInstance.emit(

                    "conversationUpdated",

                    event.detail

                );


            }

        );


        document.addEventListener(

            "chat-error",

            event => {


                const error =

                    event.detail;


                this.showToast(

                    error?.message ||

                    "Erro no chat.",

                    "error"

                );


            }

        );


        document.addEventListener(

            "chat-auth-required",

            async () => {


                this.showToast(

                    "A sua sessão expirou. Faça login novamente.",

                    "error"

                );


                await this.handleSessionExpired();


            }

        );


    }


    /*
    ======================================================
    CHAT NAVIGATION
    ======================================================
    */


    openChat(){


        if(

            !authmanager.isAuthenticated()

        ){


            this.showToast(

                "Faça login para utilizar o Chat Honey IA.",

                "error"

            );


            return;


        }


        this.showWorkspaceView(

            "chat"

        );


        this.closeSidebar();


        try{


            history.replaceState(

                null,

                "",

                "#chat"

            );


        }


        catch(error){


            console.warn(

                "Chat navigation history error:",

                error

            );


        }


        EventBusInstance.emit(

            "chatOpened"

        );


    }


    /*
    ======================================================
    NEW CHAT
    ======================================================
    */


    async newChat(){


        if(!this.chatInstance)

        return;


        try{


            if(

                typeof this.chatInstance.newConversation ===

                "function"

            ){


                await this.chatInstance.newConversation();


                return;


            }


            if(

                typeof this.chatInstance.newChat ===

                "function"

            ){


                await this.chatInstance.newChat();


                return;


            }


            if(

                typeof this.chatInstance.reset ===

                "function"

            ){


                await this.chatInstance.reset();


                return;


            }


            if(

                this.chatModule &&

                typeof this.chatModule.newChat ===

                "function"

            ){


                await this.chatModule.newChat();


            }


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


        }


    }


    /*
    ======================================================
    CHAT AGENT CHANGE
    ======================================================
    */


    async setChatAgent(

        agentId

    ){


        if(!agentId)

        return;


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


        }


        catch(error){


            console.error(

                "Chat agent change error:",

                error

            );


        }


    }


    /*
    ======================================================
    SESSION EXPIRED
    ======================================================
    */


    async handleSessionExpired(){


        try{


            authmanager.clearSession();


        }


        catch(error){


            console.warn(

                "Session clear error:",

                error

            );


        }


        Store.setState(

            "isAuthenticated",

            false

        );


        Store.setState(

            "user",

            null

        );


        this.hideWorkspace();


        try{


            await logincontroller.init();


        }


        catch(error){


            console.error(

                "Login initialization error:",

                error

            );


        }


    }


    /*
    ======================================================
    DOM REFERENCES
    ======================================================
    */


    initDOMReferences(){


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


    }


    /*
    ======================================================
    EVENT LISTENERS
    ======================================================
    */


    initEventListeners(){


        /*
        --------------------------------------------------
        CHAT NAVIGATION
        --------------------------------------------------
        */


        const chatTriggers =

            document.querySelectorAll(

                "[data-target='chat']"

            );


        chatTriggers.forEach(

            button => {


                button.addEventListener(

                    "click",

                    event => {


                        event.preventDefault();


                        this.openChat();


                    }

                );


            }

        );


        /*
        --------------------------------------------------
        NEW CHAT
        --------------------------------------------------
        */


        document.addEventListener(

            "click",

            event => {


                const button =

                    event.target.closest(

                        "#btnNewChat, #btnNewConversation"

                    );


                if(!button)

                return;


                event.preventDefault();


                this.openChat();


                this.newChat();


            }

        );


        /*
        --------------------------------------------------
        FILE PREVIEW
        --------------------------------------------------
        */


        if(this.btnClosePreview){


            this.btnClosePreview.addEventListener(

                "click",

                () => {


                    if(this.previewPane){


                        this.previewPane.style.display =

                            "none";


                    }


                }

            );


        }


        /*
        --------------------------------------------------
        MOBILE SIDEBAR
        --------------------------------------------------
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
        --------------------------------------------------
        USER BOX
        --------------------------------------------------
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
        --------------------------------------------------
        LIVE MODE
        --------------------------------------------------
        */


        if(this.btnChatMode){


            this.btnChatMode.addEventListener(

                "click",

                () =>

                    this.activateChatMode()

            );


        }


        if(this.btnLiveMode){


            this.btnLiveMode.addEventListener(

                "click",

                () =>

                    this.startLiveMode()

            );


        }


        /*
        --------------------------------------------------
        GLOBAL SEARCH
        --------------------------------------------------
        */


        if(this.globalSearch){


            this.globalSearch.addEventListener(

                "keydown",

                event => {


                    if(

                        event.key !==

                        "Enter"

                    )

                    return;


                    const query =

                        this.globalSearch.value

                            .trim();


                    if(!query)

                    return;


                    EventBusInstance.emit(

                        "globalSearch",

                        query

                    );


                }

            );


        }


        /*
        --------------------------------------------------
        NOTIFICATIONS
        --------------------------------------------------
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
        --------------------------------------------------
        NAVIGATION
        --------------------------------------------------
        */


        this.initNavigation();


    }


    /*
    ======================================================
    NAVIGATION ENGINE
    ======================================================
    */


    initNavigation(){


        if(

            this.navigationInitialized

        )

        return;


        this.navigationInitialized =

            true;


        document.addEventListener(

            "click",

            event => {


                const targetElement =

                    event.target.closest(

                        "[data-target]"

                    );


                if(!targetElement)

                return;


                const studioApp =

                    document.getElementById(

                        "studioApp"

                    );


                if(

                    studioApp &&

                    !studioApp.contains(

                        targetElement

                    )

                )

                return;


                const target =

                    targetElement.dataset.target;


                if(!target)

                return;


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

        );


        /*
        --------------------------------------------------
        CRIAR PROJETO
        --------------------------------------------------
        */


        document.addEventListener(

            "click",

            event => {


                const button =

                    event.target.closest(

                        "#btnCreateProject"

                    );


                if(!button)

                return;


                event.preventDefault();


                this.showWorkspaceView(

                    "projects"

                );


                this.closeSidebar();


                try{


                    history.replaceState(

                        null,

                        "",

                        "#projects"

                    );


                }


                catch(error){


                    console.warn(

                        "Project navigation history error:",

                        error

                    );


                }


                EventBusInstance.emit(

                    "createProjectRequested"

                );


            }

        );


        /*
        --------------------------------------------------
        ESC
        --------------------------------------------------
        */


        document.addEventListener(

            "keydown",

            event => {


                if(

                    event.key ===

                    "Escape"

                ){


                    this.closeSidebar();


                }


            }

        );


    }


    /*
    ======================================================
    SHOW WORKSPACE VIEW
    ======================================================
    */


    showWorkspaceView(

        target

    ){


        if(!target)

        return;


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


                const isTarget =

                    view.id ===

                    target;


                view.style.display =

                    isTarget

                        ? ""

                        : "none";


                view.setAttribute(

                    "aria-hidden",

                    isTarget

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


            }

        );


        Store.setState(

            "workspace",

            target

        );


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


        }


        console.log(

            `📍 Workspace: ${target}`

        );


    }


    /*
    ======================================================
    SIDEBAR
    ======================================================
    */


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


    }


    /*
    ======================================================
    LIVE MODE
    ======================================================
    */


    async startLiveMode(){


        if(

            !authmanager.isAuthenticated()

        ){


            this.showToast(

                "Faça login para utilizar o modo Live.",

                "error"

            );


            return;


        }


        try{


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


                this.updateModeButtons();


                EventBusInstance.emit(

                    "liveStarted",

                    result

                );


                this.showToast(

                    "Modo Live conectado.",

                    "success"

                );


            }


        }


        catch(error){


            this.showToast(

                error.message ||

                "Não foi possível iniciar o modo Live.",

                "error"

            );


        }


    }


    /*
    ======================================================
    CHAT MODE
    ======================================================
    */


    activateChatMode(){


        this.currentMode =

            "chat";


        this.liveMode =

            false;


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


                this.chatInstance.setMode(

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


    /*
    ======================================================
    MODE BUTTONS
    ======================================================
    */


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


    }


    /*
    ======================================================
    MARKDOWN
    ======================================================
    */


    initMarkdownEngine(){


        if(window.marked){


            window.marked.setOptions({


                breaks:

                    true,


                gfm:

                    true


            });


        }


    }


    /*
    ======================================================
    HTML LIVE PREVIEW
    ======================================================
    */


    detectAndRenderPreview(

        text

    ){


        if(!this.livePreviewIframe)

        return;


        const match =

            text.match(

                /```html([\s\S]*?)```/i

            );


        if(

            match &&

            match[1]

        ){


            const html =

                match[1].trim();


            const documentFrame =

                this.livePreviewIframe

                    .contentDocument ||

                this.livePreviewIframe

                    .contentWindow

                    ?.document;


            if(!documentFrame)

            return;


            documentFrame.open();


            documentFrame.write(

                html

            );


            documentFrame.close();


            if(this.previewPane){


                this.previewPane.style.display =

                    "block";


            }


            EventBusInstance.emit(

                "previewUpdated",

                {

                    html

                }

            );


        }


    }


    /*
    ======================================================
    TOAST
    ======================================================
    */


    showToast(

        message,

        type = "info"

    ){


        if(!this.toastContainer){


            this.toastContainer =

                document.getElementById(

                    "toastContainer"

                );


        }


        if(!this.toastContainer)

        return;


        const toast =

            document.createElement(

                "div"

            );


        toast.className =

            `toast ${type}`;


        toast.textContent =

            message || "";


        this.toastContainer.appendChild(

            toast

        );


        setTimeout(

            () => {


                toast.classList.add(

                    "removing"

                );


                setTimeout(

                    () =>

                        toast.remove(),

                    250

                );


            },

            3500

        );


    }


    /*
    ======================================================
    MODALS / UI
    ======================================================
    */


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


                            const modal =

                                document.getElementById(

                                    button.dataset.close

                                );


                            modal?.remove();


                        }

                    );


                }

            );


    }


    /*
    ======================================================
    LOGOUT
    ======================================================
    */


    async logout(){


        try{


            await authmanager.logout();


        }


        catch(error){


            console.error(

                "Logout error:",

                error

            );


        }


        Store.setState(

            "isAuthenticated",

            false

        );


        Store.setState(

            "user",

            null

        );


        Store.state.conversation = [];


        Store.setState(

            "currentChatId",

            null

        );


        Store.setState(

            "chatInitialized",

            false

        );


        this.workspaceInitialized =

            false;


        this.navigationInitialized =

            false;


        this.currentMode =

            "chat";


        this.liveMode =

            false;


        this.hideWorkspace();


        try{


            await logincontroller.init();


        }


        catch(error){


            console.error(

                "Login initialization error:",

                error

            );


        }


        this.hideLoader();


    }


    /*
    ======================================================
    AUTH REQUIRED
    ======================================================
    */


    requireAuthentication(){


        if(

            authmanager.isAuthenticated()

        ){


            return true;


        }


        this.hideWorkspace();


        logincontroller.init();


        return false;


    }


    /*
    ======================================================
    APPLICATION START
    ======================================================
    */


    async init(){


        if(this.initialized)

        return;


        this.initialized =

            true;


        console.log(

            "🐝 Honey IA V11.0 iniciado",

            SESSION_ID

        );


        await this.startAuthentication();


    }


}


/*
==========================================================
CREATE APPLICATION
==========================================================
*/


const honeyAI =

    new HoneyAIApp();


/*
==========================================================
START
==========================================================
*/


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


            honeyAI.showToast(

                "Não foi possível iniciar o Honey IA.",

                "error"

            );


        }


    };


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


/*
==========================================================
EXPORT
==========================================================
*/


export default honeyAI;
