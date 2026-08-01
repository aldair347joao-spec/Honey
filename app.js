/*
==========================================
HONEY IA
CORE ENGINE V6
Chat + Live Agent Integration
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

    emit(event, data){
        if(!this.events[event]) return;

        this.events[event].forEach(callback => {
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
        sessionId: SESSION_ID,
        conversation: [],
        loading: false,
        selectedFileBase64: null,
        selectedFileName: null,
        isAuthenticated: false
    },

    setState(key, value){
        this.state[key] = value;

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
        this.voiceActive = false;
        this.voiceRecognition = null;
        this.liveMode = false;
        this.currentMode = "chat";

        this.initDOMReferences();
        this.initAuthState();
        this.initUserSession();
        this.initDashboard();
        this.initEventListeners();
        this.initMarkdownEngine();
        this.initModalsAndUiActions();

        // Inicializa a UI dos Agentes se o contentor existir
        if(document.getElementById("agentsContainer")){
            agentsui.init("agentsContainer");
        }
    }

    // ==========================================================
    // USER SESSION & DASHBOARD
    // ==========================================================

    initDashboard(){
        if(document.getElementById("dashboardContainer")){
            dashboard.init("dashboardContainer");
        }
    }

    initUserSession(){
        const user = authmanager.getUser();

        if(user){
            Store.setState("isAuthenticated", true);
            this.updateUserInterface(user);
            return;
        }

        Store.setState("isAuthenticated", false);
    }

    updateUserInterface(user){
        const userBox = this.userBox;

        if(userBox){
            userBox.innerHTML = `
            <div class="user-profile">
                <strong>${user.name}</strong>
                <span>Plano: ${user.plan || "Gratuito"}</span>
            </div>
            `;
        }
    }

    // ==========================================================
    // DOM REFERENCES
    // ==========================================================

    initDOMReferences(){
        // Modos
        this.btnChatMode = document.getElementById("btnChatMode");
        this.btnLiveMode = document.getElementById("btnLiveMode");
        this.btnLive = document.getElementById("btnLive");
        this.liveStatus = document.getElementById("liveStatus");

        // Chat
        this.chatFeed = document.getElementById("chatMessages") || document.getElementById("chat-feed");
        this.promptTextarea = document.getElementById("chatInput") || document.getElementById("prompt-textarea");
        this.btnSend = document.getElementById("btnSend");
        this.btnVoice = document.getElementById("btnVoice");
        this.fileUploadInput = document.getElementById("fileInput");
        this.btnAttach = document.getElementById("btnAttach");
        this.attachmentBar = document.getElementById("attachment-bar");
        this.attachedFileName = document.getElementById("attached-file-name");
        this.btnRemoveAttachment = document.getElementById("btn-remove-attachment");

        // Layout (Captura rigorosa do menu mobile e sidebar)
        this.btnToggleMenu = document.getElementById("btnMobileMenu") || document.querySelector(".mobile-menu") || document.querySelector(".menu-toggle") || document.querySelector(".hamburger");
        this.osSidebar = document.getElementById("sidebar") || document.querySelector(".sidebar") || document.querySelector("aside");
        this.sidebarOverlay = document.getElementById("sidebarOverlay") || document.querySelector(".sidebar-overlay");
        this.navItems = document.querySelectorAll("#sidebarNav a, .nav-item, nav a, .sidebar-menu a, .sidebar a, [data-target]");
        this.workspaceViews = document.querySelectorAll(".workspace-view, .main-section, .view-section, main > section");

        // Preview
        this.previewPane = document.getElementById("preview-pane");
        this.livePreviewIframe = document.getElementById("live-preview-iframe");
        this.btnTogglePreview = document.getElementById("btn-toggle-preview");
        this.btnClosePreview = document.getElementById("btn-close-preview");

        // Auth & Modals
        this.loginPage = document.getElementById("loginPage");
        this.studioApp = document.getElementById("studioApp") || document.querySelector(".studio");
        this.loginForm = document.getElementById("loginForm");
        this.userBox = document.getElementById("userBox");
        this.toastContainer = document.getElementById("toastContainer");
    }

    // ==========================================================
    // AUTH
    // ==========================================================

    initAuthState(){
        if(this.loginPage && this.studioApp){
            this.loginPage.style.display = "block";
            this.studioApp.style.display = "none";
        }
    }

    // ==========================================================
    // EVENT LISTENERS
    // ==========================================================

    initEventListeners(){
        if(this.btnChatMode){
            this.btnChatMode.addEventListener("click", () => {
                this.currentMode = "chat";
                this.liveMode = false;

                if(agentstudio && typeof agentstudio.setmode === "function"){
                    agentstudio.setmode("chat");
                }

                this.btnChatMode.classList.add("active");
                this.btnLiveMode?.classList.remove("active");

                if(liveclient && typeof liveclient.stop === "function"){
                    liveclient.stop();
                }

                this.showToast("Modo Chat ativado.", "success");
            });
        }

        if(this.btnLiveMode){
            this.btnLiveMode.addEventListener("click", async () => {
                try {
                    if(agentstudio && typeof agentstudio.setmode === "function"){
                        agentstudio.setmode("live");
                    }

                    const result = await liveclient.start();

                    if(result && result.success){
                        this.currentMode = "live";
                        this.liveMode = true;

                        this.btnLiveMode.classList.add("active");
                        this.btnChatMode?.classList.remove("active");

                        this.showToast(
                            `Live conectado: ${result.session?.identity?.name || "Sessão Ativa"}`,
                            "success"
                        );
                    }
                } catch(error) {
                    this.showToast(error.message, "error");
                }
            });
        }

        if(this.promptTextarea){
            this.promptTextarea.addEventListener("keydown", (e) => {
                if(e.key === "Enter" && !e.shiftKey){
                    e.preventDefault();
                    this.handleSubmitPrompt();
                }
            });
        }

        if(this.btnSend){
            this.btnSend.addEventListener("click", () => {
                this.handleSubmitPrompt();
            });
        }

        if(this.btnAttach && this.fileUploadInput){
            this.btnAttach.addEventListener("click", () => {
                this.fileUploadInput.click();
            });
        }

        if(this.fileUploadInput){
            this.fileUploadInput.addEventListener("change", (e) => {
                this.handleFileUpload(e);
            });
        }

        if(this.btnRemoveAttachment){
            this.btnRemoveAttachment.addEventListener("click", () => {
                this.clearAttachment();
            });
        }

        if(this.btnVoice){
            this.btnVoice.addEventListener("click", () => {
                this.handleVoiceInput();
            });
        }

        // Navegação da Sidebar robusta
        if(this.navItems){
            this.navItems.forEach(item => {
                item.addEventListener("click", (e) => {
                    const target = item.getAttribute("data-target") || item.getAttribute("href")?.replace("#", "");
                    if(target && !target.startsWith("http") && !target.startsWith("javascript")){
                        e.preventDefault();
                        this.switchView(target);
                    }
                });
            });
        }

        // Toggle Sidebar Mobile
        if(this.btnToggleMenu){
            this.btnToggleMenu.addEventListener("click", (e) => {
                e.stopPropagation();
                this.osSidebar?.classList.toggle("open");
                this.sidebarOverlay?.classList.toggle("active");
            });
        }

        if(this.sidebarOverlay){
            this.sidebarOverlay.addEventListener("click", () => {
                this.osSidebar?.classList.remove("open");
                this.sidebarOverlay?.classList.remove("active");
            });
        }

        if(this.loginForm){
            logincontroller.init("loginForm");
        }

        document.addEventListener("user-login", (e) => {
            const user = e.detail;
            if(user){
                Store.setState("isAuthenticated", true);
                this.updateUserInterface(user);
                if(this.loginPage && this.studioApp){
                    this.loginPage.style.display = "none";
                    this.studioApp.style.display = "flex";
                }
                this.showToast(`Bem-vindo, ${user.name}!`, "success");
            }
        });
    }

    // ==========================================================
    // SWITCH VIEWS (Corrigido para exibir corretamente as abas)
    // ==========================================================

    switchView(targetView){
        if(!targetView) return;

        this.navItems.forEach(nav => {
            const navTarget = nav.getAttribute("data-target") || nav.getAttribute("href")?.replace("#", "");
            if(navTarget === targetView){
                nav.classList.add("active");
            } else {
                nav.classList.remove("active");
            }
        });

        // Oculta todas as vistas gerais
        const allViews = document.querySelectorAll(".workspace-view, .main > section, .view-section, main > div, .app-section");
        allViews.forEach(sec => {
            sec.style.display = "none";
        });

        // Mostra a secção correspondente
        let found = false;
        allViews.forEach(sec => {
            if(sec.id === targetView || sec.id === `${targetView}Section` || sec.classList.contains(targetView)){
                sec.style.display = "block";
                found = true;
            }
        });

        // Fallback caso encontre diretamente pelo ID
        const directEl = document.getElementById(targetView) || document.getElementById(`${targetView}Section`);
        if(directEl){
            directEl.style.display = "block";
            found = true;
        }

        this.osSidebar?.classList.remove("open");
        this.sidebarOverlay?.classList.remove("active");
    }

    initMarkdownEngine(){
        if(window.marked){
            window.marked.setOptions({
                highlight: function(code, lang) {
                    if (window.hljs && lang && window.hljs.getLanguage(lang)) {
                        return window.hljs.highlight(code, { language: lang }).value;
                    }
                    return window.hljs ? window.hljs.highlightAuto(code).value : code;
                },
                langPrefix: 'hljs language-',
                gfm: true,
                breaks: true
            });
        }
    }

    initModalsAndUiActions(){
        const closeButtons = document.querySelectorAll("[data-close]");
        closeButtons.forEach(btn => {
            btn.addEventListener("click", () => {
                const modalId = btn.getAttribute("data-close");
                const modal = document.getElementById(modalId);
                if(modal){
                    modal.style.display = "none";
                }
            });
        });
    }

    showToast(message, type = "info"){
        if(!this.toastContainer) return;

        const toast = document.createElement("div");
        toast.className = `toast ${type}`;
        toast.style.cssText = `
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: #fff;
            padding: 12px 20px;
            border-radius: 8px;
            margin-top: 10px;
            box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3);
            font-size: 14px;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 10px;
            z-index: 9999;
        `;
        toast.innerHTML = `<span>${message}</span>`;

        this.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3500);
    }

    scrollToBottom(){
        if(this.chatFeed){
            this.chatFeed.scrollTop = this.chatFeed.scrollHeight;
        }
    }

    async handleSubmitPrompt(){
        const text = this.promptTextarea ? this.promptTextarea.value.trim() : "";
        const fileBase64 = Store.state.selectedFileBase64;
        const fileName = Store.state.selectedFileName;

        if(!text && !fileBase64) return;

        this.appendUserMessage(text, fileName);

        if(this.promptTextarea){
            this.promptTextarea.value = "";
        }

        const agentBox = this.createAgentMessagePlaceholder();

        try {
            if(this.currentMode === "live"){
                const result = await liveclient.send(text);
                const content = agentBox.querySelector(".message-content");
                if(content){
                    content.innerHTML = window.marked ? window.marked.parse(result.response) : result.response;
                }
                this.speakResponse(result.response);
                this.clearAttachment();
                return;
            }

            const payload = {
                prompt: text,
                agent: (agentstudio && typeof agentstudio.getagent === "function") 
                    ? agentstudio.getagent() 
                    : "general",
                mode: "chat"
            };

            if(fileBase64){
                payload.anexoBase64 = fileBase64;
            }

            this.clearAttachment();

            const response = await fetch(
                "https://honey-ia.onrender.com/gerar-gratis",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                }
            );

            const data = await response.json();

            if(!response.ok){
                throw new Error(data.erro || "Erro no servidor.");
            }

            const content = agentBox.querySelector(".message-content");
            if(content){
                content.innerHTML = window.marked ? window.marked.parse(data.resposta) : data.resposta;
                this.detectAndRenderPreview(data.resposta);
            }

        } catch(error) {
            const content = agentBox?.querySelector(".message-content");
            if(content){
                content.innerHTML = `<div style="color:#ef4444">Erro: ${error.message}</div>`;
            }
        }
    }

    speakResponse(text){
        if(!window.speechSynthesis) return;
        const speech = new SpeechSynthesisUtterance(text);
        speech.lang = "pt-PT";
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(speech);
    }

    handleVoiceInput(){
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if(!SpeechRecognition){
            this.showToast("Reconhecimento de voz não suportado.", "error");
            return;
        }

        if(this.voiceActive){
            this.voiceRecognition?.stop();
            this.voiceActive = false;
            this.showToast("Voz desligada.", "info");
            return;
        }

        const recognition = new SpeechRecognition();
        this.voiceRecognition = recognition;
        recognition.lang = "pt-PT";
        recognition.start();
        this.voiceActive = true;
        this.showToast("🎙️ A ouvir...", "info");

        recognition.onresult = (event) => {
            const text = event.results[0][0].transcript;
            if(this.promptTextarea) this.promptTextarea.value = text;
            this.handleSubmitPrompt();
        };

        recognition.onerror = () => { this.voiceActive = false; };
        recognition.onend = () => { this.voiceActive = false; };
    }

    handleFileUpload(event){
        const file = event.target.files[0];
        if(!file) return;
        Store.setState("selectedFileName", file.name);

        const reader = new FileReader();
        reader.onload = (e) => {
            Store.setState("selectedFileBase64", e.target.result);
        };
        reader.readAsDataURL(file);

        if(this.attachedFileName) this.attachedFileName.textContent = file.name;
        this.attachmentBar?.classList.remove("hidden");
    }

    clearAttachment(){
        Store.setState("selectedFileBase64", null);
        Store.setState("selectedFileName", null);
        if(this.fileUploadInput) this.fileUploadInput.value = "";
        this.attachmentBar?.classList.add("hidden");
    }

    appendUserMessage(text, file){
        if(!this.chatFeed) return;
        const div = document.createElement("div");
        div.className = "user-message";
        div.innerHTML = `${file ? "📎 " + file : ""}<div>${text}</div>`;
        this.chatFeed.appendChild(div);
        this.scrollToBottom();
    }

    createAgentMessagePlaceholder(){
        const div = document.createElement("div");
        div.className = "agent-message";
        div.innerHTML = `<div>🐝 <strong>Honey IA</strong></div><div class="message-content">A processar...</div>`;
        if(this.chatFeed) this.chatFeed.appendChild(div);
        this.scrollToBottom();
        return div;
    }

    detectAndRenderPreview(text){
        if(!this.livePreviewIframe) return;
        const match = text.match(/```html([\s\S]*?)```/);
        if(match && match[1]){
            const doc = this.livePreviewIframe.contentDocument || this.livePreviewIframe.contentWindow.document;
            doc.open();
            doc.write(match[1]);
            doc.close();
            if(this.previewPane) this.previewPane.style.display = "block";
        }
    }

}

export default new HoneyAIApp();
