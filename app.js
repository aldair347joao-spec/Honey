/*
==========================================
HONEY IA
CORE ENGINE V8.2
Workspace + 30 Agents Integration
Enterprise Application Controller

AUTHENTICATION
JWT + MongoDB + Google
AUTH DELEGATED TO auth.js + login.js
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
AUTH READY COMPATIBILITY
==========================================================

O novo login.js utiliza:

authmanager.waitUntilReady()

O auth.js atual já inicia loadSession()
automaticamente, mas ainda não possui esse método.

Aqui criamos uma ponte de compatibilidade
sem alterar a arquitetura do auth.js.
==========================================================
*/


if(

    typeof authmanager.waitUntilReady !==

    "function"

){


    authmanager.waitUntilReady =

        function(){


            if(!this.loading){

                return Promise.resolve(

                    this.user

                );

            }



            return new Promise(

                resolve => {


                    const unsubscribe =

                        this.subscribe(

                            user => {


                                if(!this.loading){


                                    unsubscribe();


                                    resolve(user);


                                }


                            }

                        );


                }

            );


        };

}



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


                    callback(data);


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

            "main",



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



        /*
        --------------------------------------
        Aguarda o auth.js terminar a
        validação do JWT.
        --------------------------------------
        */


        await authmanager.waitUntilReady();



        const user =

            authmanager.getUser();



        /*
        --------------------------------------
        Utilizador autenticado
        --------------------------------------
        */


        if(

            authmanager.isAuthenticated()

        ){


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



            return;

        }



        /*
        --------------------------------------
        Utilizador não autenticado
        --------------------------------------
        */


        Store.setState(

            "isAuthenticated",

            false

        );



        Store.setState(

            "user",

            null

        );



        this.hideWorkspace();



        await logincontroller.init();



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


        }



        if(loginApp){


            loginApp.style.display =

                "none";


        }



        const loader =

            document.getElementById(

                "appLoader"

            );



        if(loader){


            loader.classList.add(

                "hidden"

            );


            setTimeout(

                () => {


                    loader.style.display =

                        "none";


                },

                300

            );

        }

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



        const loader =

            document.getElementById(

                "appLoader"

            );



        if(loader){


            loader.classList.remove(

                "hidden"

            );


            loader.style.display =

                "flex";


        }

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



        this.initDashboard();



        this.initEventListeners();



        this.initMarkdownEngine();



        this.initModalsAndUiActions();



        this.initAgents();



        this.initAgentStudio();



        console.log(

            "🚀 Honey IA Workspace carregado."

        );

    }





    /*
    ======================================================
    AUTH EVENTS
    ======================================================
    */


    bindAuthEvents(){


        /*
        --------------------------------------
        Auth Manager subscription
        --------------------------------------
        */


        authmanager.subscribe(

            user => {


                /*
                ------------------------------
                Sessão autenticada
                ------------------------------
                */


                if(

                    user &&

                    authmanager.isAuthenticated()

                ){


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



                    return;

                }



                /*
                ------------------------------
                Sessão encerrada
                ------------------------------
                */


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

        );



        /*
        --------------------------------------
        Login event
        --------------------------------------
        */


        document.addEventListener(

            "user-login",

            event => {


                const user =

                    event.detail;



                if(user){


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



                    this.showToast(

                        `Bem-vindo, ${this.getUserName(user)}!`,

                        "success"

                    );

                }

            }

        );



        /*
        --------------------------------------
        Logout event
        --------------------------------------
        */


        document.addEventListener(

            "user-logout",

            async () => {


                await this.logout();

            }

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


    updateUserInterface(user){


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



        /*
        --------------------------------------
        User Box
        --------------------------------------
        */


        if(userBox){


            const avatar =

                user.avatar ||

                user.picture ||

                displayName

                    .charAt(0)

                    .toUpperCase();



            userBox.innerHTML = `

                <div class="avatar">

                    ${this.escapeHTML(avatar)}

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



        /*
        --------------------------------------
        Plan badge
        --------------------------------------
        */


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


    getUserName(user){


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





    /*
    ======================================================
    ESCAPE HTML
    ======================================================
    */


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


            dashboard.init(

                "dashboardContainer"

            );



            console.log(

                "📊 Dashboard carregado"

            );

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


            agentsui.init(

                "agentsContainer"

            );



            console.log(

                "🤖 Agents UI conectado"

            );

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


            agentstudio.init(

                "agentStudioContainer"

            );



            console.log(

                "⚡ Agent Studio conectado"

            );

        }



        if(

            agentstudio &&

            typeof agentstudio.listenEvents ===

            "function"

        ){


            agentstudio.listenEvents();

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
        --------------------------------------
        CHAT SEND
        --------------------------------------
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
        --------------------------------------
        FILE ATTACHMENT
        --------------------------------------
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

                    this.handleFileUpload(event)

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
        --------------------------------------
        VOICE
        --------------------------------------
        */


        if(this.btnVoice){


            this.btnVoice.addEventListener(

                "click",

                () =>

                    this.handleVoiceInput()

            );

        }



        /*
        --------------------------------------
        MOBILE MENU
        --------------------------------------
        */


        if(this.btnToggleMenu){


            this.btnToggleMenu.addEventListener(

                "click",

                () =>

                    this.openSidebar()

            );

        }



        if(this.btnCloseSidebar){


            this.btnCloseSidebar.addEventListener(

                "click",

                () =>

                    this.closeSidebar()

            );

        }



        if(this.sidebarOverlay){


            this.sidebarOverlay.addEventListener(

                "click",

                () =>

                    this.closeSidebar()

            );

        }



        /*
        --------------------------------------
        PREVIEW CLOSE
        --------------------------------------
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
        --------------------------------------
        SIDEBAR NAVIGATION
        --------------------------------------
        */


        this.initNavigation();



        /*
        --------------------------------------
        LOGOUT / USER BOX
        --------------------------------------
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
        --------------------------------------
        CHAT / LIVE MODE
        --------------------------------------
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
    NAVIGATION
    ======================================================
    */


    initNavigation(){


        const navItems =

            document.querySelectorAll(

                ".nav-item"

            );



        navItems.forEach(

            item => {


                item.addEventListener(

                    "click",

                    event => {


                        event.preventDefault();



                        const target =

                            item.dataset.target;



                        if(!target)

                            return;



                        this.showWorkspaceView(

                            target

                        );



                        navItems.forEach(

                            nav =>

                                nav.classList.remove(

                                    "active"

                                )

                        );



                        item.classList.add(

                            "active"

                        );



                        this.closeSidebar();



                        history.replaceState(

                            null,

                            "",

                            `#${target}`

                        );

                    }

                );

            }

        );



        /*
        --------------------------------------
        Buttons using data-target
        --------------------------------------
        */


        document

            .querySelectorAll(

                "[data-target]"

            )

            .forEach(

                button => {


                    if(

                        button.classList.contains(

                            "nav-item"

                        )

                    )

                    return;



                    button.addEventListener(

                        "click",

                        () => {


                            const target =

                                button.dataset.target;



                            if(target){


                                this.showWorkspaceView(

                                    target

                                );

                            }

                        }

                    );

                }

            );

    }





    /*
    ======================================================
    SHOW VIEW
    ======================================================
    */


    showWorkspaceView(target){


        const views =

            document.querySelectorAll(

                ".workspace-view"

            );



        views.forEach(

            view => {


                view.style.display =

                    view.id === target

                        ? ""

                        : "none";

            }

        );



        const navItems =

            document.querySelectorAll(

                ".nav-item"

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

    }





    /*
    ======================================================
    SIDEBAR
    ======================================================
    */


    openSidebar(){


        this.sidebar

            ?.classList

            .add(

                "open"

            );



        this.sidebarOverlay

            ?.classList

            .add(

                "active"

            );

    }





    closeSidebar(){


        this.sidebar

            ?.classList

            .remove(

                "open"

            );



        this.sidebarOverlay

            ?.classList

            .remove(

                "active"

            );

    }





    /*
    ======================================================
    CHAT
    ======================================================
    */


    async handleSubmitPrompt(){


        /*
        --------------------------------------
        Security check
        --------------------------------------
        */


        if(

            !authmanager.isAuthenticated()

        ){


            this.showToast(

                "A sua sessão expirou. Faça login novamente.",

                "error"

            );



            await logincontroller.init();



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



            /*
            --------------------------------------
            AUTHENTICATED REQUEST
            --------------------------------------
            */


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



            /*
            --------------------------------------
            Token expired
            --------------------------------------
            */


            if(

                response.status ===

                401

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


    async parseResponse(response){


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


    handleFileUpload(event){


        const file =

            event.target.files[0];



        if(!file)

        return;



        /*
        --------------------------------------
        Limite preventivo
        --------------------------------------
        */


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


    highlightCode(container){


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


    detectAndRenderPreview(text){


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



        this.hideWorkspace();



        /*
        --------------------------------------
        Reinicia login
        --------------------------------------
        */


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

            "🐝 Honey IA V8.2 iniciado",

            SESSION_ID

        );



        /*
        --------------------------------------
        Remove loader only after auth
        --------------------------------------
        */


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
