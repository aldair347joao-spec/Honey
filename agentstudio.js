/*

HONEY IA
AGENT STUDIO ENGINE V10.0
Real Specialist Workspace
30 Agents Integration
Chat + Live + Preview
Real Artifacts + Files
Code + Documents + Media
Projects + Deployment
Secure API Communication

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

        files: [],

        activeFile: null,

        project: null,

        deployment: null,

        processing: false

    };

    this.requestController = null;

    this._eventsReady = false;

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

    this.workspace = {

        artifacts: [],

        activeArtifact: null,

        files: [],

        activeFile: null,

        project: null,

        deployment: null,

        processing: false

    };

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
// CURRENT AGENT
// ==========================================================

getAgent(){

    return this.activeAgent;

}


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
            agent.outputTypes || [],

        formats:
            agent.formats || [],

        languages:
            agent.languages || [],

        features:
            agent.features || []

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
                        ${
                            this.workspace.processing
                                ? ""
                                : "hidden"
                        }
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
                            }

                            está a trabalhar...

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
                            ${
                                this.workspace.processing
                                    ? "disabled"
                                    : ""
                            }
                        >

                            ${
                                this.workspace.processing
                                    ? "A trabalhar..."
                                    : "Enviar"
                            }

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

                <div
                    class="history-message ${
                        message.role || "assistant"
                    }"
                >

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
                String(content)
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

    const files =
        this.workspace.files || [];


    if(
        !artifacts.length &&
        !files.length &&
        !this.workspace.project
    ){

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
        this.getActiveArtifact();


    if(active){

        return this.renderArtifactPreview(
            active
        );

    }


    if(files.length){

        return this.renderFilesPreview();

    }


    if(this.workspace.project){

        return this.renderProjectPreview();

    }


    return `

        <div class="studio-preview-empty">

            <h3>
                Resultado disponível
            </h3>

        </div>

    `;

}


// ==========================================================
// ARTIFACT PREVIEW
// ==========================================================

renderArtifactPreview(artifact){

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
                                artifact.name ||
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


            ${
                this.renderArtifactTabs()
            }


            <div class="preview-content">

                ${
                    this.renderArtifact(
                        artifact
                    )
                }

            </div>

        </div>

    `;

}


// ==========================================================
// ARTIFACT TABS
// ==========================================================

renderArtifactTabs(){

    const artifacts =
        this.workspace.artifacts || [];

    if(artifacts.length <= 1){

        return "";

    }

    const active =
        this.getActiveArtifact();


    return `

        <div class="preview-tabs">

            ${
                artifacts
                    .map(
                        (artifact,index) => `

                            <button
                                type="button"
                                class="${
                                    artifact.id === active?.id
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

    const kind =
        String(
            artifact.kind || ""
        ).toLowerCase();

    const content =
        artifact.content || "";


    // IMAGE

    if(
        type.includes("image") ||
        kind === "image"
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
                        artifact.name ||
                        "Imagem gerada"
                    )}"
                />

            </div>

        `;

    }


    // VIDEO

    if(
        type.includes("video") ||
        kind === "video"
    ){

        const src =
            artifact.url ||
            artifact.src ||
            content;


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


    // AUDIO

    if(
        type.includes("audio") ||
        kind === "audio"
    ){

        const src =
            artifact.url ||
            artifact.src ||
            content;


        return `

            <div class="artifact-audio">

                <audio
                    controls
                    src="${this.escapeAttribute(src)}"
                ></audio>

            </div>

        `;

    }


    // WEBSITE / HTML

    if(
        type.includes("html") ||
        kind === "website" ||
        kind === "html"
    ){

        return `

            <iframe
                class="artifact-iframe"
                sandbox="allow-scripts allow-forms allow-modals allow-popups"
                srcdoc="${this.escapeAttribute(
                    content
                )}"
                title="Preview do resultado"
            ></iframe>

        `;

    }


    // PDF

    if(
        type.includes("pdf") ||
        kind === "pdf"
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


    // SPREADSHEET

    if(
        type.includes("spreadsheet") ||
        type.includes("excel") ||
        type.includes("csv") ||
        kind === "spreadsheet" ||
        kind === "excel"
    ){

        return this.renderSpreadsheet(
            artifact
        );

    }


    // SLIDES

    if(
        type.includes("presentation") ||
        type.includes("powerpoint") ||
        kind === "slides" ||
        kind === "presentation"
    ){

        return this.renderSlides(
            artifact
        );

    }


    // CODE

    if(
        kind === "code" ||
        this.isCodeType(type)
    ){

        return this.renderCode(
            artifact
        );

    }


    // GENERIC

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
// CODE PREVIEW
// ==========================================================

renderCode(artifact){

    const language =
        artifact.language ||
        this.detectLanguage(
            artifact.name || "",
            artifact.type || ""
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


            <pre><code class="language-${this.escapeAttribute(
                language
            )}">${
                this.escapeHTML(
                    artifact.content || ""
                )
            }</code></pre>

        </div>

    `;

}


// ==========================================================
// SPREADSHEET PREVIEW
// ==========================================================

renderSpreadsheet(artifact){

    let rows =
        artifact.rows ||
        artifact.data ||
        null;


    if(
        typeof rows === "string"
    ){

        try{

            rows =
                JSON.parse(rows);

        }catch(error){

            rows = null;

        }

    }


    if(
        !Array.isArray(rows) ||
        !rows.length
    ){

        return `

            <div class="artifact-file-preview">

                <div>
                    <i class="fa-solid fa-file-excel"></i>
                </div>

                <strong>
                    ${
                        this.escapeHTML(
                            artifact.name ||
                            "Planilha"
                        )
                    }
                </strong>

                <p>
                    A planilha foi produzida e está
                    disponível para download.
                </p>

            </div>

        `;

    }


    const headers =
        Array.isArray(rows[0])
            ? rows[0]
            : Object.keys(rows[0] || {});


    const body =
        Array.isArray(rows[0])
            ? rows.slice(1)
            : rows.map(
                row =>
                    headers.map(
                        key => row[key]
                    )
            );


    return `

        <div class="artifact-table">

            <table>

                <thead>

                    <tr>

                        ${
                            headers.map(
                                header => `

                                    <th>
                                        ${this.escapeHTML(header)}
                                    </th>

                                `
                            ).join("")
                        }

                    </tr>

                </thead>


                <tbody>

                    ${
                        body
                            .slice(0,100)
                            .map(
                                row => `

                                    <tr>

                                        ${
                                            row.map(
                                                cell => `

                                                    <td>
                                                        ${
                                                            this.escapeHTML(
                                                                cell
                                                            )
                                                        }
                                                    </td>

                                                `
                                            ).join("")
                                        }

                                    </tr>

                                `
                            )
                            .join("")
                    }

                </tbody>

            </table>

        </div>

    `;

}


// ==========================================================
// SLIDES PREVIEW
// ==========================================================

renderSlides(artifact){

    const slides =
        artifact.slides ||
        artifact.data ||
        [];


    if(!Array.isArray(slides) || !slides.length){

        return `

            <div class="artifact-file-preview">

                <div>
                    <i class="fa-solid fa-file-powerpoint"></i>
                </div>

                <strong>
                    ${
                        this.escapeHTML(
                            artifact.name ||
                            "Apresentação"
                        )
                    }
                </strong>

                <p>
                    A apresentação foi produzida
                    e está disponível para download.
                </p>

            </div>

        `;

    }


    return `

        <div class="artifact-slides">

            ${
                slides
                    .map(
                        (slide,index) => `

                            <article class="artifact-slide">

                                <small>
                                    Slide ${index + 1}
                                </small>

                                <h3>
                                    ${
                                        this.escapeHTML(
                                            slide.title ||
                                            ""
                                        )
                                    }
                                </h3>

                                <p>
                                    ${
                                        this.escapeHTML(
                                            slide.content ||
                                            slide.text ||
                                            ""
                                        )
                                    }
                                </p>

                            </article>

                        `
                    )
                    .join("")
            }

        </div>

    `;

}


// ==========================================================
// FILES PREVIEW
// ==========================================================

renderFilesPreview(){

    const files =
        this.workspace.files || [];


    return `

        <div class="artifact-file-list">

            <div class="preview-header">

                <div>

                    <span>
                        PROJECTO
                    </span>

                    <strong>
                        ${
                            this.escapeHTML(
                                this.workspace.project?.name ||
                                "Ficheiros produzidos"
                            )
                        }
                    </strong>

                </div>

            </div>


            <div class="file-list">

                ${
                    files.map(
                        (file,index) => `

                            <button
                                type="button"
                                class="file-item"
                                data-file-index="${index}"
                            >

                                <i class="fa-solid fa-file-code"></i>

                                <span>

                                    ${
                                        this.escapeHTML(
                                            file.name ||
                                            `ficheiro-${index + 1}`
                                        )
                                    }

                                </span>

                            </button>

                        `
                    ).join("")
                }

            </div>

        </div>

    `;

}


// ==========================================================
// PROJECT PREVIEW
// ==========================================================

renderProjectPreview(){

    const project =
        this.workspace.project;


    return `

        <div class="artifact-project">

            <div class="project-icon">
                <i class="fa-solid fa-cubes"></i>
            </div>

            <h3>
                ${
                    this.escapeHTML(
                        project?.name ||
                        "Projecto Honey IA"
                    )
                }
            </h3>

            <p>
                ${
                    this.escapeHTML(
                        project?.description ||
                        "Projecto criado pelo especialista."
                    )
                }
            </p>


            ${
                this.renderDeployment()
            }

        </div>

    `;

}


// ==========================================================
// DEPLOYMENT
// ==========================================================

renderDeployment(){

    const deployment =
        this.workspace.deployment;


    if(!deployment){

        return "";

    }


    return `

        <div class="studio-deployment">

            <strong>
                Publicação
            </strong>


            ${
                deployment.url
                    ? `

                        <a
                            href="${this.escapeAttribute(
                                deployment.url
                            )}"
                            target="_blank"
                            rel="noopener noreferrer"
                        >

                            Abrir aplicação

                        </a>

                    `
                    : ""
            }


            ${
                deployment.provider
                    ? `

                        <span>

                            Hospedagem:
                            ${
                                this.escapeHTML(
                                    deployment.provider
                                )
                            }

                        </span>

                    `
                    : ""
            }


            ${
                deployment.instructions
                    ? `

                        <p>

                            ${
                                this.renderAssistantContent(
                                    deployment.instructions
                                )
                            }

                        </p>

                    `
                    : ""
            }

        </div>

    `;

}


// ==========================================================
// BIND EVENTS
// ==========================================================

bindEvents(){

    if(!this.container) return;


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


    this.container
        .querySelector("#studioSend")
        ?.addEventListener(
            "click",
            () => this.sendMessage()
        );


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


    this.container
        .querySelectorAll(
            "[data-artifact-index]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        this.selectArtifact(
                            Number(
                                button.dataset.artifactIndex
                            )
                        );

                    }
                );

            }
        );


    this.container
        .querySelector(
            '[data-preview-action="download"]'
        )
        ?.addEventListener(
            "click",
            () => this.downloadActiveArtifact()
        );


    this.container
        .querySelector(
            '[data-preview-action="open"]'
        )
        ?.addEventListener(
            "click",
            () => this.openActiveArtifact()
        );


    this.container
        .querySelector(
            "[data-copy-artifact]"
        )
        ?.addEventListener(
            "click",
            () => this.copyActiveArtifact()
        );


    this.container
        .querySelectorAll(
            "[data-file-index]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        this.selectFile(
                            Number(
                                button.dataset.fileIndex
                            )
                        );

                    }
                );

            }
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

                    method:
                        "POST",

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

                    body:
                        JSON.stringify({

                            prompt:
                                text,

                            agentId:
                                this.activeAgent,

                            agent:
                                this.getAgentProfile(),

                            history:
                                this.history,

                            mode:
                                this.mode,

                            workspace:
                                this.getWorkspacePayload()

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


        result.artifacts.forEach(
            artifact => {

                this.addArtifact(
                    artifact
                );

            }
        );


        if(result.files.length){

            result.files.forEach(
                file => {

                    this.addFile(
                        file
                    );

                }
            );

        }


        if(result.project){

            this.workspace.project =
                result.project;

        }


        if(result.deployment){

            this.workspace.deployment =
                result.deployment;

        }


        this.workspace.processing =
            false;


        this.render();

        this.highlightCode();


        document.dispatchEvent(

            new CustomEvent(
                "agent-result",
                {
                    detail: result
                }
            )

        );


    }catch(error){

        this.workspace.processing =
            false;


        if(
            error?.name === "AbortError"
        ){

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
// WORKSPACE PAYLOAD
// ==========================================================

getWorkspacePayload(){

    return {

        agent:
            this.activeAgent,

        mode:
            this.mode,

        project:
            this.workspace.project,

        files:
            this.workspace.files.map(
                file => ({

                    name:
                        file.name,

                    type:
                        file.type,

                    language:
                        file.language

                })
            )

    };

}


// ==========================================================
// NORMALIZE RESPONSE
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

    const files = [];


    let project =
        data?.project ||
        data?.data?.project ||
        null;


    let deployment =
        data?.deployment ||
        data?.data?.deployment ||
        null;


    // DIRECT ARTIFACT

    if(data?.artifact){

        const artifact =
            this.normalizeArtifact(
                data.artifact
            );

        if(artifact){

            artifacts.push(
                artifact
            );

        }

    }


    // ARTIFACTS

    const rawArtifacts =
        data?.artifacts ||
        data?.outputs ||
        data?.data?.artifacts ||
        [];


    if(Array.isArray(rawArtifacts)){

        rawArtifacts.forEach(
            item => {

                const artifact =
                    this.normalizeArtifact(
                        item
                    );

                if(artifact){

                    artifacts.push(
                        artifact
                    );

                }

            }
        );

    }


    // FILES

    const rawFiles =
        data?.files ||
        data?.data?.files ||
        [];


    if(Array.isArray(rawFiles)){

        rawFiles.forEach(
            file => {

                const normalized =
                    this.normalizeArtifact(
                        file
                    );

                if(normalized){

                    files.push(
                        normalized
                    );

                }

            }
        );

    }


    // OUTPUT OBJECT

    if(
        data?.output &&
        typeof data.output === "object" &&
        !Array.isArray(data.output)
    ){

        const artifact =
            this.normalizeArtifact(
                data.output
            );

        if(artifact){

            artifacts.push(
                artifact
            );

        }

    }


    // SINGLE FILE CONTENT

    if(
        data?.content &&
        (
            data?.type ||
            data?.mime ||
            data?.filename ||
            data?.fileName
        )
    ){

        const artifact =
            this.normalizeArtifact({

                content:
                    data.content,

                type:
                    data.type,

                mime:
                    data.mime,

                filename:
                    data.filename ||
                    data.fileName,

                url:
                    data.url

            });


        if(artifact){

            artifacts.push(
                artifact
            );

        }

    }


    // RAW CODE

    if(
        !artifacts.length &&
        !files.length &&
        data?.code
    ){

        const artifact =
            this.normalizeArtifact({

                content:
                    data.code,

                type:
                    data.language ||
                    "text/plain",

                name:
                    data.filename ||
                    "resultado.txt",

                kind:
                    "code",

                language:
                    data.language

            });


        if(artifact){

            artifacts.push(
                artifact
            );

        }

    }


    return {

        answer:
            typeof answer === "string"
                ? answer
                : "",

        artifacts:
            this.uniqueArtifacts(
                artifacts
            ),

        files:
            this.uniqueArtifacts(
                files
            ),

        project,

        deployment

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

            mime:
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


    const kind =
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
            raw.content ??
            raw.text ??
            raw.code ??
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
            null,

        rows:
            raw.rows ||
            null,

        data:
            raw.data ||
            null,

        slides:
            raw.slides ||
            null,

        metadata:
            raw.metadata ||
            {},

        downloadUrl:
            raw.downloadUrl ||
            raw.download_url ||
            raw.url ||
            ""

    };

}


// ==========================================================
// ARTIFACT MANAGEMENT
// ==========================================================

addArtifact(artifact){

    if(!artifact) return;


    const exists =
        this.workspace.artifacts.find(
            item =>
                item.id === artifact.id
        );


    if(!exists){

        this.workspace.artifacts.push(
            artifact
        );

    }


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
// FILE MANAGEMENT
// ==========================================================

addFile(file){

    if(!file) return;


    const normalized =
        this.normalizeArtifact(
            file
        );


    if(!normalized) return;


    const exists =
        this.workspace.files.find(
            item =>
                item.name === normalized.name
        );


    if(!exists){

        this.workspace.files.push(
            normalized
        );

    }


    this.workspace.activeFile =
        normalized;

}


selectFile(index){

    const file =
        this.workspace.files[index];


    if(!file) return;


    this.workspace.activeFile =
        file;


    this.workspace.activeArtifact =
        file;


    this.render();

    this.highlightCode();

}


// ==========================================================
// DOWNLOAD
// ==========================================================

async downloadActiveArtifact(){

    const artifact =
        this.getActiveArtifact();


    if(!artifact){

        return;

    }


    try{

        const downloadUrl =
            artifact.downloadUrl ||
            artifact.url;


        if(downloadUrl){

            const link =
                document.createElement("a");


            link.href =
                downloadUrl;


            link.download =
                artifact.name ||
                "honey-ia-result";


            link.target =
                "_blank";


            link.rel =
                "noopener";


            document.body.appendChild(
                link
            );


            link.click();

            link.remove();

            return;

        }


        if(
            artifact.content === null ||
            artifact.content === undefined
        ){

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
                        "application/octet-stream"
                }

            );


        const url =
            URL.createObjectURL(
                blob
            );


        const link =
            document.createElement("a");


        link.href =
            url;


        link.download =
            artifact.name ||
            "honey-ia-result";


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


    if(
        artifact.url ||
        artifact.downloadUrl
    ){

        window.open(

            artifact.url ||
            artifact.downloadUrl,

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

                [artifact.content || ""],

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


        setTimeout(
            () => {

                URL.revokeObjectURL(
                    url
                );

            },
            30000
        );


        return;

    }


    this.downloadActiveArtifact();

}


// ==========================================================
// COPY
// ==========================================================

async copyActiveArtifact(){

    const artifact =
        this.getActiveArtifact();


    if(
        !artifact ||
        !artifact.content
    ){

        return;

    }


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
// HIGHLIGHT
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
// MODE UI
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

    this.workspace.files = [];

    this.workspace.activeFile = null;

    this.workspace.project = null;

    this.workspace.deployment = null;


    this.render();

}


// ==========================================================
// STATE
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

        files:
            this.workspace.files,

        project:
            this.workspace.project,

        deployment:
            this.workspace.deployment,

        activeArtifact:
            this.workspace.activeArtifact,

        activeFile:
            this.workspace.activeFile,

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
        String(
            filename
        ).toLowerCase();


    const type =
        String(
            mime
        ).toLowerCase();


    if(
        type.includes("javascript") ||
        name.endsWith(".js")
    ){

        return "javascript";

    }


    if(
        type.includes("typescript") ||
        name.endsWith(".ts")
    ){

        return "typescript";

    }


    if(
        type.includes("python") ||
        name.endsWith(".py")
    ){

        return "python";

    }


    if(
        type.includes("html") ||
        name.endsWith(".html") ||
        name.endsWith(".htm")
    ){

        return "html";

    }


    if(
        type.includes("css") ||
        name.endsWith(".css")
    ){

        return "css";

    }


    if(
        type.includes("json") ||
        name.endsWith(".json")
    ){

        return "json";

    }


    if(
        type.includes("xml") ||
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
        name.endsWith(".cc") ||
        name.endsWith(".c")
    ){

        return "cpp";

    }


    if(
        name.endsWith(".php")
    ){

        return "php";

    }


    if(
        name.endsWith(".go")
    ){

        return "go";

    }


    if(
        name.endsWith(".rs")
    ){

        return "rust";

    }


    if(
        name.endsWith(".jsx")
    ){

        return "javascript";

    }


    if(
        name.endsWith(".tsx")
    ){

        return "typescript";

    }


    return "text";

}


// ==========================================================
// CODE TYPES
// ==========================================================

isCodeType(type){

    const value =
        String(
            type || ""
        ).toLowerCase();


    return (

        value.includes("javascript") ||

        value.includes("typescript") ||

        value.includes("python") ||

        value.includes("css") ||

        value.includes("html") ||

        value.includes("json") ||

        value.includes("xml") ||

        value.includes("text/x-c") ||

        value.includes("java") ||

        value.includes("php") ||

        value.includes("rust") ||

        value.includes("sql")

    );

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


    if(
        type.includes("image")
    ){

        return "image";

    }


    if(
        type.includes("video")
    ){

        return "video";

    }


    if(
        type.includes("audio")
    ){

        return "audio";

    }


    if(
        type.includes("pdf")
    ){

        return "pdf";

    }


    if(
        type.includes("spreadsheet") ||
        type.includes("excel") ||
        type.includes("csv") ||
        name.endsWith(".xlsx") ||
        name.endsWith(".xls") ||
        name.endsWith(".csv")
    ){

        return "spreadsheet";

    }


    if(
        type.includes("presentation") ||
        type.includes("powerpoint") ||
        name.endsWith(".pptx") ||
        name.endsWith(".ppt")
    ){

        return "slides";

    }


    if(
        type.includes("html") ||
        name.endsWith(".html") ||
        name.endsWith(".htm")
    ){

        return "website";

    }


    if(
        this.isCodeType(type) ||
        [
            ".js",
            ".ts",
            ".py",
            ".css",
            ".json",
            ".xml",
            ".sql",
            ".java",
            ".cpp",
            ".php",
            ".go",
            ".rs"
        ].some(
            extension =>
                name.endsWith(extension)
        )
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

    const type =
        String(
            mime || ""
        ).toLowerCase();


    if(type.includes("html")){

        return "honey-ia-site.html";

    }


    if(type.includes("javascript")){

        return "honey-ia-app.js";

    }


    if(type.includes("typescript")){

        return "honey-ia-app.ts";

    }


    if(type.includes("python")){

        return "honey-ia-app.py";

    }


    if(type.includes("css")){

        return "honey-ia-style.css";

    }


    if(type.includes("json")){

        return "honey-ia-data.json";

    }


    if(type.includes("pdf")){

        return "honey-ia-document.pdf";

    }


    if(
        type.includes("spreadsheet") ||
        type.includes("excel")
    ){

        return "honey-ia-planilha.xlsx";

    }


    if(
        type.includes("csv")
    ){

        return "honey-ia-data.csv";

    }


    if(
        type.includes("presentation") ||
        type.includes("powerpoint")
    ){

        return "honey-ia-apresentacao.pptx";

    }


    if(
        type.includes("image")
    ){

        return "honey-ia-imagem.png";

    }


    if(
        type.includes("video")
    ){

        return "honey-ia-video.mp4";

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
// UNIQUE ARTIFACTS
// ==========================================================

uniqueArtifacts(items){

    const seen =
        new Set();


    return items.filter(
        item => {

            if(!item) return false;


            const key =
                item.id ||
                `${item.name}:${item.type}`;


            if(
                seen.has(key)
            ){

                return false;

            }


            seen.add(key);

            return true;

        }
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

        files: [],

        activeFile: null,

        project: null,

        deployment: null,

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

    if(this._eventsReady){

        return;

    }


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


    this.workspace = {};


    this._eventsReady =
        false;

}


// ==========================================================
// SECURITY
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


// ==========================================================
// ID
// ==========================================================

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
