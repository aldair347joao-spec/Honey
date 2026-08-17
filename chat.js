import authmanager from "./auth.js";

/*
==========================================================
HONEY IA OS
CHAT ENGINE
V4.1
PRODUCTION AI STUDIO CHAT ENGINE

- JWT Authentication
- Persistent MongoDB Conversations
- Unlimited Persistent Conversation History
- Smart Backend Context Management
- Groq + Gemini Compatible Backend
- Markdown Rendering
- Code Highlighting
- SSE Streaming
- Abort / Stop Generation
- File Context
- Artifacts
- Artifact Preview
- Tool Activity
- Voice Input
- User Profile
- Subscription Awareness
- Search
- Conversation Management
- Responsive Workspace
- Secure HTML Rendering
- Production Error Handling

UI BEHAVIOR V4.1
----------------------------------------------------------
- No bee avatar during assistant responses
- No response latency display
- No message timestamps
- No connection status text
- No "preparing response" text
- No "thinking" text
- Clean streaming interface
==========================================================
*/


/*
==========================================================
CONFIGURATION
==========================================================
*/

let API_BASE = "/api/chat";

const AUTH_TOKEN_KEY = "honey_token";

const DEFAULT_AGENT = "general";

const DEFAULT_MODE = "chat";

const MAX_MESSAGE_LENGTH = 50000;

const MAX_FILE_SIZE = 1024 * 1024;

const SSE_BUFFER_LIMIT = 1024 * 1024;

const MAX_VISIBLE_ARTIFACTS = 100;

const MAX_VISIBLE_TOOLS = 100;


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

    "csv",

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

    "java",

    "c",

    "cpp",

    "h",

    "hpp",

    "sql",

    "sh",

    "bash",

    "yaml",

    "yml",

    "ini",

    "conf",

    "env",

    "log"

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
        false

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

async function initializeChat(options = {}){

    if(state.initialized){

        return;

    }

    state.initialized = true;

    if(options.apiBase){

        API_BASE =
            String(
                options.apiBase
            );

    }

    if(options.agentId){

        state.agentId =
            String(
                options.agentId
            );

    }

    if(options.workspace){

        state.workspace =
            String(
                options.workspace
            );

    }

    await authmanager.waitUntilReady();

    cacheDOM();

    if(!dom.chatSection){

        console.warn(
            "[HONEY CHAT] Chat section not found."
        );

        return;

    }

    if(!options.managedByApp){

        setupNavigation();

    }

    setupChatControls();

    setupSuggestions();

    setupAttachmentControls();

    setupSearch();

    setupPreview();

    setupModeSwitch();

    setupGlobalKeyboardShortcuts();

    await initializeAuthenticatedChat();

}


/*
==========================================================
CACHE DOM
==========================================================
*/

function cacheDOM(){

    dom.chatSection =
        document.getElementById(
            "chat"
        );

    dom.chatMessages =
        document.getElementById(
            "chatMessages"
        );

    dom.chatWelcome =
        document.getElementById(
            "chatWelcome"
        );

    dom.chatInput =
        document.getElementById(
            "chatInput"
        );

    dom.chatInputArea =
        document.getElementById(
            "chatInputArea"
        );

    dom.btnSend =
        document.getElementById(
            "btnSend"
        );

    dom.btnVoice =
        document.getElementById(
            "btnVoice"
        );

    dom.btnAttach =
        document.getElementById(
            "btnAttach"
        );

    dom.fileInput =
        document.getElementById(
            "chatFileInput"
        ) ||
        document.getElementById(
            "fileInput"
        );

    dom.fileName =
        document.getElementById(
            "chatFileName"
        );

    dom.fileRemove =
        document.getElementById(
            "chatFileRemove"
        );

    dom.btnNewChat =
        document.getElementById(
            "btnNewChat"
        );

    dom.btnNewConversation =
        document.getElementById(
            "btnNewConversation"
        );

    dom.btnChatMode =
        document.getElementById(
            "btnChatMode"
        );

    dom.btnLiveMode =
        document.getElementById(
            "btnLiveMode"
        );

    dom.chatContext =
        document.getElementById(
            "chatContext"
        );

    dom.chatTitle =
        document.getElementById(
            "chatTitle"
        );

    dom.chatAgent =
        document.getElementById(
            "chatAgent"
        );

    dom.chatStatus =
        document.getElementById(
            "chatStatus"
        );

    dom.historyList =
        document.getElementById(
            "historyList"
        );

    dom.previewPane =
        document.getElementById(
            "previewPane"
        );

    dom.previewIframe =
        document.getElementById(
            "live-preview-iframe"
        ) ||
        document.getElementById(
            "previewIframe"
        );

    dom.searchInput =
        document.getElementById(
            "chatSearch"
        );

}


/*
==========================================================
AUTHENTICATED CHAT INITIALIZATION
==========================================================
*/

async function initializeAuthenticatedChat(){

    try{

        const authenticated =
            await checkAuthentication();

        state.authenticated =
            authenticated;

        if(!authenticated){

            redirectToLogin();

            return;

        }

        await loadConversations();

        await ensureInitialConversation();

        updateAuthenticationUI();

    }
    catch(error){

        console.error(
            "[HONEY CHAT] Initialization error:",
            error
        );

        handleApiError(
            error,
            "Não foi possível inicializar o Chat IA."
        );

    }

}


/*
==========================================================
AUTHENTICATION
==========================================================
*/

async function checkAuthentication(){

    try{

        if(
            typeof authmanager?.isAuthenticated ===
            "function"
        ){

            return Boolean(
                authmanager.isAuthenticated()
            );

        }

        const token =
            localStorage.getItem(
                AUTH_TOKEN_KEY
            );

        return Boolean(token);

    }
    catch(error){

        console.warn(
            "[HONEY CHAT] Authentication check failed:",
            error
        );

        return false;

    }

}


function getAuthToken(){

    try{

        if(
            typeof authmanager?.getToken ===
            "function"
        ){

            const token =
                authmanager.getToken();

            if(token){

                return token;

            }

        }

    }
    catch(error){

        console.warn(
            "[HONEY CHAT] Could not read auth manager token:",
            error
        );

    }

    try{

        return localStorage.getItem(
            AUTH_TOKEN_KEY
        );

    }
    catch(error){

        return null;

    }

}


function redirectToLogin(){

    try{

        if(
            typeof authmanager?.logout ===
            "function"
        ){

            authmanager.logout();

        }

    }
    catch(error){

        console.warn(
            "[HONEY CHAT] Logout redirect error:",
            error
        );

    }

    if(
        window.location.pathname !==
        "/login.html"
    ){

        window.location.href =
            "/login.html";

    }

}


/*
==========================================================
API REQUEST
==========================================================
*/

