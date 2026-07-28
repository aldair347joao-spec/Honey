/**
 * HONEY IA — CORE ENGINE V5 (ESTÁVEL & ENTERPRISE INTEGRATED)
 */

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
        selectedFileName: null
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
        this.initEventListeners();
        this.initMarkdownEngine();
    }

    initDOMReferences() {
        // Status & Kernel
        this.kernelStatusCard = document.getElementById("kernel-status");
        this.kernelStateText = document.getElementById("kernel-state-text");
        
        // Navigation & Layout
        this.btnToggleMenu = document.getElementById("btn-toggle-menu") || document.querySelector(".collapse");
        this.osSidebar = document.getElementById("os-sidebar") || document.querySelector(".sidebar");
        this.navItems = document.querySelectorAll(".nav-item, nav a");
        this.workspaceViews = document.querySelectorAll(".workspace-view");

        // Chat & Inputs (Com fallbacks para os IDs do index.html)
        this.chatFeed = document.getElementById("chatMessages") || document.getElementById("chat-feed");
        this.promptTextarea = document.getElementById("chatInput") || document.getElementById("prompt-textarea");
        this.btnSend = document.getElementById("btnSend");
        this.fileUploadInput = document.getElementById("fileInput") || document.getElementById("file-upload");
        this.btnAttach = document.getElementById("btnAttach");
        this.attachmentBar = document.getElementById("attachment-bar");
        this.attachedFileName = document.getElementById("attached-file-name");
        this.btnRemoveAttachment = document.getElementById("btn-remove-attachment");

        // Preview Pane & Live Iframe
        this.previewPane = document.getElementById("preview-pane");
        this.btnTogglePreview = document.getElementById("btn-toggle-preview");
        this.btnClosePreview = document.getElementById("btn-close-preview");
        this.livePreviewIframe = document.getElementById("live-preview-iframe");
    }

    initEventListeners() {
        // Menu Lateral & Navegação
        this.navItems.forEach(item => {
            item.addEventListener("click", () => {
                const target = item.getAttribute("data-view");
                if (target) {
                    this.switchView(target, item);
                } else {
                    this.navItems.forEach(nav => nav.classList.remove("active"));
                    item.classList.add("active");
                }
                if (this.osSidebar) this.osSidebar.classList.remove("open");
            });
        });

        if (this.btnToggleMenu && this.osSidebar) {
            this.btnToggleMenu.addEventListener("click", () => {
                this.osSidebar.classList.toggle("open");
            });
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

        // Controlos de Preview (caso existam no DOM)
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
        this.navItems.forEach(nav => nav.classList.remove("active"));
        if (clickedNavItem) clickedNavItem.classList.add("active");

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
            alert(`Ficheiro "${file.name}" anexado com sucesso! 🐝`);
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

        // PAYLOAD LIMPO (Rigorsamente compatível com o teu index.js no Render)
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
            // Rota configurada para o teu backend
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

            // Formatação com Marked.js ou fallback simples
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
        }
    }

    appendUserMessage(text, fileName) {
        if (!this.chatFeed) return;

        const msgContainer = document.createElement("div");
        msgContainer.style.cssText = "align-self: flex-end; max-width: 85%; background: linear-gradient(135deg, var(--primary), var(--secondary)); color: #fff; padding: 14px 18px; border-radius: 20px; font-size: 0.95rem; margin-left: auto; margin-bottom: 10px;";

        let fileHtml = fileName ? `<div style="font-size: 0.75rem; color: #ffd700; margin-bottom: 6px;">📎 ${fileName}</div>` : "";
        msgContainer.innerHTML = `${fileHtml}<div style="white-space: pre-wrap;">${text}</div>`;

        this.chatFeed.appendChild(msgContainer);
        this.scrollToBottom();
    }

    createAgentMessagePlaceholder() {
        if (!this.chatFeed) return null;

        const msgContainer = document.createElement("div");
        msgContainer.style.cssText = "align-self: flex-start; max-width: 85%; background: rgba(255, 255, 255, 0.05); border: 1px solid var(--border); padding: 16px 20px; border-radius: 20px; font-size: 0.95rem; margin-bottom: 15px; margin-right: auto;";

        msgContainer.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
                <span style="font-size: 1.1rem;">🐝</span>
                <strong style="font-size: 0.85rem; color: var(--primary);">Honey OS</strong>
            </div>
            <div class="message-content" style="line-height: 1.6; color: #e2e8f0;">
                <span style="color: var(--muted);">A processar...</span>
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

    scrollToBottom() {
        if (this.chatFeed) {
            this.chatFeed.scrollTop = this.chatFeed.scrollHeight;
        }
    }
}

// Inicialização da App quando o DOM estiver totalmente carregado
document.addEventListener("DOMContentLoaded", () => {
    window.honeyApp = new HoneyAIApp();
});
