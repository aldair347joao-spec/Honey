/**
 * HONEY IA — CORE ENGINE V5 (ESTÁVEL & ENTERPRISE INTEGRATED)
 */
import AgentStudio from "./agentStudio.js";
import { Components } from "./components.js";

const SESSION_ID = crypto.randomUUID();

// ==========================================================
// 1. EVENT BUS & CENTRAL STORE
// ==========================================================
class EventBus {
    constructor() {
        this.events = {};
    }

    on(event, callback) {
        if (!this.events[event]) this.events[event] = [];
        this.events[event].push(callback);
    }

    emit(event, data) {
        if (!this.events[event]) return;
        this.events[event].forEach(cb => cb(data));
    }
}

export const EventBusInstance = new EventBus();

export const Store = {
    state: {
        sessionId: SESSION_ID,
        conversation: [],
        loading: false,
        selectedFileBase64: null,
        selectedFileName: null,
        isAuthenticated: false
    },

    setState(key, value) {
        this.state[key] = value;
        EventBusInstance.emit("stateChanged", { key, value });
    }
};

// ==========================================================
// 2. MAIN APPLICATION CLASS
// ==========================================================
class HoneyAIApp {
    constructor() {
        this.initDOMReferences();
        this.initAuthState();
        this.initEventListeners();
        this.initMarkdownEngine();
        this.initModalsAndUiActions();
    }

    initDOMReferences() {
        // Status & Kernel
        this.kernelStatusCard = document.getElementById("kernel-status");
        this.kernelStateText = document.getElementById("kernel-state-text");
        
        // Navigation & Layout
        this.btnToggleMenu = document.getElementById("btnMobileMenu") || document.getElementById("btn-toggle-menu") || document.querySelector(".mobile-menu");
        this.btnCollapseSidebar = document.getElementById("btnCollapseSidebar");
        this.osSidebar = document.getElementById("sidebar") || document.querySelector(".sidebar");
        this.sidebarOverlay = document.getElementById("sidebarOverlay");
        this.navItems = document.querySelectorAll("#sidebarNav a, .nav-item, nav a");
        this.workspaceViews = document.querySelectorAll(".workspace-view");

        // Chat & Inputs
        this.chatFeed = document.getElementById("chatMessages") || document.getElementById("chat-feed");
        this.promptTextarea = document.getElementById("chatInput") || document.getElementById("prompt-textarea");
        this.btnSend = document.getElementById("btnSend");
        this.fileUploadInput = document.getElementById("fileInput") || document.getElementById("file-upload");
        this.btnAttach = document.getElementById("btnAttach");
        this.btnVoice = document.getElementById("btnVoice");
        this.btnNewChat = document.getElementById("btnNewChat");
        this.attachmentBar = document.getElementById("attachment-bar");
        this.attachedFileName = document.getElementById("attached-file-name");
        this.btnRemoveAttachment = document.getElementById("btn-remove-attachment");

        // Preview Pane & Live Iframe
        this.previewPane = document.getElementById("preview-pane");
        this.btnTogglePreview = document.getElementById("btn-toggle-preview");
        this.btnClosePreview = document.getElementById("btn-close-preview");
        this.livePreviewIframe = document.getElementById("live-preview-iframe");

        // Auth & Modais
        this.loginPage = document.getElementById("loginPage");
        this.loginForm = document.getElementById("loginForm");
        this.studioApp = document.getElementById("studioApp") || document.querySelector(".studio");
        this.modalNewProject = document.getElementById("modalNewProject");
        this.modalNewAgent = document.getElementById("modalNewAgent");
        this.toastContainer = document.getElementById("toastContainer");
        this.userBox = document.getElementById("userBox");
    }

    initAuthState() {
        // Garante que o utilizador começa no Login e o Studio fica oculto
        if (this.loginPage && this.studioApp) {
            this.loginPage.style.display = "block";
            this.studioApp.style.display = "none";
        }
    }