async function apiRequest(
    endpoint,
    options = {}
){

    const token =
        getAuthToken();

    const headers = {

        "Content-Type":
            "application/json",

        ...(options.headers || {})

    };

    if(token){

        headers.Authorization =
            `Bearer ${token}`;

    }

    const response =
        await fetch(
            `${API_BASE}${endpoint}`,
            {
                ...options,
                headers
            }
        );

    if(response.status === 401){

        state.authenticated =
            false;

        const error =
            new Error(
                "Sessão expirada."
            );

        error.status =
            401;

        throw error;

    }

    if(!response.ok){

        let errorMessage =
            `Erro HTTP ${response.status}.`;

        try{

            const data =
                await response.json();

            errorMessage =
                data?.error ||
                data?.message ||
                errorMessage;

        }
        catch(error){

            /*
            Corpo de erro inválido ou inexistente.
            */

        }

        const error =
            new Error(
                errorMessage
            );

        error.status =
            response.status;

        throw error;

    }

    const contentType =
        response.headers.get(
            "content-type"
        ) || "";

    if(
        contentType.includes(
            "application/json"
        )
    ){

        return response.json();

    }

    const text =
        await response.text();

    try{

        return JSON.parse(
            text
        );

    }
    catch(error){

        return {
            text
        };

    }

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
        sendCurrentMessage
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

    /*
    IMPORTANTE:

    Não existe limite artificial de quantidade,
    idade ou tempo neste frontend.

    O backend decide como recuperar e contextualizar
    o histórico persistente.
    */

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
CREATE CONVERSATION
==========================================================
*/

async function createNewConversation(
    notify = true
){

    if(state.isSending){

        return null;

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


/*
==========================================================
RESET CONVERSATION STATE
==========================================================
*/

function resetConversationState(){

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
        String(
            conversationId
        ) !==
        String(
            state.conversationId
        )
    ){

        showToast(
            "Aguarde a resposta atual terminar.",
            "warning"
        );

        return null;

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
            [];

        state.tools =
            [];

        clearChatMessages();

        renderMessages(
            state.messages
        );

        updateConversationHeader(
            state.conversation
        );

        removeAttachment();

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

    let prompt =
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

    if(
        state.selectedFileSupported &&
        state.selectedFileContent
    ){

        prompt =
            buildPromptWithFileContext(
                prompt
            );

    }

    if(
        prompt.length >
        MAX_MESSAGE_LENGTH
    ){

        showToast(
            "A mensagem com o anexo ultrapassa o limite permitido.",
            "error"
        );

        return;

    }

    await sendMessage(
        prompt
    );

}


/*
==========================================================
SEND MESSAGE
==========================================================
*/

async function sendMessage(
    prompt
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

    state.isSending =
        true;

    state.generationStartedAt =
        Date.now();

    state.generationCancelled =
        false;

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
            prompt,

        createdAt:
            new Date().toISOString()

    };

    state.messages.push(
        userMessage
    );

    appendMessage(
        userMessage
    );

    scrollChatToBottom();

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
                assistantElement
            );

        }
        else{

            await sendStandardMessage(
                prompt,
                assistantElement
            );

        }

    }
    catch(error){

        console.error(
            "[HONEY CHAT] Send error:",
            error
        );

        removeStreamingAssistantIfEmpty(
            assistantElement
        );

        if(
            !state.generationCancelled
        ){

            showErrorMessage(
                error?.message ||
                "Não foi possível processar a mensagem."
            );

        }

        if(error?.status === 401){

            redirectToLogin();

        }

    }
    finally{

        state.isSending =
            false;

        state.isLive =
            false;

        state.liveAbortController =
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

        scrollChatToBottom();

    }

}


/*
==========================================================
STANDARD CHAT
==========================================================
*/

async function sendStandardMessage(
    prompt,
    assistantElement
){

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
            state.currentMode

    };

    const controller =
        new AbortController();

    state.liveAbortController =
        controller;

    const token =
        getAuthToken();

    const headers = {

        "Content-Type":
            "application/json",

        "Accept":
            "text/event-stream"

    };

    if(token){

        headers.Authorization =
            `Bearer ${token}`;

    }

    const response =
        await fetch(
            API_BASE,
            {

                method:
                    "POST",

                headers,

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

        let errorMessage =
            `Erro HTTP ${response.status}.`;

        try{

            const errorData =
                await response.json();

            errorMessage =
                errorData?.error ||
                errorData?.message ||
                errorMessage;

        }
        catch(error){

            /*
            Corpo de erro inválido.
            */

        }

        const error =
            new Error(
                errorMessage
            );

        error.status =
            response.status;

        throw error;

    }

    if(!response.body){

        throw new Error(
            "O servidor não disponibilizou o stream da Honey IA."
        );

    }

    await consumeSSEStream(
        response.body,
        assistantElement
    );

}


/*
==========================================================
STOP GENERATION
==========================================================
*/

function stopGeneration(){

    if(!state.isSending){

        return;

    }

    state.generationCancelled =
        true;

    if(
        state.liveAbortController
    ){

        try{

            state.liveAbortController.abort();

        }
        catch(error){

            console.warn(
                "[HONEY CHAT] Abort error:",
                error
            );

        }

    }

    const element =
        state.currentAssistantElement;

    if(
        element &&
        state.currentAssistantContent.trim()
    ){

        addAssistantMessageOnce(
            state.currentAssistantContent,
            {
                interrupted:
                    true
            }
        );

        setAssistantStatus(
            element,
            "Resposta interrompida."
        );

    }

    setSendingState(
        false
    );

    showToast(
        "Geração interrompida.",
        "info"
    );

}


/*
==========================================================
SSE STREAM
==========================================================
*/

async function consumeSSEStream(
    body,
    assistantElement
){

    const reader =
        body.getReader();

    const decoder =
        new TextDecoder(
            "utf-8"
        );

    let buffer =
        "";

    let streamFinished =
        false;

    try{

        while(!streamFinished){

            const {
                value,
                done
            } =
                await reader.read();

            if(done){

                break;

            }

            buffer +=
                decoder.decode(
                    value,
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
                    "O stream da Honey IA excedeu o limite permitido."
                );

            }

            const events =
                buffer.split(
                    /\r?\n\r?\n/
                );

            buffer =
                events.pop() || "";

            for(
                const event
                of events
            ){

                const finished =
                    processSSEEvent(
                        event,
                        assistantElement
                    );

                if(finished){

                    streamFinished =
                        true;

                    break;

                }

            }

        }

        buffer +=
            decoder.decode();

        if(
            !streamFinished &&
            buffer.trim()
        ){

            processSSEEvent(
                buffer,
                assistantElement
            );

        }

        if(
            !state.generationCancelled &&
            !state.currentAssistantContent.trim()
        ){

            throw new Error(
                "A Honey IA encerrou o stream sem devolver conteúdo."
            );

        }

    }
    finally{

        try{

            reader.releaseLock();

        }
        catch(error){

            /*
            Reader já libertado.
            */

        }

    }

}


/*
==========================================================
PROCESS SSE EVENT
==========================================================
*/

