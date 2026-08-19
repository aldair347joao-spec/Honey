/*
==========================================================
HONEY IA OS
CHAT ENGINE
V6.0
UNIVERSAL ARTIFACT PREVIEW ENGINE
==========================================================

CORE
----------------------------------------------------------
- JWT Authentication
- Persistent MongoDB Conversations
- Unlimited Persistent Conversation History
- Smart Backend Context Management
- Groq + Gemini Compatible Backend
- Markdown Rendering
- Code Highlighting
- SSE / JSON Streaming Compatible
- Abort / Stop Generation
- User Controlled Scroll
- Buffered Streaming Rendering
- Generation Isolation
- File Context
- Universal Artifacts
- Universal Artifact Preview
- Live Artifact Editing
- Code Editor
- Visual Artifact Editing
- Responsive Preview
- Fullscreen Preview
- Artifact Versioning
- Version Compare
- Version Restore
- Universal Download
- Project Download
- Shareable Preview Links
- Temporary Preview Links
- Deployment Preparation
- Vercel / Render Deployment Hooks
- Secure Execution Sandbox Hooks
- Integrated Terminal
- Voice Input
- User Profile
- Subscription Awareness
- Search
- Conversation Management
- Responsive Workspace
- Secure HTML Rendering
- Production Error Handling

IMPORTANT
----------------------------------------------------------
The frontend never claims a deployment or code execution
was successful unless the backend explicitly confirms it.
==========================================================
*/


/*
==========================================================
CONFIGURATION
==========================================================
*/

const API_BASE = "/api/chat";

const AUTH_TOKEN_KEY = "honey_token";

const DEFAULT_AGENT = "general";

const DEFAULT_MODE = "chat";

const MAX_MESSAGE_LENGTH = 50000;

const MAX_FILE_SIZE = 1024 * 1024;

const SSE_BUFFER_LIMIT = 1024 * 1024;

const MAX_VISIBLE_ARTIFACTS = 100;

const MAX_VISIBLE_TOOLS = 100;

const MAX_ARTIFACT_VERSIONS = 50;

const MAX_EDITOR_SIZE = 2 * 1024 * 1024;

const SCROLL_BOTTOM_THRESHOLD = 72;

const STREAM_RENDER_INTERVAL = 32;

const PREVIEW_SHARE_PATH = "/preview";

const PREVIEW_DEPLOY_ENDPOINT = "/artifacts/deploy";

const PREVIEW_SHARE_ENDPOINT = "/artifacts/share";

const PREVIEW_EXECUTE_ENDPOINT = "/artifacts/execute";

const PREVIEW_VERSION_ENDPOINT = "/artifacts/versions";


/*
==========================================================
SUPPORTED TEXT FILES
==========================================================
*/

const SUPPORTED_TEXT_EXTENSIONS = [

    "txt",
    "md",
    "markdown",

    "json",
    "jsonl",

    "csv",
    "tsv",

    "xml",

    "html",
    "htm",

    "css",

    "js",
    "mjs",
    "cjs",

    "ts",
    "tsx",
    "jsx",

    "py",
    "pyw",

    "java",

    "c",
    "cpp",
    "cc",

    "h",
    "hpp",

    "cs",

    "go",

    "rs",

    "php",

    "rb",

    "swift",

    "kt",
    "kts",

    "sql",

    "sh",
    "bash",
    "zsh",

    "yaml",
    "yml",

    "toml",

    "ini",
    "conf",

    "env",

    "log",

    "svg",

    "vue",

    "svelte"

];


/*
==========================================================
STATE
==========================================================
*/

const state = {

    initialized:
        false,

    authenticated:
        false,

    conversationId:
        null,

    conversation:
        null,

    conversations:
        [],

    messages:
        [],

    selectedFile:
        null,

    selectedFileContent:
        "",

    selectedFileSupported:
        false,

    isSending:
        false,

    isLive:
        false,

    generationStartedAt:
        null,

    liveAbortController:
        null,

    generationAbortController:
        null,

    currentGenerationId:
        null,

    currentAssistantElement:
        null,

    currentAssistantContent:
        "",

    currentAssistantMessageId:
        null,

    currentMode:
        DEFAULT_MODE,

    agentId:
        DEFAULT_AGENT,

    workspace:
        "main",

    artifacts:
        [],

    tools:
        [],

    voiceRecognition:
        null,

    searchQuery:
        "",

    generationCancelled:
        false,

    generationStatus:
        "idle",

    userNearBottom:
        true,

    streamRenderQueued:
        false,

    streamRenderTimer:
        null,

    streamLastRenderAt:
        0,

    streamRenderGenerationId:
        null,

    streamRenderRequested:
        false,

    streamHasRenderedContent:
        false,

    /*
        UNIVERSAL PREVIEW
    */

    preview: {

        open:
            false,

        artifactId:
            null,

        artifact:
            null,

        artifactType:
            null,

        activeFile:
            null,

        activeVersion:
            null,

        versions:
            [],

        mode:
            "preview",

        editorDirty:
            false,

        fullscreen:
            false,

        share:

            null,

        deploy:

            null,

        execution:

            {

                running:
                    false,

                language:
                    null,

                output:
                    "",

                error:
                    null

            }

    }

};


/*
==========================================================
DOM
==========================================================
*/

const dom = {};


/*
==========================================================
STARTUP
==========================================================
*/

document.addEventListener(
    "DOMContentLoaded",
    initializeChat
);


async function initializeChat(){

    if(state.initialized){

        return;

    }

    state.initialized =
        true;

    cacheDOM();

    if(!dom.chatSection){

        console.warn(
            "[HONEY CHAT] Chat section not found."
        );

        return;

    }

    setupNavigation();

    setupChatControls();

    setupSuggestions();

    setupAttachmentControls();

    setupSearch();

    setupPreview();

    setupModeSwitch();

    setupGlobalKeyboardShortcuts();

    setupScrollTracking();

    await initializeAuthenticatedChat();

}


/*
==========================================================
CACHE DOM
==========================================================
*/

function cacheDOM(){

    dom.chatSection =
        document.getElementById("chat");

    dom.chatMessages =
        document.getElementById("chatMessages");

    dom.chatWelcome =
        document.getElementById("chatWelcome");

    dom.chatInput =
        document.getElementById("chatInput");

    dom.chatInputArea =
        document.getElementById("chatInputArea");

    dom.btnSend =
        document.getElementById("btnSend");

    dom.btnVoice =
        document.getElementById("btnVoice");

    dom.btnAttach =
        document.getElementById("btnAttach");

    dom.fileInput =
        document.getElementById("fileInput");

    dom.attachmentBar =
        document.getElementById("attachment-bar");

    dom.attachedFileName =
        document.getElementById("attached-file-name");

    dom.btnRemoveAttachment =
        document.getElementById("btn-remove-attachment");

    dom.btnNewChat =
        document.getElementById("btnNewChat");

    dom.btnNewConversation =
        document.getElementById("btnNewConversation");

    dom.btnChatMode =
        document.getElementById("btnChatMode");

    dom.btnLiveMode =
        document.getElementById("btnLiveMode");

    dom.conversationTitle =
        document.getElementById("conversationTitle");

    dom.historyContainer =
        document.getElementById("historyContainer");

    dom.projectsContainer =
        document.getElementById("projectsContainer");

    dom.previewPane =
        document.getElementById("preview-pane");

    dom.previewIframe =
        document.getElementById("live-preview-iframe");

    dom.btnClosePreview =
        document.getElementById("btn-close-preview");

    dom.globalSearch =
        document.getElementById("globalSearch");

    dom.toastContainer =
        document.getElementById("toastContainer");

    dom.planBadge =
        document.getElementById("planBadge");

    dom.userBox =
        document.getElementById("userBox");

}


/*
==========================================================
AUTHENTICATION
==========================================================
*/

async function initializeAuthenticatedChat(){

    const token =
        getAuthToken();

    if(!token){

        redirectToLogin();

        return;

    }

    state.authenticated =
        true;

    try{

        await loadConversations();

        await ensureInitialConversation();

        await loadUserProfile();

    }
    catch(error){

        console.error(
            "[HONEY CHAT] Initialization error:",
            error
        );

        if(error?.status === 401){

            redirectToLogin();

            return;

        }

        showToast(
            "Não foi possível carregar o Chat da Honey IA.",
            "error"
        );

    }

}


function getAuthToken(){

    try{

        const token =
            localStorage.getItem(
                AUTH_TOKEN_KEY
            );

        if(
            typeof token !== "string" ||
            !token.trim()
        ){

            return null;

        }

        return token.trim();

    }
    catch(error){

        return null;

    }

}


function redirectToLogin(){

    if(
        window.location.pathname.endsWith(
            "login.html"
        )
    ){

        return;

    }

    window.location.replace(
        "login.html"
    );

}


/*
==========================================================
API REQUEST
==========================================================
*/

async function apiRequest(
    endpoint = "",
    options = {}
){

    const token =
        getAuthToken();

    const headers = {

        Accept:
            "application/json",

        ...(options.headers || {})

    };

    if(
        options.body &&
        !(options.body instanceof FormData)
    ){

        headers["Content-Type"] =
            "application/json";

    }

    if(token){

        headers.Authorization =
            `Bearer ${token}`;

    }

    let response;

    try{

        response =
            await fetch(
                `${API_BASE}${endpoint}`,
                {
                    ...options,
                    headers,
                    credentials:
                        "include"
                }
            );

    }
    catch(error){

        if(
            error?.name === "AbortError"
        ){

            throw error;

        }

        const networkError =
            new Error(
                "Não foi possível contactar o servidor da Honey IA."
            );

        networkError.cause =
            error;

        throw networkError;

    }

    if(response.status === 401){

        const error =
            new Error(
                "Sessão expirada."
            );

        error.status =
            401;

        throw error;

    }

    let data =
        null;

    const contentType =
        response.headers.get(
            "content-type"
        ) || "";

    if(
        contentType.includes(
            "application/json"
        )
    ){

        try{

            data =
                await response.json();

        }
        catch(error){

            data =
                null;

        }

    }

    if(!response.ok){

        const error =
            new Error(
                data?.error ||
                data?.message ||
                `Erro HTTP ${response.status}.`
            );

        error.status =
            response.status;

        error.data =
            data;

        throw error;

    }

    return data;

}


/*
==========================================================
NAVIGATION
==========================================================
*/

function setupNavigation(){

    const navItems =
        document.querySelectorAll(
            ".nav-item[data-target]"
        );

    navItems.forEach(
        item => {

            item.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    const target =
                        item.dataset.target;

                    if(!target){

                        return;

                    }

                    activateWorkspace(
                        target
                    );

                }
            );

        }
    );

    window.addEventListener(
        "hashchange",
        () => {

            const target =
                window.location.hash
                    .replace(
                        "#",
                        ""
                    )
                    .trim();

            if(target){

                activateWorkspace(
                    target,
                    false
                );

            }

        }
    );

    const initialTarget =
        window.location.hash
            .replace(
                "#",
                ""
            )
            .trim();

    if(initialTarget){

        activateWorkspace(
            initialTarget,
            false
        );

    }

}


function activateWorkspace(
    target,
    updateHash = true
){

    const sections =
        document.querySelectorAll(
            ".workspace-view"
        );

    sections.forEach(
        section => {

            section.style.display =
                "none";

        }
    );

    const targetSection =
        document.getElementById(
            target
        );

    if(targetSection){

        targetSection.style.display =
            "";

    }

    document
        .querySelectorAll(
            ".nav-item"
        )
        .forEach(
            item => {

                item.classList.toggle(
                    "active",
                    item.dataset.target ===
                    target
                );

            }
        );

    if(updateHash){

        history.replaceState(
            null,
            "",
            `#${target}`
        );

    }

    if(target === "history"){

        renderHistory();

    }

    if(target === "chat"){

        focusChatInput();

    }

}


/*
==========================================================
CHAT CONTROLS
==========================================================
*/

function setupChatControls(){

    dom.btnSend?.addEventListener(
        "click",
        handleSendButton
    );

    dom.chatInput?.addEventListener(
        "keydown",
        event => {

            if(
                event.key === "Enter" &&
                !event.shiftKey
            ){

                event.preventDefault();

                if(state.isSending){

                    return;

                }

                sendCurrentMessage();

            }

        }
    );

    dom.chatInput?.addEventListener(
        "input",
        autoResizeInput
    );

    dom.btnNewChat?.addEventListener(
        "click",
        () => {

            createNewConversation();

        }
    );

    dom.btnNewConversation?.addEventListener(
        "click",
        () => {

            createNewConversation();

            activateWorkspace(
                "chat"
            );

        }
    );

    dom.btnVoice?.addEventListener(
        "click",
        startVoiceInput
    );

}


function handleSendButton(){

    if(state.isSending){

        stopGeneration();

        return;

    }

    sendCurrentMessage();

}


/*
==========================================================
GLOBAL KEYBOARD SHORTCUTS
==========================================================
*/

function setupGlobalKeyboardShortcuts(){

    document.addEventListener(
        "keydown",
        event => {

            if(
                event.key === "Escape" &&
                state.preview.fullscreen
            ){

                exitPreviewFullscreen();

                return;

            }

            if(
                event.key === "Escape" &&
                state.isSending
            ){

                stopGeneration();

                return;

            }

            if(
                event.ctrlKey &&
                event.key === "Enter"
            ){

                event.preventDefault();

                if(!state.isSending){

                    sendCurrentMessage();

                }

            }

        }
    );

}


/*
==========================================================
SCROLL TRACKING
==========================================================
*/

function setupScrollTracking(){

    if(!dom.chatMessages){

        return;

    }

    dom.chatMessages.addEventListener(
        "scroll",
        () => {

            state.userNearBottom =
                isChatNearBottom();

        },
        {
            passive:
                true
        }
    );

    state.userNearBottom =
        true;

}


function isChatNearBottom(){

    if(!dom.chatMessages){

        return true;

    }

    const distance =
        dom.chatMessages.scrollHeight -
        dom.chatMessages.scrollTop -
        dom.chatMessages.clientHeight;

    return distance <=
        SCROLL_BOTTOM_THRESHOLD;

}


function scrollChatToBottom(
    force = false
){

    if(!dom.chatMessages){

        return;

    }

    if(
        !force &&
        !state.userNearBottom
    ){

        return;

    }

    requestAnimationFrame(
        () => {

            dom.chatMessages.scrollTop =
                dom.chatMessages.scrollHeight;

        }
    );

}


/*
==========================================================
INPUT
==========================================================
*/

function autoResizeInput(){

    if(!dom.chatInput){

        return;

    }

    dom.chatInput.style.height =
        "auto";

    const maxHeight =
        window.innerWidth <= 700
            ? 160
            : 240;

    dom.chatInput.style.height =
        `${Math.min(
            dom.chatInput.scrollHeight,
            maxHeight
        )}px`;

}


function focusChatInput(){

    setTimeout(
        () => {

            if(
                dom.chatInput &&
                !dom.chatInput.disabled
            ){

                dom.chatInput.focus();

            }

        },
        50
    );

}


/*
==========================================================
SUGGESTIONS
==========================================================
*/

function setupSuggestions(){

    document
        .querySelectorAll(
            ".suggestion-button"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const prompt =
                            button.dataset.prompt ||
                            "";

                        if(!prompt){

                            return;

                        }

                        if(dom.chatInput){

                            dom.chatInput.value =
                                prompt;

                            autoResizeInput();

                            focusChatInput();

                        }

                    }
                );

            }
        );

}


/*
==========================================================
MODE
==========================================================
*/

function setupModeSwitch(){

    dom.btnChatMode?.addEventListener(
        "click",
        () => setChatMode("chat")
    );

    dom.btnLiveMode?.addEventListener(
        "click",
        () => setChatMode("live")
    );

    setChatMode(
        state.currentMode
    );

}


function setChatMode(mode){

    state.currentMode =
        mode === "live"
            ? "live"
            : "chat";

    const live =
        state.currentMode ===
        "live";

    dom.btnChatMode?.classList.toggle(
        "active",
        !live
    );

    dom.btnLiveMode?.classList.toggle(
        "active",
        live
    );

    dom.btnChatMode?.setAttribute(
        "aria-pressed",
        String(!live)
    );

    dom.btnLiveMode?.setAttribute(
        "aria-pressed",
        String(live)
    );

    if(dom.chatInput){

        dom.chatInput.placeholder =
            live
                ? "Fale ou escreva para a Honey IA..."
                : "Escreva uma mensagem para a Honey IA...";

    }

}


/*
==========================================================
CONVERSATIONS
==========================================================
*/

async function loadConversations(){

    const data =
        await apiRequest(
            "/conversations"
        );

    state.conversations =
        Array.isArray(
            data?.conversations
        )
            ? data.conversations
            : [];

    renderHistory();

}


