/*
==========================================
HONEY IA
CORE ENGINE V8
Workspace + 30 Agents Integration
Enterprise Application Controller
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


import authmanager from "./auth.js";



const SESSION_ID =

crypto.randomUUID();


/* =========================================
   HONEY IA - APP PRINCIPAL & LOGIN BINDING
========================================= */

document.addEventListener("DOMContentLoaded", () => {
    const loginPage = document.getElementById("loginPage");
    const studioApp = document.getElementById("studioApp");
    const loginForm = document.getElementById("loginForm");

    // 1. Verifica se o utilizador já tem uma sessão ativa
    if (authmanager.isAuthenticated()) {
        if (loginPage) loginPage.style.display = "none";
        if (studioApp) studioApp.style.display = "flex";
        return;
    }

    // 2. Intercepta o envio do formulário de login presente no index.html
    if (loginForm) {
        loginForm.addEventListener("submit", (e) => {
            e.preventDefault();

            const email = document.getElementById("email").value;
            const password = document.getElementById("password").value;

            try {
                // Tenta autenticar usando o authmanager
                authmanager.login({ email, password });

                // Oculta a página de login e revela o estúdio
                if (loginPage) loginPage.style.display = "none";
                if (studioApp) studioApp.style.display = "flex";

                // Atualiza a página para carregar o workspace completo
                location.reload();
            } catch (err) {
                alert(err.message || "Erro ao entrar. Verifique os seus dados.");
            }
        });
    }
});

// ... (resto do seu código atual do app.js continua aqui em baixo)







// ==========================================================
// EVENT BUS
// ==========================================================


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







        this.events[event].push(

            callback

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







        this.events[event]

        .forEach(

            callback=>{


                callback(data);



            }

        );



    }



}









export const EventBusInstance =

new EventBus();









// ==========================================================
// GLOBAL STORE
// ==========================================================


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

        "main"




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









// ==========================================================
// HONEY IA APPLICATION
// ==========================================================


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









        this.initDOMReferences();



        this.initAuthState();



        this.initUserSession();



        this.initDashboard();



        this.initEventListeners();



        this.initMarkdownEngine();



        this.initModalsAndUiActions();









        this.initAgents();



        this.initAgentStudio();



    }/*
==========================================================
AGENTS INITIALIZATION
==========================================================
*/