function processSSEEvent(
    rawEvent,
    assistantElement
){

    if(
        typeof rawEvent !==
        "string" ||
        !rawEvent.trim()
    ){

        return false;

    }

    const lines =
        rawEvent.split(
            /\r?\n/
        );

    const dataLines = [];

    for(
        const line
        of lines
    ){

        if(
            line.startsWith(
                "data:"
            )
        ){

            dataLines.push(
                line
                    .slice(5)
                    .trim()
            );

        }

    }

    if(!dataLines.length){

        return false;

    }

    const rawData =
        dataLines.join(
            "\n"
        );

    if(
        rawData ===
        "[DONE]"
    ){

        finalizeStreamingAssistant(
            assistantElement
        );

        return true;

    }

    let payload;

    try{

        payload =
            JSON.parse(
                rawData
            );

    }
    catch(error){

        console.warn(
            "[HONEY CHAT] Invalid SSE payload."
        );

        return false;

    }

    /*
    ======================================================
    UI BEHAVIOR V4.1

    A Honey IA recebe normalmente eventos de conexão,
    estado e processamento enviados pelo backend.

    Esses eventos NÃO são apresentados ao utilizador.

    Não mostrar:
    - A se conectar
    - A preparar a resposta
    - A pensar
    - estados internos do modelo

    O utilizador vê diretamente a resposta à medida
    que ela é produzida.
    ======================================================
    */

    if(
        typeof payload?.text ===
        "string" &&
        payload.text
    ){

        state.currentAssistantContent +=
            payload.text;

        renderAssistantContent(
            assistantElement,
            state.currentAssistantContent
        );

        setAssistantStatus(
            assistantElement,
            ""
        );

        scrollChatToBottom();

    }

    if(
        typeof payload?.delta ===
        "string" &&
        payload.delta
    ){

        state.currentAssistantContent +=
            payload.delta;

        renderAssistantContent(
            assistantElement,
            state.currentAssistantContent
        );

        scrollChatToBottom();

    }

    if(
        typeof payload?.response ===
        "string" &&
        payload.response &&
        !state.currentAssistantContent
    ){

        state.currentAssistantContent =
            payload.response;

        renderAssistantContent(
            assistantElement,
            state.currentAssistantContent
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
        payload?.artifact
    ){

        renderArtifacts([
            payload.artifact
        ]);

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

    if(
        payload?.tool
    ){

        renderTools([
            payload.tool
        ]);

    }

    if(payload?.error){

        const error =
            new Error(
                payload.error
            );

        error.streamError =
            true;

        throw error;

    }

    if(payload?.conversationId){

        state.conversationId =
            String(
                payload.conversationId
            );

    }

    if(payload?.agent){

        state.agentId =
            typeof payload.agent ===
            "string"
                ? payload.agent
                : (
                    payload.agent.id ||
                    payload.agent._id ||
                    state.agentId
                );

    }

    if(payload?.conversation){

        synchronizeConversation(
            payload.conversation
        );

    }

    if(
        payload?.done === true
    ){

        const response =
            payload.response ||
            state.currentAssistantContent;

        if(response){

            state.currentAssistantContent =
                response;

            renderAssistantContent(
                assistantElement,
                response
            );

            addAssistantMessageOnce(
                response,
                payload
            );

        }

        /*
        A latência, modelo e outros dados técnicos
        não são mostrados durante ou depois da resposta.
        */

        setAssistantStatus(
            assistantElement,
            ""
        );

        updateConversationInList(
            payload.conversation
        );

        renderHistory();

        return true;

    }

    return false;

}


/*
==========================================================
FINALIZE STREAM
==========================================================
*/

function finalizeStreamingAssistant(
    assistantElement
){

    if(
        state.currentAssistantContent.trim()
    ){

        renderAssistantContent(
            assistantElement,
            state.currentAssistantContent
        );

        addAssistantMessageOnce(
            state.currentAssistantContent,
            {}
        );

    }

    setAssistantStatus(
        assistantElement,
        ""
    );

    renderHistory();

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

        return;

    }

    const message = {

        id:
            state.currentAssistantMessageId ||
            createClientMessageId(),

        role:
            "assistant",

        content:
            normalized,

        createdAt:
            new Date().toISOString(),

        ...metadata

    };

    state.messages.push(
        message
    );

}


/*
==========================================================
ASSISTANT MESSAGE RENDERING
==========================================================
*/

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

    /*
    ======================================================
    AVATAR

    O utilizador continua com o indicador "U".

    A Honey IA NÃO recebe mais o emoji 🐝 nas respostas.
    ======================================================
    */

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

    if(role === "user"){

        avatar.textContent =
            "U";

    }

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

    /*
    Não são adicionados timestamps ao corpo
    das mensagens.
    */

    if(role === "user"){

        wrapper.appendChild(
            avatar
        );

    }

    wrapper.appendChild(
        body
    );

    dom.chatMessages.appendChild(
        wrapper
    );

    if(scroll){

        scrollChatToBottom();

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

    /*
    Indicador visual discreto de streaming.
    Não existe abelha nem texto de estado.
    */

    content.innerHTML = `
        <div class="chat-thinking"
             aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
        </div>
    `;

    body.appendChild(
        content
    );

    wrapper.appendChild(
        body
    );

    dom.chatMessages.appendChild(
        wrapper
    );

    scrollChatToBottom();

    return wrapper;

}


/*
==========================================================
ASSISTANT CONTENT
==========================================================
*/

function renderAssistantContent(
    element,
    content
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
            <div class="chat-thinking"
                 aria-hidden="true">
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

    highlightCode(
        contentElement
    );

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

    /*
    ======================================================
    HONEY IA V4.1

    Nenhum estado textual de geração é mostrado.

    Esta função permanece para manter compatibilidade
    com o restante do motor, mas apenas remove qualquer
    elemento de status que possa ter sido criado por uma
    versão anterior do chat.js.
    ======================================================
    */

    element
        .querySelector(
            ".assistant-status"
        )
        ?.remove();

}


/*
==========================================================
RESPONSE METADATA
==========================================================
*/

function renderResponseMetadata(
    element,
    result
){

    if(
        !element ||
        !result
    ){

        return;

    }

    const metadata = [];

    if(result.agent){

        const agentName =
            typeof result.agent ===
                "string"
                ? result.agent
                : (
                    result.agent.name ||
                    result.agent.id ||
                    result.agent._id ||
                    ""
                );

        if(agentName){

            metadata.push(
                agentName
            );

        }

    }

    /*
    ======================================================
    LATENCY REMOVIDA

    O valor "xxx ms" não é apresentado ao utilizador.
    ======================================================
    */

    if(result.model){

        metadata.push(
            String(
                result.model
            )
        );

    }

    if(
        result.provider
    ){

        metadata.push(
            String(
                result.provider
            )
        );

    }

    if(result.interrupted){

        metadata.push(
            "interrompida"
        );

    }

    if(!metadata.length){

        return;

    }

    const body =
        element.querySelector(
            ".message-body"
        );

    if(!body){

        return;

    }

    body
        .querySelector(
            ".message-meta"
        )
        ?.remove();

    const meta =
        document.createElement(
            "div"
        );

    meta.className =
        "message-meta";

    meta.textContent =
        metadata.join(
            " · "
        );

    body.appendChild(
        meta
    );

}


/*
==========================================================
MESSAGE ROLE
==========================================================
*/

function normalizeMessageRole(
    role
){

    if(
        typeof role !==
        "string"
    ){

        return null;

    }

    const normalized =
        role
            .trim()
            .toLowerCase();

    if(
        [
            "user",
            "assistant"
        ].includes(
            normalized
        )
    ){

        return normalized;

    }

    return null;

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

                    hljs.highlightElement(
                        block
                    );

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
SANITIZE HTML
==========================================================
*/

function sanitizeHTML(
    html
){

    const parser =
        new DOMParser();

    const parsed =
        parser.parseFromString(
            String(
                html || ""
            ),
            "text/html"
        );

    parsed
        .querySelectorAll(
            "script,iframe,object,embed,form,style,link,meta,base"
        )
        .forEach(
            element =>
                element.remove()
        );

    parsed
        .querySelectorAll(
            "*"
        )
        .forEach(
            element => {

                Array.from(
                    element.attributes
                )
                .forEach(
                    attribute => {

                        const name =
                            attribute.name
                                .toLowerCase();

                        const value =
                            attribute.value
                                .trim();

                        const lowerValue =
                            value.toLowerCase();

                        if(
                            name.startsWith(
                                "on"
                            )
                        ){

                            element.removeAttribute(
                                attribute.name
                            );

                            return;

                        }

                        if(
                            [
                                "src",
                                "href",
                                "action",
                                "formaction",
                                "xlink:href"
                            ].includes(
                                name
                            )
                        ){

                            if(
                                lowerValue.startsWith(
                                    "javascript:"
                                ) ||
                                lowerValue.startsWith(
                                    "vbscript:"
                                ) ||
                                lowerValue.startsWith(
                                    "data:"
                                ) ||
                                lowerValue.startsWith(
                                    "file:"
                                )
                            ){

                                element.removeAttribute(
                                    attribute.name
                                );

                                return;

                            }

                        }

                        if(
                            name ===
                            "target"
                        ){

                            element.setAttribute(
                                "rel",
                                "noopener noreferrer"
                            );

                        }

                    }
                );

                if(
                    element.tagName
                        .toLowerCase() ===
                    "a"
                ){

                    const href =
                        element.getAttribute(
                            "href"
                        );

                    if(href){

                        element.setAttribute(
                            "rel",
                            "noopener noreferrer"
                        );

                        element.setAttribute(
                            "target",
                            "_blank"
                        );

                    }

                }

            }
        );

    return parsed.body.innerHTML;

}


/*
==========================================================
ESCAPE HTML
==========================================================
*/

function escapeHTML(
    value
){

    const element =
        document.createElement(
            "div"
        );

    element.textContent =
        String(
            value ?? ""
        );

    return element.innerHTML;

}


/*
==========================================================
ARTIFACTS
==========================================================
*/

function renderArtifacts(
    artifacts
){

    if(
        !Array.isArray(
            artifacts
        ) ||
        !artifacts.length ||
        !dom.chatMessages
    ){

        return;

    }

    artifacts.forEach(
        artifact => {

            if(!artifact){

                return;

            }

            const normalized =
                normalizeArtifact(
                    artifact
                );

            if(!normalized){

                return;

            }

            const existingIndex =
                state.artifacts.findIndex(
                    item =>
                        getArtifactKey(item) ===
                        getArtifactKey(normalized)
                );

            if(existingIndex >= 0){

                state.artifacts[
                    existingIndex
                ] =
                    {
                        ...state.artifacts[
                            existingIndex
                        ],
                        ...normalized
                    };

            }
            else{

                state.artifacts.push(
                    normalized
                );

            }

        }
    );

    if(
        state.artifacts.length >
        MAX_VISIBLE_ARTIFACTS
    ){

        state.artifacts =
            state.artifacts.slice(
                -MAX_VISIBLE_ARTIFACTS
            );

    }

    renderArtifactCards();

}/*
==========================================================
ARTIFACT CARDS
==========================================================
*/

function renderArtifactCards(){

    if(!dom.chatMessages){

        return;

    }

    let container =
        dom.chatMessages.querySelector(
            ".chat-artifacts-container"
        );

    if(!state.artifacts.length){

        container?.remove();

        return;

    }

    if(!container){

        container =
            document.createElement(
                "section"
            );

        container.className =
            "chat-artifacts-container";

        container.setAttribute(
            "aria-label",
            "Artefactos"
        );

        dom.chatMessages.appendChild(
            container
        );

    }

    container.innerHTML = "";

    state.artifacts.forEach(
        artifact => {

            const card =
                createArtifactCard(
                    artifact
                );

            if(card){

                container.appendChild(
                    card
                );

            }

        }
    );

}


/*
==========================================================
CREATE ARTIFACT CARD
==========================================================
*/

function createArtifactCard(
    artifact
){

    if(!artifact){

        return null;

    }

    const card =
        document.createElement(
            "article"
        );

    card.className =
        "artifact-card";

    const header =
        document.createElement(
            "div"
        );

    header.className =
        "artifact-header";

    const title =
        document.createElement(
            "div"
        );

    title.className =
        "artifact-title";

    title.textContent =
        artifact.name ||
        artifact.title ||
        "Artefacto";

    const type =
        document.createElement(
            "span"
        );

    type.className =
        "artifact-type";

    type.textContent =
        artifact.type ||
        artifact.language ||
        "arquivo";

    header.appendChild(
        title
    );

    header.appendChild(
        type
    );

    const body =
        document.createElement(
            "div"
        );

    body.className =
        "artifact-body";

    const description =
        document.createElement(
            "div"
        );

    description.className =
        "artifact-description";

    description.textContent =
        artifact.description ||
        "";

    if(
        description.textContent
    ){

        body.appendChild(
            description
        );

    }

    if(
        artifact.content ||
        artifact.code
    ){

        const code =
            document.createElement(
                "pre"
            );

        const codeElement =
            document.createElement(
                "code"
            );

        codeElement.textContent =
            artifact.content ||
            artifact.code ||
            "";

        code.appendChild(
            codeElement
        );

        body.appendChild(
            code
        );

        if(
            typeof hljs !==
            "undefined"
        ){

            try{

                hljs.highlightElement(
                    codeElement
                );

            }
            catch(error){

                console.warn(
                    "[HONEY CHAT] Artifact highlight error:",
                    error
                );

            }

        }

    }

    const actions =
        document.createElement(
            "div"
        );

    actions.className =
        "artifact-actions";

    if(
        artifact.content ||
        artifact.code
    ){

        const previewButton =
            document.createElement(
                "button"
            );

        previewButton.type =
            "button";

        previewButton.className =
            "artifact-action";

        previewButton.textContent =
            "Pré-visualizar";

        previewButton.addEventListener(
            "click",
            () => {

                previewArtifact(
                    artifact
                );

            }
        );

        actions.appendChild(
            previewButton
        );

    }

    const copyButton =
        document.createElement(
            "button"
        );

    copyButton.type =
        "button";

    copyButton.className =
        "artifact-action";

    copyButton.textContent =
        "Copiar";

    copyButton.addEventListener(
        "click",
        async () => {

            const content =
                artifact.content ||
                artifact.code ||
                "";

            if(!content){

                return;

            }

            try{

                await navigator.clipboard.writeText(
                    content
                );

                showToast(
                    "Conteúdo copiado.",
                    "success"
                );

            }
            catch(error){

                showToast(
                    "Não foi possível copiar o conteúdo.",
                    "error"
                );

            }

        }
    );

    actions.appendChild(
        copyButton
    );

    body.appendChild(
        actions
    );

    card.appendChild(
        header
    );

    card.appendChild(
        body
    );

    return card;

}


/*
==========================================================
NORMALIZE ARTIFACT
==========================================================
*/

function normalizeArtifact(
    artifact
){

    if(
        typeof artifact !==
        "object" ||
        !artifact
    ){

        return null;

    }

    return {

        ...artifact,

        id:
            artifact.id ||
            artifact._id ||
            createClientMessageId(),

        name:
            artifact.name ||
            artifact.filename ||
            artifact.title ||
            "Artefacto",

        type:
            artifact.type ||
            artifact.mimeType ||
            artifact.language ||
            "text",

        content:
            typeof artifact.content ===
            "string"
                ? artifact.content
                : (
                    typeof artifact.code ===
                    "string"
                        ? artifact.code
                        : ""
                )

    };

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
        artifact.name ||
        ""
    );

}


/*
==========================================================
ARTIFACT PREVIEW
==========================================================
*/

function previewArtifact(
    artifact
){

    if(!artifact){

        return;

    }

    const content =
        artifact.content ||
        artifact.code ||
        "";

    if(!content){

        return;

    }

    if(!dom.previewIframe){

        showToast(
            "A área de pré-visualização não está disponível.",
            "warning"
        );

        return;

    }

    let html =
        content;

    const type =
        String(
            artifact.type ||
            artifact.mimeType ||
            artifact.language ||
            ""
        ).toLowerCase();

    if(
        !type.includes(
            "html"
        ) &&
        !/<html[\s>]/i.test(
            content
        )
    ){

        if(
            type.includes("css")
        ){

            html = `
<!DOCTYPE html>
<html lang="pt-PT">
<head>
<meta charset="UTF-8">
<meta name="viewport"
      content="width=device-width,initial-scale=1">
<style>
${content}
</style>
</head>
<body>
</body>
</html>
            `;

        }
        else{

            html = `
<!DOCTYPE html>
<html lang="pt-PT">
<head>
<meta charset="UTF-8">
<meta name="viewport"
      content="width=device-width,initial-scale=1">
</head>
<body>
<pre>${escapeHTML(content)}</pre>
</body>
</html>
            `;

        }

    }

    dom.previewIframe.srcdoc =
        html;

    dom.previewPane?.classList.add(
        "active"
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
        !Array.isArray(
            tools
        ) ||
        !tools.length
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
                    createClientMessageId()

            };

            const existing =
                state.tools.findIndex(
                    item =>
                        String(
                            item.id
                        ) ===
                        String(
                            normalized.id
                        )
                );

            if(existing >= 0){

                state.tools[
                    existing
                ] =
                    {
                        ...state.tools[
                            existing
                        ],
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

    if(
        state.tools.length >
        MAX_VISIBLE_TOOLS
    ){

        state.tools =
            state.tools.slice(
                -MAX_VISIBLE_TOOLS
            );

    }

    renderToolActivity();

}


/*
==========================================================
TOOL ACTIVITY
==========================================================
*/

function renderToolActivity(){

    if(!dom.chatMessages){

        return;

    }

    let container =
        dom.chatMessages.querySelector(
            ".chat-tools-container"
        );

    if(!state.tools.length){

        container?.remove();

        return;

    }

    if(!container){

        container =
            document.createElement(
                "section"
            );

        container.className =
            "chat-tools-container";

        container.setAttribute(
            "aria-label",
            "Atividade de ferramentas"
        );

        dom.chatMessages.appendChild(
            container
        );

    }

    container.innerHTML = "";

    state.tools.forEach(
        tool => {

            const item =
                document.createElement(
                    "div"
                );

            item.className =
                "chat-tool-item";

            const name =
                document.createElement(
                    "span"
                );

            name.className =
                "chat-tool-name";

            name.textContent =
                tool.name ||
                tool.tool ||
                tool.type ||
                "Ferramenta";

            const status =
                document.createElement(
                    "span"
                );

            status.className =
                "chat-tool-status";

            status.textContent =
                normalizeToolStatus(
                    tool
                );

            item.appendChild(
                name
            );

            item.appendChild(
                status
            );

            container.appendChild(
                item
            );

        }
    );

}


function normalizeToolStatus(
    tool
){

    if(!tool){

        return "";

    }

    if(
        tool.error ||
        tool.failed
    ){

        return "Falhou";

    }

    if(
        tool.completed ||
        tool.done ||
        tool.status ===
        "completed"
    ){

        return "Concluída";

    }

    if(
        tool.running ||
        tool.status ===
        "running"
    ){

        return "Em execução";

    }

    return (
        tool.status ||
        ""
    );

}


/*
==========================================================
LIVE MODE
==========================================================
*/

async function sendLiveMessage(
    prompt,
    assistantElement
){

    state.isLive =
        true;

    const payload = {

        prompt,

        conversationId:
            state.conversationId,

        agentId:
            state.agentId,

        mode:
            "live",

        workspaceContext: {

            workspace:
                state.workspace

        }

    };

    const controller =
        new AbortController();

    state.liveAbortController =
        controller;

    const token =
        getAuthToken();

    const headers = {

        "Content-Type":
            "application/json",

        "Accept":
            "text/event-stream"

    };

    if(token){

        headers.Authorization =
            `Bearer ${token}`;

    }

    const response =
        await fetch(
            API_BASE,
            {

                method:
                    "POST",

                headers,

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
            Resposta sem JSON.
            */

        }

        const error =
            new Error(
                message
            );

        error.status =
            response.status;

        throw error;

    }

    if(!response.body){

        throw new Error(
            "O modo Live não recebeu um stream válido."
        );

    }

    await consumeSSEStream(
        response.body,
        assistantElement
    );

}


/*
==========================================================
CONVERSATION SYNCHRONIZATION
==========================================================
*/

function synchronizeConversation(
    conversation
){

    if(!conversation){

        return;

    }

    state.conversation =
        {
            ...state.conversation,
            ...conversation
        };

    const id =
        getConversationId(
            conversation
        );

    if(id){

        state.conversationId =
            id;

    }

    if(
        conversation.agentId
    ){

        state.agentId =
            conversation.agentId;

    }

    if(
        conversation.workspace
    ){

        state.workspace =
            conversation.workspace;

    }

    updateConversationHeader(
        state.conversation
    );

    updateConversationInList(
        conversation
    );

}


/*
==========================================================
CONVERSATION LIST STATE
==========================================================
*/

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
                getConversationId(
                    item
                ) === id
        );

    if(index >= 0){

        state.conversations[
            index
        ] =
            {
                ...state.conversations[
                    index
                ],
                ...conversation
            };

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
                getConversationId(
                    item
                ) === id
        );

    if(index >= 0){

        state.conversations[
            index
        ] =
            {
                ...state.conversations[
                    index
                ],
                ...conversation
            };

    }
    else{

        state.conversations.unshift(
            conversation
        );

    }

}


/*
==========================================================
CONVERSATION HEADER
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
        conversation.name ||
        "Nova Conversa";

    if(dom.chatTitle){

        dom.chatTitle.textContent =
            title;

    }

    if(dom.chatContext){

        dom.chatContext.dataset.conversationId =
            state.conversationId ||
            "";

    }

    if(dom.chatAgent){

        dom.chatAgent.textContent =
            formatAgentName(
                conversation.agentId ||
                state.agentId
            );

    }

    /*
    ======================================================
    NÃO MOSTRAR ESTADO DE CONEXÃO

    A Honey IA não exibe:
    "A se conectar"
    "Ligando..."
    "Conectando..."
    "Online"
    ou estados técnicos equivalentes.
    ======================================================
    */

    if(dom.chatStatus){

        dom.chatStatus.textContent =
            "";

        dom.chatStatus.removeAttribute(
            "data-status"
        );

        dom.chatStatus.classList.remove(
            "active",
            "connected",
            "connecting",
            "online",
            "loading"
        );

    }

}