async function ensureInitialConversation(){

    if(state.conversationId){

        return;

    }

    const existing =
        state.conversations[0];

    if(existing){

        const id =
            getConversationId(
                existing
            );

        if(id){

            await openConversation(
                id,
                false
            );

            return;

        }

    }

    await createNewConversation(
        false
    );

}


function getConversationId(
    conversation
){

    if(!conversation){

        return null;

    }

    return String(
        conversation._id ||
        conversation.id ||
        ""
    ).trim() || null;

}


/*
==========================================================
GENERATION CONTROL
==========================================================
*/

function createGeneration(){

    const id =
        createClientMessageId();

    state.currentGenerationId =
        id;

    state.generationAbortController =
        new AbortController();

    state.generationCancelled =
        false;

    state.generationStatus =
        "preparing";

    state.streamRenderGenerationId =
        id;

    state.streamRenderQueued =
        false;

    state.streamRenderRequested =
        false;

    state.streamHasRenderedContent =
        false;

    state.streamLastRenderAt =
        0;

    clearStreamRenderTimer();

    return {

        id,

        controller:
            state.generationAbortController

    };

}


function isCurrentGeneration(
    generationId
){

    return Boolean(
        generationId &&
        state.currentGenerationId ===
            generationId
    );

}


function invalidateCurrentGeneration(){

    state.currentGenerationId =
        null;

    state.generationStatus =
        "idle";

    clearStreamRenderTimer();

}


function abortCurrentGeneration(
    silent = false
){

    const controller =
        state.generationAbortController;

    if(controller){

        try{

            controller.abort();

        }
        catch(error){

            console.warn(
                "[HONEY CHAT] Abort error:",
                error
            );

        }

    }

    if(
        state.liveAbortController &&
        state.liveAbortController !==
            controller
    ){

        try{

            state.liveAbortController.abort();

        }
        catch(error){

            console.warn(
                "[HONEY CHAT] Live abort error:",
                error
            );

        }

    }

    state.generationCancelled =
        true;

    state.generationStatus =
        "stopping";

    clearStreamRenderTimer();

    if(!silent){

        showToast(
            "Geração interrompida.",
            "info"
        );

    }

}


function stopGeneration(){

    if(!state.isSending){

        return;

    }

    abortCurrentGeneration();

}


/*
==========================================================
STREAM RENDER TIMER
==========================================================
*/

function clearStreamRenderTimer(){

    if(state.streamRenderTimer){

        clearTimeout(
            state.streamRenderTimer
        );

    }

    state.streamRenderTimer =
        null;

    state.streamRenderQueued =
        false;

}


function requestStreamRender(
    element,
    generationId
){

    if(
        !element ||
        !isCurrentGeneration(
            generationId
        )
    ){

        return;

    }

    if(
        state.streamRenderQueued
    ){

        return;

    }

    const now =
        Date.now();

    const elapsed =
        now -
        state.streamLastRenderAt;

    const delay =
        Math.max(
            0,
            STREAM_RENDER_INTERVAL -
            elapsed
        );

    state.streamRenderQueued =
        true;

    state.streamRenderTimer =
        setTimeout(
            () => {

                state.streamRenderTimer =
                    null;

                state.streamRenderQueued =
                    false;

                if(
                    !isCurrentGeneration(
                        generationId
                    )
                ){

                    return;

                }

                state.streamLastRenderAt =
                    Date.now();

                renderAssistantContent(
                    element,
                    state.currentAssistantContent
                );

                if(state.userNearBottom){

                    scrollChatToBottom();

                }

            },
            delay
        );

}


/*
==========================================================
CREATE CONVERSATION
==========================================================
*/

async function createNewConversation(
    notify = true
){

    if(state.isSending){

        abortCurrentGeneration(
            true
        );

        state.isSending =
            false;

        state.isLive =
            false;

        setSendingState(
            false
        );

        await waitForAbortSettlement();

    }

    try{

        const data =
            await apiRequest(
                "/conversations",
                {

                    method:
                        "POST",

                    body:
                        JSON.stringify({

                            agentId:
                                state.agentId,

                            workspace:
                                state.workspace,

                            title:
                                "Nova Conversa"

                        })

                }
            );

        const conversation =
            data?.conversation;

        if(!conversation){

            throw new Error(
                "A API não devolveu a conversa criada."
            );

        }

        resetConversationState();

        state.conversation =
            conversation;

        state.conversationId =
            getConversationId(
                conversation
            );

        clearChatMessages();

        showWelcome();

        updateConversationHeader(
            conversation
        );

        addConversationToState(
            conversation
        );

        renderHistory();

        activateWorkspace(
            "chat"
        );

        if(notify){

            showToast(
                "Nova conversa criada.",
                "success"
            );

        }

        return conversation;

    }
    catch(error){

        handleApiError(
            error,
            "Não foi possível criar uma nova conversa."
        );

        return null;

    }

}


async function waitForAbortSettlement(){

    await new Promise(
        resolve =>
            setTimeout(
                resolve,
                0
            )
    );

}


/*
==========================================================
RESET CONVERSATION STATE
==========================================================
*/

function resetConversationState(){

    clearStreamRenderTimer();

    state.messages =
        [];

    state.artifacts =
        [];

    state.tools =
        [];

    state.currentAssistantElement =
        null;

    state.currentAssistantContent =
        "";

    state.currentAssistantMessageId =
        null;

    state.generationCancelled =
        false;

    state.generationStatus =
        "idle";

    state.currentGenerationId =
        null;

    state.generationAbortController =
        null;

    state.liveAbortController =
        null;

    state.streamRenderGenerationId =
        null;

    state.streamRenderQueued =
        false;

    state.streamRenderRequested =
        false;

    state.streamHasRenderedContent =
        false;

    resetPreviewState();

    removeAttachment();

}


/*
==========================================================
OPEN CONVERSATION
==========================================================
*/

async function openConversation(
    conversationId,
    activate = true
){

    if(!conversationId){

        return null;

    }

    if(
        state.isSending &&
        String(conversationId) !==
        String(state.conversationId)
    ){

        abortCurrentGeneration(
            true
        );

        state.isSending =
            false;

        state.isLive =
            false;

        setSendingState(
            false
        );

        await waitForAbortSettlement();

    }

    try{

        const data =
            await apiRequest(
                `/conversations/${encodeURIComponent(
                    conversationId
                )}`
            );

        if(!data?.conversation){

            throw new Error(
                "Conversa não encontrada."
            );

        }

        state.conversation =
            data.conversation;

        state.conversationId =
            getConversationId(
                data.conversation
            );

        state.messages =
            Array.isArray(
                data.messages
            )
                ? [...data.messages]
                : [];

        state.agentId =
            data.conversation.agentId ||
            DEFAULT_AGENT;

        state.workspace =
            data.conversation.workspace ||
            "main";

        state.artifacts =
            normalizeArtifactCollection(
                data.artifacts ||
                data.conversation.artifacts ||
                []
            );

        state.tools =
            Array.isArray(
                data.tools
            )
                ? data.tools
                : [];

        clearStreamRenderTimer();

        clearChatMessages();

        renderMessages(
            state.messages
        );

        renderArtifacts(
            state.artifacts
        );

        updateConversationHeader(
            state.conversation
        );

        removeAttachment();

        state.userNearBottom =
            true;

        scrollChatToBottom(
            true
        );

        if(activate){

            activateWorkspace(
                "chat"
            );

        }

        renderHistory();

        return state.conversation;

    }
    catch(error){

        handleApiError(
            error,
            "Não foi possível carregar a conversa."
        );

        return null;

    }

}


/*
==========================================================
SEND CURRENT MESSAGE
==========================================================
*/

async function sendCurrentMessage(){

    if(state.isSending){

        return;

    }

    const rawPrompt =
        dom.chatInput?.value || "";

    const prompt =
        rawPrompt.trim();

    if(!prompt){

        focusChatInput();

        return;

    }

    if(
        prompt.length >
        MAX_MESSAGE_LENGTH
    ){

        showToast(
            "A mensagem é demasiado longa.",
            "error"
        );

        return;

    }

    const displayPrompt =
        prompt;

    let requestPrompt =
        prompt;

    if(
        state.selectedFileSupported &&
        state.selectedFileContent
    ){

        requestPrompt =
            buildPromptWithFileContext(
                prompt
            );

    }

    if(
        requestPrompt.length >
        MAX_MESSAGE_LENGTH
    ){

        showToast(
            "A mensagem com o anexo ultrapassa o limite permitido.",
            "error"
        );

        return;

    }

    await sendMessage(
        requestPrompt,
        displayPrompt
    );

}


/*
==========================================================
SEND MESSAGE
==========================================================
*/

async function sendMessage(
    prompt,
    displayPrompt = prompt
){

    if(state.isSending){

        return;

    }

    if(!state.authenticated){

        redirectToLogin();

        return;

    }

    if(!state.conversationId){

        const conversation =
            await createNewConversation(
                false
            );

        if(!conversation){

            return;

        }

    }

    const generation =
        createGeneration();

    const generationId =
        generation.id;

    state.isSending =
        true;

    state.generationStartedAt =
        Date.now();

    state.generationCancelled =
        false;

    state.generationStatus =
        "preparing";

    state.currentAssistantContent =
        "";

    state.currentAssistantMessageId =
        createClientMessageId();

    setSendingState(
        true
    );

    hideWelcome();

    const userMessage = {

        id:
            createClientMessageId(),

        role:
            "user",

        content:
            displayPrompt,

        createdAt:
            new Date().toISOString()

    };

    state.messages.push(
        userMessage
    );

    appendMessage(
        userMessage,
        false
    );

    state.userNearBottom =
        true;

    scrollChatToBottom(
        true
    );

    const assistantElement =
        createStreamingAssistantMessage();

    state.currentAssistantElement =
        assistantElement;

    try{

        if(
            state.currentMode ===
            "live"
        ){

            await sendLiveMessage(
                prompt,
                assistantElement,
                generationId
            );

        }
        else{

            await sendStandardMessage(
                prompt,
                assistantElement,
                generationId
            );

        }

    }
    catch(error){

        console.error(
            "[HONEY CHAT] Send error:",
            error
        );

        const stillCurrent =
            isCurrentGeneration(
                generationId
            );

        if(
            error?.name === "AbortError" ||
            state.generationCancelled
        ){

            if(
                stillCurrent &&
                state.currentAssistantContent.trim()
            ){

                finalizeInterruptedAssistant(
                    assistantElement
                );

            }
            else{

                removeStreamingAssistantIfEmpty(
                    assistantElement
                );

            }

        }
        else if(stillCurrent){

            if(
                state.currentAssistantContent.trim()
            ){

                setAssistantStatus(
                    assistantElement,
                    "A geração foi interrompida por um erro."
                );

                addAssistantMessageOnce(
                    state.currentAssistantContent,
                    {
                        interrupted:
                            true
                    }
                );

            }
            else{

                removeStreamingAssistantIfEmpty(
                    assistantElement
                );

                showErrorMessage(
                    error?.message ||
                    "Não foi possível processar a mensagem."
                );

            }

        }

        if(error?.status === 401){

            redirectToLogin();

        }

    }
    finally{

        if(
            !isCurrentGeneration(
                generationId
            )
        ){

            return;

        }

        clearStreamRenderTimer();

        state.isSending =
            false;

        state.isLive =
            false;

        state.generationStatus =
            state.generationCancelled
                ? "stopped"
                : "completed";

        state.liveAbortController =
            null;

        state.generationAbortController =
            null;

        state.generationStartedAt =
            null;

        setSendingState(
            false
        );

        state.currentAssistantElement =
            null;

        state.currentAssistantContent =
            "";

        state.currentAssistantMessageId =
            null;

        clearInputAfterSend();

        if(state.userNearBottom){

            scrollChatToBottom();

        }

        state.currentGenerationId =
            null;

    }

}


/*
==========================================================
STANDARD CHAT
==========================================================
*/

async function sendStandardMessage(
    prompt,
    assistantElement,
    generationId
){

    if(
        !isCurrentGeneration(
            generationId
        )
    ){

        return;

    }

    const controller =
        state.generationAbortController;

    const payload = {

        prompt,

        conversationId:
            state.conversationId,

        agentId:
            state.agentId,

        workspaceContext: {

            workspace:
                state.workspace,

            artifacts:
                state.artifacts.map(
                    artifact => ({
                        id:
                            artifact.id ||
                            artifact._id,

                        name:
                            artifact.name,

                        type:
                            artifact.artifactType ||
                            artifact.type,

                        language:
                            artifact.language
                    })
                )

        },

        memory: [],

        mode:
            "chat"

    };

    state.generationStatus =
        "streaming";

    const data =
        await apiRequest(
            "",
            {

                method:
                    "POST",

                body:
                    JSON.stringify(
                        payload
                    ),

                signal:
                    controller?.signal

            }
        );

    if(
        !isCurrentGeneration(
            generationId
        )
    ){

        return;

    }

    if(
        !data ||
        data.success === false
    ){

        throw new Error(
            data?.error ||
            data?.message ||
            "A Honey IA não conseguiu processar o pedido."
        );

    }

    synchronizeConversation(
        data.conversation
    );

    const response =
        data.response ||
        data.message?.assistant?.content ||
        data.message?.content ||
        "";

    if(!response){

        throw new Error(
            "A Honey IA não devolveu uma resposta."
        );

    }

    state.currentAssistantContent =
        response;

    renderAssistantContent(
        assistantElement,
        response,
        {
            final:
                true
        }
    );

    /*
        We intentionally do not show latency/model/provider
        metadata in the user chat UI.
    */

    if(
        Array.isArray(
            data.artifacts
        )
    ){

        renderArtifacts(
            data.artifacts
        );

    }

    if(
        Array.isArray(
            data.tools
        )
    ){

        renderTools(
            data.tools
        );

    }

    addAssistantMessageOnce(
        response,
        data
    );

    updateConversationInList(
        data.conversation
    );

    renderHistory();

}


/*
==========================================================
LIVE MESSAGE
==========================================================
*/

async function sendLiveMessage(
    prompt,
    assistantElement,
    generationId
){

    const controller =
        state.generationAbortController ||
        new AbortController();

    state.liveAbortController =
        controller;

    state.isLive =
        true;

    state.generationStatus =
        "streaming";

    const payload = {

        prompt,

        conversationId:
            state.conversationId,

        agentId:
            state.agentId,

        workspaceContext: {

            workspace:
                state.workspace

        },

        mode:
            "live"

    };

    const response =
        await fetch(
            `${API_BASE}`,
            {

                method:
                    "POST",

                headers: {

                    "Content-Type":
                        "application/json",

                    Accept:
                        "text/event-stream, application/json",

                    Authorization:
                        `Bearer ${getAuthToken()}`

                },

                credentials:
                    "include",

                body:
                    JSON.stringify(
                        payload
                    ),

                signal:
                    controller.signal

            }
        );

    if(response.status === 401){

        const error =
            new Error(
                "Sessão expirada."
            );

        error.status =
            401;

        throw error;

    }

    if(!response.ok){

        let message =
            `Erro HTTP ${response.status}.`;

        try{

            const data =
                await response.json();

            message =
                data?.error ||
                data?.message ||
                message;

        }
        catch(error){

            /*
                Response was not JSON.
            */

        }

        throw new Error(
            message
        );

    }

    const contentType =
        response.headers.get(
            "content-type"
        ) || "";

    if(
        contentType.includes(
            "text/event-stream"
        )
    ){

        await consumeSSEStream(
            response,
            assistantElement,
            generationId
        );

        return;

    }

    const data =
        await response.json();

    if(
        data?.success === false
    ){

        throw new Error(
            data?.error ||
            data?.message ||
            "A Honey IA não conseguiu processar o pedido."
        );

    }

    synchronizeConversation(
        data?.conversation
    );

    const text =
        data?.response ||
        data?.message?.assistant?.content ||
        data?.message?.content ||
        "";

    if(text){

        state.currentAssistantContent =
            text;

        renderAssistantContent(
            assistantElement,
            text,
            {
                final:
                    true
            }
        );

        addAssistantMessageOnce(
            text,
            data
        );

    }

    if(
        Array.isArray(
            data?.artifacts
        )
    ){

        renderArtifacts(
            data.artifacts
        );

    }

    if(
        Array.isArray(
            data?.tools
        )
    ){

        renderTools(
            data.tools
        );

    }

}


/*
==========================================================
SSE STREAM
==========================================================
*/