initAgents(){



    const container =

    document.getElementById(

        "agentsContainer"

    );








    if(

        container &&

        agentsui &&

        typeof agentsui.init === "function"

    ){



        agentsui.init(

            "agentsContainer"

        );



        console.log(

            "🤖 Agents UI carregado"

        );



    }









    document.addEventListener(

        "agent-selected",

        event=>{



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
==========================================================
AGENT STUDIO INITIALIZATION
==========================================================
*/


initAgentStudio(){



    const studioContainer =

    document.getElementById(

        "agentStudioContainer"

    );









    if(

        studioContainer &&

        agentstudio &&

        typeof agentstudio.init === "function"

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

        typeof agentstudio.listenEvents === "function"

    ){



        agentstudio.listenEvents();



    }



}









// ==========================================================
// USER SESSION
// ==========================================================


initUserSession(){



    const user =

    authmanager.getUser();









    if(user){



        Store.setState(

            "isAuthenticated",

            true

        );







        this.updateUserInterface(

            user

        );



        return;



    }









    Store.setState(

        "isAuthenticated",

        false

    );



}









updateUserInterface(user){



    if(

        this.userBox

    ){



        this.userBox.innerHTML = `



        <div class="user-profile">



            <strong>

            ${

                user.name ||

                "Utilizador"

            }



            </strong>





            <span>

            Plano:

            ${

                user.plan ||

                "Gratuito"

            }



            </span>



        </div>



        `;



    }



}









// ==========================================================
// DASHBOARD
// ==========================================================


initDashboard(){



    const dashboardContainer =

    document.getElementById(

        "dashboardContainer"

    );









    if(

        dashboardContainer &&

        dashboard &&

        typeof dashboard.init === "function"

    ){



        dashboard.init(

            "dashboardContainer"

        );



        console.log(

            "📊 Dashboard carregado"

        );



    }



}/*
==========================================================
DOM REFERENCES
==========================================================
*/


initDOMReferences(){



    // ===============================
    // CHAT MODE
    // ===============================


    this.btnChatMode =

    document.getElementById(

        "btnChatMode"

    );





    this.btnLiveMode =

    document.getElementById(

        "btnLiveMode"

    );









    // ===============================
    // CHAT
    // ===============================


    this.chatFeed =

    document.getElementById(

        "chatMessages"

    )

    ||

    document.getElementById(

        "chat-feed"

    );









    this.promptTextarea =

    document.getElementById(

        "chatInput"

    )

    ||

    document.getElementById(

        "prompt-textarea"

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









    // ===============================
    // SIDEBAR
    // ===============================


    this.btnToggleMenu =

    document.getElementById(

        "btnMobileMenu"

    );









    this.sidebar =

    document.getElementById(

        "sidebar"

    );









    this.sidebarOverlay =

    document.getElementById(

        "sidebarOverlay"

    );









    this.navItems =

    document.querySelectorAll(

        "[data-target]"

    );









    // ===============================
    // PREVIEW
    // ===============================


    this.previewPane =

    document.getElementById(

        "preview-pane"

    );









    this.livePreviewIframe =

    document.getElementById(

        "live-preview-iframe"

    );









    // ===============================
    // AUTH
    // ===============================


// ==========================================================
// AUTH STATE
// ==========================================================


// ==========================================================
// GLOBAL EVENTS
// ==========================================================


initEventListeners(){



    // LOGIN


    if(

        this.loginForm

    ){



        logincontroller.init(

            "loginForm"

        );



    }









    document.addEventListener(

        "user-login",

        event=>{



            const user =

            event.detail;







            if(user){



                Store.setState(

                    "isAuthenticated",

                    true

                );







                this.updateUserInterface(

                    user

                );







                this.showToast(

                    `Bem-vindo, ${user.name}!`,

                    "success"

                );



            }



        }

    );









    // CHAT SEND


    if(

        this.btnSend

    ){



        this.btnSend.addEventListener(

            "click",

            ()=>{


                this.handleSubmitPrompt();


            }

        );



    }









    if(

        this.promptTextarea

    ){



        this.promptTextarea.addEventListener(

            "keydown",

            event=>{



                if(

                    event.key === "Enter"

                    &&

                    !event.shiftKey

                ){



                    event.preventDefault();



                    this.handleSubmitPrompt();



                }



            }

        );



    }/*
==========================================================
CHAT EVENTS CONTINUATION
==========================================================
*/


        if(

            this.btnAttach &&

            this.fileUploadInput

        ){



            this.btnAttach.addEventListener(

                "click",

                ()=>{


                    this.fileUploadInput.click();


                }

            );



        }









        if(

            this.fileUploadInput

        ){



            this.fileUploadInput.addEventListener(

                "change",

                event=>{


                    this.handleFileUpload(event);


                }

            );



        }









        if(

            this.btnRemoveAttachment

        ){



            this.btnRemoveAttachment.addEventListener(

                "click",

                ()=>{


                    this.clearAttachment();


                }

            );



        }









        if(

            this.btnVoice

        ){



            this.btnVoice.addEventListener(

                "click",

                ()=>{


                    this.handleVoiceInput();


                }

            );



        }









        // MOBILE MENU


        if(

            this.btnToggleMenu

        ){



            this.btnToggleMenu.addEventListener(

                "click",

                ()=>{



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

            );



        }









        if(

            this.sidebarOverlay

        ){



            this.sidebarOverlay.addEventListener(

                "click",

                ()=>{



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

            );



        }









}











// ==========================================================
// SEND PROMPT TO HONEY IA
// ==========================================================


async handleSubmitPrompt(){



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









    if(

        this.promptTextarea

    ){



        this.promptTextarea.value =

        "";



    }









    try{



        const activeAgent =



        agentstudio &&

        typeof agentstudio.getAgent ===

        "function"



        ?



        agentstudio.getAgent()



        :



        Store.state.selectedAgent;









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



        }









        const response =

        await fetch(

            `${window.location.origin}/gerar-gratis`,

            {



                method:



                "POST",







                headers:{



                    "Content-Type":



                    "application/json"



                },







                body:



                JSON.stringify(

                    payload

                )



            }

        );









        const data =

        await response.json();









        if(

            !response.ok

        ){



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



            answer;



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



            `Erro:

            ${error.message}`;

        }









        this.showToast(

            "Falha ao comunicar com Honey IA",

            "error"

        );



    }/*
==========================================================
LIVE MODE
==========================================================
*/


async startLiveMode(){



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

            error.message,

            "error"

        );



    }



}











// ==========================================================
// VOICE INPUT
// ==========================================================


handleVoiceInput(){



    const SpeechRecognition =



    window.SpeechRecognition ||



    window.webkitSpeechRecognition;









    if(!SpeechRecognition){



        this.showToast(

            "Reconhecimento de voz indisponível.",

            "error"

        );



        return;



    }









    if(this.voiceActive){



        this.voiceRecognition.stop();



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









    recognition.start();









    this.voiceActive =

    true;









    recognition.onresult =

    event=>{



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

    ()=>{



        this.voiceActive =

        false;



    };









    recognition.onend =

    ()=>{



        this.voiceActive =

        false;



    };



}











// ==========================================================
// FILE MANAGEMENT
// ==========================================================


handleFileUpload(event){



    const file =

    event.target.files[0];









    if(!file)

    return;









    Store.setState(

        "selectedFileName",

        file.name

    );









    const reader =

    new FileReader();









    reader.onload =

    e=>{



        Store.setState(

            "selectedFileBase64",

            e.target.result

        );



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









    this.attachmentBar

    ?.classList

    .add(

        "hidden"

    );



}











// ==========================================================
// CHAT UI HELPERS
// ==========================================================


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









    div.innerHTML = `



        ${

            file

            ?

            "📎 " + file

            :

            ""

        }



        <div>

        ${text}

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

        🐝 <strong>Honey IA</strong>

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











// ==========================================================
// MARKDOWN ENGINE
// ==========================================================


initMarkdownEngine(){



    if(window.marked){



        window.marked.setOptions({



            breaks:true,



            gfm:true



        });



    }



}











// ==========================================================
// HTML LIVE PREVIEW
// ==========================================================


detectAndRenderPreview(text){



    if(!this.livePreviewIframe)

    return;









    const match =

    text.match(

        /```html([\s\S]*?)```/

    );









    if(

        match &&

        match[1]

    ){



        const doc =



        this.livePreviewIframe

        .contentDocument ||

        this.livePreviewIframe

        .contentWindow

        .document;









        doc.open();



        doc.write(

            match[1]

        );



        doc.close();









        if(this.previewPane){



            this.previewPane.style.display =

            "block";



        }



    }



}











// ==========================================================
// TOAST SYSTEM
// ==========================================================


showToast(

    message,

    type="info"

){



    if(!this.toastContainer)

    return;









    const toast =

    document.createElement(

        "div"

    );









    toast.className =

    `toast ${type}`;









    toast.innerHTML =

    message;









    this.toastContainer.appendChild(

        toast

    );









    setTimeout(()=>{



        toast.remove();



    },3500);



}











// ==========================================================
// MODAL ACTIONS
// ==========================================================


initModalsAndUiActions(){



    document

    .querySelectorAll(

        "[data-close]"

    )

    .forEach(button=>{



        button.addEventListener(

            "click",

            ()=>{



                const modal =

                document.getElementById(

                    button.dataset.close

                );







                modal?.remove();



            }

        );



    });



}











// ==========================================================
// APPLICATION START
// ==========================================================


init(){



    if(this.initialized)

    return;









    this.initialized =

    true;









    console.log(

        "🐝 Honey IA V8 iniciado",

        SESSION_ID

    );



}



}









// ==========================================================
// EXPORT INSTANCE
// ==========================================================


export default new HoneyAIApp();