/*
==========================================================
AGENT NAME
==========================================================
*/

function formatAgentName(
    agent
){

    if(!agent){

        return "Honey IA";

    }

    const normalized =
        String(
            agent
        ).trim();

    if(
        !normalized ||
        normalized ===
        "general"
    ){

        return "Honey IA";

    }

    return normalized;

}


/*
==========================================================
RENDER HISTORY
==========================================================
*/

function renderHistory(){

    if(!dom.historyList){

        return;

    }

    dom.historyList.innerHTML =
        "";

    const query =
        state.searchQuery
            .trim()
            .toLowerCase();

    const conversations =
        state.conversations.filter(
            conversation => {

                if(!query){

                    return true;

                }

                const title =
                    String(
                        conversation.title ||
                        conversation.name ||
                        ""
                    ).toLowerCase();

                return title.includes(
                    query
                );

            }
        );

    conversations.forEach(
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
                    "button"
                );

            item.type =
                "button";

            item.className =
                "history-item";

            if(
                String(
                    state.conversationId
                ) ===
                String(
                    id
                )
            ){

                item.classList.add(
                    "active"
                );

            }

            const title =
                document.createElement(
                    "span"
                );

            title.className =
                "history-item-title";

            title.textContent =
                conversation.title ||
                conversation.name ||
                "Nova Conversa";

            item.appendChild(
                title
            );

            item.addEventListener(
                "click",
                () => {

                    openConversation(
                        id
                    );

                }
            );

            dom.historyList.appendChild(
                item
            );

        }
    );

}