async function consumeSSEStream(
    response,
    assistantElement,
    generationId
){

    if(!response.body){

        throw new Error(
            "O servidor não disponibilizou o fluxo de resposta."
        );

    }

    const reader =
        response.body.getReader();

    const decoder =
        new TextDecoder(
            "utf-8"
        );

    let buffer =
        "";

    try{

        while(true){

            const result =
                await reader.read();

            if(result.done){

                break;

            }

            if(
                !isCurrentGeneration(
                    generationId
                )
            ){

                try{

                    await reader.cancel();

                }
                catch(error){

                    /*
                        Reader already closed.
                    */

                }

                return;

            }

            buffer +=
                decoder.decode(
                    result.value,
                    {
                        stream:
                            true
                    }
                );

            if(
                buffer.length >
                SSE_BUFFER_LIMIT
            ){

                throw new Error(
                    "O fluxo de resposta ultrapassou o limite de segurança."
                );

            }

            const chunks =
                buffer.split(
                    /\r?\n\r?\n/
                );

            buffer =
                chunks.pop() || "";

            for(
                const chunk of chunks
            ){

                processSSEChunk(
                    chunk,
                    assistantElement,
                    generationId
                );

            }

        }

        buffer +=
            decoder.decode();

        if(buffer.trim()){

            processSSEChunk(
                buffer,
                assistantElement,
                generationId
            );

        }

    }
    finally{

        try{

            reader.releaseLock();

        }
        catch(error){

            /*
                Reader already released.
            */

        }

    }

    if(
        isCurrentGeneration(
            generationId
        )
    ){

        renderAssistantContent(
            assistantElement,
            state.currentAssistantContent,
            {
                final:
                    true
            }
        );

        if(
            state.currentAssistantContent.trim()
        ){

            addAssistantMessageOnce(
                state.currentAssistantContent
            );

        }

    }

}


function processSSEChunk(
    chunk,
    assistantElement,
    generationId
){

    if(
        !chunk ||
        !isCurrentGeneration(
            generationId
        )
    ){

        return;

    }

    const lines =
        chunk.split(
            /\r?\n/
        );

    let eventName =
        "";

    let dataLines =
        [];

    lines.forEach(
        line => {

            if(
                line.startsWith(
                    "event:"
                )
            ){

                eventName =
                    line.slice(
                        6
                    ).trim();

                return;

            }

            if(
                line.startsWith(
                    "data:"
                )
            ){

                dataLines.push(
                    line.slice(
                        5
                    ).trim()
                );

            }

        }
    );

    if(!dataLines.length){

        return;

    }

    const rawData =
        dataLines.join(
            "\n"
        );

    if(
        rawData ===
        "[DONE]"
    ){

        return;

    }

    let payload =
        null;

    try{

        payload =
            JSON.parse(
                rawData
            );

    }
    catch(error){

        payload = {

            text:
                rawData

        };

    }

    if(
        eventName ===
        "error" ||
        payload?.error
    ){

        throw new Error(
            payload?.error ||
            payload?.message ||
            "Erro durante o streaming."
        );

    }

    const delta =
        payload?.delta ??
        payload?.text ??
        payload?.content ??
        payload?.token ??
        payload?.response?.delta ??
        "";

    if(
        typeof delta ===
        "string" &&
        delta
    ){

        state.currentAssistantContent +=
            delta;

        state.streamHasRenderedContent =
            true;

        requestStreamRender(
            assistantElement,
            generationId
        );

    }

    if(
        payload?.conversation
    ){

        synchronizeConversation(
            payload.conversation
        );

    }

    if(
        Array.isArray(
            payload?.artifacts
        )
    ){

        renderArtifacts(
            payload.artifacts
        );

    }

    if(
        Array.isArray(
            payload?.tools
        )
    ){

        renderTools(
            payload.tools
        );

    }

}


/*
==========================================================
ASSISTANT MESSAGE DEDUPLICATION
==========================================================
*/

function addAssistantMessageOnce(
    content,
    metadata = {}
){

    const normalized =
        String(
            content || ""
        ).trim();

    if(!normalized){

        return;

    }

    const last =
        state.messages[
            state.messages.length - 1
        ];

    if(
        last?.role === "assistant" &&
        String(
            last.content || ""
        ).trim() ===
        normalized
    ){

        if(
            metadata?.interrupted === true
        ){

            last.interrupted =
                true;

        }

        return;

    }

    state.messages.push({

        id:
            state.currentAssistantMessageId ||
            createClientMessageId(),

        role:
            "assistant",

        content:
            normalized,

        createdAt:
            new Date().toISOString(),

        interrupted:
            metadata?.interrupted === true

    });

}


/*
==========================================================
CLIENT MESSAGE ID
==========================================================
*/

function createClientMessageId(){

    if(
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID ===
            "function"
    ){

        return crypto.randomUUID();

    }

    return `honey-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`;

}


/*
==========================================================
REFRESH CONVERSATION
==========================================================
*/

async function refreshCurrentConversation(){

    if(!state.conversationId){

        return;

    }

    try{

        const data =
            await apiRequest(
                `/conversations/${encodeURIComponent(
                    state.conversationId
                )}`
            );

        if(data?.conversation){

            synchronizeConversation(
                data.conversation
            );

        }

        if(
            Array.isArray(
                data?.messages
            )
        ){

            state.messages =
                [...data.messages];

        }

        if(
            Array.isArray(
                data?.artifacts
            )
        ){

            state.artifacts =
                normalizeArtifactCollection(
                    data.artifacts
                );

        }

        await loadConversations();

    }
    catch(error){

        if(
            error?.status ===
            401
        ){

            redirectToLogin();

        }
        else{

            console.warn(
                "[HONEY CHAT] Conversation refresh failed:",
                error
            );

        }

    }

}


/*
==========================================================
CONVERSATION STATE
==========================================================
*/

function synchronizeConversation(
    conversation
){

    if(!conversation){

        return;

    }

    state.conversation =
        conversation;

    state.conversationId =
        getConversationId(
            conversation
        );

    state.agentId =
        conversation.agentId ||
        state.agentId;

    state.workspace =
        conversation.workspace ||
        state.workspace;

    updateConversationHeader(
        conversation
    );

    updateConversationInList(
        conversation
    );

}


function addConversationToState(
    conversation
){

    const id =
        getConversationId(
            conversation
        );

    if(!id){

        return;

    }

    const index =
        state.conversations.findIndex(
            item =>
                getConversationId(item) ===
                id
        );

    if(index >= 0){

        state.conversations[index] =
            conversation;

    }
    else{

        state.conversations.unshift(
            conversation
        );

    }

}


function updateConversationInList(
    conversation
){

    if(!conversation){

        return;

    }

    addConversationToState(
        conversation
    );

}


/*
==========================================================
HEADER
==========================================================
*/

function updateConversationHeader(
    conversation
){

    if(!conversation){

        return;

    }

    const title =
        conversation.title ||
        "Nova Conversa";

    if(dom.conversationTitle){

        dom.conversationTitle.textContent =
            title;

    }

}


/*
==========================================================
MESSAGE RENDERING
==========================================================
*/

function clearChatMessages(){

    if(!dom.chatMessages){

        return;

    }

    dom.chatMessages.innerHTML =
        "";

}


function showWelcome(){

    if(!dom.chatMessages){

        return;

    }

    if(dom.chatWelcome){

        dom.chatMessages.appendChild(
            dom.chatWelcome
        );

        dom.chatWelcome.style.display =
            "";

        return;

    }

    const welcome =
        document.createElement(
            "div"
        );

    welcome.className =
        "welcome-message";

    welcome.id =
        "chatWelcome";

    welcome.innerHTML = `

        <div class="welcome-icon">
            <span>🐝</span>
        </div>

        <h3>
            Olá, sou a Honey IA
        </h3>

        <p>
            Como posso ajudar hoje?
        </p>

    `;

    dom.chatMessages.appendChild(
        welcome
    );

    dom.chatWelcome =
        welcome;

}


function hideWelcome(){

    if(dom.chatWelcome){

        dom.chatWelcome.style.display =
            "none";

    }

}


function renderMessages(
    messages
){

    if(!dom.chatMessages){

        return;

    }

    clearChatMessages();

    if(
        !Array.isArray(messages) ||
        !messages.length
    ){

        showWelcome();

        return;

    }

    messages.forEach(
        message => {

            appendMessage(
                message,
                false
            );

        }
    );

    state.userNearBottom =
        true;

    scrollChatToBottom(
        true
    );

}


function appendMessage(
    message,
    scroll = true
){

    if(!dom.chatMessages){

        return null;

    }

    const role =
        normalizeMessageRole(
            message?.role
        );

    if(
        role !== "user" &&
        role !== "assistant"
    ){

        return null;

    }

    const content =
        typeof message?.content ===
            "string"
            ? message.content
            : "";

    if(!content){

        return null;

    }

    hideWelcome();

    const wrapper =
        document.createElement(
            "article"
        );

    wrapper.className =
        `chat-message message-${role}`;

    wrapper.dataset.role =
        role;

    if(message.id){

        wrapper.dataset.messageId =
            String(
                message.id
            );

    }

    const avatar =
        document.createElement(
            "div"
        );

    avatar.className =
        "message-avatar";

    avatar.setAttribute(
        "aria-hidden",
        "true"
    );

    const body =
        document.createElement(
            "div"
        );

    body.className =
        "message-body";

    const contentElement =
        document.createElement(
            "div"
        );

    contentElement.className =
        "message-content";

    if(role === "assistant"){

        contentElement.innerHTML =
            renderMarkdown(
                content
            );

        highlightCode(
            contentElement
        );

    }
    else{

        contentElement.textContent =
            content;

    }

    body.appendChild(
        contentElement
    );

    if(message?.interrupted){

        const status =
            document.createElement(
                "div"
            );

        status.className =
            "assistant-status";

        status.textContent =
            "Resposta interrompida.";

        body.appendChild(
            status
        );

    }

    wrapper.appendChild(
        avatar
    );

    wrapper.appendChild(
        body
    );

    dom.chatMessages.appendChild(
        wrapper
    );

    if(scroll){

        state.userNearBottom =
            true;

        scrollChatToBottom(
            true
        );

    }

    return wrapper;

}


/*
==========================================================
STREAMING ASSISTANT
==========================================================
*/

function createStreamingAssistantMessage(){

    if(!dom.chatMessages){

        return null;

    }

    hideWelcome();

    const wrapper =
        document.createElement(
            "article"
        );

    wrapper.className =
        "chat-message message-assistant streaming-message";

    wrapper.dataset.role =
        "assistant";

    if(state.currentGenerationId){

        wrapper.dataset.generationId =
            state.currentGenerationId;

    }

    const avatar =
        document.createElement(
            "div"
        );

    avatar.className =
        "message-avatar";

    const body =
        document.createElement(
            "div"
        );

    body.className =
        "message-body";

    const content =
        document.createElement(
            "div"
        );

    content.className =
        "message-content";

    content.innerHTML = `

        <div class="chat-thinking">

            <span></span>
            <span></span>
            <span></span>

        </div>

    `;

    body.appendChild(
        content
    );

    wrapper.appendChild(
        avatar
    );

    wrapper.appendChild(
        body
    );

    dom.chatMessages.appendChild(
        wrapper
    );

    state.userNearBottom =
        true;

    scrollChatToBottom(
        true
    );

    return wrapper;

}


/*
==========================================================
ASSISTANT CONTENT
==========================================================
*/

function renderAssistantContent(
    element,
    content,
    options = {}
){

    if(!element){

        return;

    }

    const contentElement =
        element.querySelector(
            ".message-content"
        );

    if(!contentElement){

        return;

    }

    if(!content){

        contentElement.innerHTML = `

            <div class="chat-thinking">

                <span></span>
                <span></span>
                <span></span>

            </div>

        `;

        return;

    }

    contentElement.innerHTML =
        renderMarkdown(
            content
        );

    if(
        options.final === true
    ){

        highlightCode(
            contentElement
        );

    }

}


/*
==========================================================
ASSISTANT STATUS
==========================================================
*/

function setAssistantStatus(
    element,
    status
){

    if(!element){

        return;

    }

    let statusElement =
        element.querySelector(
            ".assistant-status"
        );

    if(!status){

        statusElement?.remove();

        return;

    }

    if(!statusElement){

        statusElement =
            document.createElement(
                "div"
            );

        statusElement.className =
            "assistant-status";

        const body =
            element.querySelector(
                ".message-body"
            );

        body?.appendChild(
            statusElement
        );

    }

    statusElement.textContent =
        status;

}


/*
==========================================================
MARKDOWN
==========================================================
*/

function renderMarkdown(
    content
){

    if(
        typeof content !==
            "string" ||
        !content
    ){

        return "";

    }

    if(
        typeof marked ===
        "undefined"
    ){

        return escapeHTML(
            content
        ).replace(
            /\n/g,
            "<br>"
        );

    }

    try{

        const html =
            marked.parse(
                content,
                {

                    breaks:
                        true,

                    gfm:
                        true

                }
            );

        return sanitizeHTML(
            html
        );

    }
    catch(error){

        console.warn(
            "[HONEY CHAT] Markdown error:",
            error
        );

        return escapeHTML(
            content
        ).replace(
            /\n/g,
            "<br>"
        );

    }

}


/*
==========================================================
CODE HIGHLIGHT
==========================================================
*/

function highlightCode(
    container
){

    if(
        !container ||
        typeof hljs ===
            "undefined"
    ){

        return;

    }

    container
        .querySelectorAll(
            "pre code"
        )
        .forEach(
            block => {

                try{

                    if(
                        block.dataset.honeyHighlighted ===
                        "true"
                    ){

                        return;

                    }

                    hljs.highlightElement(
                        block
                    );

                    block.dataset.honeyHighlighted =
                        "true";

                }
                catch(error){

                    console.warn(
                        "[HONEY CHAT] Highlight error:",
                        error
                    );

                }

            }
        );

}


/*
==========================================================
SAFE HTML
==========================================================
*/

function sanitizeHTML(
    html
){

    if(
        typeof DOMPurify !==
        "undefined"
    ){

        return DOMPurify.sanitize(
            html,
            {

                USE_PROFILES:
                    {
                        html:
                            true
                    },

                ADD_TAGS:
                    [
                        "table",
                        "thead",
                        "tbody",
                        "tr",
                        "th",
                        "td"
                    ],

                FORBID_TAGS:
                    [
                        "script",
                        "object",
                        "embed",
                        "iframe"
                    ]

            }
        );

    }

    const template =
        document.createElement(
            "template"
        );

    template.innerHTML =
        String(
            html || ""
        );

    template.content
        .querySelectorAll(
            "script,iframe,object,embed"
        )
        .forEach(
            element =>
                element.remove()
        );

    return template.innerHTML;

}


function escapeHTML(
    value
){

    const div =
        document.createElement(
            "div"
        );

    div.textContent =
        String(
            value || ""
        );

    return div.innerHTML;

}


/*
==========================================================
UNIVERSAL ARTIFACTS
==========================================================
*/

function normalizeArtifactCollection(
    artifacts
){

    if(
        !Array.isArray(
            artifacts
        )
    ){

        return [];

    }

    return artifacts
        .map(
            normalizeArtifact
        )
        .filter(
            Boolean
        );

}


function normalizeArtifact(
    artifact
){

    if(
        !artifact ||
        typeof artifact !==
        "object"
    ){

        return null;

    }

    const content =
        typeof artifact.content ===
            "string"
            ? artifact.content
            : (
                typeof artifact.code ===
                    "string"
                    ? artifact.code
                    : ""
            );

    const files =
        normalizeArtifactFiles(
            artifact.files
        );

    const inferredType =
        inferArtifactType(
            {
                ...artifact,
                content,
                files
            }
        );

    return {

        ...artifact,

        id:
            artifact.id ||
            artifact._id ||
            createClientMessageId(),

        name:
            artifact.name ||
            artifact.title ||
            "Honey IA Result",

        title:
            artifact.title ||
            artifact.name ||
            "Honey IA Result",

        content,

        mime:
            artifact.mime ||
            artifact.mimeType ||
            "",

        language:
            artifact.language ||
            inferLanguage(
                artifact,
                content
            ),

        artifactType:
            artifact.artifactType ||
            artifact.category ||
            inferredType,

        type:
            artifact.type ||
            artifact.artifactType ||
            inferredType,

        files,

        entryPoint:
            artifact.entryPoint ||
            inferEntryPoint(
                files,
                inferredType
            ),

        versions:
            Array.isArray(
                artifact.versions
            )
                ? artifact.versions
                : [],

        downloadable:
            artifact.downloadable !==
            false,

        editable:
            artifact.editable !==
            false,

        previewable:
            artifact.previewable !==
            false

    };

}


