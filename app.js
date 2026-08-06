/*
==========================================
HONEY IA
CORE ENGINE V7
Workspace + 30 Agents Integration
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



const SESSION_ID =
crypto.randomUUID();





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



        this.events[event]
        .push(callback);



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
            callback => {

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
        false



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



        this.initDOMReferences();



        this.initAuthState();



        this.initUserSession();



        this.initDashboard();



        this.initEventListeners();



        this.initMarkdownEngine();



        this.initModalsAndUiActions();





        if(
            document.getElementById(
                "agentsContainer"
            )
        ){



            agentsui.init(
                "agentsContainer"
            );



        }




    }// ==========================================================
// USER SESSION & DASHBOARD
// ==========================================================


initDashboard(){


    if(
        document.getElementById(
            "dashboardContainer"
        )
    ){


        dashboard.init(
            "dashboardContainer"
        );


    }


}







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
            ${user.name}
            </strong>



            <span>
            Plano:
            ${user.plan || "Gratuito"}
            </span>


        </div>


        `;



    }



}









// ==========================================================
// DOM REFERENCES
// ==========================================================


initDOMReferences(){



    // MODES

    this.btnChatMode =
    document.getElementById(
        "btnChatMode"
    );


    this.btnLiveMode =
    document.getElementById(
        "btnLiveMode"
    );


    this.btnLive =
    document.getElementById(
        "btnLive"
    );


    this.liveStatus =
    document.getElementById(
        "liveStatus"
    );







    // CHAT


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









    // SIDEBAR


    this.btnToggleMenu =

    document.getElementById(
        "btnMobileMenu"
    )

    ||

    document.querySelector(
        ".menu-toggle"
    )

    ||

    document.querySelector(
        ".hamburger"
    );





    this.osSidebar =

    document.getElementById(
        "sidebar"
    )

    ||

    document.querySelector(
        ".sidebar"
    );





    this.sidebarOverlay =

    document.getElementById(
        "sidebarOverlay"
    )

    ||

    document.querySelector(
        ".sidebar-overlay"
    );





    this.navItems =

    document.querySelectorAll(

        "#sidebarNav a, .nav-item, [data-target]"

    );









    // PREVIEW


    this.previewPane =

    document.getElementById(
        "preview-pane"
    );





    this.livePreviewIframe =

    document.getElementById(
        "live-preview-iframe"
    );









    // AUTH


    this.loginPage =

    document.getElementById(
        "loginPage"
    );





    this.studioApp =

    document.getElementById(
        "studioApp"
    );





    this.loginForm =

    document.getElementById(
        "loginForm"
    );





    this.userBox =

    document.getElementById(
        "userBox"
    );





    this.toastContainer =

    document.getElementById(
        "toastContainer"
    );



}









// ==========================================================
// AUTH STATE
// ==========================================================


initAuthState(){



    if(
        this.loginPage &&
        this.studioApp
    ){



        this.loginPage.style.display =
        "block";



        this.studioApp.style.display =
        "none";



    }



}









// ==========================================================
// EVENT LISTENERS
// ==========================================================


initEventListeners(){



    if(
        this.btnChatMode
    ){



        this.btnChatMode
        .addEventListener(

            "click",

            ()=>{



                this.currentMode =
                "chat";



                this.liveMode =
                false;



                agentstudio?.setmode(
                    "chat"
                );



                this.btnChatMode
                .classList
                .add(
                    "active"
                );



                this.btnLiveMode
                ?.classList
                .remove(
                    "active"
                );



                liveclient?.stop?.();



            }


        );



    }// ==========================================================
// CHAT EVENTS
// ==========================================================


        if(
            this.promptTextarea
        ){


            this.promptTextarea
            .addEventListener(

                "keydown",

                (e)=>{


                    if(
                        e.key === "Enter" &&
                        !e.shiftKey
                    ){


                        e.preventDefault();


                        this.handleSubmitPrompt();



                    }


                }


            );


        }








        if(
            this.btnSend
        ){



            this.btnSend
            .addEventListener(

                "click",

                ()=>{


                    this.handleSubmitPrompt();



                }

            );



        }








        if(
            this.btnAttach &&
            this.fileUploadInput
        ){



            this.btnAttach
            .addEventListener(

                "click",

                ()=>{


                    this.fileUploadInput.click();



                }

            );



        }








        if(
            this.fileUploadInput
        ){



            this.fileUploadInput
            .addEventListener(

                "change",

                (e)=>{


                    this.handleFileUpload(e);



                }

            );



        }









        if(
            this.btnRemoveAttachment
        ){



            this.btnRemoveAttachment
            .addEventListener(

                "click",

                ()=>{


                    this.clearAttachment();



                }

            );



        }








        if(
            this.btnVoice
        ){



            this.btnVoice
            .addEventListener(

                "click",

                ()=>{


                    this.handleVoiceInput();



                }

            );



        }








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

            (e)=>{


                const user =
                e.detail;



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



    }









// ==========================================================
// SEND MESSAGE TO HONEY IA
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









    const agentMessage =

    this.createAgentMessagePlaceholder();









    if(
        this.promptTextarea
    ){


        this.promptTextarea.value =
        "";



    }









    try{



        const payload = {



            prompt:

            text,





            agentId:



            agentstudio &&

            typeof agentstudio.getAgent ===
            "function"



            ?



            agentstudio.getAgent()



            :



            Store.state.selectedAgent,








            history:



            Store.state.conversation,








            workspaceContext:{



                session:

                Store.state.sessionId,



                platform:

                "Honey IA Workspace"



            },








            memory:



            [],








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









        const aiResponse =

        data.response ||

        "Sem resposta gerada.";









        const content =

        agentMessage
        .querySelector(

            ".message-content"

        );









        if(content){



            content.innerHTML =

            window.marked

            ?

            window.marked.parse(
                aiResponse
            )

            :

            aiResponse;



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

            aiResponse



        });









        this.clearAttachment();



    }

    catch(error){



        const content =

        agentMessage
        ?.querySelector(

            ".message-content"

        );



        if(content){


            content.innerHTML =


            `Erro:
            ${error.message}`;


        }



    }



}// ==========================================================
// LIVE MODE
// ==========================================================


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

            "Reconhecimento de voz não disponível.",

            "error"

        );



        return;



    }









    if(
        this.voiceActive
    ){



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

    (event)=>{



        const text =

        event.results[0][0]
        .transcript;





        if(
            this.promptTextarea
        ){



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
// FILE UPLOAD
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

    (e)=>{



        Store.setState(

            "selectedFileBase64",

            e.target.result

        );



    };





    reader.readAsDataURL(file);








    if(
        this.attachedFileName
    ){



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





    if(
        this.fileUploadInput
    ){



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
// CHAT UI
// ==========================================================


appendUserMessage(
    text,
    file
){



    if(
        !this.chatFeed
    )
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



    if(
        this.chatFeed
    ){



        this.chatFeed.scrollTop =

        this.chatFeed.scrollHeight;



    }



}









// ==========================================================
// MARKDOWN
// ==========================================================


initMarkdownEngine(){



    if(
        window.marked
    ){



        window.marked.setOptions({


            breaks:true,


            gfm:true



        });



    }



}









// ==========================================================
// PREVIEW HTML
// ==========================================================


detectAndRenderPreview(text){



    if(
        !this.livePreviewIframe
    )
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





        if(
            this.previewPane
        ){



            this.previewPane.style.display =
            "block";



        }



    }



}









// ==========================================================
// TOAST
// ==========================================================


showToast(
    message,
    type="info"
){



    if(
        !this.toastContainer
    )
    return;





    const toast =

    document.createElement(
        "div"
    );





    toast.className =
    `toast ${type}`;





    toast.innerHTML = message;





    this.toastContainer
    .appendChild(
        toast
    );





    setTimeout(()=>{


        toast.remove();


    },3500);



}









// ==========================================================
// MODALS
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





}



// ==========================================================
// START APPLICATION
// ==========================================================


export default new HoneyAIApp();
