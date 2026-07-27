// ======================================================
// HONEY IA - CORE ENGINE V5
// ======================================================
const SESSION_ID = crypto.randomUUID();
class EventBus {

    constructor() {
        this.events = {};
    }

    on(event, callback) {

        if (!this.events[event]) {
            this.events[event] = [];
        }

        this.events[event].push(callback);

    }

    emit(event, data) {

        if (!this.events[event]) return;

        this.events[event].forEach(callback => callback(data));

    }

}

const EventBusInstance = new EventBus();


// ======================================================
// ESTADO GLOBAL
// ======================================================

const Store = {

    state: {

        conversation: [],

        theme: "dark",

        model: "Honey Core",

        voice: false,

        canvas: false,

        plugins: [],

        loading: false

    },

    set(data) {

        this.state = {

            ...this.state,

            ...data

        };

    }

};


// ======================================================
// ELEMENTOS DA INTERFACE
// ======================================================

const UI = {

    chat: document.getElementById("chatStreamContainer"),

    input: document.getElementById("osPromptInput"),

    send: document.querySelector(".btn-send-core"),

    canvas: document.getElementById("liveCanvasPanel"),

    iframe: document.getElementById("liveCanvasIframe"),

    status: document.getElementById("topbarStatusText")

};


// ======================================================
// FUNÇÕES DE CHAT
// ======================================================

function addUserMessage(text){

    UI.chat.innerHTML += `

    <div class="chat-bubble-row user">

        <div class="chat-content-card">

            ${text}

        </div>

    </div>

    `;

    UI.chat.scrollTop = UI.chat.scrollHeight;

}

function addAssistantMessage(html){

    UI.chat.innerHTML += `

    <div class="chat-bubble-row assistant">

        <div class="chat-avatar-box">

            🐝

        </div>

        <div class="chat-content-card">

            ${marked.parse(html)}

        </div>

    </div>

    `;

    UI.chat.scrollTop = UI.chat.scrollHeight;

} // ======================================================
// COMUNICAÇÃO COM O BACKEND
// ======================================================

async function sendToHoney(prompt){

    try{

        Store.set({
            loading:true
        });

        UI.status.textContent = "PROCESSANDO...";

        const response = await fetch("/gerar-gratis",{

            method:"POST",

            headers:{
                "Content-Type":"application/json"
            },

            body: JSON.stringify({

    sessionId: SESSION_ID,

    prompt,

    modo: "general"

})

        });

        const data = await response.json();

        Store.set({
            loading:false
        });

        UI.status.textContent = "HONEY AI ONLINE";

        if(data.sucesso){

            addAssistantMessage(data.resposta);

            Store.state.conversation.push({

                role:"assistant",

                content:data.resposta

            });

            detectCanvas(data.resposta);

        }else{

            addAssistantMessage("❌ " + data.erro);

        }

    }catch(e){

        console.error(e);

        Store.set({
            loading:false
        });

        UI.status.textContent = "ERRO";

        addAssistantMessage(
            "❌ Não foi possível comunicar com o servidor."
        );

    }

}

// ======================================================
// ENVIO DA MENSAGEM
// ======================================================

async function sendMessage(){

    const text = UI.input.value.trim();

    if(text==="") return;

    addUserMessage(text);

    Store.state.conversation.push({

        role:"user",

        content:text

    });

    UI.input.value="";

    UI.input.style.height="40px";

    await sendToHoney(text);

}

// ======================================================
// EVENTOS
// ======================================================

UI.send.addEventListener("click",sendMessage);

UI.input.addEventListener("keydown",function(e){

    if(e.key==="Enter" && !e.shiftKey){

        e.preventDefault();

        sendMessage();

    }

});

// ======================================================
// AUTO AJUSTE DO TEXTAREA
// ======================================================

UI.input.addEventListener("input",function(){

    this.style.height="40px";

    this.style.height=this.scrollHeight+"px";

});// ======================================================
// LIVE CANVAS
// ======================================================

function detectCanvas(response){

    const match = response.match(/```html([\s\S]*?)```/);

    if(!match) return;

    const html = match[1].trim();

    UI.canvas.classList.add("active");

    const doc = UI.iframe.contentDocument || UI.iframe.contentWindow.document;

    doc.open();
    doc.write(html);
    doc.close();

}

// ======================================================
// COMANDOS
// ======================================================

function executeCommand(command){

    switch(command){

        case "/new":

            UI.chat.innerHTML = "";

            Store.state.conversation = [];

            addAssistantMessage("🐝 Nova conversa iniciada.");

            break;

        case "/help":

            addAssistantMessage(`
# Comandos disponíveis

• /new

Limpa a conversa.

• /help

Mostra esta ajuda.

• /export

Exporta o histórico.

• /plugins

Lista os plugins carregados.

            `);

            break;

        case "/plugins":

            if(Store.state.plugins.length===0){

                addAssistantMessage("Nenhum plugin carregado.");

            }else{

                let txt="# Plugins ativos\n\n";

                Store.state.plugins.forEach(plugin=>{

                    txt+="• "+plugin+"\n";

                });

                addAssistantMessage(txt);

            }

            break;

        case "/export":

            exportConversation();

            break;

        default:

            sendToHoney(command);

    }

}

