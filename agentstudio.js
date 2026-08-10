/*
==========================================
HONEY IA
AGENT STUDIO ENGINE V9
Real Specialist Workspace
30 Agents Integration
Chat + Preview + Artifacts
Code + Files + Downloads
==========================================
*/


import Agents from "./agents.js";





class AgentStudio {





    constructor(){


        this.activeAgent = "general";


        this.mode = "chat";


        this.container = null;


        this.history = [];


        this.workspace = {


            artifacts: [],


            activeArtifact: null,


            processing: false


        };


        this.requestController = null;


    }





    // ==========================================================
    // INITIALIZE
    // ==========================================================


    init(containerId){


        this.container =
            document.getElementById(containerId);


        if(!this.container){


            console.warn(
                "[Agent Studio] Container não encontrado:",
                containerId
            );


            return;


        }


        this.listenEvents();


        this.render();


    }





    // ==========================================================
    // OPEN AGENT
    // ==========================================================


    open(agent){


        if(!agent) return;


        this.activeAgent =
            agent.id || "general";


        if(typeof Agents.setActive === "function"){


            Agents.setActive(
                this.activeAgent
            );


        }


        this.history =
            typeof Agents.getConversation === "function"
                ? Agents.getConversation(this.activeAgent)
                : [];


        this.workspace.artifacts = [];


        this.workspace.activeArtifact = null;


        document.dispatchEvent(
            new CustomEvent(
                "agent-opened",
                {
                    detail: agent
                }
            )
        );


        this.render();


    }





    // ==========================================================
    // GET CURRENT AGENT
    // ==========================================================


    getAgent(){


        return this.activeAgent;


    }





    // ==========================================================
    // GET PROFILE
    // ==========================================================


    getAgentProfile(){


        const agent =
            Agents.get(this.activeAgent);


        if(!agent) return null;


        return {


            id:
                agent.id,


            name:
                agent.name,


            category:
                agent.category || "",


            level:
                agent.level || "Professional",


            tools:
                agent.tools || [],


            description:
                agent.description || "",


            capabilities:
                agent.capabilities || [],


            outputTypes:
                agent.outputTypes || []


        };


    }





    // ==========================================================
    // MODE
    // ==========================================================


    setMode(mode){


        if(
            mode !== "chat" &&
            mode !== "live"
        ){
            return;
        }


        this.mode = mode;


        this.updateModeUI();


    }





    getMode(){


        return this.mode;


    }





    // ==========================================================
    // RENDER
    // ==========================================================


    render(){


        if(!this.container) return;


        const agent =
            Agents.get(this.activeAgent);


        if(!agent) return;


        this.container.innerHTML = `

            <div class="agent-studio-panel">

                <div class="studio-agent-header">

                    <div class="studio-agent-icon">

                        ${
                            agent.emoji ||
                            "🤖"
                        }

                    </div>


                    <div class="studio-agent-info">

                        <h2>
                            ${
                                this.escapeHTML(
                                    agent.name ||
                                    "Especialista Honey IA"
                                )
                            }
                        </h2>


                        <p>
                            ${
                                this.escapeHTML(
                                    agent.description ||
                                    "Especialista Honey IA"
                                )
                            }
                        </p>


                        <span class="agent-level">
                            ${
                                this.escapeHTML(
                                    agent.level ||
                                    "Professional"
                                )
                            }
                        </span>

                    </div>

                </div>


                <div class="studio-tools">

                    <h3>
                        Capacidades
                    </h3>


                    <div class="tools-list">

                        ${
                            (agent.tools || [])
                                .map(
                                    tool => `
                                        <span class="tool-item">
                                            ${this.escapeHTML(tool)}
                                        </span>
                                    `
                                )
                                .join("")
                        }

                    </div>

                </div>


                <div class="studio-mode">

                    <button
                        class="mode-btn ${
                            this.mode === "chat"
                                ? "active"
                                : ""
                        }"
                        data-mode="chat"
                        type="button"
                    >
                        💬 Chat
                    </button>


                    <button
                        class="mode-btn ${
                            this.mode === "live"
                                ? "active"
                                : ""
                        }"
                        data-mode="live"
                        type="button"
                    >
                        ⚡ Live
                    </button>

                </div>


                <div class="studio-workspace">

                    <div class="studio-chat-area">

                        <div
                            id="studioHistory"
                            class="studio-history"
                        >

                            ${
                                this.renderHistory()
                            }

                        </div>


                        <div
                            id="studioProcessing"
                            class="studio-processing"
                            hidden
                        >

                            <span></span>
                            <span></span>
                            <span></span>

                            <strong>
                                ${
                                    this.escapeHTML(
                                        agent.name ||
                                        "Especialista"
                                    )
                                } está a trabalhar...
                            </strong>

                        </div>


                        <div class="studio-input-area">

                            <textarea
                                id="studioInput"
                                placeholder="Diga ao especialista o que precisa..."
                                rows="1"
                            ></textarea>


                            <button
                                id="studioSend"
                                type="button"
                            >
                                Enviar
                            </button>

                        </div>

                    </div>


                    <aside
                        class="studio-preview-panel"
                        id="studioPreviewPanel"
                    >

                        ${
                            this.renderPreview()
                        }

                    </aside>

                </div>

            </div>

        `;


        this.bindEvents();


    }





