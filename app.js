/**
 * HONEY IA — CORE ENGINE V5 + AI OS WORKSPACE
 * Unificação da arquitetura de EventBus/Store com o novo Honey AI OS.
 */

import { Components } from "./components.js";

// ======================================================
// IDENTIFICADOR DE SESSÃO & BARRAMENTO DE EVENTOS
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

export const EventBusInstance = new EventBus();

// ======================================================
// ESTADO GLOBAL DA APLICAÇÃO (STORE)
// ======================================================
export const Store = {
    state: {
        sessionId: SESSION_ID,
        conversation: [],
        theme: "dark",
        model: "Honey Core v5",
        voice: false,
        canvas: false,
        plugins: [],
        loading: false,
        activeWorkspace: "Geral & Desenvolvimento",
        selectedFileBase64: null,
        selectedFileName: null
    },

    setState(key, value) {
        this.state[key] = value;
        EventBusInstance.emit("stateChanged", { key, value, state: this.state });
    }
};

// ======================================================
// CLASSE PRINCIPAL DO SISTEMA OPERACIONAL
// ======================================================
class HoneyAIApp {
    constructor() {
        this.initDOMReferences();
        this.initEventListeners();
        this.initMarkdownEngine();
        this.bindStoreEvents();
    }

    initDOMReferences() {
        // Elementos de Status e Navegação
        this.kernelStatusCard = document.getElementById("kernel-status");
        this.kernelStateText = document.getElementById("kernel-state-text");
        this.btnToggleMenu = document.getElementById("btn-toggle-menu");
        this.osSidebar = document.getElementById("os-sidebar");

        this.navItems = document.querySelectorAll(".nav-item");
        this.workspaceViews = document.querySelectorAll(".workspace-view");

        // Elementos do Chat e Input
        this.chatFeed = document.getElementById("chat-feed");
        this.promptForm = document.getElementById("os-prompt-form");
        this.promptTextarea = document.getElementById("prompt-textarea");
        this.fileUploadInput = document.getElementById("file-upload");
        this.attachmentBar = document.getElementById("attachment-bar");
        this.attachedFileName = document.getElementById("attached-file-name");
        this.btnRemoveAttachment = document.getElementById("btn-remove-attachment");

        // Elementos do Live Preview Split
        this.previewPane = document.getElementById("preview-pane");
        this.btnTogglePreview = document.getElementById("btn-toggle-preview");
        this.btnClosePreview = document.getElementById("btn-close-preview");
        this.livePreviewIframe = document.getElementById("live-preview-iframe");
    }