    initEventListeners() {
        // Menu Lateral & Navegação
        this.navItems.forEach(item => {
            item.addEventListener("click", (e) => {
                e.preventDefault();
                const target = item.getAttribute("data-target") || item.getAttribute("data-view");
                
                this.navItems.forEach(nav => nav.classList.remove("active"));
                item.classList.add("active");

                if (target) {
                    this.switchView(target, item);
                }
                
                this.closeMobileSidebar();
            });
        });

        // Toggle do Menu Mobile (Garante a abertura correta por cima do overlay)
        if (this.btnToggleMenu) {
            this.btnToggleMenu.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleMobileSidebar();
            });
        }

        if (this.btnCollapseSidebar) {
            this.btnCollapseSidebar.addEventListener("click", () => this.closeMobileSidebar());
        }

        if (this.sidebarOverlay) {
            this.sidebarOverlay.addEventListener("click", () => this.closeMobileSidebar());
        }

        // Auto-Resize Textarea & Submissão via Enter
        if (this.promptTextarea) {
            this.promptTextarea.addEventListener("input", () => {
                this.promptTextarea.style.height = "auto";
                this.promptTextarea.style.height = `${Math.min(this.promptTextarea.scrollHeight, 120)}px`;
            });

            this.promptTextarea.addEventListener("keydown", (e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    this.handleSubmitPrompt();
                }
            });
        }

        // Clique no Botão Enviar
        if (this.btnSend) {
            this.btnSend.addEventListener("click", (e) => {
                e.preventDefault();
                this.handleSubmitPrompt();
            });
        }

        // Upload de Ficheiros
        if (this.btnAttach && this.fileUploadInput) {
            this.btnAttach.addEventListener("click", (e) => {
                e.preventDefault();
                this.fileUploadInput.click();
            });
        }

        if (this.fileUploadInput) {
            this.fileUploadInput.addEventListener("change", (e) => this.handleFileUpload(e));
        }

        if (this.btnRemoveAttachment) {
            this.btnRemoveAttachment.addEventListener("click", () => this.clearAttachment());
        }

        // Comando de Voz (Web Speech API)
        if (this.btnVoice && this.promptTextarea) {
            this.btnVoice.addEventListener("click", () => this.handleVoiceInput());
        }

        // Novo Chat
        if (this.btnNewChat) {
            this.btnNewChat.addEventListener("click", () => this.handleNewChat());
        }

        // Controlos de Preview
        if (this.btnTogglePreview && this.previewPane) {
            this.btnTogglePreview.addEventListener("click", () => {
                this.previewPane.classList.toggle("hidden");
            });
        }

        if (this.btnClosePreview && this.previewPane) {
            this.btnClosePreview.addEventListener("click", () => {
                this.previewPane.classList.add("hidden");
            });
        }

        // Autenticação / Login Form
        if (this.loginForm) {
            this.loginForm.addEventListener("submit", (e) => {
                e.preventDefault();
                this.login();
            });
        }

        // Botão "Começar" na tela de login
        const btnStartLogin = document.getElementById("btnStartLogin");
        if (btnStartLogin) {
            btnStartLogin.addEventListener("click", () => {
                document.getElementById("loginEmail")?.focus();
            });
        }

        // Clique no Perfil (User Box) para Logout / Alternar Login
        if (this.userBox) {
            this.userBox.style.cursor = "pointer";
            this.userBox.title = "Clique para sair / fechar sessão";
            this.userBox.addEventListener("click", () => {
                if (confirm("Deseja terminar a sessão e voltar ao Login?")) {
                    this.logout();
                }
            });
        }

        // Módulos do Studio (Cards interativos)
        document.querySelectorAll(".module-grid .module").forEach(module => {
            module.addEventListener("click", () => {
                const action = module.getAttribute("data-action");
                if (action) {
                    this.showToast(`Módulo ativado: ${action.toUpperCase()}`, "info");
                }
            });
        });
    }

    login() {
        if (this.loginPage && this.studioApp) {
            this.loginPage.style.display = "none";
            this.studioApp.style.display = "grid";
            Store.setState("isAuthenticated", true);
            this.showToast("Bem-vindo ao Honey IA Studio!", "success");
        }
    }

    logout() {
        if (this.loginPage && this.studioApp) {
            this.studioApp.style.display = "none";
            this.loginPage.style.display = "block";
            Store.setState("isAuthenticated", false);
            this.showToast("Sessão terminada com sucesso.", "info");
        }
    }

    initModalsAndUiActions() {
        // Abrir Modal de Novo Projeto
        const btnNewProject = document.getElementById("btnNewProject");
        const btnQuickAdd = document.getElementById("btnQuickAdd");
        if (btnNewProject) {
            btnNewProject.addEventListener("click", () => this.openModal(this.modalNewProject));
        }
        if (btnQuickAdd) {
            btnQuickAdd.addEventListener("click", () => this.openModal(this.modalNewProject));
        }

        // Abrir Modal de Criar Agente
        const btnNewAgent = document.getElementById("btnNewAgent");
        if (btnNewAgent) {
            btnNewAgent.addEventListener("click", () => this.openModal(this.modalNewAgent));
        }

        // Botões de fechar Modal [data-close]
        document.querySelectorAll("[data-close]").forEach(closeBtn => {
            closeBtn.addEventListener("click", () => {
                const modalId = closeBtn.getAttribute("data-close");
                const modalTarget = document.getElementById(modalId);
                if (modalTarget) this.closeModal(modalTarget);
            });
        });

        // Submissão do Form de Novo Projeto
        const formNewProject = document.getElementById("formNewProject");
        if (formNewProject) {
            formNewProject.addEventListener("submit", (e) => {
                e.preventDefault();
                const nameInput = document.getElementById("projectName");
                const projectName = nameInput ? nameInput.value : "Novo Projeto";
                
                const statProjectCount = document.getElementById("statProjectCount");
                if (statProjectCount) {
                    let current = parseInt(statProjectCount.textContent) || 0;
                    statProjectCount.textContent = current + 1;
                }

                this.showToast(`Projeto "${projectName}" criado com sucesso!`, "success");
                formNewProject.reset();
                this.closeModal(this.modalNewProject);
            });
        }

        // Submissão do Form de Criar Agente
        const formNewAgent = document.getElementById("formNewAgent");
        if (formNewAgent) {
            formNewAgent.addEventListener("submit", (e) => {
                e.preventDefault();
                const agentInput = document.getElementById("agentName");
                const agentName = agentInput ? agentInput.value : "Novo Agente";

                this.showToast(`Agente IA "${agentName}" criado e ativado!`, "success");
                formNewAgent.reset();
                this.closeModal(this.modalNewAgent);
            });
        }
    }

    openModal(modalElement) {
        if (!modalElement) return;
        modalElement.style.display = "flex";
    }

    closeModal(modalElement) {
        if (!modalElement) return;
        modalElement.style.display = "none";
    }

    toggleMobileSidebar() {
        if (!this.osSidebar) return;
        
        const isOpen = this.osSidebar.classList.contains("open") || this.osSidebar.classList.contains("active");

        if (isOpen) {
            this.closeMobileSidebar();
        } else {
            // Adiciona todas as variações de classe para garantir compatibilidade com o CSS
            this.osSidebar.classList.add("open", "active");
            this.osSidebar.style.zIndex = "10001"; // Garante que fica acima do overlay fusco
            if (this.sidebarOverlay) {
                this.sidebarOverlay.classList.add("active");
                this.sidebarOverlay.style.zIndex = "10000";
            }
        }
    }

    closeMobileSidebar() {
        if (this.osSidebar) {
            this.osSidebar.classList.remove("open", "active");
        }
        if (this.sidebarOverlay) {
            this.sidebarOverlay.classList.remove("active");
        }
    }

    initMarkdownEngine() {
        if (window.marked) {
            marked.setOptions({
                highlight: function(code, lang) {
                    if (window.hljs && hljs.getLanguage(lang)) {
                        return hljs.highlight(code, { language: lang }).value;
                    }
                    return window.hljs ? hljs.highlightAuto(code).value : code;
                },
                breaks: true
            });
        }
    }

    switchView(viewName, clickedNavItem) {
        this.workspaceViews.forEach(view => view.classList.add("hidden"));

        const targetElement = document.getElementById(`view-${viewName}`);
        if (targetElement) {
            targetElement.classList.remove("hidden");

            switch (viewName) {
                case "workspaces": Components.renderWorkspaces?.(targetElement); break;
                case "memories": Components.renderMemories?.(targetElement); break;
                case "agents": Components.renderAgents?.(targetElement); break;
                case "tools": Components.renderTools?.(targetElement); break;
                case "system": Components.renderSystem?.(targetElement); break;
            }
        } else {
            this.showToast(`Seção ativa: ${viewName.toUpperCase()}`, "info");
        }
    }

    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        Store.setState("selectedFileName", file.name);

        if (this.attachedFileName) {
            this.attachedFileName.textContent = file.name;
        }
        if (this.attachmentBar) {
            this.attachmentBar.classList.remove("hidden");
        } else {
            this.showToast(`Ficheiro "${file.name}" anexado com sucesso! 🐝`, "success");
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            Store.setState("selectedFileBase64", e.target.result);
        };
        reader.readAsDataURL(file);
    }

    clearAttachment() {
        Store.setState("selectedFileBase64", null);
        Store.setState("selectedFileName", null);
        if (this.fileUploadInput) this.fileUploadInput.value = "";
        if (this.attachmentBar) this.attachmentBar.classList.add("hidden");
    }

    handleVoiceInput() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.lang = 'pt-PT';
            recognition.start();

            this.showToast('Escutando comando de voz...', 'info');

            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                if (this.promptTextarea) {
                    this.promptTextarea.value = transcript;
                }
            };

            recognition.onerror = () => {
                this.showToast('Não foi possível reconhecer o áudio.', 'error');
            };
        } else {
            this.showToast('Reconhecimento de voz não suportado neste navegador.', 'error');
        }
    }

    handleNewChat() {
        if (this.chatFeed) this.chatFeed.innerHTML = "";
        const welcomeMessage = document.getElementById("welcomeBox") || document.getElementById("workspace-welcome");
        if (welcomeMessage) welcomeMessage.style.display = "block";
        this.showToast("Novo chat iniciado.", "info");
    }

    setKernelState(isBusy, message = "Ocioso") {
        if (!this.kernelStatusCard) return;

        if (isBusy) {
            this.kernelStatusCard.classList.add("busy");
            if (this.kernelStateText) this.kernelStateText.textContent = message;
        } else {
            this.kernelStatusCard.classList.remove("busy");
            if (this.kernelStateText) this.kernelStateText.textContent = "Ocioso";
        }
    }

    async handleSubmitPrompt() {
        const userText = this.promptTextarea ? this.promptTextarea.value.trim() : "";

        if (!userText && !Store.state.selectedFileBase64) return;

        const welcomeMessage = document.getElementById("welcomeBox") || document.getElementById("workspace-welcome");
        if (welcomeMessage) welcomeMessage.style.display = "none";

        this.appendUserMessage(userText, Store.state.selectedFileName);

        const payload = {
            prompt: userText
        };

        if (Store.state.selectedFileBase64) {
            payload.imagem = Store.state.selectedFileBase64;
        }

        if (this.promptTextarea) {
            this.promptTextarea.value = "";
            this.promptTextarea.style.height = "auto";
        }
        this.clearAttachment();

        this.setKernelState(true, "Processando...");
        const agentMessageElement = this.createAgentMessagePlaceholder();

        try {
            const payload = {

    prompt: userText,

    agent: AgentStudio.getAgent(),

    mode: AgentStudio.getMode()

};

AgentStudio.setStatus("thinking");
            const response = await fetch("https://honey-ia.onrender.com/gerar-gratis", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.erro || "Falha no servidor Render.");
            }

            const rawResponse = data.resposta || "Processado com sucesso.";

            const formattedContent = window.marked ? marked.parse(rawResponse) : rawResponse;
            
            const contentBox = agentMessageElement.querySelector(".message-content");
            if (contentBox) {
                contentBox.innerHTML = formattedContent;
            }

            this.detectAndRenderPreview(rawResponse);

        } catch (error) {
            const contentBox = agentMessageElement.querySelector(".message-content");
            if (contentBox) {
                contentBox.innerHTML = `
                    <div style="color: #ef4444; background: rgba(239, 68, 68, 0.1); padding: 12px; border-radius: 12px; font-size: 0.85rem; border: 1px solid rgba(239, 68, 68, 0.2);">
                        <strong>Erro no Kernel:</strong> ${error.message}
                    </div>
                `;
            }
        } finally {
            this.setKernelState(false);
            this.scrollToBottom();
            AgentStudio.setStatus("idle");
        }
    }

    appendUserMessage(text, fileName) {
        if (!this.chatFeed) return;

        const msgContainer = document.createElement("div");
        msgContainer.style.cssText = "align-self: flex-end; max-width: 85%; background: linear-gradient(135deg, #0066ff, #0044cc); color: #fff; padding: 14px 18px; border-radius: 20px; font-size: 0.95rem; margin-left: auto; margin-bottom: 10px;";

        let fileHtml = fileName ? `<div style="font-size: 0.75rem; color: #ffd700; margin-bottom: 6px;">📎 ${fileName}</div>` : "";
        msgContainer.innerHTML = `${fileHtml}<div style="white-space: pre-wrap;">${text}</div>`;

        this.chatFeed.appendChild(msgContainer);
        this.scrollToBottom();
    }

    createAgentMessagePlaceholder() {
        if (!this.chatFeed) return null;

        const msgContainer = document.createElement("div");
        msgContainer.style.cssText = "align-self: flex-start; max-width: 85%; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); padding: 16px 20px; border-radius: 20px; font-size: 0.95rem; margin-bottom: 15px; margin-right: auto;";

        msgContainer.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
                <span style="font-size: 1.1rem;">🐝</span>
                <strong style="font-size: 0.85rem; color: #0066ff;">Honey OS</strong>
            </div>
            <div class="message-content" style="line-height: 1.6; color: #e2e8f0;">
                <span style="color: #94a3b8;">A processar...</span>
            </div>
        `;

        this.chatFeed.appendChild(msgContainer);
        this.scrollToBottom();
        return msgContainer;
    }

    detectAndRenderPreview(textResponse) {
        if (!textResponse || !this.previewPane || !this.livePreviewIframe) return;

        const htmlMatch = textResponse.match(/```html([\s\S]*?)```/);
        if (htmlMatch && htmlMatch[1]) {
            const htmlCode = htmlMatch[1].trim();
            this.previewPane.classList.remove("hidden");

            const doc = this.livePreviewIframe.contentWindow.document;
            doc.open();
            doc.write(htmlCode);
            doc.close();
        }
    }

    showToast(message, type = "info") {
        if (!this.toastContainer) return;

        const toast = document.createElement("div");
        toast.style.cssText = "padding: 12px 20px; margin-bottom: 10px; border-radius: 8px; color: #fff; font-size: 14px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); transition: all 0.3s ease;";

        if (type === "success") toast.style.backgroundColor = "#10b981";
        else if (type === "error") toast.style.backgroundColor = "#ef4444";
        else toast.style.backgroundColor = "#2563eb";

        toast.textContent = message;
        this.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = "0";
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    scrollToBottom() {
        if (this.chatFeed) {
            this.chatFeed.scrollTop = this.chatFeed.scrollHeight;
        }
    }
}

// Inicialização da Aplicação
document.addEventListener("DOMContentLoaded", () => {
    window.honeyApp = new HoneyAIApp();
});