// ======================================================
// EXPORTAÇÃO
// ======================================================

function exportConversation(){

    const file = new Blob(

        [

            JSON.stringify(

                Store.state.conversation,

                null,

                2

            )

        ],

        {

            type:"application/json"

        }

    );

    const a = document.createElement("a");

    a.href = URL.createObjectURL(file);

    a.download = "honey-conversation.json";

    a.click();

}

// ======================================================
// PROCESSADOR
// ======================================================

const originalSend = sendMessage;

sendMessage = async function(){

    const text = UI.input.value.trim();

    if(text==="") return;

    if(text.startsWith("/")){

        UI.input.value="";

        executeCommand(text);

        return;

    }

    await originalSend();

};// ======================================================
// MEMÓRIA PERSISTENTE
// ======================================================

const Memory = {

    save() {

        localStorage.setItem(
            "honey_state",
            JSON.stringify(Store.state)
        );

    },

    load() {

        const data = localStorage.getItem("honey_state");

        if (!data) return;

        try {

            Store.state = JSON.parse(data);

        } catch (e) {

            console.error(e);

        }

    }

};

// ======================================================
// RESTAURAR CONVERSA
// ======================================================

function restoreConversation() {

    UI.chat.innerHTML = "";

    Store.state.conversation.forEach(msg => {

        if (msg.role === "user") {

            addUserMessage(msg.content);

        } else {

            addAssistantMessage(msg.content);

        }

    });

}

// ======================================================
// TEMA
// ======================================================

function toggleTheme() {

    if (Store.state.theme === "dark") {

        Store.state.theme = "light";

        document.documentElement.classList.remove("dark");

    } else {

        Store.state.theme = "dark";

        document.documentElement.classList.add("dark");

    }

    Memory.save();

}

// ======================================================
// EVENTOS GLOBAIS
// ======================================================

window.addEventListener("beforeunload", () => {

    Memory.save();

});

document.addEventListener("visibilitychange", () => {

    if (document.visibilityState === "hidden") {

        Memory.save();

    }

});

// ======================================================
// BOTÃO DE TEMA (caso exista)
// ======================================================

const themeButton = document.getElementById("toggleTheme");

if (themeButton) {

    themeButton.addEventListener("click", toggleTheme);

}

// ======================================================
// INICIALIZAÇÃO
// ======================================================

window.addEventListener("DOMContentLoaded", () => {

    Memory.load();

    restoreConversation();

    UI.status.textContent = "HONEY AI ONLINE";

    console.log("Honey Core iniciado.");

});// ======================================================
// GERENCIADOR DE PLUGINS
// ======================================================

const PluginManager = {

    plugins: {},

    register(plugin) {

        this.plugins[plugin.id] = plugin;

        Store.state.plugins.push(plugin.name);

        console.log("Plugin carregado:", plugin.name);

    },

    execute(id, data) {

        if (!this.plugins[id]) return;

        this.plugins[id].run(data);

    }

};

// ======================================================
// PLUGIN EXEMPLO
// ======================================================

PluginManager.register({

    id: "developer",

    name: "Developer",

    run(data) {

        console.log("Plugin Developer executado.", data);

    }

});

// ======================================================
// UPLOAD DE FICHEIROS
// ======================================================

const fileInput = document.createElement("input");

fileInput.type = "file";

fileInput.accept = "*/*";

fileInput.style.display = "none";

document.body.appendChild(fileInput);

async function uploadFile() {

    fileInput.click();

}

fileInput.addEventListener("change", async function () {

    if (!this.files.length) return;

    const file = this.files[0];

    const reader = new FileReader();

    reader.onload = function () {

        Store.state.file = {

            nome: file.name,

            tipo: file.type,

            base64: reader.result.split(",")[1]

        };

        addAssistantMessage(
            "📁 Arquivo carregado: **" + file.name + "**"
        );

    };

    reader.readAsDataURL(file);

});

// ======================================================
// VOZ
// ======================================================

let recognition = null;

if ("webkitSpeechRecognition" in window) {

    recognition = new webkitSpeechRecognition();

    recognition.lang = "pt-PT";

    recognition.continuous = false;

    recognition.interimResults = false;

    recognition.onresult = function (event) {

        UI.input.value =
            event.results[0][0].transcript;

    };

}

function startVoice() {

    if (!recognition) {

        addAssistantMessage(
            "O navegador não suporta reconhecimento de voz."
        );

        return;

    }

    recognition.start();

}

// ======================================================
// BOTÕES
// ======================================================

document.querySelectorAll(".btn-dock-action").forEach(btn => {

    if (btn.textContent.includes("Arquivos")) {

        btn.addEventListener("click", uploadFile);

    }

    if (btn.textContent.includes("Voz")) {

        btn.addEventListener("click", startVoice);

    }

});