    // ==========================================================
    // HISTORY
    // ==========================================================


    renderHistory(){


        if(
            !this.history ||
            this.history.length === 0
        ){


            return `

                <div class="empty-history">

                    <div>
                        ✨
                    </div>

                    <strong>
                        Studio pronto
                    </strong>

                    <span>
                        Dê uma tarefa ao especialista
                        e veja o resultado aparecer
                        no Preview.
                    </span>

                </div>

            `;


        }


        return this.history
            .map(
                message => `

                    <div class="history-message ${message.role}">

                        <div class="history-message-content">

                            ${
                                message.role === "assistant"
                                    ? this.renderAssistantContent(
                                        message.content
                                    )
                                    : this.escapeHTML(
                                        message.content
                                    )
                            }

                        </div>

                    </div>

                `
            )
            .join("");


    }





    // ==========================================================
    // ASSISTANT CONTENT
    // ==========================================================


    renderAssistantContent(content){


        if(!content) return "";


        if(window.marked){


            try{


                return window.marked.parse(
                    content
                );


            }catch(error){


                console.warn(
                    "[Agent Studio] Markdown:",
                    error
                );


            }


        }


        return this.escapeHTML(
            content
        )
        .replace(
            /\n/g,
            "<br>"
        );


    }





    // ==========================================================
    // PREVIEW
    // ==========================================================


    renderPreview(){


        const artifacts =
            this.workspace.artifacts || [];


        if(!artifacts.length){


            return `

                <div class="studio-preview-empty">

                    <div class="preview-empty-icon">
                        <i class="fa-solid fa-display"></i>
                    </div>

                    <h3>
                        Preview
                    </h3>

                    <p>
                        Os resultados produzidos
                        pelo especialista aparecerão
                        aqui.
                    </p>

                </div>

            `;


        }


        const active =
            this.workspace.activeArtifact ||
            artifacts[artifacts.length - 1];


        return `

            <div class="studio-preview">

                <div class="preview-header">

                    <div>

                        <span>
                            RESULTADO
                        </span>

                        <strong>
                            ${
                                this.escapeHTML(
                                    active.name ||
                                    "Resultado"
                                )
                            }
                        </strong>

                    </div>


                    <div class="preview-actions">

                        <button
                            type="button"
                            data-preview-action="download"
                            title="Baixar"
                        >
                            <i class="fa-solid fa-download"></i>
                        </button>


                        <button
                            type="button"
                            data-preview-action="open"
                            title="Abrir"
                        >
                            <i class="fa-solid fa-up-right-from-square"></i>
                        </button>

                    </div>

                </div>


                <div class="preview-tabs">

                    ${
                        artifacts
                            .map(
                                (artifact, index) => `

                                    <button
                                        type="button"
                                        class="${
                                            artifact.id === active.id
                                                ? "active"
                                                : ""
                                        }"
                                        data-artifact-index="${index}"
                                    >

                                        ${
                                            this.escapeHTML(
                                                artifact.name ||
                                                `Resultado ${index + 1}`
                                            )
                                        }

                                    </button>