function normalizeArtifactFiles(
    files
){

    if(
        !Array.isArray(files)
    ){

        return [];

    }

    return files
        .map(
            file => {

                if(
                    typeof file ===
                    "string"
                ){

                    return {

                        name:
                            file,

                        path:
                            file,

                        content:
                            "",

                        language:
                            inferLanguageFromFilename(
                                file
                            )

                    };

                }

                if(
                    !file ||
                    typeof file !==
                    "object"
                ){

                    return null;

                }

                return {

                    ...file,

                    name:
                        file.name ||
                        file.path ||
                        "arquivo",

                    path:
                        file.path ||
                        file.name ||
                        "arquivo",

                    content:
                        typeof file.content ===
                            "string"
                            ? file.content
                            : "",

                    language:
                        file.language ||
                        inferLanguageFromFilename(
                            file.name ||
                            file.path ||
                            ""
                        )

                };

            }
        )
        .filter(
            Boolean
        );

}


function inferArtifactType(
    artifact
){

    const explicit =
        String(
            artifact?.artifactType ||
            artifact?.category ||
            artifact?.type ||
            ""
        )
        .toLowerCase()
        .trim();

    if(explicit){

        if(
            explicit.includes(
                "presentation"
            ) ||
            explicit.includes(
                "slide"
            ) ||
            explicit.includes(
                "ppt"
            )
        ){

            return "presentation";

        }

        if(
            explicit.includes(
                "spreadsheet"
            ) ||
            explicit.includes(
                "excel"
            ) ||
            explicit.includes(
                "xlsx"
            )
        ){

            return "spreadsheet";

        }

        if(
            explicit.includes(
                "document"
            ) ||
            explicit.includes(
                "docx"
            ) ||
            explicit.includes(
                "word"
            )
        ){

            return "document";

        }

        if(
            explicit.includes(
                "website"
            ) ||
            explicit.includes(
                "web"
            )
        ){

            return "website";

        }

        if(
            explicit.includes(
                "webapp"
            ) ||
            explicit.includes(
                "application"
            ) ||
            explicit.includes(
                "app"
            )
        ){

            return "webapp";

        }

        if(
            explicit.includes(
                "image"
            ) ||
            explicit.includes(
                "png"
            ) ||
            explicit.includes(
                "jpg"
            )
        ){

            return "image";

        }

        if(
            explicit.includes(
                "pdf"
            )
        ){

            return "pdf";

        }

        if(
            explicit.includes(
                "chart"
            ) ||
            explicit.includes(
                "graph"
            )
        ){

            return "chart";

        }

        if(
            explicit.includes(
                "data"
            ) ||
            explicit.includes(
                "dataset"
            )
        ){

            return "data";

        }

        if(
            explicit.includes(
                "code"
            ) ||
            explicit.includes(
                "script"
            )
        ){

            return "code";

        }

    }

    const mime =
        String(
            artifact?.mime ||
            artifact?.mimeType ||
            ""
        ).toLowerCase();

    if(
        mime.includes(
            "presentation"
        ) ||
        mime.includes(
            "powerpoint"
        )
    ){

        return "presentation";

    }

    if(
        mime.includes(
            "spreadsheet"
        ) ||
        mime.includes(
            "excel"
        )
    ){

        return "spreadsheet";

    }

    if(
        mime.includes(
            "pdf"
        )
    ){

        return "pdf";

    }

    if(
        mime.startsWith(
            "image/"
        )
    ){

        return "image";

    }

    const filename =
        String(
            artifact?.name ||
            artifact?.title ||
            artifact?.entryPoint ||
            ""
        ).toLowerCase();

    if(
        /\.(pptx?|odp)$/.test(
            filename
        )
    ){

        return "presentation";

    }

    if(
        /\.(xlsx?|ods)$/.test(
            filename
        )
    ){

        return "spreadsheet";

    }

    if(
        /\.pdf$/.test(
            filename
        )
    ){

        return "pdf";

    }

    if(
        /\.(png|jpg|jpeg|gif|webp|svg)$/.test(
            filename
        )
    ){

        return "image";

    }

    const files =
        artifact?.files || [];

    const names =
        files
            .map(
                file =>
                    String(
                        file?.name ||
                        file?.path ||
                        ""
                    ).toLowerCase()
            );

    if(
        names.some(
            name =>
                /(^|\/)index\.html?$/.test(
                    name
                )
        )
    ){

        return "website";

    }

    if(
        names.some(
            name =>
                /\.(xlsx?|ods)$/.test(
                    name
                )
        )
    ){

        return "spreadsheet";

    }

    if(
        names.some(
            name =>
                /\.(pptx?|odp)$/.test(
                    name
                )
        )
    ){

        return "presentation";

    }

    if(
        names.some(
            name =>
                /\.pdf$/.test(
                    name
                )
        )
    ){

        return "pdf";

    }

    if(
        names.some(
            name =>
                /\.(png|jpg|jpeg|gif|webp|svg)$/.test(
                    name
                )
        )
    ){

        return "image";

    }

    const language =
        String(
            artifact?.language ||
            ""
        ).toLowerCase();

    if(
        [
            "html",
            "css",
            "javascript",
            "typescript",
            "jsx",
            "tsx",
            "vue",
            "svelte"
        ].includes(
            language
        )
    ){

        return "website";

    }

    if(
        language ||
        artifact?.code
    ){

        return "code";

    }

    if(
        typeof artifact?.content ===
        "string"
    ){

        return "document";

    }

    return "generic";

}


function inferLanguage(
    artifact,
    content
){

    if(artifact?.language){

        return String(
            artifact.language
        );

    }

    const name =
        artifact?.name ||
        artifact?.title ||
        "";

    return inferLanguageFromFilename(
        name
    ) || (
        content.includes(
            "<html"
        )
            ? "html"
            : ""
    );

}


function inferLanguageFromFilename(
    filename
){

    const extension =
        String(
            filename || ""
        )
        .toLowerCase()
        .split(
            "."
        )
        .pop();

    const map = {

        html:
            "html",

        htm:
            "html",

        css:
            "css",

        js:
            "javascript",

        mjs:
            "javascript",

        cjs:
            "javascript",

        ts:
            "typescript",

        tsx:
            "tsx",

        jsx:
            "jsx",

        py:
            "python",

        java:
            "java",

        c:
            "c",

        cpp:
            "cpp",

        h:
            "c",

        hpp:
            "cpp",

        sql:
            "sql",

        json:
            "json",

        csv:
            "csv",

        xml:
            "xml",

        md:
            "markdown",

        yaml:
            "yaml",

        yml:
            "yaml",

        sh:
            "shell",

        bash:
            "shell",

        php:
            "php",

        go:
            "go",

        rs:
            "rust",

        rb:
            "ruby",

        vue:
            "vue",

        svelte:
            "svelte"

    };

    return map[
        extension
    ] || "";

}


function inferEntryPoint(
    files,
    type
){

    if(!Array.isArray(files)){

        return null;

    }

    const html =
        files.find(
            file =>
                /(^|\/)index\.html?$/.test(
                    String(
                        file?.name ||
                        file?.path ||
                        ""
                    ).toLowerCase()
                )
        );

    if(html){

        return html.name ||
            html.path;

    }

    if(type === "website"){

        const firstHtml =
            files.find(
                file =>
                    /\.(html|htm)$/i.test(
                        String(
                            file?.name ||
                            file?.path ||
                            ""
                        )
                    )
            );

        return firstHtml?.name ||
            firstHtml?.path ||
            null;

    }

    return files[0]?.name ||
        files[0]?.path ||
        null;

}


function getArtifactKey(
    artifact
){

    if(!artifact){

        return "";

    }

    return String(
        artifact.id ||
        artifact._id ||
        `${artifact.name || "artifact"}:${artifact.language || ""}:${String(
            artifact.content || ""
        ).slice(0, 120)}`
    );

}


/*
==========================================================
ARTIFACT CARDS
==========================================================
*/

function renderArtifactCards(){

    if(!dom.chatMessages){

        return;

    }

    dom.chatMessages
        .querySelectorAll(
            ".honey-artifact-card"
        )
        .forEach(
            element =>
                element.remove()
        );

    state.artifacts.forEach(
        artifact => {

            const card =
                createArtifactCard(
                    artifact
                );

            dom.chatMessages.appendChild(
                card
            );

        }
    );

    if(state.userNearBottom){

        scrollChatToBottom();

    }

}


function createArtifactCard(
    artifact
){

    const card =
        document.createElement(
            "article"
        );

    card.className =
        "honey-artifact-card";

    card.dataset.artifactId =
        String(
            artifact.id
        );

    const type =
        getArtifactDisplayType(
            artifact
        );

    const title =
        document.createElement(
            "h3"
        );

    title.textContent =
        artifact.title ||
        artifact.name;

    const typeElement =
        document.createElement(
            "span"
        );

    typeElement.textContent =
        type;

    const actions =
        document.createElement(
            "div"
        );

    actions.className =
        "honey-artifact-actions";

    const previewButton =
        createButton(
            "Abrir Preview",
            "fa-solid fa-eye"
        );

    previewButton.addEventListener(
        "click",
        () => {

            openArtifactPreview(
                artifact
            );

        }
    );

    actions.appendChild(
        previewButton
    );

    if(artifact.downloadable){

        const downloadButton =
            createButton(
                "Baixar",
                "fa-solid fa-download"
            );

        downloadButton.addEventListener(
            "click",
            () => {

                downloadArtifact(
                    artifact
                );

            }
        );

        actions.appendChild(
            downloadButton
        );

    }

    card.appendChild(
        title
    );

    card.appendChild(
        typeElement
    );

    card.appendChild(
        actions
    );

    return card;

}


function getArtifactDisplayType(
    artifact
){

    const type =
        artifact?.artifactType ||
        artifact?.type ||
        "generic";

    const labels = {

        website:
            "Website",

        webapp:
            "Web App",

        presentation:
            "Apresentação",

        spreadsheet:
            "Excel / Spreadsheet",

        document:
            "Documento",

        chart:
            "Gráfico",

        image:
            "Imagem",

        pdf:
            "PDF",

        code:
            "Código",

        data:
            "Dados",

        generic:
            "Artefacto"

    };

    return labels[
        type
    ] || "Artefacto";

}


/*
==========================================================
UNIVERSAL PREVIEW SETUP
==========================================================
*/

function setupPreview(){

    if(
        dom.btnClosePreview
    ){

        dom.btnClosePreview.addEventListener(
            "click",
            closeArtifactPreview
        );

    }

    if(
        dom.previewIframe
    ){

        dom.previewIframe.setAttribute(
            "title",
            "Preview Honey IA"
        );

        dom.previewIframe.setAttribute(
            "sandbox",
            "allow-scripts allow-forms allow-modals allow-popups"
        );

    }

    /*
        Existing HTML may not contain a dedicated toolbar.
        We create one only inside the preview pane.
    */

    if(dom.previewPane){

        ensurePreviewShell();

    }

    window.addEventListener(
        "message",
        handlePreviewMessage
    );

}


function ensurePreviewShell(){

    if(
        !dom.previewPane ||
        dom.previewPane.querySelector(
            ".honey-preview-shell"
        )
    ){

        return;

    }

    const shell =
        document.createElement(
            "div"
        );

    shell.className =
        "honey-preview-shell";

    shell.innerHTML = `

        <div class="honey-preview-toolbar">

            <div class="honey-preview-title">
                Preview
            </div>

            <div class="honey-preview-toolbar-actions">

                <button
                    type="button"
                    data-preview-action="preview"
                >
                    Preview
                </button>

                <button
                    type="button"
                    data-preview-action="edit"
                >
                    Editar
                </button>

                <button
                    type="button"
                    data-preview-action="code"
                >
                    Código
                </button>

                <button
                    type="button"
                    data-preview-action="terminal"
                >
                    Terminal
                </button>

                <button
                    type="button"
                    data-preview-action="fullscreen"
                >
                    Ecrã inteiro
                </button>

                <button
                    type="button"
                    data-preview-action="download"
                >
                    Baixar
                </button>

                <button
                    type="button"
                    data-preview-action="share"
                >
                    Partilhar
                </button>

                <button
                    type="button"
                    data-preview-action="deploy"
                >
                    Publicar
                </button>

            </div>

        </div>

        <div class="honey-preview-versionbar">

            <label>
                Versão
            </label>

            <select
                data-preview-version
            ></select>

            <button
                type="button"
                data-preview-action="compare"
            >
                Comparar
            </button>

            <button
                type="button"
                data-preview-action="restore"
            >
                Restaurar
            </button>

        </div>

        <div class="honey-preview-workspace">

            <div
                class="honey-preview-editor"
                data-preview-editor
                hidden
            >

                <div class="honey-preview-files"></div>

                <textarea
                    data-preview-code
                    spellcheck="false"
                ></textarea>

                <div class="honey-preview-editor-actions">

                    <button
                        type="button"
                        data-preview-save
                    >
                        Guardar alterações
                    </button>

                    <button
                        type="button"
                        data-preview-cancel
                    >
                        Cancelar
                    </button>

                </div>

            </div>

            <div
                class="honey-preview-render-area"
                data-preview-render-area
            ></div>

            <div
                class="honey-preview-terminal"
                data-preview-terminal
                hidden
            >

                <div
                    class="honey-terminal-output"
                    data-terminal-output
                ></div>

                <div class="honey-terminal-input-row">

                    <span>
                        $
                    </span>

                    <input
                        type="text"
                        data-terminal-input
                        placeholder="python, node ou comando permitido..."
                    />

                    <button
                        type="button"
                        data-terminal-run
                    >
                        Executar
                    </button>

                </div>

            </div>

        </div>

    `;

    /*
        We place the shell before the existing iframe.
        The existing iframe remains available as a compatibility
        fallback for the original index.html.
    */

    dom.previewPane.prepend(
        shell
    );

    bindPreviewShell(
        shell
    );

}


function bindPreviewShell(
    shell
){

    shell
        .querySelectorAll(
            "[data-preview-action]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        handlePreviewAction(
                            button.dataset.previewAction
                        );

                    }
                );

            }
        );

    const versionSelect =
        shell.querySelector(
            "[data-preview-version]"
        );

    versionSelect?.addEventListener(
        "change",
        () => {

            selectArtifactVersion(
                versionSelect.value
            );

        }
    );

    shell
        .querySelector(
            "[data-preview-save]"
        )
        ?.addEventListener(
            "click",
            savePreviewEdits
        );

    shell
        .querySelector(
            "[data-preview-cancel]"
        )
        ?.addEventListener(
            "click",
            cancelPreviewEdits
        );

    shell
        .querySelector(
            "[data-terminal-run]"
        )
        ?.addEventListener(
            "click",
            runTerminalCommand
        );

    shell
        .querySelector(
            "[data-terminal-input]"
        )
        ?.addEventListener(
            "keydown",
            event => {

                if(
                    event.key === "Enter"
                ){

                    runTerminalCommand();

                }

            }
        );

}


function getPreviewShell(){

    return dom.previewPane?.querySelector(
        ".honey-preview-shell"
    ) || null;

}


function getPreviewElement(
    selector
){

    return getPreviewShell()?.querySelector(
        selector
    ) || null;

}


/*
==========================================================
OPEN ARTIFACT PREVIEW
==========================================================
*/

function openArtifactPreview(
    artifact
){

    const normalized =
        normalizeArtifact(
            artifact
        );

    if(!normalized){

        return;

    }

    state.preview.open =
        true;

    state.preview.artifactId =
        normalized.id;

    state.preview.artifact =
        normalized;

    state.preview.artifactType =
        normalized.artifactType;

    state.preview.mode =
        "preview";

    state.preview.editorDirty =
        false;

    state.preview.activeFile =
        normalized.entryPoint ||
        normalized.files?.[0]?.name ||
        null;

    state.preview.versions =
        buildArtifactVersions(
            normalized
        );

    state.preview.activeVersion =
        state.preview.versions[
            state.preview.versions.length - 1
        ]?.id ||
        null;

    state.preview.share =
        null;

    state.preview.deploy =
        null;

    state.preview.execution =
        {
            running:
                false,

            language:
                normalized.language ||
                null,

            output:
                "",

            error:
                null

        };

    ensurePreviewShell();

    if(dom.previewPane){

        dom.previewPane.classList.add(
            "open"
        );

        dom.previewPane.style.display =
            "";

    }

    updatePreviewTitle();

    renderPreviewVersions();

    renderPreviewArtifact();

    focusPreview();

}


/*
==========================================================
CLOSE PREVIEW
==========================================================
*/

function closeArtifactPreview(){

    state.preview.open =
        false;

    state.preview.artifact =
        null;

    state.preview.artifactId =
        null;

    state.preview.activeFile =
        null;

    state.preview.mode =
        "preview";

    state.preview.editorDirty =
        false;

    if(
        state.preview.fullscreen
    ){

        exitPreviewFullscreen();

    }

    if(dom.previewPane){

        dom.previewPane.classList.remove(
            "open"
        );

        /*
            Do not destroy the pane because index.html
            already owns it.
        */

    }

}


function resetPreviewState(){

    closeArtifactPreview();

    state.preview.versions =
        [];

    state.preview.activeVersion =
        null;

}


/*
==========================================================
PREVIEW TITLE
==========================================================
*/