    initEventListeners() {
        // Navegação entre Visões do OS
        this.navItems.forEach(item => {
            item.addEventListener("click", () => {
                const targetView = item.getAttribute("data-view");
                this.switchView(targetView, item);
            });
        });

        // Toggle Sidebar Mobile
        if (this.btnToggleMenu) {
            this.btnToggleMenu.addEventListener("click", () => {
                this.osSidebar.classList.toggle("open");
            });
        }

        // Auto-resize do Textarea
        this.promptTextarea.addEventListener("input", () => {
            this.promptTextarea.style.height = "auto";
            this.promptTextarea.style.height = `${Math.min(this.promptTextarea.scrollHeight, 120)}px`;
        });

        // Enviar com Enter (Shift+Enter pula linha)
        this.promptTextarea.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                this.promptForm.dispatchEvent(new Event("submit"));
            }
        });

        // Upload de Anexos
        this.fileUploadInput.addEventListener("change", (e) => this.handleFileUpload(e));
        this.btnRemoveAttachment.addEventListener("click", () => this.clearAttachment());

        // Submissão do Prompt ao Backend
        this.promptForm.addEventListener("submit", (e) => this.handleSubmitPrompt(e));

        // Controles do Split Preview
        if (this.btnTogglePreview) {
            this.btnTogglePreview.addEventListener("click", () => {
                this.previewPane.classList.toggle("hidden");
                Store.setState("canvas", !this.previewPane.classList.contains("hidden"));
            });
        }

        if (this.btnClosePreview) {
            this.btnClosePreview.addEventListener("click", () => {
                this.previewPane.classList.add("hidden");
                Store.setState("canvas", false);
            });
        }
    }

    bindStoreEvents() {
        EventBusInstance.on("stateChanged", ({ key, value }) => {
            if (key === "loading") {
                this.setKernelState(value, value ? "Processando..." : "Ocioso");
            }
        });
    }

    initMarkdownEngine() {
        if (window.marked) {
            marked.setOptions({
                highlight: function(code, lang) {
                    if (window.hljs && hljs.getLanguage(lang)) {
                        return hljs.highlight(code, { language: lang }).value;
                    }
                    return hljs.highlightAuto(code).value;
                },
                breaks: true
            });
        }
    }

    switchView(viewName, clickedNavItem) {
        this.navItems.forEach(nav => nav.classList.remove("active"));
        clickedNavItem.classList.add("active");

        this.workspaceViews.forEach(view => view.classList.add("hidden"));

        const targetElement = document.getElementById(`view-${viewName}`);
        if (targetElement) {
            targetElement.classList.remove("hidden");

            switch (viewName) {
                case "workspaces":
                    Components.renderWorkspaces(targetElement);
                    break;
                case "memories":
                    Components.renderMemories(targetElement);
                    break;
                case "agents":
                    Components.renderAgents(targetElement);
                    break;
                case "tools":
                    Components.renderTools(targetElement);
                    break;
                case "analytics":
                    Components.renderAnalytics(targetElement);
                    break;
                case "system":
                    Components.renderSystem(targetElement);
                    break;
            }
        }
    }

    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        Store.setState("selectedFileName", file.name);
        this.attachedFileName.textContent = file.name;
        this.attachmentBar.classList.remove("hidden");

        const reader = new FileReader();
        reader.onload = (e) => {
            Store.setState("selectedFileBase64", e.target.result);
        };
        reader.readAsDataURL(file);
    }

    clearAttachment() {
        Store.setState("selectedFileBase64", null);
        Store.setState("selectedFileName", null);
        this.fileUploadInput.value = "";
        this.attachmentBar.classList.add("hidden");
    }

    setKernelState(isBusy, message = "Ocioso") {
        if (isBusy) {
            this.kernelStatusCard.classList.add("busy");
            this.kernelStateText.textContent = message;
        } else {
            this.kernelStatusCard.classList.remove("busy");
            this.kernelStateText.textContent = "Ocioso";
        }
    }

    async handleSubmitPrompt(event) {
        event.preventDefault();
        const userText = this.promptTextarea.value.trim();

        if (!userText && !Store.state.selectedFileBase64) return;

        const welcomeMessage = document.getElementById("workspace-welcome");
        if (welcomeMessage) welcomeMessage.style.display = "none";

        // Adiciona à conversa local e ao estado
        this.appendUserMessage(userText, Store.state.selectedFileName);
        Store.state.conversation.push({ role: "user", content: userText });

        const payloadPrompt = userText;
        const payloadImage = Store.state.selectedFileBase64;

        this.promptTextarea.value = "";
        this.promptTextarea.style.height = "auto";
        this.clearAttachment();

        Store.setState("loading", true);
        const agentMessageElement = this.createAgentMessagePlaceholder();

        try {
            const response = await fetch("/gerar-gratis", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prompt: payloadPrompt,
                    imagem: payloadImage,
                    userId: Store.state.sessionId
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.erro || "Ocorreu um erro na comunicação com a IA.");
            }

            const formattedContent = marked.parse(data.resposta || "Executado com sucesso.");
            agentMessageElement.querySelector(".message-content").innerHTML = formattedContent;

            // Salva na memória da conversa local
            Store.state.conversation.push({ role: "assistant", content: data.resposta });

            // Dispara evento de resposta recebida
            EventBusInstance.emit("responseReceived", data);

            // Renderiza Preview Split se houver HTML
            this.detectAndRenderPreview(data.resposta);

        } catch (error) {
            agentMessageElement.querySelector(".message-content").innerHTML = `
                <div style="color: #ef4444; background: rgba(239, 68, 68, 0.1); padding: 12px; border-radius: 8px; border: 1px solid rgba(239, 68, 68, 0.2);">
                    <strong>Erro no Kernel:</strong> ${error.message}
                </div>
            `;
            EventBusInstance.emit("error", error);
        } finally {
            Store.setState("loading", false);
            this.scrollToBottom();
        }
    }

    appendUserMessage(text, fileName) {
        const msgContainer = document.createElement("div");
        msgContainer.className = "user-msg-wrapper";
        msgContainer.style.cssText = "align-self: flex-end; max-width: 80%; background: var(--bg-card); border: 1px solid var(--border-color); padding: 14px 18px; border-radius: var(--radius-lg) var(--radius-lg) 2px var(--radius-lg); margin-left: auto;";

        let fileHtml = "";
        if (fileName) {
            fileHtml = `<div style="font-size: 0.75rem; color: var(--accent-yellow); margin-bottom: 6px;">📎 Arquivo: ${fileName}</div>`;
        }

        msgContainer.innerHTML = `
            ${fileHtml}
            <div style="font-size: 0.92rem; color: var(--text-main); white-space: pre-wrap;">${text}</div>
        `;

        this.chatFeed.appendChild(msgContainer);
        this.scrollToBottom();
    }

    createAgentMessagePlaceholder() {
        const msgContainer = document.createElement("div");
        msgContainer.className = "agent-msg-wrapper";
        msgContainer.style.cssText = "align-self: flex-start; max-width: 85%; background: var(--bg-panel); border: 1px solid var(--border-color); padding: 16px 20px; border-radius: var(--radius-lg) var(--radius-lg) var(--radius-lg) 2px;";

        msgContainer.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
                <span style="font-size: 1.1rem;">🐝</span>
                <span style="font-size: 0.8rem; font-weight: 700; color: var(--accent-yellow);">Honey OS Agent</span>
            </div>
            <div class="message-content" style="font-size: 0.9rem; line-height: 1.6; color: var(--text-main);">
                <span style="color: var(--text-muted);">A processar instrução...</span>
            </div>
        `;

        this.chatFeed.appendChild(msgContainer);
        this.scrollToBottom();
        return msgContainer;
    }

    detectAndRenderPreview(textResponse) {
        if (!textResponse) return;

        const htmlMatch = textResponse.match(/```html([\s\S]*?)```/);
        if (htmlMatch && htmlMatch[1]) {
            const htmlCode = htmlMatch[1].trim();
            this.previewPane.classList.remove("hidden");
            Store.setState("canvas", true);

            const doc = this.livePreviewIframe.contentWindow.document;
            doc.open();
            doc.write(htmlCode);
            doc.close();
        }
    }

    scrollToBottom() {
        this.chatFeed.scrollTop = this.chatFeed.scrollHeight;
    }
}

// Inicializa no carregamento do DOM
document.addEventListener("DOMContentLoaded", () => {
    window.honeyApp = new HoneyAIApp();
});
