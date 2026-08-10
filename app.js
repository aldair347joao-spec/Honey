/*
==========================================
HONEY IA
CORE ENGINE V10.0
Workspace + 30 Agents Integration
Enterprise Application Controller

AUTHENTICATION
JWT + MongoDB + Google
AUTH DELEGATED TO auth.js + login.js

PREMIUM AUTH FLOW
AUTH V6 COMPATIBLE

NAVIGATION ENGINE
Responsive Sidebar
Dynamic Workspace Navigation
Dashboard Actions
Agent Navigation
Project Navigation
==========================================
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



        /*
        --------------------------------------------------
        ATUALIZAR REFERÊNCIAS DOM
        --------------------------------------------------
        */


        this.initDOMReferences();



        /*
        --------------------------------------------------
        DASHBOARD
        --------------------------------------------------
        */


        this.initDashboard();



        /*
        --------------------------------------------------
        EVENTOS PRINCIPAIS
        --------------------------------------------------
        */


        this.initEventListeners();



        /*
        --------------------------------------------------
        MARKDOWN
        --------------------------------------------------
        */


        this.initMarkdownEngine();



        /*
        --------------------------------------------------
        MODALS / UI
        --------------------------------------------------
        */


        this.initModalsAndUiActions();



        /*
        --------------------------------------------------
        AGENTS
        --------------------------------------------------
        */


        this.initAgents();



        /*
        --------------------------------------------------
        AGENT STUDIO
        --------------------------------------------------
        */


        this.initAgentStudio();



        /*
        --------------------------------------------------
        RESTAURAR WORKSPACE
        --------------------------------------------------
        */


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


    }



    /*
    ======================================================
    EVENT LISTENERS
    ======================================================
    */


    initEventListeners(){


        /*
        --------------------------------------------------
        CHAT SEND
        --------------------------------------------------
        */


        if(this.btnSend){


            this.btnSend.addEventListener(

                "click",

                () =>

                    this.handleSubmitPrompt()

            );


        }



        if(this.promptTextarea){


            this.promptTextarea.addEventListener(

                "keydown",

                event => {


                    if(

                        event.key === "Enter" &&

                        !event.shiftKey

                    ){


                        event.preventDefault();



                        this.handleSubmitPrompt();


                    }


                }

            );


        }



        /*
        --------------------------------------------------
        FILE
        --------------------------------------------------
        */


        if(

            this.btnAttach &&

            this.fileUploadInput

        ){


            this.btnAttach.addEventListener(

                "click",

                () =>

                    this.fileUploadInput.click()

            );


        }



        if(this.fileUploadInput){


            this.fileUploadInput.addEventListener(

                "change",

                event =>

                    this.handleFileUpload(

                        event

                    )

            );


        }



        if(this.btnRemoveAttachment){


            this.btnRemoveAttachment.addEventListener(

                "click",

                () =>

                    this.clearAttachment()

            );


        }



        /*
        --------------------------------------------------
        VOICE
        --------------------------------------------------
        */


        if(this.btnVoice){


            this.btnVoice.addEventListener(

                "click",

                () =>

                    this.handleVoiceInput()

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
        PREVIEW
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
        NAVIGATION
        --------------------------------------------------
        */


        this.initNavigation();



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
        MODES
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



        /*
        --------------------------------------------------
        EVENT DELEGATION
        --------------------------------------------------

        Em vez de ligar eventos apenas aos elementos
        existentes no momento da inicialização, usamos
        um único listener no documento.

        Isso permite que Dashboard, Agents ou outros
        módulos criem novos elementos data-target
        posteriormente sem perder a navegação.
        --------------------------------------------------
        */


        document.addEventListener(

            "click",

            event => {


                const targetElement =

                    event.target.closest(

                        "[data-target]"

                    );



                if(!targetElement)

                return;



                /*
                ------------------------------------------
                IGNORAR ELEMENTOS FORA DO STUDIO
                ------------------------------------------
                */


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



                /*
                ------------------------------------------
                TARGET
                ------------------------------------------
                */


                const target =

                    targetElement.dataset.target;



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

                    return;

                }



                /*
                ------------------------------------------
                EVITAR NAVEGAÇÃO DUPLICADA
                ------------------------------------------
                */


                event.preventDefault();



                /*
                ------------------------------------------
                MOSTRAR VIEW
                ------------------------------------------
                */


                this.showWorkspaceView(

                    target

                );



                /*
                ------------------------------------------
                FECHAR SIDEBAR
                ------------------------------------------
                */


                this.closeSidebar();



                /*
                ------------------------------------------
                HASH
                ------------------------------------------
                */


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

                    event.key === "Escape"

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

                    view.id === target;



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
    CHAT
    ======================================================
    */


    async handleSubmitPrompt(){


        if(

            !authmanager.isAuthenticated()

        ){


            this.showToast(

                "A sua sessão expirou. Faça login novamente.",

                "error"

            );



            try{


                await logincontroller.init();


            }

            catch(error){


                console.error(

                    "Login initialization error:",

                    error

                );


            }



            return;


        }



        const text =

            this.promptTextarea

                ?

                this.promptTextarea.value.trim()

                :

                "";



        const fileBase64 =

            Store.state.selectedFileBase64;



        const fileName =

            Store.state.selectedFileName;



        if(

            !text &&

            !fileBase64

        )

        return;



        this.appendUserMessage(

            text,

            fileName

        );



        const loadingMessage =

            this.createAgentMessagePlaceholder();



        if(this.promptTextarea){


            this.promptTextarea.value =

                "";


        }



        Store.setState(

            "loading",

            true

        );



        try{


            let activeAgent =

                Store.state.selectedAgent;



            if(

                agentstudio &&

                typeof agentstudio.getAgent ===

                "function"

            ){


                activeAgent =

                    agentstudio.getAgent() ||

                    activeAgent;


            }



            const payload = {


                prompt:

                    text,



                agentId:

                    activeAgent,



                history:

                    Store.state.conversation,



                workspaceContext:{


                    session:

                        Store.state.sessionId,



                    platform:

                        "Honey IA Studio",



                    workspace:

                        Store.state.workspace


                },



                mode:

                    this.currentMode


            };



            if(fileBase64){


                payload.anexoBase64 =

                    fileBase64;



                payload.fileName =

                    fileName;


            }



            const response =

                await authmanager.authFetch(

                    "/gerar-gratis",

                    {


                        method:

                            "POST",



                        headers:{


                            "Content-Type":

                                "application/json",



                            "Accept":

                                "application/json"


                        },



                        body:

                            JSON.stringify(

                                payload

                            )


                    }

                );



            if(

                response.status === 401 ||

                response.status === 403

            ){


                authmanager.clearSession();



                throw new Error(

                    "A sua sessão expirou. Faça login novamente."

                );


            }



            const data =

                await this.parseResponse(

                    response

                );



            if(!response.ok){


                throw new Error(

                    data.error ||

                    "Erro no servidor."

                );


            }



            const answer =

                data.response ||

                data.resposta ||

                "Sem resposta.";



            const content =

                loadingMessage

                    ?.querySelector(

                        ".message-content"

                    );



            if(content){


                content.innerHTML =

                    window.marked

                        ?

                        window.marked.parse(

                            answer

                        )

                        :

                        this.escapeHTML(

                            answer

                        );



                this.highlightCode(

                    content

                );


            }



            Store.state.conversation.push({


                role:

                    "user",



                content:

                    text


            });



            Store.state.conversation.push({


                role:

                    "assistant",



                content:

                    answer


            });



            EventBusInstance.emit(

                "conversationUpdated",

                {


                    agent:

                        activeAgent,



                    answer


                }

            );



            this.detectAndRenderPreview(

                answer

            );



            this.clearAttachment();


        }


        catch(error){


            const content =

                loadingMessage

                    ?.querySelector(

                        ".message-content"

                    );



            if(content){


                content.innerHTML =

                    `Erro: ${this.escapeHTML(

                        error.message ||

                        "Erro desconhecido."

                    )}`;


            }



            this.showToast(

                error.message ||

                "Falha ao comunicar com Honey IA.",

                "error"

            );


        }


        finally{


            Store.setState(

                "loading",

                false

            );


        }


    }



    /*
    ======================================================
    RESPONSE PARSER
    ======================================================
    */


    async parseResponse(

        response

    ){


        try{


            return await response.json();


        }


        catch(error){


            return {


                success:

                    false,



                error:

                    "Resposta inválida do servidor."


            };


        }


    }



    /*
    ======================================================
    FILE MANAGEMENT
    ======================================================
    */


    handleFileUpload(

        event

    ){


        const file =

            event.target.files[0];



        if(!file)

        return;



        const maxSize =

            15 * 1024 * 1024;



        if(file.size > maxSize){


            this.showToast(

                "O ficheiro é demasiado grande. Limite: 15 MB.",

                "error"

            );



            event.target.value =

                "";



            return;


        }



        Store.setState(

            "selectedFileName",

            file.name

        );



        const reader =

            new FileReader();



        reader.onload =

            event => {


                Store.setState(

                    "selectedFileBase64",

                    event.target.result

                );


            };



        reader.onerror =

            () => {


                this.showToast(

                    "Não foi possível ler o ficheiro.",

                    "error"

                );



                this.clearAttachment();


            };



        reader.readAsDataURL(

            file

        );



        if(this.attachedFileName){


            this.attachedFileName.textContent =

                file.name;


        }



        this.attachmentBar

            ?.classList

            .remove(

                "hidden"

            );


    }



    clearAttachment(){


        Store.setState(

            "selectedFileBase64",

            null

        );



        Store.setState(

            "selectedFileName",

            null

        );



        if(this.fileUploadInput){


            this.fileUploadInput.value =

                "";


        }



        if(this.attachedFileName){


            this.attachedFileName.textContent =

                "";


        }



        this.attachmentBar

            ?.classList

            .add(

                "hidden"

            );


    }



    /*
    ======================================================
    CHAT UI
    ======================================================
    */


    appendUserMessage(

        text,

        file

    ){


        if(!this.chatFeed)

        return;



        const div =

            document.createElement(

                "div"

            );



        div.className =

            "user-message";



        const safeText =

            this.escapeHTML(

                text || ""

            );



        const safeFile =

            file

                ?

                `📎 ${this.escapeHTML(file)}`

                :

                "";



        div.innerHTML = `

            ${safeFile}

            <div>

                ${safeText}

            </div>

        `;



        this.chatFeed.appendChild(

            div

        );



        this.scrollToBottom();


    }



    createAgentMessagePlaceholder(){


        const div =

            document.createElement(

                "div"

            );



        div.className =

            "agent-message";



        div.innerHTML = `

            <div>

                🐝

                <strong>

                    Honey IA

                </strong>

            </div>



            <div class="message-content">

                A processar...

            </div>

        `;



        this.chatFeed

            ?.appendChild(

                div

            );



        this.scrollToBottom();



        return div;


    }



    scrollToBottom(){


        if(this.chatFeed){


            this.chatFeed.scrollTop =

                this.chatFeed.scrollHeight;


        }


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
    VOICE INPUT
    ======================================================
    */


    handleVoiceInput(){


        const SpeechRecognition =

            window.SpeechRecognition ||

            window.webkitSpeechRecognition;



        if(!SpeechRecognition){


            this.showToast(

                "Reconhecimento de voz indisponível neste navegador.",

                "error"

            );


            return;


        }



        if(this.voiceActive){


            this.voiceRecognition?.stop();



            this.voiceActive =

                false;



            return;


        }



        const recognition =

            new SpeechRecognition();



        this.voiceRecognition =

            recognition;



        recognition.lang =

            "pt-PT";



        recognition.interimResults =

            false;



        recognition.continuous =

            false;



        recognition.start();



        this.voiceActive =

            true;



        this.showToast(

            "Estou a ouvir...",

            "info"

        );



        recognition.onresult =

            event => {


                const text =

                    event.results[0][0]

                        .transcript;



                if(this.promptTextarea){


                    this.promptTextarea.value =

                        text;


                }



                this.handleSubmitPrompt();


            };



        recognition.onerror =

            event => {


                console.error(

                    "VOICE ERROR:",

                    event.error

                );



                this.voiceActive =

                    false;



                this.showToast(

                    "Não foi possível utilizar o reconhecimento de voz.",

                    "error"

                );


            };



        recognition.onend =

            () => {


                this.voiceActive =

                    false;


            };


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
    CODE HIGHLIGHT
    ======================================================
    */


    highlightCode(

        container

    ){


        if(

            !container ||

            !window.hljs

        )

        return;



        container

            .querySelectorAll(

                "pre code"

            )

            .forEach(

                block => {


                    try{


                        window.hljs.highlightElement(

                            block

                        );


                    }


                    catch(error){


                        console.warn(

                            "Highlight error:",

                            error

                        );


                    }


                }

            );


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

            "🐝 Honey IA V10.0 iniciado",

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