function updatePreviewTitle(){

    const title =
        getPreviewElement(
            ".honey-preview-title"
        );

    if(!title){

        return;

    }

    title.textContent =
        state.preview.artifact?.title ||
        "Preview";

}


/*
==========================================================
PREVIEW ACTIONS
==========================================================
*/

function handlePreviewAction(
    action
){

    if(!state.preview.artifact){

        return;

    }

    switch(action){

        case "preview":

            setPreviewMode(
                "preview"
            );

            break;

        case "edit":

            setPreviewMode(
                "edit"
            );

            break;

        case "code":

            setPreviewMode(
                "code"
            );

            break;

        case "terminal":

            setPreviewMode(
                "terminal"
            );

            break;

        case "fullscreen":

            togglePreviewFullscreen();

            break;

        case "download":

            downloadArtifact(
                state.preview.artifact
            );

            break;

        case "share":

            shareArtifactPreview();

            break;

        case "deploy":

            deployArtifact(
                state.preview.artifact
            );

            break;

        case "compare":

            compareArtifactVersions();

            break;

        case "restore":

            restoreSelectedVersion();

            break;

        default:

            break;

    }

}


function setPreviewMode(
    mode
){

    state.preview.mode =
        mode;

    const editor =
        getPreviewElement(
            "[data-preview-editor]"
        );

    const renderArea =
        getPreviewElement(
            "[data-preview-render-area]"
        );

    const terminal =
        getPreviewElement(
            "[data-preview-terminal]"
        );

    if(editor){

        editor.hidden =
            !(
                mode ===
                "edit" ||
                mode ===
                "code"
            );

    }

    if(renderArea){

        renderArea.hidden =
            mode ===
            "terminal";

    }

    if(terminal){

        terminal.hidden =
            mode !==
            "terminal";

    }

    if(
        mode ===
        "edit"
    ){

        renderPreviewEditor(
            false
        );

        return;

    }

    if(
        mode ===
        "code"
    ){

        renderPreviewEditor(
            true
        );

        return;

    }

    if(
        mode ===
        "terminal"
    ){

        renderTerminalOutput();

        return;

    }

    renderPreviewArtifact();

}


/*
==========================================================
RENDER PREVIEW ARTIFACT
==========================================================
*/

function renderPreviewArtifact(){

    const artifact =
        state.preview.artifact;

    if(!artifact){

        return;

    }

    const renderArea =
        getPreviewElement(
            "[data-preview-render-area]"
        );

    if(!renderArea){

        return;

    }

    renderArea.innerHTML =
        "";

    const version =
        getActiveArtifactVersion();

    const effectiveArtifact =
        version?.artifact ||
        artifact;

    switch(
        effectiveArtifact.artifactType
    ){

        case "website":

        case "webapp":

            renderWebsiteArtifact(
                effectiveArtifact,
                renderArea
            );

            break;

        case "presentation":

            renderPresentationArtifact(
                effectiveArtifact,
                renderArea
            );

            break;

        case "spreadsheet":

            renderSpreadsheetArtifact(
                effectiveArtifact,
                renderArea
            );

            break;

        case "document":

            renderDocumentArtifact(
                effectiveArtifact,
                renderArea
            );

            break;

        case "chart":

            renderChartArtifact(
                effectiveArtifact,
                renderArea
            );

            break;

        case "image":

            renderImageArtifact(
                effectiveArtifact,
                renderArea
            );

            break;

        case "pdf":

            renderPDFArtifact(
                effectiveArtifact,
                renderArea
            );

            break;

        case "code":

            renderCodeArtifact(
                effectiveArtifact,
                renderArea
            );

            break;

        case "data":

            renderDataArtifact(
                effectiveArtifact,
                renderArea
            );

            break;

        default:

            renderGenericArtifact(
                effectiveArtifact,
                renderArea
            );

            break;

    }

}


/*
==========================================================
WEBSITE RENDERER
==========================================================
*/

function renderWebsiteArtifact(
    artifact,
    container
){

    const files =
        artifact.files?.length
            ? artifact.files
            : [
                {

                    name:
                        artifact.entryPoint ||
                        "index.html",

                    content:
                        artifact.content,

                    language:
                        "html"

                }
            ];

    const entry =
        files.find(
            file =>
                String(
                    file.name ||
                    file.path
                ) ===
                String(
                    artifact.entryPoint
                )
        ) ||
        files.find(
            file =>
                /(^|\/)index\.html?$/.test(
                    String(
                        file.name ||
                        file.path ||
                        ""
                    ).toLowerCase()
                )
        ) ||
        files.find(
            file =>
                /\.(html|htm)$/i.test(
                    String(
                        file.name ||
                        file.path ||
                        ""
                    )
                )
        ) ||
        files[0];

    if(!entry){

        renderEmptyPreview(
            container,
            "O projecto não possui um ficheiro de entrada."
        );

        return;

    }

    const iframe =
        document.createElement(
            "iframe"
        );

    iframe.className =
        "honey-universal-preview-frame";

    iframe.setAttribute(
        "title",
        artifact.title ||
        "Website Preview"
    );

    iframe.setAttribute(
        "sandbox",
        "allow-scripts allow-forms allow-modals allow-popups"
    );

    iframe.srcdoc =
        buildWebsiteDocument(
            entry.content ||
            artifact.content ||
            "",
            files
        );

    container.appendChild(
        iframe
    );

    /*
        Keep the original iframe synchronized when it exists.
        This preserves compatibility with the current index.html.
    */

    if(dom.previewIframe){

        dom.previewIframe.srcdoc =
            iframe.srcdoc;

        dom.previewIframe.style.display =
            "none";

    }

}


/*
==========================================================
WEBSITE DOCUMENT BUILDER
==========================================================
*/

function buildWebsiteDocument(
    entryHTML,
    files
){

    let html =
        String(
            entryHTML || ""
        );

    /*
        Replace local asset references with data/blob URLs
        when the artifact provides inline content.
    */

    const fileMap =
        new Map();

    files.forEach(
        file => {

            const path =
                normalizePath(
                    file.path ||
                    file.name ||
                    ""
                );

            if(path){

                fileMap.set(
                    path,
                    file
                );

                fileMap.set(
                    normalizePath(
                        file.name ||
                        ""
                    ),
                    file
                );

            }

        }
    );

    html =
        injectInlineStyles(
            html,
            files
        );

    html =
        injectInlineScripts(
            html,
            files
        );

    html =
        injectLocalAssets(
            html,
            fileMap
        );

    return html;

}


function injectInlineStyles(
    html,
    files
){

    let output =
        html;

    const cssFiles =
        files.filter(
            file =>
                /\.(css)$/i.test(
                    String(
                        file.name ||
                        file.path ||
                        ""
                    )
                )
        );

    cssFiles.forEach(
        file => {

            const name =
                escapeRegExp(
                    file.name ||
                    file.path ||
                    ""
                );

            const regex =
                new RegExp(
                    `<link[^>]+href=["'][^"']*${name}["'][^>]*>`,
                    "gi"
                );

            output =
                output.replace(
                    regex,
                    `<style>${file.content || ""}</style>`
                );

        }
    );

    return output;

}


function injectInlineScripts(
    html,
    files
){

    let output =
        html;

    const jsFiles =
        files.filter(
            file =>
                /\.(js|mjs|cjs)$/i.test(
                    String(
                        file.name ||
                        file.path ||
                        ""
                    )
                )
        );

    jsFiles.forEach(
        file => {

            const name =
                escapeRegExp(
                    file.name ||
                    file.path ||
                    ""
                );

            const regex =
                new RegExp(
                    `<script[^>]+src=["'][^"']*${name}["'][^>]*>\\s*</script>`,
                    "gi"
                );

            output =
                output.replace(
                    regex,
                    `<script>${file.content || ""}</script>`
                );

        }
    );

    return output;

}


function injectLocalAssets(
    html,
    fileMap
){

    return html.replace(
        /(?:src|href)=["']([^"']+)["']/gi,
        (
            full,
            reference
        ) => {

            const normalized =
                normalizePath(
                    reference
                );

            const file =
                fileMap.get(
                    normalized
                );

            if(
                !file ||
                !file.content
            ){

                return full;

            }

            if(
                /\.(css)$/i.test(
                    normalized
                ) ||
                /\.(js|mjs|cjs)$/i.test(
                    normalized
                )
            ){

                return full;

            }

            const mime =
                file.mime ||
                guessMimeType(
                    file.name ||
                    reference
                );

            const encoded =
                `data:${mime};base64,${base64Encode(
                    file.content
                )}`;

            return full.replace(
                reference,
                encoded
            );

        }
    );

}


function normalizePath(
value
){

    return String(
        value || ""
    )
        .replace(
            /^\.\/+/,
            ""
        )
        .replace(
            /^\/+/,
            ""
        )
        .replace(
            /\\/g,
            "/"
        )
        .trim();

}


function escapeRegExp(
value
){

    return String(
        value || ""
    ).replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
    );

}


function base64Encode(
value
){

    try{

        return btoa(
            unescape(
                encodeURIComponent(
                    String(
                        value || ""
                    )
                )
            )
        );

    }
    catch(error){

        return btoa(
            String(
                value || ""
            )
        );

    }

}


/*
==========================================================
PRESENTATION RENDERER
==========================================================
*/

function renderPresentationArtifact(
    artifact,
    container
){

    if(
        artifact.url ||
        artifact.fileUrl ||
        artifact.downloadUrl
    ){

        const url =
            artifact.url ||
            artifact.fileUrl ||
            artifact.downloadUrl;

        const iframe =
            document.createElement(
                "iframe"
            );

        iframe.className =
            "honey-universal-preview-frame";

        iframe.src =
            url;

        iframe.setAttribute(
            "title",
            "Apresentação"
        );

        container.appendChild(
            iframe
        );

        return;

    }

    const slides =
        artifact.slides ||
        parseSlidesFromContent(
            artifact.content
        );

    if(
        Array.isArray(
            slides
        ) &&
        slides.length
    ){

        renderSlideDeck(
            slides,
            container
        );

        return;

    }

    renderUnsupportedArtifact(
        container,
        "A apresentação foi criada, mas o backend ainda não disponibilizou um formato visualizável no navegador. O ficheiro pode ser baixado quando o URL do artefacto estiver disponível."
    );

}


function parseSlidesFromContent(
content
){

    if(
        typeof content !==
        "string"
    ){

        return [];

    }

    const sections =
        content.split(
            /\n-{3,}\n/
        );

    return sections.map(
        section => {

            const lines =
                section
                    .split(
                        "\n"
                    )
                    .map(
                        line =>
                            line.trim()
                    )
                    .filter(
                        Boolean
                    );

            if(!lines.length){

                return null;

            }

            return {

                title:
                    lines[0],

                content:
                    lines
                        .slice(
                            1
                        )
                        .join(
                            "\n"
                        )

            };

        }
    ).filter(
        Boolean
    );

}


function renderSlideDeck(
slides,
container
){

    const deck =
        document.createElement(
            "div"
        );

    deck.className =
        "honey-slide-deck";

    let current =
        0;

    const slide =
        document.createElement(
            "div"
        );

    slide.className =
        "honey-slide";

    const controls =
        document.createElement(
            "div"
        );

    controls.className =
        "honey-slide-controls";

    const previous =
        createButton(
            "Anterior",
            "fa-solid fa-arrow-left"
        );

    const next =
        createButton(
            "Próximo",
            "fa-solid fa-arrow-right"
        );

    const counter =
        document.createElement(
            "span"
        );

    function draw(){

        const currentSlide =
            slides[current];

        slide.innerHTML = `

            <h1>
                ${escapeHTML(
                    currentSlide.title ||
                    ""
                )}
            </h1>

            <div class="honey-slide-content">
                ${renderMarkdown(
                    currentSlide.content ||
                    ""
                )}
            </div>

        `;

        counter.textContent =
            `${current + 1} / ${slides.length}`;

        previous.disabled =
            current <= 0;

        next.disabled =
            current >=
            slides.length - 1;

    }

    previous.addEventListener(
        "click",
        () => {

            if(current > 0){

                current -=
                    1;

                draw();

            }

        }
    );

    next.addEventListener(
        "click",
        () => {

            if(
                current <
                slides.length - 1
            ){

                current +=
                    1;

                draw();

            }

        }
    );

    controls.appendChild(
        previous
    );

    controls.appendChild(
        counter
    );

    controls.appendChild(
        next
    );

    deck.appendChild(
        slide
    );

    deck.appendChild(
        controls
    );

    container.appendChild(
        deck
    );

    draw();

}


/*
==========================================================
SPREADSHEET RENDERER
==========================================================
*/

function renderSpreadsheetArtifact(
    artifact,
    container
){

    if(
        artifact.url ||
        artifact.fileUrl ||
        artifact.downloadUrl
    ){

        const iframe =
            document.createElement(
                "iframe"
            );

        iframe.className =
            "honey-universal-preview-frame";

        iframe.src =
            artifact.url ||
            artifact.fileUrl ||
            artifact.downloadUrl;

        iframe.setAttribute(
            "title",
            "Spreadsheet"
        );

        container.appendChild(
            iframe
        );

        return;

    }

    let rows =
        artifact.rows ||
        null;

    if(
        !Array.isArray(rows)
    ){

        rows =
            parseCSV(
                artifact.content
            );

    }

    if(
        !Array.isArray(rows) ||
        !rows.length
    ){

        renderUnsupportedArtifact(
            container,
            "A planilha foi criada, mas não há dados tabulares disponíveis para o Preview."
        );

        return;

    }

    const wrapper =
        document.createElement(
            "div"
        );

    wrapper.className =
        "honey-spreadsheet-wrapper";

    const table =
        document.createElement(
            "table"
        );

    table.className =
        "honey-spreadsheet";

    rows.forEach(
        (
            row,
            rowIndex
        ) => {

            const tr =
                document.createElement(
                    "tr"
                );

            const cells =
                Array.isArray(row)
                    ? row
                    : Object.values(
                        row || {}
                    );

            cells.forEach(
                value => {

                    const cell =
                        document.createElement(
                            rowIndex === 0
                                ? "th"
                                : "td"
                        );

                    cell.textContent =
                        String(
                            value ??
                            ""
                        );

                    tr.appendChild(
                        cell
                    );

                }
            );

            table.appendChild(
                tr
            );

        }
    );

    wrapper.appendChild(
        table
    );

    container.appendChild(
        wrapper
    );

}


function parseCSV(
content
){

    if(
        typeof content !==
        "string"
    ){

        return [];

    }

    return content
        .split(
            /\r?\n/
        )
        .filter(
            line =>
                line.trim()
        )
        .map(
            line =>
                parseCSVLine(
                    line
                )
        );

}


function parseCSVLine(
line
){

    const result =
        [];

    let current =
        "";

    let quoted =
        false;

    for(
        let index = 0;
        index < line.length;
        index++
    ){

        const char =
            line[index];

        if(
            char ===
            '"'
        ){

            if(
                quoted &&
                line[index + 1] ===
                '"'
            ){

                current +=
                    '"';

                index +=
                    1;

            }
            else{

                quoted =
                    !quoted;

            }

        }
        else if(
            char === "," &&
            !quoted
        ){

            result.push(
                current
            );

            current =
                "";

        }
        else{

            current +=
                char;

        }

    }

    result.push(
        current
    );

    return result;

}


/*
==========================================================
DOCUMENT RENDERER
==========================================================
*/

function renderDocumentArtifact(
    artifact,
    container
){

    if(
        artifact.url ||
        artifact.fileUrl ||
        artifact.downloadUrl
    ){

        const url =
            artifact.url ||
            artifact.fileUrl ||
            artifact.downloadUrl;

        const iframe =
            document.createElement(
                "iframe"
            );

        iframe.className =
            "honey-universal-preview-frame";

        iframe.src =
            url;

        iframe.setAttribute(
            "title",
            "Documento"
        );

        container.appendChild(
            iframe
        );

        return;

    }

    const documentElement =
        document.createElement(
            "article"
        );

    documentElement.className =
        "honey-document-preview";

    documentElement.innerHTML =
        renderMarkdown(
            artifact.content ||
            ""
        );

    container.appendChild(
        documentElement
    );

}


/*
==========================================================
CHART RENDERER
==========================================================
*/

