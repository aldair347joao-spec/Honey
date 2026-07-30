/*
==========================================
HONEY IA
CORE ENGINE V6
Chat + Live Agent Integration
==========================================
*/

import LiveClient from "./liveClient.js";
import AgentStudio from "./agentStudio.js";
import { Components } from "./components.js";
import AgentsUI from "./agents-ui.js";
import AgentStudioView from "./agentStudioView.js";
import AgentsNavigation from "./agentsNavigation.js";
import Dashboard from "./dashboard.js";
import AuthManager from "./auth.js";
import Dashboard from "./dashboard.js";
const SESSION_ID = crypto.randomUUID();


// ==========================================================
// EVENT BUS
// ==========================================================

class EventBus {

    constructor(){

        this.events = {};

    }


    on(event, callback){

        if(!this.events[event]){

            this.events[event] = [];

        }

        this.events[event].push(callback);

    }



    emit(event,data){

        if(!this.events[event]) return;


        this.events[event].forEach(callback=>{

            callback(data);

        });

    }

}


export const EventBusInstance = new EventBus();




// ==========================================================
// GLOBAL STORE
// ==========================================================


export const Store = {


    state:{


        sessionId:SESSION_ID,

        conversation:[],

        loading:false,

        selectedFileBase64:null,

        selectedFileName:null,

        isAuthenticated:false


    },



    setState(key,value){


        this.state[key]=value;


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


    this.voiceActive=false;

    this.voiceRecognition=null;

    this.liveMode=false;

    this.currentMode="chat";


    this.initDOMReferences();

    this.initAuthState();
    this.initUserSession();

    this.initEventListeners();

    this.initMarkdownEngine();

    this.initModalsAndUiActions();


}
    // ==========================================================
// DOM REFERENCES
// ==========================================================

initDOMReferences(){


    // Modos
    this.btnChatMode =
    document.getElementById("btnChatMode");


    this.btnLiveMode =
    document.getElementById("btnLiveMode");



    this.btnLive =
    document.getElementById("btnLive");



    this.liveStatus =
    document.getElementById("liveStatus");




    // Chat

    this.chatFeed =
    document.getElementById("chatMessages")
    ||
    document.getElementById("chat-feed");



    this.promptTextarea =
    document.getElementById("chatInput")
    ||
    document.getElementById("prompt-textarea");



    this.btnSend =
    document.getElementById("btnSend");



    this.btnVoice =
    document.getElementById("btnVoice");



    this.fileUploadInput =
    document.getElementById("fileInput");



    this.btnAttach =
    document.getElementById("btnAttach");



    this.attachmentBar =
    document.getElementById("attachment-bar");



    this.attachedFileName =
    document.getElementById("attached-file-name");



    this.btnRemoveAttachment =
    document.getElementById("btn-remove-attachment");





    // Layout


    this.btnToggleMenu =
    document.getElementById("btnMobileMenu")
    ||
    document.querySelector(".mobile-menu");



    this.osSidebar =
    document.getElementById("sidebar")
    ||
    document.querySelector(".sidebar");



    this.sidebarOverlay =
    document.getElementById("sidebarOverlay");



    this.navItems =
    document.querySelectorAll(
        "#sidebarNav a,.nav-item,nav a"
    );



    this.workspaceViews =
    document.querySelectorAll(
        ".workspace-view"
    );





    // Preview


    this.previewPane =
    document.getElementById("preview-pane");



    this.livePreviewIframe =
    document.getElementById(
        "live-preview-iframe"
    );



    this.btnTogglePreview =
    document.getElementById(
        "btn-toggle-preview"
    );



    this.btnClosePreview =
    document.getElementById(
        "btn-close-preview"
    );






    // Login


    this.loginPage =
    document.getElementById("loginPage");



    this.studioApp =
    document.getElementById("studioApp")
    ||
    document.querySelector(".studio");



    this.loginForm =
    document.getElementById("loginForm");



    this.userBox =
    document.getElementById("userBox");



    this.toastContainer =
    document.getElementById(
        "toastContainer"
    );


}






// ==========================================================
// AUTH
// ==========================================================


initAuthState(){


    if(this.loginPage && this.studioApp){


        this.loginPage.style.display="block";


        this.studioApp.style.display="none";


    }


}





// ==========================================================
// EVENT LISTENERS
// ==========================================================


initEventListeners(){



/*
==========================================
CHAT MODE
==========================================
*/


if(this.btnChatMode){


this.btnChatMode.addEventListener(
"click",
()=>{


    this.currentMode="chat";

    this.liveMode=false;



    AgentStudio.setMode("chat");



    this.btnChatMode.classList.add(
        "active"
    );


    this.btnLiveMode?.classList.remove(
        "active"
    );



    LiveClient.stop();



    this.showToast(
        "Modo Chat ativado.",
        "success"
    );



});

}




/*
==========================================
LIVE MODE
==========================================
*/


if(this.btnLiveMode){


this.btnLiveMode.addEventListener(
"click",
async()=>{


try{


    AgentStudio.setMode("live");



    const result =
    await LiveClient.start();



    if(result.success){



        this.currentMode="live";


        this.liveMode=true;



        this.btnLiveMode.classList.add(
            "active"
        );



        this.btnChatMode?.classList.remove(
            "active"
        );



        this.showToast(
        `Live conectado: ${result.session.identity.name}`,
        "success"
        );


    }



}catch(error){



    this.showToast(
        error.message,
        "error"
    );



}



});

}
// ==========================================================
// INPUT DE MENSAGEM
// ==========================================================


if(this.promptTextarea){



this.promptTextarea.addEventListener(
"keydown",
(e)=>{


    if(e.key==="Enter" && !e.shiftKey){


        e.preventDefault();


        this.handleSubmitPrompt();


    }


});



}




// Botão enviar


if(this.btnSend){


this.btnSend.addEventListener(
"click",
()=>{


    this.handleSubmitPrompt();


});



}






// ==========================================================
// ANEXOS
// ==========================================================


if(this.btnAttach && this.fileUploadInput){



this.btnAttach.addEventListener(
"click",
()=>{


    this.fileUploadInput.click();


});



}




if(this.fileUploadInput){


this.fileUploadInput.addEventListener(
"change",
(e)=>{


    this.handleFileUpload(e);


});


}





// ==========================================================
// VOZ
// ==========================================================


if(this.btnVoice){


this.btnVoice.addEventListener(
"click",
()=>{


    this.handleVoiceInput();


});


}




}








// ==========================================================
// ENVIO PRINCIPAL
// ==========================================================


async handleSubmitPrompt(){



const payload =
AgentRouter.preparePayload(text);




if(!text && !Store.state.selectedFileBase64){

    return;

}





this.appendUserMessage(
    text,
    Store.state.selectedFileName
);






if(this.promptTextarea){


    this.promptTextarea.value="";


}





const agentBox =
this.createAgentMessagePlaceholder();







try{





/*
==========================================
LIVE MODE
==========================================
*/


if(this.currentMode==="live"){



const result =
await LiveClient.send(text);





const content =
agentBox.querySelector(
".message-content"
);





if(content){


content.innerHTML =
window.marked
?
marked.parse(result.response)
:
result.response;


}




this.speakResponse(
    result.response
);




return;



}






/*
==========================================
CHAT MODE NORMAL
==========================================
*/


const payload={


    prompt:text,


    agent:
    AgentStudio.getAgent(),



    mode:
    "chat"



};





if(Store.state.selectedFileBase64){


payload.imagem =
Store.state.selectedFileBase64;


}





const response =
await fetch(
"https://honey-ia.onrender.com/gerar-gratis",
{


method:"POST",


headers:{


"Content-Type":"application/json"


},


body:JSON.stringify(payload)


});







const data =
await response.json();






if(!response.ok){


throw new Error(
data.erro ||
"Erro no servidor."
);


}





const content =
agentBox.querySelector(
".message-content"
);






if(content){


content.innerHTML =
window.marked
?
marked.parse(data.resposta)
:
data.resposta;


}






}catch(error){



const content =
agentBox?.querySelector(
".message-content"
);



if(content){


content.innerHTML=
`
<div style="color:#ef4444">
Erro: ${error.message}
</div>
`;

}



}





}







// ==========================================================
// RESPOSTA POR VOZ
// ==========================================================


speakResponse(text){



if(!window.speechSynthesis){

return;

}



const speech =
new SpeechSynthesisUtterance(text);



speech.lang="pt-PT";


speech.rate=1;


speech.pitch=1;



window.speechSynthesis.cancel();


window.speechSynthesis.speak(
speech
);



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
"Reconhecimento de voz não suportado.",
"error"
);


return;


}