/*
==========================================================
SEARCH
==========================================================
*/

function setupSearch(){

    if(!dom.searchInput){

        return;

    }

    dom.searchInput.addEventListener(
        "input",
        event => {

            state.searchQuery =
                event.target.value ||
                "";

            renderHistory();

        }
    );

}


/*
==========================================================
RENDER MESSAGES
==========================================================
*/

function renderMessages(
    messages
){

    if(!dom.chatMessages){

        return;

    }

    dom.chatMessages.innerHTML =
        "";

    if(
        !Array.isArray(
            messages
        ) ||
        !messages.length
    ){

        showWelcome();

        return;

    }

    hideWelcome();

    messages.forEach(
        message => {

            appendMessage(
                message,
                false
            );

        }
    );

    removeAllMessageTimeElements();

    removeLegacyAssistantIndicators();

    scrollChatToBottom(
        false
    );

}


/*
==========================================================
CLEAR CHAT
==========================================================
*/

function clearChatMessages(){

    if(!dom.chatMessages){

        return;

    }

    dom.chatMessages.innerHTML =
        "";

    state.artifacts =
        [];

    state.tools =
        [];

}


/*
==========================================================
WELCOME
==========================================================
*/

function showWelcome(){

    if(dom.chatWelcome){

        dom.chatWelcome.hidden =
            false;

        dom.chatWelcome.style.display =
            "";

    }

}