function renderChartArtifact(
    artifact,
    container
){

    if(
        artifact.html
    ){

        const iframe =
            document.createElement(
                "iframe"
            );

        iframe.className =
            "honey-universal-preview-frame";

        iframe.sandbox =
            "allow-scripts";

        iframe.srcdoc =
            artifact.html;

        container.appendChild(
            iframe
        );

        return;

    }

    const data =
        artifact.data ||
        artifact.chartData ||
        null;

    if(
        typeof Chart !==
        "undefined" &&
        data
    ){

        const canvas =
            document.createElement(
                "canvas"
            );

        canvas.className =
            "honey-chart-canvas";

        container.appendChild(
            canvas
        );

        try{

            const config =
                artifact.config ||
                {

                    type:
                        "bar",

                    data

                };

            new Chart(
                canvas.getContext(
                    "2d"
                ),
                config
            );

        }
        catch(error){

            console.warn(
                "[HONEY CHAT] Chart rendering error:",
                error
            );

            renderGenericArtifact(
                artifact,
                container
            );

        }

        return;

    }

    renderGenericArtifact(
        artifact,
        container
    );

}


/*
==========================================================
IMAGE RENDERER
==========================================================
*/

function renderImageArtifact(
    artifact,
    container
){

    const image =
        document.createElement(
            "img"
        );

    image.className =
        "honey-image-preview";

    image.alt =
        artifact.title ||
        artifact.name ||
        "Imagem gerada pela Honey IA";

    const source =
        artifact.url ||
        artifact.fileUrl ||
        artifact.downloadUrl ||
        (
            artifact.dataUrl ||
            (
                artifact.mime &&
                artifact.content
                    ? `data:${artifact.mime};base64,${artifact.content}`
                    : ""
            )
        );

    if(source){

        image.src =
            source;

        container.appendChild(
            image
        );

        return;

    }

    if(
        artifact.content &&
        /^data:image\//i.test(
            artifact.content
        )
    ){

        image.src =
            artifact.content;

        container.appendChild(
            image
        );

        return;

    }

    renderUnsupportedArtifact(
        container,
        "A imagem foi criada, mas o Preview não recebeu uma fonte visual."
    );

}


/*
==========================================================
PDF RENDERER
==========================================================
*/

function renderPDFArtifact(
    artifact,
    container
){

    const source =
        artifact.url ||
        artifact.fileUrl ||
        artifact.downloadUrl ||
        (
            artifact.content &&
            /^data:application\/pdf/i.test(
                artifact.content
            )
                ? artifact.content
                : ""
        );

    if(!source){

        renderUnsupportedArtifact(
            container,
            "O PDF foi criado, mas o Preview não recebeu o ficheiro ou URL do PDF."
        );

        return;

    }

    const iframe =
        document.createElement(
            "iframe"
        );

    iframe.className =
        "honey-universal-preview-frame";

    iframe.src =
        source;

    iframe.setAttribute(
        "title",
        "PDF"
    );

    container.appendChild(
        iframe
    );

}


/*
==========================================================
CODE RENDERER
==========================================================
*/

function renderCodeArtifact(
    artifact,
    container
){

    const wrapper =
        document.createElement(
            "div"
        );

    wrapper.className =
        "honey-code-preview";

    const pre =
        document.createElement(
            "pre"
        );

    const code =
        document.createElement(
            "code"
        );

    code.className =
        artifact.language
            ? `language-${artifact.language}`
            : "";

    code.textContent =
        artifact.content ||
        "";

    pre.appendChild(
        code
    );

    wrapper.appendChild(
        pre
    );

    container.appendChild(
        wrapper
    );

    highlightCode(
        wrapper
    );

}


/*
==========================================================
DATA RENDERER
==========================================================
*/

function renderDataArtifact(
    artifact,
    container
){

    const content =
        artifact.content ||
        artifact.data ||
        "";

    if(
        typeof content ===
        "object"
    ){

        const pre =
            document.createElement(
                "pre"
            );

        pre.textContent =
            JSON.stringify(
                content,
                null,
                2
            );

        container.appendChild(
            pre
        );

        return;

    }

    if(
        artifact.mime ===
        "text/csv" ||
        /\.csv$/i.test(
            artifact.name ||
            ""
        )
    ){

        renderSpreadsheetArtifact(
            artifact,
            container
        );

        return;

    }

    const pre =
        document.createElement(
            "pre"
        );

    pre.textContent =
        String(
            content
        );

    container.appendChild(
        pre
    );

}


/*
==========================================================
GENERIC RENDERER
==========================================================
*/

function renderGenericArtifact(
    artifact,
    container
){

    if(
        artifact.content
    ){

        const pre =
            document.createElement(
                "pre"
            );

        pre.textContent =
            artifact.content;

        container.appendChild(
            pre
        );

        return;

    }

    renderUnsupportedArtifact(
        container,
        "Este artefacto foi recebido, mas ainda não possui um renderer específico no Preview."
    );

}


function renderUnsupportedArtifact(
    container,
    message
){

    const element =
        document.createElement(
            "div"
        );

    element.className =
        "honey-preview-message";

    element.textContent =
        message;

    container.appendChild(
        element
    );

}


function renderEmptyPreview(
    container,
    message
){

    renderUnsupportedArtifact(
        container,
        message
    );

}


/*
==========================================================
PREVIEW EDITOR
==========================================================
*/

function renderPreviewEditor(
    codeMode = false
){

    const artifact =
        state.preview.artifact;

    if(!artifact){

        return;

    }

    const editor =
        getPreviewElement(
            "[data-preview-editor]"
        );

    const textarea =
        getPreviewElement(
            "[data-preview-code]"
        );

    const filesContainer =
        getPreviewElement(
            ".honey-preview-files"
        );

    if(
        !editor ||
        !textarea
    ){

        return;

    }

    const files =
        artifact.files?.length
            ? artifact.files
            : [
                {

                    name:
                        artifact.entryPoint ||
                        artifact.name,

                    content:
                        artifact.content,

                    language:
                        artifact.language

                }
            ];

    filesContainer.innerHTML =
        "";

    files.forEach(
        file => {

            const button =
                document.createElement(
                    "button"
                );

            button.type =
                "button";

            button.textContent =
                file.name ||
                file.path;

            button.classList.toggle(
                "active",
                String(
                    file.name ||
                    file.path
                ) ===
                String(
                    state.preview.activeFile
                )
            );

            button.addEventListener(
                "click",
                () => {

                    if(
                        state.preview.editorDirty
                    ){

                        const confirmed =
                            window.confirm(
                                "Existem alterações não guardadas. Deseja mudar de ficheiro?"
                            );

                        if(!confirmed){

                            return;

                        }

                    }

                    state.preview.activeFile =
                        file.name ||
                        file.path;

                    state.preview.editorDirty =
                        false;

                    loadActiveFileIntoEditor();

                    renderPreviewEditor(
                        codeMode
                    );

                }
            );

            filesContainer.appendChild(
                button
            );

        }
    );

    loadActiveFileIntoEditor();

}


function loadActiveFileIntoEditor(){

    const textarea =
        getPreviewElement(
            "[data-preview-code]"
        );

    if(!textarea){

        return;

    }

    const file =
        getActivePreviewFile();

    if(!file){

        textarea.value =
            state.preview.artifact?.content ||
            "";

        return;

    }

    textarea.value =
        file.content ||
        "";

    state.preview.editorDirty =
        false;

    textarea.oninput =
        () => {

            state.preview.editorDirty =
                true;

        };

}


function getActivePreviewFile(){

    const artifact =
        state.preview.artifact;

    if(!artifact){

        return null;

    }

    return artifact.files?.find(
        file =>
            String(
                file.name ||
                file.path
            ) ===
            String(
                state.preview.activeFile
            )
    ) || null;

}


/*
==========================================================
SAVE LIVE EDIT
==========================================================
*/

async function savePreviewEdits(){

    const artifact =
        state.preview.artifact;

    const textarea =
        getPreviewElement(
            "[data-preview-code]"
        );

    if(
        !artifact ||
        !textarea
    ){

        return;

    }

    const newContent =
        textarea.value;

    const file =
        getActivePreviewFile();

    if(file){

        file.content =
            newContent;

    }
    else{

        artifact.content =
            newContent;

    }

    artifact.updatedAt =
        new Date().toISOString();

    state.preview.editorDirty =
        false;

    /*
        Local live update happens immediately.
        Backend persistence is attempted only when an
        artifact id is available.
    */

    await persistArtifactEdit(
        artifact
    );

    createLocalArtifactVersion(
        artifact,
        "Edição manual"
    );

    renderPreviewVersions();

    setPreviewMode(
        "preview"
    );

    showToast(
        "Alterações aplicadas ao Preview.",
        "success"
    );

}


async function persistArtifactEdit(
    artifact
){

    if(!artifact?.id){

        return;

    }

    try{

        await apiRequest(
            `/artifacts/${encodeURIComponent(
                artifact.id
            )}`,
            {

                method:
                    "PATCH",

                body:
                    JSON.stringify({

                        content:
                            artifact.content,

                        files:
                            artifact.files,

                        title:
                            artifact.title

                    })

            }
        );

    }
    catch(error){

        /*
            The local edit remains active even when the
            optional persistence endpoint is unavailable.
        */

        console.warn(
            "[HONEY CHAT] Artifact persistence unavailable:",
            error
        );

    }

}


function cancelPreviewEdits(){

    state.preview.editorDirty =
        false;

    setPreviewMode(
        "preview"
    );

}


/*
==========================================================
LIVE VISUAL EDITING
==========================================================
*/

function applyVisualEdit(
path,
value
){

    const artifact =
        state.preview.artifact;

    if(!artifact){

        return false;

    }

    const file =
        artifact.files?.find(
            item =>
                String(
                    item.path ||
                    item.name
                ) ===
                String(
                    path
                )
        );

    if(
        file &&
        typeof value ===
        "string"
    ){

        file.content =
            value;

        state.preview.editorDirty =
            true;

        renderPreviewArtifact();

        return true;

    }

    return false;

}


/*
==========================================================
PREVIEW FULLSCREEN
==========================================================
*/

function togglePreviewFullscreen(){

    if(
        state.preview.fullscreen
    ){

        exitPreviewFullscreen();

    }
    else{

        enterPreviewFullscreen();

    }

}


async function enterPreviewFullscreen(){

    const target =
        dom.previewPane ||
        getPreviewShell();

    if(!target){

        return;

    }

    try{

        if(
            target.requestFullscreen
        ){

            await target.requestFullscreen();

            state.preview.fullscreen =
                true;

        }

    }
    catch(error){

        console.warn(
            "[HONEY CHAT] Fullscreen error:",
            error
        );

        target.classList.add(
            "honey-preview-fullscreen"
        );

        state.preview.fullscreen =
            true;

    }

}


function exitPreviewFullscreen(){

    try{

        if(
            document.fullscreenElement &&
            document.exitFullscreen
        ){

            document.exitFullscreen();

        }

    }
    catch(error){

        /*
            Browser may already have exited fullscreen.
        */

    }

    dom.previewPane?.classList.remove(
        "honey-preview-fullscreen"
    );

    state.preview.fullscreen =
        false;

}


document.addEventListener(
    "fullscreenchange",
    () => {

        state.preview.fullscreen =
            Boolean(
                document.fullscreenElement
            );

    }
);


/*
==========================================================
VERSIONING
==========================================================
*/

function buildArtifactVersions(
artifact
){

    const existing =
        Array.isArray(
            artifact.versions
        )
            ? artifact.versions
            : [];

    const versions =
        existing
            .map(
                normalizeArtifactVersion
            )
            .filter(
                Boolean
            );

    if(!versions.length){

        versions.push({

            id:
                "v1",

            label:
                "v1",

            createdAt:
                artifact.createdAt ||
                new Date().toISOString(),

            description:
                "Versão inicial",

            artifact:
                cloneArtifact(
                    artifact
                )

        });

    }

    return versions.slice(
        -MAX_ARTIFACT_VERSIONS
    );

}


function normalizeArtifactVersion(
version
){

    if(
        !version ||
        typeof version !==
        "object"
    ){

        return null;

    }

    const artifact =
        normalizeArtifact(
            version.artifact ||
            version
        );

    if(!artifact){

        return null;

    }

    return {

        id:
            String(
                version.id ||
                version._id ||
                `v${Date.now()}`
            ),

        label:
            version.label ||
            version.name ||
            "Versão",

        createdAt:
            version.createdAt ||
            new Date().toISOString(),

        description:
            version.description ||
            "",

        artifact

    };

}


function getActiveArtifactVersion(){

    return state.preview.versions.find(
        version =>
            String(
                version.id
            ) ===
            String(
                state.preview.activeVersion
            )
    ) || null;

}


function createLocalArtifactVersion(
artifact,
description
){

    const nextNumber =
        state.preview.versions.length +
        1;

    const version = {

        id:
            `v${nextNumber}`,

        label:
            `v${nextNumber}`,

        createdAt:
            new Date().toISOString(),

        description:
            description ||
            "Nova versão",

        artifact:
            cloneArtifact(
                artifact
            )

    };

    state.preview.versions.push(
        version
    );

    state.preview.versions =
        state.preview.versions.slice(
            -MAX_ARTIFACT_VERSIONS
        );

    state.preview.activeVersion =
        version.id;

    return version;

}


function selectArtifactVersion(
versionId
){

    const version =
        state.preview.versions.find(
            item =>
                String(
                    item.id
                ) ===
                String(
                    versionId
                )
        );

    if(!version){

        return;

    }

    state.preview.activeVersion =
        version.id;

    renderPreviewArtifact();

}


function renderPreviewVersions(){

    const select =
        getPreviewElement(
            "[data-preview-version]"
        );

    if(!select){

        return;

    }

    select.innerHTML =
        "";

    state.preview.versions.forEach(
        version => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                version.id;

            option.textContent =
                version.label;

            if(
                version.id ===
                state.preview.activeVersion
            ){

                option.selected =
                    true;

            }

            select.appendChild(
                option
            );

        }
    );

}


async function compareArtifactVersions(){

    if(
        state.preview.versions.length <
        2
    ){

        showToast(
            "Ainda não existem versões suficientes para comparar.",
            "info"
        );

        return;

    }

    const currentIndex =
        state.preview.versions.findIndex(
            version =>
                version.id ===
                state.preview.activeVersion
        );

    const current =
        state.preview.versions[
            currentIndex
        ];

    const previous =
        state.preview.versions[
            Math.max(
                0,
                currentIndex - 1
            )
        ];

    if(
        !current ||
        !previous ||
        current === previous
    ){

        showToast(
            "Não há uma versão anterior disponível.",
            "info"
        );

        return;

    }

    renderVersionComparison(
        previous,
        current
    );

}


function renderVersionComparison(
left,
right
){

    const renderArea =
        getPreviewElement(
            "[data-preview-render-area]"
        );

    if(!renderArea){

        return;

    }

    renderArea.innerHTML = `

        <div class="honey-version-comparison">

            <div class="honey-version-column">

                <header>
                    ${escapeHTML(
                        left.label
                    )}
                </header>

                <pre></pre>

            </div>

            <div class="honey-version-column">

                <header>
                    ${escapeHTML(
                        right.label
                    )}
                </header>

                <pre></pre>

            </div>

        </div>

    `;

    const columns =
        renderArea.querySelectorAll(
            ".honey-version-column pre"
        );

    columns[0].textContent =
        getArtifactText(
            left.artifact
        );

    columns[1].textContent =
        getArtifactText(
            right.artifact
        );

}


function restoreSelectedVersion(){

    const version =
        getActiveArtifactVersion();

    if(!version){

        return;

    }

    const confirmed =
        window.confirm(
            `Restaurar ${version.label}?`
        );

    if(!confirmed){

        return;

    }

    state.preview.artifact =
        cloneArtifact(
            version.artifact
        );

    state.preview.artifactId =
        state.preview.artifact.id;

    state.preview.activeFile =
        state.preview.artifact.entryPoint ||
        state.preview.artifact.files?.[0]?.name ||
        null;

    state.preview.editorDirty =
        false;

    createLocalArtifactVersion(
        state.preview.artifact,
        `Restaurado de ${version.label}`
    );

    renderPreviewVersions();

    renderPreviewArtifact();

    showToast(
        `${version.label} restaurada.`,
        "success"
    );

}


function cloneArtifact(
artifact
){

    try{

        return JSON.parse(
            JSON.stringify(
                artifact
            )
        );

    }
    catch(error){

        return {
            ...artifact
        };

    }

}


function getArtifactText(
artifact
){

    if(
        artifact?.content
    ){

        return String(
            artifact.content
        );

    }

    if(
        artifact?.files
    ){

        return artifact.files
            .map(
                file =>
                    `--- ${file.name || file.path} ---\n${file.content || ""}`
            )
            .join(
                "\n\n"
            );

    }

    return JSON.stringify(
        artifact,
        null,
        2
    );

}


/*
==========================================================
DOWNLOAD SYSTEM
==========================================================
*/