if(this.voiceActive){


this.voiceRecognition?.stop();


this.voiceActive=false;


this.showToast(
"Voz desligada.",
"info"
);


return;


}





const recognition =
new SpeechRecognition();



this.voiceRecognition =
recognition;



recognition.lang="pt-PT";


recognition.continuous=false;


recognition.interimResults=false;



recognition.start();



this.voiceActive=true;



this.showToast(
"🎙️ A ouvir...",
"info"
);





recognition.onresult=(event)=>{


const text =
event.results[0][0].transcript;




if(this.currentMode==="live"){



LiveClient.send(text)
.then(result=>{


this.appendAgentMessage(
result.response
);



this.speakResponse(
result.response
);


});



}else{


this.promptTextarea.value=text;


this.handleSubmitPrompt();


}



};





recognition.onerror=()=>{


this.voiceActive=false;



this.showToast(
"Erro no reconhecimento de voz.",
"error"
);



};



recognition.onend=()=>{


this.voiceActive=false;


};



}







// ==========================================================
// FILE UPLOAD
// ==========================================================


handleFileUpload(event){



const file =
event.target.files[0];



if(!file)return;



Store.setState(
"selectedFileName",
file.name
);




const reader =
new FileReader();



reader.onload=(e)=>{


Store.setState(
"selectedFileBase64",
e.target.result
);



};



reader.readAsDataURL(file);




if(this.attachedFileName){


this.attachedFileName.textContent=
file.name;


}



this.attachmentBar?.classList.remove(
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

this.fileUploadInput.value="";

}


this.attachmentBar?.classList.add(
"hidden"
);



}







