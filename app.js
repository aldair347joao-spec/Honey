/**
 * HONEY IA — CORE ENGINE V5 (ESTÁVEL)
 */

import { Components } from "./components.js";

const SESSION_ID = crypto.randomUUID();

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

class HoneyAIApp {
    constructor() {
        this.initDOMReferences();
        this.initEventListeners();
        this.initMarkdownEngine();
    }

    initDOMReferences() {
        this.kernelStatusCard = document.getElementById("kernel-status");
        this.kernelStateText = document.getElementById("kernel-state-text");
        this.btnToggleMenu = document.getElementById("btn-toggle-menu");
        this.osSidebar = document.getElementById("os-sidebar");

        this.navItems = document.querySelectorAll(".nav-item");
        this.workspaceViews = document.querySelectorAll(".workspace-view");

        this.chatFeed = document.getElementById("chat-feed");
        this.promptForm = document.getElementById("os-prompt-form");
        this.promptTextarea = document.getElementById("prompt-textarea");
        this.fileUploadInput = document.getElementById("file-upload");
        this.attachmentBar = document.getElementById("attachment-bar");
        this.attachedFileName = document.getElementById("attached-file-name");
        this.btnRemoveAttachment = document.getElementById("btn-remove-attachment");

        this.previewPane = document.getElementById("preview-pane");
        this.btnTogglePreview = document.getElementById("btn-toggle-preview");
        this.btnClosePreview = document.getElementById("btn-close-preview");
        this.livePreviewIframe = document.getElementById("live-preview-iframe");
    }

    initEventListeners() {
        // Menu Lateral
        this.navItems.forEach(item => {
            item.addEventListener("click", () => {
                const target = item.getAttribute("data-view");
                this.switchView(target, item);
                this.osSidebar.classList.remove("open");
            });
        });

        if (this.btnToggleMenu) {
            this.btnToggleMenu.addEventListener("click", () => {
                this.osSidebar.classList.toggle("open");
            });
        }

        // Auto-Resize Textarea
        this.promptTextarea.addEventListener("input", () => {
            this.promptTextarea.style.height = "auto";
            this.promptTextarea.style.height = `${Math.min(this.promptTextarea.scrollHeight, 100)}px`;
        });

        this.promptTextarea.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                this.promptForm.dispatchEvent(new Event("submit"));
            }
        });

        // Upload
        this.fileUploadInput.addEventListener("change", (e) => this.handleFileUpload(e));
        this.btnRemoveAttachment.addEventListener("click", () => this.clearAttachment());

        // Envio do Form
        this.promptForm.addEventListener("submit", (e) => this.handleSubmitPrompt(e));

        // Preview Controls
        if (this.btnTogglePreview) {
            this.btnTogglePreview.addEventListener("click", () => {
                this.previewPane.classList.toggle("hidden");
            });
        }

        if (this.btnClosePreview) {
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
                case "workspaces": Components.renderWorkspaces(targetElement); break;
                case "memories": Components.renderMemories(targetElement); break;
                case "agents": Components.renderAgents(targetElement); break;
                case "tools": Components.renderTools(targetElement); break;
                case "system": Components.renderSystem(targetElement); break;
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

        this.appendUserMessage(userText, Store.state.selectedFileName);

        // PAYLOAD LIMPO (Compatível rigorosamente com o teu index.js no Render)
        const payload = {
            prompt: userText
        };

        if (Store.state.selectedFileBase64) {
            payload.imagem = Store.state.selectedFileBase64;
        }

        this.promptTextarea.value = "";
        this.promptTextarea.style.height = "auto";
        this.clearAttachment();

        this.setKernelState(true, "Processando...");
        const agentMessageElement = this.createAgentMessagePlaceholder();

        try {
            const response = await fetch("/gerar-gratis", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.erro || "Falha no servidor Render.");
            }

            const formattedContent = marked.parse(data.resposta || "Processado com sucesso.");
            agentMessageElement.querySelector(".message-content").innerHTML = formattedContent;

            this.detectAndRenderPreview(data.resposta);

        } catch (error) {
            agentMessageElement.querySelector(".message-content").innerHTML = `
                <div style="color: #ef4444; background: rgba(239, 68, 68, 0.1); padding: 10px; border-radius: 8px; font-size: 0.85rem;">
                    <strong>Erro no Kernel:</strong> ${error.message}
                </div>
            `;
        } finally {
            this.setKernelState(false);
            this.scrollToBottom();
        }
    }

    appendUserMessage(text, fileName) {
        const msgContainer = document.createElement("div");
        msgContainer.style.cssText = "align-self: flex-end; max-width: 85%; background: var(--bg-card); border: 1px solid var(--border-color); padding: 12px 16px; border-radius: var(--radius-md); font-size: 0.9rem; margin-left: auto;";

        let fileHtml = fileName ? `<div style="font-size: 0.72rem; color: var(--accent-gold); margin-bottom: 4px;">📎 ${fileName}</div>` : "";
        msgContainer.innerHTML = `${fileHtml}<div style="white-space: pre-wrap;">${text}</div>`;

        this.chatFeed.appendChild(msgContainer);
        this.scrollToBottom();
    }

    createAgentMessagePlaceholder() {
        const msgContainer = document.createElement("div");
        msgContainer.style.cssText = "align-self: flex-start; max-width: 90%; background: var(--bg-panel); border: 1px solid var(--border-color); padding: 14px 16px; border-radius: var(--radius-md); font-size: 0.9rem;";

        msgContainer.innerHTML = `
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px;">
                <span>🐝</span>
                <strong style="font-size: 0.8rem; color: var(--accent-gold);">Honey OS</strong>
            </div>
            <div class="message-content" style="line-height: 1.5; color: var(--text-main);">
                <span style="color: var(--text-muted);">A processar...</span>
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

document.addEventListener("DOMContentLoaded", () => {
    window.honeyApp = new HoneyAIApp();
});