function hideWelcome(){

    if(dom.chatWelcome){

        dom.chatWelcome.hidden =
            true;

        dom.chatWelcome.style.display =
            "none";

    }

}


/*
==========================================================
LEGACY UI CLEANUP
==========================================================
*/

function removeLegacyAssistantIndicators(){

    if(!dom.chatMessages){

        return;

    }

    /*
    Remove qualquer elemento antigo de:

    - bee
    - honey avatar
    - connecting
    - thinking text
    - response time
    - timestamps

    Isto também torna a V4.1 compatível com mensagens
    que já estavam no DOM antes da atualização.
    */

    dom.chatMessages
        .querySelectorAll(
            ".message-time, " +
            ".assistant-status, " +
            ".connection-status, " +
            ".connecting-status, " +
            ".chat-connection-status, " +
            ".response-time, " +
            ".latency, " +
            ".generation-time, " +
            ".message-timestamp, " +
            ".timestamp, " +
            ".bee-avatar, " +
            ".honey-avatar"
        )
        .forEach(
            element =>
                element.remove()
        );

}


function removeAllMessageTimeElements(){

    if(!dom.chatMessages){

        return;

    }

    dom.chatMessages
        .querySelectorAll(
            "time.message-time, " +
            ".message-time, " +
            ".message-timestamp, " +
            ".timestamp, " +
            ".response-time, " +
            ".latency, " +
            ".generation-time"
        )
        .forEach(
            element =>
                element.remove()
        );

}


/*
==========================================================
TIMESTAMP
==========================================================
*/

function createMessageTimestamp(
    value
){

    /*
    ======================================================
    DESATIVADO NA V4.1

    Mantemos a função para compatibilidade com qualquer
    código externo que possa chamá-la, mas ela nunca cria
    elementos de tempo.

    A interface da Honey IA não mostra horários nas
    mensagens.
    ======================================================
    */

    return null;

}


/*
==========================================================
SEND STATE
==========================================================
*/