async function downloadArtifact(
artifact
){

    if(!artifact){

        return;

    }

    /*
        Prefer an explicit backend-generated download URL.
    */

    if(
        artifact.downloadUrl ||
        artifact.fileUrl ||
        artifact.url
    ){

        const url =
            artifact.downloadUrl ||
            artifact.fileUrl ||
            artifact.url;

        triggerBrowserDownload(
            url,
            artifact.name
        );

        return;

    }

    /*
        Multiple-file projects need a backend ZIP endpoint
        when ZIP generation is not already supplied.
    */

    if(
        Array.isArray(
            artifact.files
        ) &&
        artifact.files.length >
        1
    ){

        await downloadArtifactProject(
            artifact
        );

        return;

    }

    if(
        artifact.content
    ){

        const mime =
            artifact.mime ||
            guessMimeType(
                artifact.name
            );

        const blob =
            new Blob(
                [
                    artifact.content
                ],
                {
                    type:
                        mime
                }
            );

        const url =
            URL.createObjectURL(
                blob
            );

        triggerBrowserDownload(
            url,
            artifact.name
        );

        setTimeout(
            () =>
                URL.revokeObjectURL(
                    url
                ),
            5000
        );

        return;

    }

    showToast(
        "Este artefacto ainda não possui um ficheiro disponível para download.",
        "warning"
    );

}


async function downloadArtifactProject(
artifact
){

    if(
        artifact.zipUrl
    ){

        triggerBrowserDownload(
            artifact.zipUrl,
            `${artifact.name || "honey-project"}.zip`
        );

        return;

    }

    if(!artifact.id){

        showToast(
            "Não foi possível preparar o projecto para download.",
            "warning"
        );

        return;

    }

    try{

        const response =
            await apiRequest(
                `/artifacts/${encodeURIComponent(
                    artifact.id
                )}/download`,
                {

                    method:
                        "POST",

                    body:
                        JSON.stringify({

                            format:
                                "zip"

                        })

                }
            );

        const url =
            response?.downloadUrl ||
            response?.url;

        if(!url){

            throw new Error(
                "O servidor não devolveu o URL do projecto."
            );

        }

        triggerBrowserDownload(
            url,
            `${artifact.name || "honey-project"}.zip`
        );

    }
    catch(error){

        handleApiError(
            error,
            "Não foi possível preparar o download do projecto."
        );

    }

}


function triggerBrowserDownload(
url,
filename
){

    if(!url){

        return;

    }

    const link =
        document.createElement(
            "a"
        );

    link.href =
        url;

    if(filename){

        link.download =
            filename;

    }

    link.target =
        "_blank";

    link.rel =
        "noopener noreferrer";

    document.body.appendChild(
        link
    );

    link.click();

    link.remove();

}


/*
==========================================================
MIME TYPES
==========================================================
*/

function guessMimeType(
filename
){

    const name =
        String(
            filename || ""
        ).toLowerCase();

    if(
        name.endsWith(
            ".html"
        )
    ){

        return "text/html";

    }

    if(
        name.endsWith(
            ".css"
        )
    ){

        return "text/css";

    }

    if(
        name.endsWith(
            ".js"
        )
    ){

        return "text/javascript";

    }

    if(
        name.endsWith(
            ".json"
        )
    ){

        return "application/json";

    }

    if(
        name.endsWith(
            ".csv"
        )
    ){

        return "text/csv";

    }

    if(
        name.endsWith(
            ".pdf"
        )
    ){

        return "application/pdf";

    }

    if(
        name.endsWith(
            ".png"
        )
    ){

        return "image/png";

    }

    if(
        name.endsWith(
            ".jpg" ||
            ".jpeg"
        )
    ){

        return "image/jpeg";

    }

    if(
        name.endsWith(
            ".svg"
        )
    ){

        return "image/svg+xml";

    }

    return "application/octet-stream";

}


/*
==========================================================
SHARING
==========================================================
*/

async function shareArtifactPreview(){

    const artifact =
        state.preview.artifact;

    if(!artifact){

        return;

    }

    /*
        If backend already provided a share URL,
        use it directly.
    */

    if(
        artifact.shareUrl
    ){

        await copyText(
            artifact.shareUrl
        );

        showToast(
            "Link do Preview copiado.",
            "success"
        );

        return;

    }

    if(!artifact.id){

        showToast(
            "Este artefacto ainda não possui um identificador para partilha.",
            "warning"
        );

        return;

    }

    try{

        const response =
            await apiRequest(
                PREVIEW_SHARE_ENDPOINT,
                {

                    method:
                        "POST",

                    body:
                        JSON.stringify({

                            artifactId:
                                artifact.id,

                            conversationId:
                                state.conversationId,

                            expiresIn:
                                604800

                        })

                }
            );

        const shareId =
            response?.shareId ||
            response?.id ||
            response?.previewId;

        let url =
            response?.url ||
            response?.shareUrl ||
            "";

        if(
            !url &&
            shareId
        ){

            url =
                `${window.location.origin}${PREVIEW_SHARE_PATH}/${encodeURIComponent(
                    shareId
                )}`;

        }

        if(!url){

            throw new Error(
                "O servidor não devolveu um link de partilha."
            );

        }

        state.preview.share =
            response;

        await copyText(
            url
        );

        showToast(
            "Link temporário do Preview copiado.",
            "success"
        );

    }
    catch(error){

        handleApiError(
            error,
            "Não foi possível criar o link de partilha."
        );

    }

}


/*
==========================================================
DEPLOYMENT
==========================================================
*/

async function deployArtifact(
artifact,
provider = null
){

    if(!artifact){

        return;

    }

    const selectedProvider =
        provider ||
        await chooseDeploymentProvider(
            artifact
        );

    if(!selectedProvider){

        return;

    }

    if(!artifact.id){

        showToast(
            "O artefacto ainda não possui um ID de projecto para publicação.",
            "warning"
        );

        return;

    }

    try{

        showToast(
            `A preparar publicação na ${selectedProvider}...`,
            "info"
        );

        const response =
            await apiRequest(
                PREVIEW_DEPLOY_ENDPOINT,
                {

                    method:
                        "POST",

                    body:
                        JSON.stringify({

                            artifactId:
                                artifact.id,

                            conversationId:
                                state.conversationId,

                            provider:
                                selectedProvider

                        })

                }
            );

        state.preview.deploy =
            response;

        const url =
            response?.url ||
            response?.deploymentUrl ||
            response?.publicUrl;

        if(
            response?.success &&
            url
        ){

            showDeploymentResult(
                selectedProvider,
                url
            );

            return;

        }

        if(
            response?.success ===
            false
        ){

            throw new Error(
                response?.error ||
                "A publicação não foi concluída."
            );

        }

        showToast(
            "A publicação foi iniciada. O servidor ainda não devolveu um URL público.",
            "info"
        );

    }
    catch(error){

        handleApiError(
            error,
            `Não foi possível publicar na ${selectedProvider}.`
        );

    }

}


async function chooseDeploymentProvider(
artifact
){

    const type =
        artifact.artifactType;

    if(
        type !== "website" &&
        type !== "webapp"
    ){

        showToast(
            "A publicação directa está disponível para websites e aplicações web.",
            "info"
        );

        return null;

    }

    const value =
        window.prompt(
            "Escolha a plataforma: vercel ou render",
            "vercel"
        );

    if(!value){

        return null;

    }

    const provider =
        value
            .trim()
            .toLowerCase();

    if(
        ![
            "vercel",
            "render"
        ].includes(
            provider
        )
    ){

        showToast(
            "Plataforma inválida.",
            "warning"
        );

        return null;

    }

    return provider;

}


function showDeploymentResult(
provider,
url
){

    const confirmed =
        window.confirm(
            `Publicado com sucesso na ${provider}.\n\nAbrir agora?`
        );

    if(
        confirmed &&
        url
    ){

        window.open(
            url,
            "_blank",
            "noopener,noreferrer"
        );

    }

}


/*
==========================================================
SANDBOX / TERMINAL
==========================================================
*/

function renderTerminalOutput(){

    const output =
        getPreviewElement(
            "[data-terminal-output]"
        );

    if(!output){

        return;

    }

    output.textContent =
        state.preview.execution.output ||
        (
            state.preview.execution.error
                ? String(
                    state.preview.execution.error
                )
                : "Terminal pronto."
        );

}


async function runTerminalCommand(){

    const input =
        getPreviewElement(
            "[data-terminal-input]"
        );

    if(!input){

        return;

    }

    const command =
        input.value.trim();

    if(!command){

        return;

    }

    const artifact =
        state.preview.artifact;

    if(!artifact){

        return;

    }

    const output =
        getPreviewElement(
            "[data-terminal-output]"
        );

    if(output){

        output.textContent +=
            `\n$ ${command}\n`;

    }

    input.value =
        "";

    state.preview.execution.running =
        true;

    try{

        const response =
            await apiRequest(
                PREVIEW_EXECUTE_ENDPOINT,
                {

                    method:
                        "POST",

                    body:
                        JSON.stringify({

                            artifactId:
                                artifact.id,

                            language:
                                artifact.language,

                            command,

                            conversationId:
                                state.conversationId

                        })

                }
            );

        state.preview.execution.output +=
            `\n$ ${command}\n${
                response?.output ||
                ""
            }`;

        if(
            response?.error
        ){

            state.preview.execution.error =
                response.error;

        }

        renderTerminalOutput();

    }
    catch(error){

        state.preview.execution.error =
            error?.message ||
            "Não foi possível executar o comando.";

        renderTerminalOutput();

    }
    finally{

        state.preview.execution.running =
            false;

    }

}


/*
==========================================================
PREVIEW MESSAGING
==========================================================
*/

function handlePreviewMessage(
event
){

    if(
        !event ||
        !event.data
    ){

        return;

    }

    const data =
        event.data;

    if(
        typeof data !==
        "object"
    ){

        return;

    }

    if(
        data.type ===
        "honey-preview-edit"
    ){

        applyVisualEdit(
            data.path,
            data.value
        );

    }

    if(
        data.type ===
        "honey-preview-ready"
    ){

        /*
            Preview iframe is ready.
        */

    }

}


/*
==========================================================
PREVIEW FOCUS
==========================================================
*/

function focusPreview(){

    if(!state.preview.open){

        return;

    }

    setTimeout(
        () => {

            const area =
                getPreviewElement(
                    "[data-preview-render-area]"
                );

            area?.scrollTo?.(
                {
                    top:
                        0,

                    behavior:
                        "instant"

                }
            );

        },
        20
    );

}


/*
==========================================================
TOOLS
==========================================================
*/

function renderTools(
tools
){

    if(
        !Array.isArray(tools) ||
        !tools.length ||
        !dom.chatMessages
    ){

        return;

    }

    tools.forEach(
        tool => {

            if(!tool){

                return;

            }

            const normalized = {

                ...tool,

                id:
                    tool.id ||
                    tool._id ||
                    createClientMessageId(),

                name:
                    tool.name ||
                    tool.tool ||
                    "Ferramenta",

                success:
                    tool.success !== false

            };

            const index =
                state.tools.findIndex(
                    item =>
                        String(item.id) ===
                        String(normalized.id)
                );

            if(index >= 0){

                state.tools[index] =
                    {
                        ...state.tools[index],
                        ...normalized
                    };

            }
            else{

                state.tools.push(
                    normalized
                );

            }

        }
    );

    state.tools =
        state.tools.slice(
            -MAX_VISIBLE_TOOLS
        );

    renderToolCards();

}


function renderToolCards(){

    if(!dom.chatMessages){

        return;

    }

    const wasNearBottom =
        state.userNearBottom;

    dom.chatMessages
        .querySelectorAll(
            ".chat-tool-result"
        )
        .forEach(
            element =>
                element.remove()
        );

    state.tools.forEach(
        tool => {

            const element =
                document.createElement(
                    "div"
                );

            element.className =
                "chat-tool-result";

            const icon =
                document.createElement(
                    "i"
                );

            icon.className =
                tool.success
                    ? "fa-solid fa-circle-check"
                    : "fa-solid fa-circle-exclamation";

            const text =
                document.createElement(
                    "span"
                );

            const status =
                tool.success
                    ? "Concluído"
                    : "Falhou";

            text.textContent =
                `${tool.name} · ${status}`;

            element.appendChild(
                icon
            );

            element.appendChild(
                text
            );

            dom.chatMessages.appendChild(
                element
            );

        }
    );

    state.userNearBottom =
        wasNearBottom;

    if(wasNearBottom){

        scrollChatToBottom();

    }

}


/*
==========================================================
COPY
==========================================================
*/

async function copyText(
value
){

    const text =
        String(
            value || ""
        );

    if(!text){

        return false;

    }

    try{

        await navigator.clipboard.writeText(
            text
        );

        return true;

    }
    catch(error){

        try{

            const textarea =
                document.createElement(
                    "textarea"
                );

            textarea.value =
                text;

            textarea.style.position =
                "fixed";

            textarea.style.opacity =
                "0";

            document.body.appendChild(
                textarea
            );

            textarea.select();

            document.execCommand(
                "copy"
            );

            textarea.remove();

            return true;

        }
        catch(fallbackError){

            return false;

        }

    }

}


/*
==========================================================
ERROR
==========================================================
*/

function showErrorMessage(
message
){

    const element =
        document.createElement(
            "div"
        );

    element.className =
        "chat-error-message";

    const icon =
        document.createElement(
            "i"
        );

    icon.className =
        "fa-solid fa-circle-exclamation";

    const text =
        document.createElement(
            "span"
        );

    text.textContent =
        String(
            message ||
            "Ocorreu um erro."
        );

    element.appendChild(
        icon
    );

    element.appendChild(
        text
    );

    dom.chatMessages?.appendChild(
        element
    );

    state.userNearBottom =
        true;

    scrollChatToBottom(
        true
    );

}


/*
==========================================================
INTERRUPTED ASSISTANT
==========================================================
*/

function finalizeInterruptedAssistant(
element
){

    if(!element){

        return;

    }

    renderAssistantContent(
        element,
        state.currentAssistantContent,
        {
            final:
                true
        }
    );

    setAssistantStatus(
        element,
        "Resposta interrompida."
    );

    addAssistantMessageOnce(
        state.currentAssistantContent,
        {
            interrupted:
                true
        }
    );

}


function removeStreamingAssistantIfEmpty(
element
){

    if(!element){

        return;

    }

    if(
        !state.currentAssistantContent
            .trim()
    ){

        element.remove();

    }

}


/*
==========================================================
INPUT STATE
==========================================================
*/

function setSendingState(
sending
){

    if(dom.btnSend){

        dom.btnSend.disabled =
            false;

        dom.btnSend.classList.toggle(
            "loading",
            sending
        );

        if(sending){

            dom.btnSend.innerHTML = `

                <i class="fa-solid fa-stop"></i>

            `;

            dom.btnSend.title =
                "Parar geração";

            dom.btnSend.setAttribute(
                "aria-label",
                "Parar geração"
            );

            dom.btnSend.setAttribute(
                "data-state",
                "generating"
            );

        }
        else{

            dom.btnSend.innerHTML = `

                <i class="fa-solid fa-paper-plane"></i>

            `;

            dom.btnSend.title =
                "Enviar mensagem";

            dom.btnSend.setAttribute(
                "aria-label",
                "Enviar mensagem"
            );

            dom.btnSend.setAttribute(
                "data-state",
                "idle"
            );

        }

    }

    if(dom.chatInput){

        dom.chatInput.disabled =
            sending;

    }

    if(dom.btnAttach){

        dom.btnAttach.disabled =
            sending;

    }

    if(dom.btnVoice){

        dom.btnVoice.disabled =
            sending;

    }

}


/*
==========================================================
CLEAR INPUT
==========================================================
*/

function clearInputAfterSend(){

    if(!dom.chatInput){

        removeAttachment();

        return;

    }

    dom.chatInput.value =
        "";

    dom.chatInput.style.height =
        "auto";

    removeAttachment();

    focusChatInput();

}


/*
==========================================================
VOICE INPUT
==========================================================
*/

function startVoiceInput(){

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;

    if(!SpeechRecognition){

        showToast(
            "O reconhecimento de voz não é suportado neste navegador.",
            "warning"
        );

        return;

    }

    if(state.isSending){

        return;

    }

    if(state.voiceRecognition){

        try{

            state.voiceRecognition.stop();

        }
        catch(error){

            /*
                Recognition already stopped.
            */

        }

        state.voiceRecognition =
            null;

        dom.btnVoice?.classList.remove(
            "recording"
        );

        return;

    }

    const recognition =
        new SpeechRecognition();

    state.voiceRecognition =
        recognition;

    recognition.lang =
        "pt-PT";

    recognition.interimResults =
        true;

    recognition.continuous =
        false;

    recognition.maxAlternatives =
        1;

    dom.btnVoice?.classList.add(
        "recording"
    );

    recognition.onresult =
        event => {

            let transcript =
                "";

            for(
                let index = 0;
                index <
                    event.results.length;
                index++
            ){

                transcript +=
                    event.results[
                        index
                    ][0]?.transcript ||
                    "";

            }

            transcript =
                transcript.trim();

            if(
                dom.chatInput &&
                transcript
            ){

                dom.chatInput.value =
                    transcript;

                autoResizeInput();

            }

        };

    recognition.onerror =
        error => {

            console.warn(
                "[HONEY CHAT] Voice error:",
                error
            );

            if(
                error?.error !==
                "aborted"
            ){

                showToast(
                    "Não foi possível utilizar a entrada de voz.",
                    "error"
                );

            }

        };

    recognition.onend =
        () => {

            dom.btnVoice?.classList.remove(
                "recording"
            );

            state.voiceRecognition =
                null;

            focusChatInput();

        };

    try{

        recognition.start();

    }
    catch(error){

        dom.btnVoice?.classList.remove(
            "recording"
        );

        state.voiceRecognition =
            null;

    }

}