// ==========================================================
// MENSAGENS
// ==========================================================


appendUserMessage(text,file){



if(!this.chatFeed)return;



const div =
document.createElement("div");



div.className="user-message";



div.innerHTML=
`
${file ? "📎 "+file:""}

<div>${text}</div>
`;



this.chatFeed.appendChild(div);



this.scrollToBottom();



}







appendAgentMessage(text){


const box =
this.createAgentMessagePlaceholder();



const content =
box.querySelector(
".message-content"
);



content.innerHTML =
window.marked
?
marked.parse(text)
:
text;



this.scrollToBottom();


}








createAgentMessagePlaceholder(){



const div =
document.createElement("div");



div.className="agent-message";



div.innerHTML=
`
<div>
🐝 <strong>Honey IA</strong>
</div>

<div class="message-content">
A processar...
</div>
`;



this.chatFeed.appendChild(div);



return div;


}








// ==========================================================
// PREVIEW HTML
// ==========================================================


detectAndRenderPreview(text){



if(!this.livePreviewIframe)return;



const match =
text.match(
/```html([\s\S]*?)```/
);



if(!match)return;



const doc =
this.livePreviewIframe
.contentWindow
.document;



doc.open();


doc.write(
match[1]
);


doc.close();



this.previewPane?.classList.remove(
"hidden"
);



}








// ==========================================================
// MARKDOWN
// ==========================================================


initMarkdownEngine(){


if(window.marked){


marked.setOptions({

breaks:true

});


}



}








// ==========================================================
// TOAST
// ==========================================================


showToast(message,type="info"){



if(!this.toastContainer)return;



const toast =
document.createElement("div");



toast.textContent=message;



toast.className=
`toast ${type}`;



this.toastContainer.appendChild(
toast
);



setTimeout(()=>{


toast.remove();


},3000);



}








// ==========================================================
// SCROLL
// ==========================================================


scrollToBottom(){



if(this.chatFeed){


this.chatFeed.scrollTop =
this.chatFeed.scrollHeight;


}



}






}







// ==========================================================
// START APP
// ==========================================================


document.addEventListener(
"DOMContentLoaded",
()=>{


window.honeyApp =
new HoneyAIApp();



}
);  