function setSendingState(
    sending
){

    state.isSending =
        Boolean(
            sending
        );

    if(dom.chatInput){

        dom.chatInput.disabled =
            Boolean(
                sending
            );

    }

    if(dom.btnSend){

        dom.btnSend.disabled =
            false;

        dom.btnSend.classList.toggle(
            "sending",
            Boolean(
                sending
            )
        );

        /*
        O botão continua disponível visualmente para que
        o utilizador possa interromper a geração através
        da interface existente.
        */

    }

    if(dom.btnVoice){

        dom.btnVoice.disabled =
            Boolean(
                sending
            );

    }

    if(dom.btnAttach){

        dom.btnAttach.disabled =
            Boolean(
                sending
            );

    }

    if(dom.btnNewChat){

        dom.btnNewChat.disabled =
            Boolean(
                sending
            );

    }

    if(dom.btnNewConversation){

        dom.btnNewConversation.disabled =
            Boolean(
                sending
            );

    }

    /*
    ======================================================
    IMPORTANTE

    Não atualizar dom.chatStatus com:

    "A se conectar"
    "A pensar"
    "A preparar..."
    "Gerando..."
    "Processando..."

    A interface permanece limpa.
    ======================================================
    */

    if(dom.chatStatus){

        dom.chatStatus.textContent =
            "";

        dom.chatStatus.hidden =
            true;

    }

}


/*
==========================================================
CLEAR INPUT
==========================================================
*/

function clearInputAfterSend(){

    if(!dom.chatInput){

        return;

    }

    dom.chatInput.value =
        "";

    dom.chatInput.style.height =
        "";

    removeAttachment();

}


/*
==========================================================
SCROLL
==========================================================
*/

function scrollChatToBottom(
    force = true
){

    if(!dom.chatMessages){

        return;

    }

    /*
    Só seguimos automaticamente o fim enquanto o utilizador
    estiver próximo do fundo.

    Assim a Honey não rouba o controlo do conteúdo.
    */

    if(
        !force &&
        !isUserNearChatBottom()
    ){

        return;

    }

    if(
        state.userManuallyScrolledAway ===
        true &&
        force
    ){

        return;

    }

    dom.chatMessages.scrollTo({

        top:
            dom.chatMessages.scrollHeight,

        behavior:
            "smooth"

    });

}


/*
==========================================================
USER NEAR BOTTOM
==========================================================
*/

function isUserNearChatBottom(){

    if(!dom.chatMessages){

        return true;

    }

    const distance =
        dom.chatMessages.scrollHeight -
        dom.chatMessages.scrollTop -
        dom.chatMessages.clientHeight;

    return distance <= 120;

}


/*
==========================================================
SCROLL CONTROL
==========================================================
*/

state.userManuallyScrolledAway =
    false;

function setupChatScrollControl(){

    if(!dom.chatMessages){

        return;

    }

    dom.chatMessages.addEventListener(
        "scroll",
        () => {

            state.userManuallyScrolledAway =
                !isUserNearChatBottom();

        },
        {
            passive:
                true
        }
    );

}

setupChatScrollControl();


/*
==========================================================
REMOVE STREAMING ASSISTANT IF EMPTY
==========================================================
*/

function removeStreamingAssistantIfEmpty(
    element
){

    if(!element){

        return;

    }

    if(
        !state.currentAssistantContent.trim()
    ){

        element.remove();

    }

}


/*
==========================================================
ERROR MESSAGE
==========================================================
*/

function showErrorMessage(
    message
){

    if(!dom.chatMessages){

        return;

    }

    const element =
        document.createElement(
            "article"
        );

    element.className =
        "chat-message message-error";

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

    content.textContent =
        String(
            message ||
            "Ocorreu um erro."
        );

    body.appendChild(
        content
    );

    element.appendChild(
        body
    );

    dom.chatMessages.appendChild(
        element
    );

    scrollChatToBottom();

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

    if(
        typeof window.showToast ===
        "function"
    ){

        window.showToast(
            message,
            type
        );

        return;

    }

    let container =
        document.getElementById(
            "honeyToastContainer"
        );

    if(!container){

        container =
            document.createElement(
                "div"
            );

        container.id =
            "honeyToastContainer";

        container.className =
            "honey-toast-container";

        document.body.appendChild(
            container
        );

    }

    const toast =
        document.createElement(
            "div"
        );

    toast.className =
        `honey-toast honey-toast-${type}`;

    toast.textContent =
        String(
            message ||
            ""
        );

    container.appendChild(
        toast
    );

    requestAnimationFrame(
        () => {

            toast.classList.add(
                "visible"
            );

        }
    );

    setTimeout(
        () => {

            toast.classList.remove(
                "visible"
            );

            setTimeout(
                () => {

                    toast.remove();

                },
                250
            );

        },
        2800
    );

}


/*
==========================================================
API ERROR HANDLER
==========================================================
*/

function handleApiError(
    error,
    fallbackMessage
){

    console.error(
        "[HONEY CHAT]",
        error
    );

    if(
        error?.status ===
        401
    ){

        redirectToLogin();

        return;

    }

    showToast(
        error?.message ||
        fallbackMessage ||
        "Ocorreu um erro.",
        "error"
    );

}


/*
==========================================================
CLIENT ID
==========================================================
*/

function createClientMessageId(){

    if(
        typeof crypto !==
        "undefined" &&
        typeof crypto.randomUUID ===
        "function"
    ){

        return crypto.randomUUID();

    }

    return (
        "honey-" +
        Date.now().toString(36) +
        "-" +
        Math.random()
            .toString(36)
            .slice(2)
    );

}


/*
==========================================================
AUTHENTICATION UI
==========================================================
*/

function updateAuthenticationUI(){

    if(!state.authenticated){

        return;

    }

    /*
    Não mostrar indicadores técnicos de conexão.
    */

    if(dom.chatStatus){

        dom.chatStatus.textContent =
            "";

        dom.chatStatus.hidden =
            true;

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

            dom.fileInput?.click();

        }
    );

    dom.fileInput?.addEventListener(
        "change",
        handleFileSelection
    );

    dom.fileRemove?.addEventListener(
        "click",
        removeAttachment
    );

}


async function handleFileSelection(
    event
){

    const file =
        event.target?.files?.[0];

    if(!file){

        return;

    }

    if(
        file.size >
        MAX_FILE_SIZE
    ){

        showToast(
            "O arquivo ultrapassa o limite permitido.",
            "error"
        );

        removeAttachment();

        return;

    }

    state.selectedFile =
        file;

    state.selectedFileContent =
        "";

    state.selectedFileSupported =
        isSupportedTextFile(
            file
        );

    if(
        state.selectedFileSupported
    ){

        try{

            state.selectedFileContent =
                await file.text();

        }
        catch(error){

            console.error(
                "[HONEY CHAT] File read error:",
                error
            );

            state.selectedFileContent =
                "";

            state.selectedFileSupported =
                false;

        }

    }

    updateAttachmentUI();

}