/*
==========================================================
ATTACHMENTS
==========================================================
*/

function setupAttachmentControls(){

    dom.btnAttach?.addEventListener(
        "click",
        () => {

            if(state.isSending){

                return;

            }

            dom.fileInput?.click();

        }
    );

    dom.fileInput?.addEventListener(
        "change",
        handleFileSelection
    );

    dom.btnRemoveAttachment?.addEventListener(
        "click",
        removeAttachment
    );

}


async function handleFileSelection(
event
){

    const file =
        event.target.files?.[0];

    if(!file){

        return;

    }

    if(
        file.size >
        MAX_FILE_SIZE
    ){

        showToast(
            "O ficheiro ultrapassa o limite permitido.",
            "error"
        );

        removeAttachment();

        return;

    }

    state.selectedFile =
        file;

    state.selectedFileSupported =
        isSupportedTextFile(
            file.name
        );

    if(
        state.selectedFileSupported
    ){

        try{

            state.selectedFileContent =
                await file.text();

        }
        catch(error){

            state.selectedFileContent =
                "";

            state.selectedFileSupported =
                false;

        }

    }
    else{

        state.selectedFileContent =
            "";

    }

    if(dom.attachmentBar){

        dom.attachmentBar.style.display =
            "";

    }

    if(dom.attachedFileName){

        dom.attachedFileName.textContent =
            file.name;

    }

}


function isSupportedTextFile(
filename
){

    const extension =
        String(
            filename || ""
        )
        .toLowerCase()
        .split(
            "."
        )
        .pop();

    return SUPPORTED_TEXT_EXTENSIONS.includes(
        extension
    );

}


function buildPromptWithFileContext(
prompt
){

    const file =
        state.selectedFile;

    if(
        !file ||
        !state.selectedFileContent
    ){

        return prompt;

    }

    return `

${prompt}

CONTEXTO DO FICHEIRO ANEXADO
Nome: ${file.name}
Tipo: ${file.type || "desconhecido"}

Conteúdo:

\`\`\`
${state.selectedFileContent}
\`\`\`

Utiliza este ficheiro como contexto para responder ao pedido.

`.trim();

}


function removeAttachment(){

    state.selectedFile =
        null;

    state.selectedFileContent =
        "";

    state.selectedFileSupported =
        false;

    if(dom.fileInput){

        dom.fileInput.value =
            "";

    }

    if(dom.attachmentBar){

        dom.attachmentBar.style.display =
            "none";

    }

    if(dom.attachedFileName){

        dom.attachedFileName.textContent =
            "";

    }

}


/*
==========================================================
SEARCH
==========================================================
*/

function setupSearch(){

    if(!dom.globalSearch){

        return;

    }

    dom.globalSearch.addEventListener(
        "input",
        event => {

            state.searchQuery =
                String(
                    event.target.value ||
                    ""
                ).trim()
                .toLowerCase();

            renderHistory();

        }
    );

}


function getFilteredConversations(){

    if(
        !state.searchQuery
    ){

        return state.conversations;

    }

    return state.conversations.filter(
        conversation => {

            const title =
                String(
                    conversation?.title ||
                    ""
                ).toLowerCase();

            return title.includes(
                state.searchQuery
            );

        }
    );

}


/*
==========================================================
HISTORY
==========================================================
*/

function renderHistory(
conversations
){

    if(!dom.historyContainer){

        return;

    }

    const source =
        Array.isArray(
            conversations
        )
            ? conversations
            : getFilteredConversations();

    if(
        !Array.isArray(
            source
        ) ||
        !source.length
    ){

        dom.historyContainer.innerHTML = `

            <div class="empty-state">

                <div class="empty-icon">

                    <i class="fa-solid fa-comments"></i>

                </div>

                <h3>
                    O seu histórico aparecerá aqui
                </h3>

                <p>
                    As suas conversas serão guardadas automaticamente pela Honey IA.
                </p>

            </div>

        `;

        return;

    }

    const wrapper =
        document.createElement(
            "div"
        );

    wrapper.className =
        "conversation-history-list";

    source.forEach(
        conversation => {

            const id =
                getConversationId(
                    conversation
                );

            if(!id){

                return;

            }

            const item =
                document.createElement(
                    "article"
                );

            item.className =
                "conversation-history-item";

            if(
                id ===
                state.conversationId
            ){

                item.classList.add(
                    "active"
                );

            }

            const content =
                document.createElement(
                    "div"
                );

            content.className =
                "conversation-history-content";

            const title =
                document.createElement(
                    "h3"
                );

            title.textContent =
                conversation.title ||
                "Nova Conversa";

            const meta =
                document.createElement(
                    "span"
                );

            meta.textContent =
                formatConversationDate(
                    conversation.updatedAt ||
                    conversation.createdAt
                );

            content.appendChild(
                title
            );

            content.appendChild(
                meta
            );

            const actions =
                document.createElement(
                    "div"
                );

            actions.className =
                "conversation-history-actions";

            const openButton =
                document.createElement(
                    "button"
                );

            openButton.type =
                "button";

            openButton.title =
                "Abrir conversa";

            openButton.setAttribute(
                "aria-label",
                "Abrir conversa"
            );

            openButton.innerHTML =
                `<i class="fa-solid fa-arrow-right"></i>`;

            openButton.addEventListener(
                "click",
                event => {

                    event.stopPropagation();

                    openConversation(
                        id
                    );

                }
            );

            const deleteButton =
                document.createElement(
                    "button"
                );

            deleteButton.type =
                "button";

            deleteButton.title =
                "Eliminar conversa";

            deleteButton.setAttribute(
                "aria-label",
                "Eliminar conversa"
            );

            deleteButton.innerHTML =
                `<i class="fa-solid fa-trash"></i>`;

            deleteButton.addEventListener(
                "click",
                async event => {

                    event.stopPropagation();

                    await deleteConversation(
                        id
                    );

                }
            );

            actions.appendChild(
                openButton
            );

            actions.appendChild(
                deleteButton
            );

            item.appendChild(
                content
            );

            item.appendChild(
                actions
            );

            item.addEventListener(
                "click",
                () => {

                    openConversation(
                        id
                    );

                }
            );

            wrapper.appendChild(
                item
            );

        }
    );

    dom.historyContainer.innerHTML =
        "";

    dom.historyContainer.appendChild(
        wrapper
    );

}


/*
==========================================================
HISTORY DATE
==========================================================
*/

function formatConversationDate(
value
){

    if(!value){

        return "";

    }

    const date =
        new Date(
            value
        );

    if(
        Number.isNaN(
            date.getTime()
        )
    ){

        return "";

    }

    return date.toLocaleString(
        "pt-PT",
        {

            day:
                "2-digit",

            month:
                "2-digit",

            year:
                "numeric",

            hour:
                "2-digit",

            minute:
                "2-digit"

        }
    );

}


/*
==========================================================
DELETE CONVERSATION
==========================================================
*/

async function deleteConversation(
conversationId
){

    if(!conversationId){

        return;

    }

    const confirmed =
        window.confirm(
            "Tem a certeza de que deseja eliminar esta conversa? Esta ação não pode ser desfeita."
        );

    if(!confirmed){

        return;

    }

    if(
        state.isSending &&
        String(
            state.conversationId
        ) ===
        String(
            conversationId
        )
    ){

        abortCurrentGeneration(
            true
        );

        state.isSending =
            false;

        state.isLive =
            false;

        setSendingState(
            false
        );

    }

    try{

        await apiRequest(
            `/conversations/${encodeURIComponent(
                conversationId
            )}`,
            {

                method:
                    "DELETE"

            }
        );

        state.conversations =
            state.conversations.filter(
                conversation =>
                    getConversationId(
                        conversation
                    ) !==
                    conversationId
            );

        if(
            state.conversationId ===
            conversationId
        ){

            state.conversationId =
                null;

            state.conversation =
                null;

            resetConversationState();

            clearChatMessages();

            await ensureInitialConversation();

        }

        renderHistory();

        showToast(
            "Conversa eliminada.",
            "success"
        );

    }
    catch(error){

        handleApiError(
            error,
            "Não foi possível eliminar a conversa."
        );

    }

}


/*
==========================================================
USER PROFILE
==========================================================
*/

async function loadUserProfile(){

    const userBox =
        dom.userBox;

    if(!userBox){

        return;

    }

    try{

        const token =
            getAuthToken();

        if(!token){

            return;

        }

        const response =
            await fetch(
                "/api/auth/me",
                {

                    headers: {

                        Authorization:
                            `Bearer ${token}`,

                        Accept:
                            "application/json"

                    },

                    credentials:
                        "include"

                }
            );

        if(
            response.status ===
            401
        ){

            redirectToLogin();

            return;

        }

        if(!response.ok){

            return;

        }

        const data =
            await response.json();

        const user =
            data?.user ||
            data?.data?.user ||
            data?.data ||
            null;

        if(!user){

            return;

        }

        const firstName =
            user.firstName ||
            user.name ||
            user.fullName ||
            "Utilizador";

        const lastName =
            user.lastName ||
            "";

        const fullName =
            `${firstName} ${lastName}`
                .trim();

        const avatar =
            user.avatar ||
            user.picture ||
            null;

        const plan =
            user.planName ||
            user.plan ||
            "Plano Gratuito";

        const strong =
            userBox.querySelector(
                "strong"
            );

        const small =
            userBox.querySelector(
                "small"
            );

        const avatarElement =
            userBox.querySelector(
                ".avatar"
            );

        if(strong){

            strong.textContent =
                fullName;

        }

        if(small){

            small.textContent =
                plan;

        }

        if(avatarElement){

            if(avatar){

                avatarElement.innerHTML =
                    "";

                const image =
                    document.createElement(
                        "img"
                    );

                image.src =
                    String(
                        avatar
                    );

                image.alt =
                    "";

                image.referrerPolicy =
                    "no-referrer";

                avatarElement.appendChild(
                    image
                );

            }
            else{

                avatarElement.textContent =
                    fullName
                        .charAt(0)
                        .toUpperCase();

            }

        }

        if(dom.planBadge){

            const strongPlan =
                dom.planBadge.querySelector(
                    "strong"
                );

            if(strongPlan){

                strongPlan.textContent =
                    plan;

            }

        }

    }
    catch(error){

        console.warn(
            "[HONEY CHAT] Profile load error:",
            error
        );

    }

}


/*
==========================================================
BUTTON FACTORY
==========================================================
*/

function createButton(
label,
iconClass
){

    const button =
        document.createElement(
            "button"
        );

    button.type =
        "button";

    if(iconClass){

        const icon =
            document.createElement(
                "i"
            );

        icon.className =
            iconClass;

        button.appendChild(
            icon
        );

    }

    const text =
        document.createElement(
            "span"
        );

    text.textContent =
        label;

    button.appendChild(
        text
    );

    return button;

}


/*
==========================================================
TOAST
==========================================================
*/

function showToast(
message,
type = "info"
){

    if(!dom.toastContainer){

        return;

    }

    const toast =
        document.createElement(
            "div"
        );

    toast.className =
        `toast toast-${type}`;

    const iconMap = {

        success:
            "fa-circle-check",

        error:
            "fa-circle-exclamation",

        warning:
            "fa-triangle-exclamation",

        info:
            "fa-circle-info"

    };

    const icon =
        document.createElement(
            "i"
        );

    icon.className =
        `fa-solid ${
            iconMap[type] ||
            iconMap.info
        }`;

    const text =
        document.createElement(
            "span"
        );

    text.textContent =
        String(
            message || ""
        );

    toast.appendChild(
        icon
    );

    toast.appendChild(
        text
    );

    dom.toastContainer.appendChild(
        toast
    );

    requestAnimationFrame(
        () => {

            toast.classList.add(
                "show"
            );

        }
    );

    setTimeout(
        () => {

            toast.classList.remove(
                "show"
            );

            setTimeout(
                () => {

                    toast.remove();

                },
                250
            );

        },
        4000
    );

}


/*
==========================================================
API ERROR HANDLING
==========================================================
*/

function handleApiError(
error,
fallback
){

    console.error(
        "[HONEY CHAT API ERROR]",
        error
    );

    if(
        error?.name ===
        "AbortError"
    ){

        return;

    }

    if(
        error?.status ===
        401
    ){

        redirectToLogin();

        return;

    }

    showToast(
        error?.message ||
        fallback ||
        "Ocorreu um erro.",
        "error"
    );

}


/*
==========================================================
PUBLIC API
==========================================================
*/

window.HoneyChat = {

    getState(){

        return {

            conversationId:
                state.conversationId,

            conversation:
                state.conversation,

            messages:
                [...state.messages],

            mode:
                state.currentMode,

            agentId:
                state.agentId,

            workspace:
                state.workspace,

            isSending:
                state.isSending,

            authenticated:
                state.authenticated,

            artifacts:
                [...state.artifacts],

            tools:
                [...state.tools],

            generationStatus:
                state.generationStatus,

            userNearBottom:
                state.userNearBottom,

            preview:
                {

                    open:
                        state.preview.open,

                    artifactId:
                        state.preview.artifactId,

                    artifactType:
                        state.preview.artifactType,

                    activeFile:
                        state.preview.activeFile,

                    activeVersion:
                        state.preview.activeVersion,

                    mode:
                        state.preview.mode,

                    fullscreen:
                        state.preview.fullscreen,

                    editorDirty:
                        state.preview.editorDirty

                }

        };

    },


    async newConversation(){

        return createNewConversation();

    },


    async openConversation(
        conversationId
    ){

        return openConversation(
            conversationId
        );

    },


    async refresh(){

        await loadConversations();

        if(state.conversationId){

            await refreshCurrentConversation();

        }

    },


    async send(
        prompt
    ){

        const normalized =
            typeof prompt ===
                "string"
                ? prompt.trim()
                : "";

        if(!normalized){

            return;

        }

        if(
            normalized.length >
            MAX_MESSAGE_LENGTH
        ){

            showToast(
                "A mensagem é demasiado longa.",
                "error"
            );

            return;

        }

        return sendMessage(
            normalized,
            normalized
        );

    },


    stop(){

        stopGeneration();

    },


    setMode(
        mode
    ){

        setChatMode(
            mode
        );

    },


    closePreview(){

        closeArtifactPreview();

    },


    openPreview(
        artifact
    ){

        openArtifactPreview(
            artifact
        );

    },


    editPreview(){

        setPreviewMode(
            "edit"
        );

    },


    fullscreenPreview(){

        togglePreviewFullscreen();

    },


    downloadPreview(){

        if(
            state.preview.artifact
        ){

            return downloadArtifact(
                state.preview.artifact
            );

        }

    },


    sharePreview(){

        return shareArtifactPreview();

    },


    deployPreview(
        provider
    ){

        return deployArtifact(
            state.preview.artifact,
            provider
        );

    },


    focus(){

        focusChatInput();

    },


    getConversationId(){

        return state.conversationId;

    }

};


/*
==========================================================
DIAGNOSTICS
==========================================================
*/

console.info(
    "[HONEY IA] Chat Engine V6.0 initialized."
);

console.info(
    "[HONEY IA] Persistent conversation history enabled."
);

console.info(
    "[HONEY IA] Artificial history age/quantity limits disabled."
);

console.info(
    "[HONEY IA] Groq + Gemini orchestration compatible."
);

console.info(
    "[HONEY IA] Live / SSE / Stop Generation enabled."
);

console.info(
    "[HONEY IA] User-controlled scroll enabled."
);

console.info(
    "[HONEY IA] Buffered streaming rendering enabled."
);

console.info(
    "[HONEY IA] Generation isolation enabled."
);

console.info(
    "[HONEY IA] Universal Artifact Preview enabled."
);

console.info(
    "[HONEY IA] Live Artifact Editing enabled."
);

console.info(
    "[HONEY IA] Artifact Versioning enabled."
);

console.info(
    "[HONEY IA] Fullscreen Preview enabled."
);

console.info(
    "[HONEY IA] Download / Share / Deploy hooks enabled."
);

console.info(
    "[HONEY IA] Secure Sandbox execution hooks enabled."
);