                                `
                            )
                            .join("")
                    }

                </div>


                <div class="preview-content">

                    ${
                        this.renderArtifact(
                            active
                        )
                    }

                </div>

            </div>

        `;


    }





    // ==========================================================
    // ARTIFACT RENDER
    // ==========================================================


    renderArtifact(artifact){


        if(!artifact){


            return `
                <div class="preview-empty">
                    Nenhum resultado selecionado.
                </div>
            `;


        }


        const type =
            String(
                artifact.type ||
                artifact.mime ||
                ""
            ).toLowerCase();


        const content =
            artifact.content || "";


        /*
        ======================================================
        IMAGE
        ======================================================
        */


        if(
            type.includes("image") ||
            artifact.kind === "image"
        ){


            const src =
                artifact.url ||
                artifact.src ||
                content;


            return `

                <div class="artifact-image">

                    <img
                        src="${this.escapeAttribute(src)}"
                        alt="${this.escapeAttribute(
                            artifact.name || "Imagem gerada"
                        )}"
                    />

                </div>

            `;


        }


        /*
        ======================================================
        HTML / WEBSITE / APP PREVIEW
        ======================================================
        */


        if(
            type.includes("html") ||
            artifact.kind === "website" ||
            artifact.kind === "html"
        ){


            return `

                <iframe
                    class="artifact-iframe"
                    sandbox="allow-scripts allow-forms allow-modals"
                    srcdoc="${this.escapeAttribute(
                        content
                    )}"
                    title="Preview do resultado"
                ></iframe>

            `;


        }


        /*
        ======================================================
        VIDEO
        ======================================================
        */


        if(
            type.includes("video") ||
            artifact.kind === "video"
        ){


            const src =
                artifact.url ||
                artifact.src;


            return `

                <div class="artifact-video">

                    <video
                        controls
                        playsinline
                        src="${this.escapeAttribute(src)}"
                    ></video>

                </div>

            `;


        }


        /*
        ======================================================
        PDF
        ======================================================
        */


        if(
            type.includes("pdf") ||
            artifact.kind === "pdf"
        ){


            const src =
                artifact.url ||
                artifact.src ||
                content;


            return `

                <iframe
                    class="artifact-document"
                    src="${this.escapeAttribute(src)}"
                    title="Preview PDF"
                ></iframe>

            `;


        }


        /*
        ======================================================
        CODE
        ======================================================
        */


        if(
            artifact.kind === "code" ||
            type.includes("javascript") ||
            type.includes("python") ||
            type.includes("css") ||
            type.includes("json") ||
            type.includes("xml") ||
            type.includes("text")
        ){


            const language =
                artifact.language ||
                this.detectLanguage(
                    artifact.name || "",
                    type
                );


            return `

                <div class="artifact-code">

                    <div class="artifact-code-header">

                        <span>
                            ${this.escapeHTML(language)}
                        </span>

                        <button
                            type="button"
                            data-copy-artifact
                        >
                            <i class="fa-regular fa-copy"></i>
                            Copiar
                        </button>

                    </div>


                    <pre><code class="language-${this.escapeAttribute(language)}">${
                        this.escapeHTML(content)
                    }</code></pre>

                </div>

            `;


        }


        /*
        ======================================================
        GENERIC FILE / TEXT
        ======================================================
        */


        return `

            <div class="artifact-text">

                ${
                    this.renderAssistantContent(
                        content ||
                        artifact.description ||
                        "Resultado produzido."
                    )
                }

            </div>

        `;


    }





    // ==========================================================
    // BIND EVENTS
    // ==========================================================


    bindEvents(){


        if(!this.container) return;


        /*
        MODE
        */


        this.container
            .querySelectorAll("[data-mode]")
            .forEach(
                button => {


                    button.addEventListener(
                        "click",
                        () => {


                            this.setMode(
                                button.dataset.mode
                            );


                        }
                    );


                }
            );


        /*
        SEND
        */


        const sendButton =
            this.container.querySelector(
                "#studioSend"
            );


        sendButton?.addEventListener(
            "click",
            () => this.sendMessage()
        );


        /*
        INPUT
        */


        const input =
            this.container.querySelector(
                "#studioInput"
            );


        input?.addEventListener(
            "keydown",
            event => {


                if(
                    event.key === "Enter" &&
                    !event.shiftKey
                ){


                    event.preventDefault();


                    this.sendMessage();


                }


            }
        );


        /*
        PREVIEW TABS
        */


        this.container
            .querySelectorAll(
                "[data-artifact-index]"
            )
            .forEach(
                button => {


                    button.addEventListener(
                        "click",
                        () => {


                            const index =
                                Number(
                                    button.dataset.artifactIndex
                                );


                            this.selectArtifact(
                                index
                            );


                        }
                    );


                }
            );


        /*
        DOWNLOAD
        */


        this.container
            .querySelector(
                '[data-preview-action="download"]'
            )
            ?.addEventListener(
                "click",
                () => this.downloadActiveArtifact()
            );


        /*
        OPEN
        */


        this.container
            .querySelector(
                '[data-preview-action="open"]'
            )
            ?.addEventListener(
                "click",
                () => this.openActiveArtifact()
            );


        /*
        COPY
        */


        this.container
            .querySelector(
                "[data-copy-artifact]"
            )
            ?.addEventListener(
                "click",
                () => this.copyActiveArtifact()
            );


        this.highlightCode();


    }





    // ==========================================================
    // SEND MESSAGE
    // ==========================================================


    async sendMessage(){


        if(
            !this.container ||
            this.workspace.processing
        ){
            return;
        }


        const input =
            this.container.querySelector(
                "#studioInput"
            );


        if(!input) return;


        const text =
            input.value.trim();


        if(!text) return;


        input.value = "";


        this.saveConversation(
            "user",
            text
        );


        this.workspace.processing = true;


        this.render();


        try{


            if(this.requestController){


                this.requestController.abort();


            }


            this.requestController =
                new AbortController();


            const response =
                await fetch(
                    `${window.location.origin}/gerar-gratis`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json",

                            ...(this.getToken()
                                ? {
                                    "Authorization":
                                        "Bearer " +
                                        this.getToken()
                                }
                                : {})
                        },

                        body: JSON.stringify({

                            prompt: text,

                            agentId:
                                this.activeAgent,

                            agent:
                                this.getAgentProfile(),

                            history:
                                this.history,

                            mode:
                                this.mode

                        }),

                        signal:
                            this.requestController.signal
                    }
                );


            let data = null;


            try{


                data =
                    await response.json();


            }catch(error){


                data = null;


            }


            if(!response.ok){


                throw new Error(
                    data?.message ||
                    data?.error ||
                    `Erro ${response.status}`
                );


            }


            const result =
                this.normalizeResponse(
                    data
                );


            if(result.answer){


                this.saveConversation(
                    "assistant",
                    result.answer
                );


            }


            if(result.artifacts.length){


                result.artifacts.forEach(
                    artifact => {

                        this.addArtifact(
                            artifact
                        );

                    }
                );


            }


            this.workspace.processing = false;


            this.render();


            this.highlightCode();


        }catch(error){


            this.workspace.processing = false;


            if(error?.name === "AbortError"){


                return;


            }


            console.error(
                "[Agent Studio]",
                error
            );


            this.saveConversation(
                "assistant",
                "Não foi possível concluir esta tarefa. Verifique a ligação ao servidor e tente novamente."
            );


            this.render();


        }


    }





    // ==========================================================
    // NORMALIZE API RESPONSE
    // ==========================================================


    normalizeResponse(data){


        let answer =
            data?.response ||
            data?.resposta ||
            data?.reply ||
            data?.message ||
            data?.data?.response ||
            data?.data?.reply ||
            "";


        const artifacts = [];


        /*
        ======================================================
        DIRECT ARTIFACT
        ======================================================
        */


        if(data?.artifact){


            artifacts.push(
                this.normalizeArtifact(
                    data.artifact
                )
            );


        }


        /*
        ======================================================
        OUTPUT
        ======================================================
        */


        if(data?.output){


            if(
                typeof data.output === "object" &&
                !Array.isArray(data.output)
            ){


                artifacts.push(
                    this.normalizeArtifact(
                        data.output
                    )
                );


            }


        }


        /*
        ======================================================
        FILES
        ======================================================
        */


        const files =
            data?.files ||
            data?.artifacts ||
            data?.outputs ||
            data?.data?.files ||
            [];


        if(Array.isArray(files)){


            files.forEach(
                file => {


                    artifacts.push(
                        this.normalizeArtifact(
                            file
                        )
                    );


                }
            );


        }


        /*
        ======================================================
        SINGLE GENERATED RESULT
        ======================================================
        */


        if(
            data?.content &&
            (
                data?.type ||
                data?.mime ||
                data?.filename ||
                data?.fileName
            )
        ){


            artifacts.push(
                this.normalizeArtifact({
                    content: data.content,
                    type: data.type,
                    mime: data.mime,
                    filename:
                        data.filename ||
                        data.fileName,
                    url: data.url
                })
            );


        }


        /*
        ======================================================
        RAW CODE RESULT
        ======================================================
        */


        if(
            !artifacts.length &&
            data?.code
        ){


            artifacts.push(
                this.normalizeArtifact({
                    content: data.code,
                    type:
                        data.language ||
                        "text/plain",
                    name:
                        data.filename ||
                        "resultado.txt",
                    kind: "code",
                    language:
                        data.language
                })
            );


        }


        return {


            answer:
                typeof answer === "string"
                    ? answer
                    : "",


            artifacts:
                artifacts.filter(Boolean)


        };


    }





    // ==========================================================
    // NORMALIZE ARTIFACT
    // ==========================================================


    normalizeArtifact(raw){


        if(!raw) return null;


        if(typeof raw === "string"){


            return {


                id:
                    this.createId(),


                name:
                    "Resultado.txt",


                type:
                    "text/plain",


                kind:
                    "text",


                content:
                    raw


            };


        }


        const mime =
            raw.mime ||
            raw.type ||
            raw.contentType ||
            "text/plain";


        const name =
            raw.name ||
            raw.filename ||
            raw.fileName ||
            this.defaultFileName(
                mime,
                raw.language
            );


        let kind =
            raw.kind ||
            this.kindFromMime(
                mime,
                name
            );


        return {


            id:
                raw.id ||
                this.createId(),


            name,


            type:
                mime,


            mime,


            kind,


            language:
                raw.language ||
                this.detectLanguage(
                    name,
                    mime
                ),


            content:
                raw.content ||
                raw.text ||
                raw.code ||
                "",


            url:
                raw.url ||
                raw.downloadUrl ||
                raw.download_url ||
                raw.src ||
                "",


            description:
                raw.description ||
                "",


            size:
                raw.size ||
                null


        };


    }





    // ==========================================================
    // ARTIFACT MANAGEMENT
    // ==========================================================


    addArtifact(artifact){


        if(!artifact) return;


        this.workspace.artifacts.push(
            artifact
        );


        this.workspace.activeArtifact =
            artifact;


    }





    selectArtifact(index){


        const artifact =
            this.workspace.artifacts[index];


        if(!artifact) return;


        this.workspace.activeArtifact =
            artifact;


        this.render();


        this.highlightCode();


    }





    getActiveArtifact(){


        return (
            this.workspace.activeArtifact ||
            this.workspace.artifacts[
                this.workspace.artifacts.length - 1
            ] ||
            null
        );


    }





    // ==========================================================
    // DOWNLOAD ARTIFACT
    // ==========================================================


    async downloadActiveArtifact(){


        const artifact =
            this.getActiveArtifact();


        if(!artifact) return;


        try{


            if(artifact.url){


                const link =
                    document.createElement("a");


                link.href =
                    artifact.url;


                link.download =
                    artifact.name ||
                    "honey-ia-result";


                link.target =
                    "_blank";


                document.body.appendChild(
                    link
                );


                link.click();


                link.remove();


                return;


            }


            if(!artifact.content){


                console.warn(
                    "[Agent Studio] Resultado sem conteúdo."
                );


                return;


            }


            const blob =
                new Blob(
                    [artifact.content],
                    {
                        type:
                            artifact.mime ||
                            artifact.type ||
                            "text/plain"
                    }
                );


            const url =
                URL.createObjectURL(
                    blob
                );


            const link =
                document.createElement("a");


            link.href = url;


            link.download =
                artifact.name ||
                "honey-ia-result.txt";


            document.body.appendChild(
                link
            );


            link.click();


            link.remove();


            setTimeout(
                () => {
                    URL.revokeObjectURL(
                        url
                    );
                },
                1000
            );


        }catch(error){


            console.error(
                "[Agent Studio] Download:",
                error
            );


        }


    }





    // ==========================================================
    // OPEN ARTIFACT
    // ==========================================================


    openActiveArtifact(){


        const artifact =
            this.getActiveArtifact();


        if(!artifact) return;


        if(artifact.url){


            window.open(
                artifact.url,
                "_blank",
                "noopener,noreferrer"
            );


            return;


        }


        if(
            artifact.kind === "website" ||
            artifact.kind === "html"
        ){


            const blob =
                new Blob(
                    [artifact.content],
                    {
                        type:
                            "text/html"
                    }
                );


            const url =
                URL.createObjectURL(
                    blob
                );


            window.open(
                url,
                "_blank",
                "noopener,noreferrer"
            );


            return;


        }


        this.downloadActiveArtifact();


    }





    // ==========================================================
    // COPY ARTIFACT
    // ==========================================================


    async copyActiveArtifact(){


        const artifact =
            this.getActiveArtifact();


        if(!artifact?.content) return;


        try{


            await navigator.clipboard.writeText(
                artifact.content
            );


        }catch(error){


            console.warn(
                "[Agent Studio] Clipboard:",
                error
            );


        }


    }





    // ==========================================================
    // CODE HIGHLIGHT
    // ==========================================================


    highlightCode(){


        if(!window.hljs) return;


        this.container
            ?.querySelectorAll(
                "pre code"
            )
            .forEach(
                block => {


                    try{


                        window.hljs.highlightElement(
                            block
                        );


                    }catch(error){


                        console.warn(
                            "[Agent Studio] Highlight:",
                            error
                        );


                    }


                }
            );


    }





    // ==========================================================
    // SAVE CONVERSATION
    // ==========================================================


    saveConversation(
        role,
        content
    ){


        if(
            typeof Agents.addConversation ===
            "function"
        ){


            Agents.addConversation(
                this.activeAgent,
                role,
                content
            );


        }


        this.history.push({

            role,

            content

        });


    }





    // ==========================================================
    // UPDATE MODE UI
    // ==========================================================


    updateModeUI(){


        if(!this.container) return;


        this.container
            .querySelectorAll(
                "[data-mode]"
            )
            .forEach(
                button => {


                    button.classList.toggle(
                        "active",
                        button.dataset.mode ===
                        this.mode
                    );


                }
            );


    }





    // ==========================================================
    // CLEAR HISTORY
    // ==========================================================


    clearHistory(){


        const agent =
            Agents.get(
                this.activeAgent
            );


        if(agent){


            agent.conversations = [];


        }


        this.history = [];


        this.workspace.artifacts = [];


        this.workspace.activeArtifact = null;


        this.render();


    }





    // ==========================================================
    // WORKSPACE STATE
    // ==========================================================


    getWorkspaceState(){


        return {


            agent:
                this.activeAgent,


            mode:
                this.mode,


            history:
                this.history,


            artifacts:
                this.workspace.artifacts,


            activeArtifact:
                this.workspace.activeArtifact,


            processing:
                this.workspace.processing,


            profile:
                this.getAgentProfile()


        };


    }





    // ==========================================================
    // EXPORT PROFILE
    // ==========================================================


    exportProfile(){


        const profile =
            this.getAgentProfile();


        if(!profile) return null;


        return JSON.stringify(
            profile,
            null,
            2
        );


    }





    // ==========================================================
    // TOKEN
    // ==========================================================


    getToken(){


        return (
            localStorage.getItem(
                "honey_token"
            ) ||
            localStorage.getItem(
                "token"
            ) ||
            ""
        );


    }





    // ==========================================================
    // LANGUAGE
    // ==========================================================


    detectLanguage(
        filename = "",
        mime = ""
    ){


        const name =
            filename.toLowerCase();


        if(
            mime.includes("javascript") ||
            name.endsWith(".js")
        ){
            return "javascript";
        }


        if(
            mime.includes("python") ||
            name.endsWith(".py")
        ){
            return "python";
        }


        if(
            mime.includes("html") ||
            name.endsWith(".html") ||
            name.endsWith(".htm")
        ){
            return "html";
        }


        if(
            mime.includes("css") ||
            name.endsWith(".css")
        ){
            return "css";
        }


        if(
            mime.includes("json") ||
            name.endsWith(".json")
        ){
            return "json";
        }


        if(
            mime.includes("xml") ||
            name.endsWith(".xml")
        ){
            return "xml";
        }


        if(
            name.endsWith(".sql")
        ){
            return "sql";
        }


        if(
            name.endsWith(".java")
        ){
            return "java";
        }


        if(
            name.endsWith(".cpp") ||
            name.endsWith(".cc")
        ){
            return "cpp";
        }


        if(
            name.endsWith(".ts")
        ){
            return "typescript";
        }


        return "text";


    }





    // ==========================================================
    // ARTIFACT KIND
    // ==========================================================


    kindFromMime(
        mime,
        filename
    ){


        const type =
            String(
                mime || ""
            ).toLowerCase();


        const name =
            String(
                filename || ""
            ).toLowerCase();


        if(type.includes("image"))
            return "image";


        if(type.includes("video"))
            return "video";


        if(type.includes("pdf"))
            return "pdf";


        if(
            type.includes("html") ||
            name.endsWith(".html")
        ){
            return "website";
        }


        if(
            type.includes("javascript") ||
            type.includes("python") ||
            type.includes("css") ||
            type.includes("json") ||
            type.includes("xml") ||
            name.endsWith(".js") ||
            name.endsWith(".py") ||
            name.endsWith(".css") ||
            name.endsWith(".json")
        ){
            return "code";
        }


        return "text";


    }





    // ==========================================================
    // DEFAULT FILE NAME
    // ==========================================================


    defaultFileName(
        mime,
        language
    ){


        if(
            String(mime).includes("html")
        ){
            return "honey-ia-site.html";
        }


        if(
            String(mime).includes("javascript")
        ){
            return "honey-ia-app.js";
        }


        if(
            String(mime).includes("python")
        ){
            return "honey-ia-app.py";
        }


        if(
            String(mime).includes("css")
        ){
            return "honey-ia-style.css";
        }


        if(
            String(mime).includes("json")
        ){
            return "honey-ia-data.json";
        }


        if(
            String(mime).includes("pdf")
        ){
            return "honey-ia-document.pdf";
        }


        if(
            String(mime).includes("csv")
        ){
            return "honey-ia-data.csv";
        }


        return (
            "honey-ia-result." +
            (
                language ||
                "txt"
            )
        );


    }





    // ==========================================================
    // RESET
    // ==========================================================


    reset(){


        if(this.requestController){


            this.requestController.abort();


        }


        this.activeAgent =
            "general";


        this.mode =
            "chat";


        this.history =
            [];


        this.workspace = {


            artifacts: [],


            activeArtifact: null,


            processing: false


        };


        if(this.container){


            this.render();


        }


    }





    // ==========================================================
    // EVENT LISTENERS
    // ==========================================================


    listenEvents(){


        if(this._eventsReady)
            return;


        this._eventsReady = true;


        document.addEventListener(
            "agent-selected",
            event => {


                const agent =
                    event.detail;


                if(agent){


                    this.open(
                        agent
                    );


                }


            }
        );


    }





    // ==========================================================
    // AUTO INIT
    // ==========================================================


    autoInit(){


        const studio =
            document.getElementById(
                "agentStudioContainer"
            );


        if(studio){


            this.init(
                "agentStudioContainer"
            );


        }


    }





    // ==========================================================
    // DESTROY
    // ==========================================================


    destroy(){


        if(this.requestController){


            this.requestController.abort();


        }


        if(this.container){


            this.container.innerHTML =
                "";


        }


        this.container =
            null;


        this.history =
            [];


        this.workspace =
            {};


        this._eventsReady =
            false;


    }





    // ==========================================================
    // SECURITY HELPERS
    // ==========================================================


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





    escapeAttribute(value){


        return this.escapeHTML(
            value
        )
        .replace(
            /`/g,
            "&#096;"
        );


    }





    createId(){


        return (
            "artifact_" +
            Date.now() +
            "_" +
            Math.random()
                .toString(36)
                .slice(2,9)
        );


    }


}





const agentstudio =
    new AgentStudio();


export default agentstudio;