function isSupportedTextFile(
    file
){

    if(!file){

        return false;

    }

    const name =
        String(
            file.name ||
            ""
        ).toLowerCase();

    const extension =
        name.includes(".")
            ? name
                .split(".")
                .pop()
            : "";

    if(
        SUPPORTED_TEXT_EXTENSIONS.includes(
            extension
        )
    ){

        return true;

    }

    const mime =
        String(
            file.type ||
            ""
        ).toLowerCase();

    return (
        mime.startsWith(
            "text/"
        ) ||
        mime.includes(
            "json"
        ) ||
        mime.includes(
            "javascript"
        ) ||
        mime.includes(
            "xml"
        )
    );

}


function buildPromptWithFileContext(
    prompt
){

    if(
        !state.selectedFileSupported ||
        !state.selectedFileContent
    ){

        return prompt;

    }

    const file =
        state.selectedFile;

    const filename =
        file?.name ||
        "arquivo";

    return `${prompt}

[CONTEXTO DO ARQUIVO: ${filename}]
\`\`\`
${state.selectedFileContent}
\`\`\`
`;

}


function updateAttachmentUI(){

    if(dom.fileName){

        if(state.selectedFile){

            dom.fileName.textContent =
                state.selectedFile.name;

            dom.fileName.hidden =
                false;

        }
        else{

            dom.fileName.textContent =
                "";

            dom.fileName.hidden =
                true;

        }

    }

    if(dom.fileRemove){

        dom.fileRemove.hidden =
            !state.selectedFile;

    }

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

    updateAttachmentUI();

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

    if(state.voiceRecognition){

        try{

            state.voiceRecognition.stop();

        }
        catch(error){

            /*
            Reconhecimento já parado.
            */

        }

        state.voiceRecognition =
            null;

        return;

    }

    const recognition =
        new SpeechRecognition();

    recognition.lang =
        document.documentElement.lang ||
        "pt-PT";

    recognition.interimResults =
        true;

    recognition.continuous =
        false;

    let finalTranscript =
        "";

    recognition.onstart =
        () => {

            state.voiceRecognition =
                recognition;

            dom.btnVoice?.classList.add(
                "active"
            );

        };

    recognition.onresult =
        event => {

            let interim =
                "";

            for(
                let index = event.resultIndex;
                index < event.results.length;
                index++
            ){

                const result =
                    event.results[index];

                const transcript =
                    result[0]?.transcript ||
                    "";

                if(result.isFinal){

                    finalTranscript +=
                        transcript;

                }
                else{

                    interim +=
                        transcript;

                }

            }

            if(dom.chatInput){

                dom.chatInput.value =
                    (
                        finalTranscript +
                        interim
                    ).trim();

                autoResizeInput();

            }

        };

    recognition.onerror =
        event => {

            console.warn(
                "[HONEY CHAT] Voice recognition error:",
                event.error
            );

            if(
                event.error !==
                "aborted"
            ){

                showToast(
                    "Não foi possível reconhecer a voz.",
                    "error"
                );

            }

        };

    recognition.onend =
        () => {

            state.voiceRecognition =
                null;

            dom.btnVoice?.classList.remove(
                "active"
            );

            focusChatInput();

        };

    try{

        recognition.start();

    }
    catch(error){

        console.error(
            "[HONEY CHAT] Voice start error:",
            error
        );

        state.voiceRecognition =
            null;

        dom.btnVoice?.classList.remove(
            "active"
        );

    }

}


/*
==========================================================
PREVIEW
==========================================================
*/

function setupPreview(){

    if(!dom.previewIframe){

        return;

    }

    dom.previewIframe.setAttribute(
        "sandbox",
        "allow-scripts allow-forms allow-modals"
    );

}


/*
==========================================================
RENDER HISTORY AFTER MESSAGE
==========================================================
*/

function updateConversationTitleFromMessage(
    prompt
){

    if(
        !state.conversation ||
        !prompt
    ){

        return;

    }

    const currentTitle =
        String(
            state.conversation.title ||
            ""
        ).trim();

    if(
        currentTitle &&
        currentTitle !==
        "Nova Conversa"
    ){

        return;

    }

    const clean =
        String(
            prompt
        )
            .replace(
                /\s+/g,
                " "
            )
            .trim();

    if(!clean){

        return;

    }

    const title =
        clean.length > 60
            ? `${clean.slice(
                0,
                57
            )}...`
            : clean;

    state.conversation.title =
        title;

    updateConversationInList(
        state.conversation
    );

    updateConversationHeader(
        state.conversation
    );

}


/*
==========================================================
MESSAGE HISTORY
==========================================================
*/

function getMessageContent(
    message
){

    if(!message){

        return "";

    }

    if(
        typeof message.content ===
        "string"
    ){

        return message.content;

    }

    if(
        typeof message.text ===
        "string"
    ){

        return message.text;

    }

    if(
        typeof message.message ===
        "string"
    ){

        return message.message;

    }

    return "";

}


/*
==========================================================
MESSAGE NORMALIZATION
==========================================================
*/

function normalizeStoredMessage(
    message
){

    if(!message){

        return null;

    }

    const role =
        normalizeMessageRole(
            message.role ||
            message.sender
        );

    if(!role){

        return null;

    }

    const content =
        getMessageContent(
            message
        );

    if(!content){

        return null;

    }

    return {

        ...message,

        id:
            message.id ||
            message._id ||
            createClientMessageId(),

        role,

        content

    };

}


/*
==========================================================
EXPORT CHAT STATE
==========================================================
*/

function getChatState(){

    return {

        conversationId:
            state.conversationId,

        conversation:
            state.conversation,

        messages:
            [...state.messages],

        agentId:
            state.agentId,

        mode:
            state.currentMode,

        workspace:
            state.workspace,

        isSending:
            state.isSending,

        isLive:
            state.isLive

    };

}


/*
==========================================================
PUBLIC API
==========================================================
*/

const HoneyChat = {

    init:
        initializeChat,

    initialize:
        initializeChat,

    send:
        sendMessage,

    sendCurrentMessage,

    stop:
        stopGeneration,

    newConversation:
        createNewConversation,

    createNewConversation,

    openConversation,

    setMode:
        setChatMode,

    getState:
        getChatState,

    focus:
        focusChatInput,

    removeAttachment

};


/*
==========================================================
GLOBAL EXPORT
==========================================================
*/

window.HoneyChat =
    HoneyChat;


/*
==========================================================
AUTO INIT
==========================================================
*/

if(
    document.readyState ===
    "loading"
){

    document.addEventListener(
        "DOMContentLoaded",
        () => {

            initializeChat()
                .catch(
                    error => {

                        console.error(
                            "[HONEY CHAT] Auto initialization failed:",
                            error
                        );

                    }
                );

        },
        {
            once:
                true
        }
    );

}
else{

    initializeChat()
        .catch(
            error => {

                console.error(
                    "[HONEY CHAT] Auto initialization failed:",
                    error
                );

            }
        );

}


/*
==========================================================
END HONEY CHAT ENGINE V4.1
==========================================================
*/
