/*
==========================================================
HONEY IA OS
CHAT ENGINE
V4.0
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

    initialized: false,

    authenticated: false,

    conversationId: null,

    conversation: null,

    conversations: [],

    messages: [],

    selectedFile: null,

    selectedFileContent: "",

    selectedFileSupported: false,

    isSending: false,

    isLive: false,

    generationStartedAt: null,

    liveAbortController: null,

    currentAssistantElement: null,

    currentAssistantContent: "",

    currentAssistantMessageId: null,

    currentMode: DEFAULT_MODE,

    agentId: DEFAULT_AGENT,

    workspace: "main",

    artifacts: [],

    tools: [],

    voiceRecognition: null,

    searchQuery: "",

    generationCancelled: false

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

    state.initialized = true;

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

    state.authenticated = true;

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
                    credentials: "include"
                }
            );

    }
    catch(error){

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

    let data = null;

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

            data = null;

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

    state.messages = [];

    state.artifacts = [];

    state.tools = [];

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

        state.artifacts = [];

        state.tools = [];

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

        memory: [],

        mode:
            "chat"

    };

    const data =
        await apiRequest(
            "",
            {

                method:
                    "POST",

                body:
                    JSON.stringify(
                        payload
                    )

            }
        );

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
        response
    );

    renderResponseMetadata(
        assistantElement,
        data
    );

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

    scrollChatToBottom();

}


/*
==========================================================
LIVE CHAT
==========================================================
*/

async function sendLiveMessage(
    prompt,
    assistantElement
){

    state.isLive =
        true;

    state.liveAbortController =
        new AbortController();

    const token =
        getAuthToken();

    let response;

    try{

        response =
            await fetch(
                `${API_BASE}/live`,
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        Accept:
                            "text/event-stream",

                        ...(token
                            ? {
                                Authorization:
                                    `Bearer ${token}`
                            }
                            : {})

                    },

                    credentials:
                        "include",

                    body:
                        JSON.stringify({

                            prompt,

                            conversationId:
                                state.conversationId,

                            agentId:
                                state.agentId,

                            workspaceContext: {

                                workspace:
                                    state.workspace

                            },

                            memory: [],

                            mode:
                                "live"

                        }),

                    signal:
                        state.liveAbortController
                            .signal

                }
            );

    }
    catch(error){

        if(
            error?.name ===
            "AbortError"
        ){

            state.generationCancelled =
                true;

            return;

        }

        throw new Error(
            "Não foi possível estabelecer a ligação Live com a Honey IA."
        );

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

    if(!response.body){

        throw new Error(
            "O servidor não disponibilizou o stream Live."
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
                    "O stream Live excedeu o limite permitido."
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

    if(
        payload?.connected
    ){

        setAssistantStatus(
            assistantElement,
            "A Honey IA está a preparar a resposta..."
        );

    }

    if(
        payload?.status &&
        typeof payload.status ===
            "string"
    ){

        setAssistantStatus(
            assistantElement,
            payload.status
        );

    }

    if(
        payload?.thinking === true
    ){

        setAssistantStatus(
            assistantElement,
            "A Honey IA está a pensar..."
        );

    }

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

        renderResponseMetadata(
            assistantElement,
            payload
        );

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

    scrollChatToBottom();

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

    avatar.textContent =
        role === "user"
            ? "U"
            : "🐝";

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

    const timestamp =
        createMessageTimestamp(
            message?.createdAt
        );

    if(timestamp){

        body.appendChild(
            timestamp
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

    const avatar =
        document.createElement(
            "div"
        );

    avatar.className =
        "message-avatar";

    avatar.textContent =
        "🐝";

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

    const status =
        document.createElement(
            "div"
        );

    status.className =
        "assistant-status";

    status.textContent =
        "A Honey IA está a preparar a resposta...";

    body.appendChild(
        status
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

    if(
        Number.isFinite(
            Number(
                result.latency
            )
        )
    ){

        metadata.push(
            `${Math.round(
                Number(
                    result.latency
                )
            )} ms`
        );

    }

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
TIMESTAMP
==========================================================
*/

function createMessageTimestamp(
    value
){

    if(!value){

        return null;

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

        return null;

    }

    const element =
        document.createElement(
            "time"
        );

    element.className =
        "message-time";

    element.dateTime =
        date.toISOString();

    element.textContent =
        date.toLocaleTimeString(
            "pt-PT",
            {
                hour:
                    "2-digit",

                minute:
                    "2-digit"
            }
        );

    return element;

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

    state.artifacts =
        state.artifacts.slice(
            -MAX_VISIBLE_ARTIFACTS
        );

    renderArtifactCards();

}


/*
==========================================================
ARTIFACT NORMALIZATION
==========================================================
*/

function normalizeArtifact(
    artifact
){

    if(
        typeof artifact !==
        "object"
    ){

        return null;

    }

    const content =
        typeof artifact.content ===
            "string"
            ? artifact.content
            : "";

    if(!content){

        return null;

    }

    return {

        ...artifact,

        name:
            artifact.name ||
            "Honey IA Result",

        content,

        mime:
            artifact.mime ||
            artifact.type ||
            "",

        language:
            artifact.language ||
            ""

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
            ".chat-artifact"
        )
        .forEach(
            element =>
                element.remove()
        );

    state.artifacts.forEach(
        artifact => {

            const card =
                document.createElement(
                    "section"
                );

            card.className =
                "chat-artifact";

            const header =
                document.createElement(
                    "header"
                );

            header.className =
                "chat-artifact-header";

            const title =
                document.createElement(
                    "strong"
                );

            title.textContent =
                artifact.name;

            const actions =
                document.createElement(
                    "div"
                );

            actions.className =
                "chat-artifact-actions";

            const previewButton =
                document.createElement(
                    "button"
                );

            previewButton.type =
                "button";

            previewButton.innerHTML =
                `<i class="fa-solid fa-eye"></i>`;

            previewButton.title =
                "Abrir Preview";

            previewButton.addEventListener(
                "click",
                () => {

                    openArtifactPreview(
                        artifact
                    );

                }
            );

            const copyButton =
                document.createElement(
                    "button"
                );

            copyButton.type =
                "button";

            copyButton.innerHTML =
                `<i class="fa-regular fa-copy"></i>`;

            copyButton.title =
                "Copiar";

            copyButton.addEventListener(
                "click",
                async () => {

                    await copyText(
                        artifact.content
                    );

                    showToast(
                        "Artifact copiado.",
                        "success"
                    );

                }
            );

            actions.appendChild(
                previewButton
            );

            actions.appendChild(
                copyButton
            );

            header.appendChild(
                title
            );

            header.appendChild(
                actions
            );

            const description =
                document.createElement(
                    "div"
                );

            description.className =
                "chat-artifact-description";

            description.textContent =
                artifact.language ||
                artifact.mime ||
                "Resultado gerado pela Honey IA";

            card.appendChild(
                header
            );

            card.appendChild(
                description
            );

            dom.chatMessages.appendChild(
                card
            );

        }

    );

}


/*
==========================================================
ARTIFACT PREVIEW
==========================================================
*/

function openArtifactPreview(
    artifact
){

    if(
        !dom.previewPane ||
        !dom.previewIframe
    ){

        return;

    }

    const content =
        typeof artifact?.content ===
            "string"
            ? artifact.content
            : "";

    if(!content){

        return;

    }

    const type =
        String(
            artifact?.mime ||
            artifact?.type ||
            ""
        ).toLowerCase();

    let documentContent;

    if(
        type.includes("html") ||
        artifact?.language ===
            "html"
    ){

        documentContent =
            content;

    }
    else{

        documentContent = `

<!DOCTYPE html>

<html lang="pt">

<head>

<meta charset="UTF-8">

<meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
>

<style>

*{
    box-sizing:border-box;
}

body{

    margin:0;

    padding:24px;

    background:#07080a;

    color:#f4f4f5;

    font-family:
        Inter,
        Arial,
        sans-serif;

}

pre{

    margin:0;

    white-space:pre-wrap;

    word-break:break-word;

    line-height:1.65;

}

</style>

</head>

<body>

<pre>${escapeHTML(
            content
        )}</pre>

</body>

</html>

`;

    }

    dom.previewIframe.setAttribute(
        "sandbox",
        "allow-scripts"
    );

    dom.previewIframe.srcdoc =
        documentContent;

    dom.previewPane.classList.add(
        "open"
    );

}


function setupPreview(){

    dom.btnClosePreview?.addEventListener(
        "click",
        closeArtifactPreview
    );

}


function closeArtifactPreview(){

    dom.previewPane?.classList.remove(
        "open"
    );

    if(dom.previewIframe){

        dom.previewIframe.srcdoc =
            "";

    }

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


/*
==========================================================
TOOL CARDS
==========================================================
*/

function renderToolCards(){

    if(!dom.chatMessages){

        return;

    }

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

    scrollChatToBottom();

}


/*
==========================================================
STREAMING EMPTY STATE
==========================================================
*/

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

            dom.btnSend.onclick =
                stopGeneration;

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

            dom.btnSend.onclick =
                sendCurrentMessage;

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

    if(dom.btnNewChat){

        dom.btnNewChat.disabled =
            sending;

    }

    if(dom.btnNewConversation){

        dom.btnNewConversation.disabled =
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
ATTACHMENTS
==========================================================
*/

function setupAttachmentControls(){

    dom.btnAttach?.addEventListener(
        "click",
        () => {

            if(
                !state.isSending
            ){

                dom.fileInput?.click();

            }

        }
    );

    dom.fileInput?.addEventListener(
        "change",
        event => {

            const file =
                event.target.files?.[0];

            if(file){

                handleSelectedFile(
                    file
                );

            }

        }
    );

    dom.btnRemoveAttachment?.addEventListener(
        "click",
        removeAttachment
    );

}


async function handleSelectedFile(
    file
){

    if(!file){

        return;

    }

    if(
        file.size >
        MAX_FILE_SIZE
    ){

        showToast(
            "O ficheiro ultrapassa o limite de 1 MB.",
            "error"
        );

        resetFileInput();

        return;

    }

    const extension =
        getFileExtension(
            file.name
        );

    state.selectedFile =
        file;

    state.selectedFileSupported =
        SUPPORTED_TEXT_EXTENSIONS.includes(
            extension
        );

    state.selectedFileContent =
        "";

    if(!state.selectedFileSupported){

        updateAttachmentUI(
            file.name,
            "Ficheiro selecionado. Este formato não possui leitura direta."
        );

        showToast(
            "Este tipo de ficheiro não possui leitura de conteúdo integrada.",
            "warning"
        );

        return;

    }

    try{

        const content =
            await file.text();

        state.selectedFileContent =
            content.slice(
                0,
                MAX_MESSAGE_LENGTH
            );

        updateAttachmentUI(
            file.name,
            "Conteúdo pronto para análise."
        );

        showToast(
            "Ficheiro anexado à próxima mensagem.",
            "success"
        );

    }
    catch(error){

        console.error(
            "[HONEY CHAT] File read error:",
            error
        );

        state.selectedFileSupported =
            false;

        state.selectedFileContent =
            "";

        showToast(
            "Não foi possível ler o ficheiro.",
            "error"
        );

    }

}


function updateAttachmentUI(
    fileName,
    description
){

    dom.attachmentBar?.classList.remove(
        "hidden"
    );

    if(dom.attachedFileName){

        dom.attachedFileName.textContent =
            description
                ? `${fileName} — ${description}`
                : fileName;

    }

}


function removeAttachment(){

    state.selectedFile =
        null;

    state.selectedFileContent =
        "";

    state.selectedFileSupported =
        false;

    dom.attachmentBar?.classList.add(
        "hidden"
    );

    if(dom.attachedFileName){

        dom.attachedFileName.textContent =
            "";

    }

    resetFileInput();

}


function resetFileInput(){

    if(dom.fileInput){

        dom.fileInput.value =
            "";

    }

}


function getFileExtension(
    fileName
){

    const value =
        String(
            fileName || ""
        ).toLowerCase();

    const index =
        value.lastIndexOf(
            "."
        );

    if(index < 0){

        return "";

    }

    return value
        .slice(
            index + 1
        )
        .trim();

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

    const extension =
        getFileExtension(
            file.name
        );

    const availableLength =
        Math.max(
            0,
            MAX_MESSAGE_LENGTH -
            prompt.length -
            1000
        );

    const content =
        state.selectedFileContent.slice(
            0,
            availableLength
        );

    return `${prompt}

[ANEXO PARA ANÁLISE]

Nome: ${file.name}

Tipo: ${file.type || extension || "texto"}

Conteúdo:

\`\`\`${extension}

${content}

\`\`\`

[FIM DO ANEXO]`;

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
SEARCH
==========================================================
*/

function setupSearch(){

    dom.globalSearch?.addEventListener(
        "input",
        () => {

            state.searchQuery =
                dom.globalSearch.value
                    .trim()
                    .toLowerCase();

            if(state.searchQuery){

                filterHistory(
                    state.searchQuery
                );

            }
            else{

                renderHistory();

            }

        }
    );

}


function filterHistory(
    query
){

    if(!dom.historyContainer){

        return;

    }

    const filtered =
        state.conversations.filter(
            conversation => {

                const title =
                    String(
                        conversation.title ||
                        ""
                    ).toLowerCase();

                const agent =
                    String(
                        conversation.agentId ||
                        ""
                    ).toLowerCase();

                return (
                    title.includes(
                        query
                    ) ||
                    agent.includes(
                        query
                    )
                );

            }
        );

    renderHistory(
        filtered
    );

}


/*
==========================================================
HISTORY
==========================================================
*/

function renderHistory(
    conversations =
        state.conversations
){

    if(!dom.historyContainer){

        return;

    }

    if(
        !Array.isArray(
            conversations
        ) ||
        !conversations.length
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
SCROLL
==========================================================
*/

function scrollChatToBottom(){

    if(!dom.chatMessages){

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
                [...state.tools]

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
    "[HONEY IA] Chat Engine V4.0 initialized."
);

console.info(
    "[HONEY IA] Persistent conversation history: backend controlled."
);

console.info(
    "[HONEY IA] Artificial history age/quantity limits: disabled."
);

console.info(
    "[HONEY IA] Groq + Gemini orchestration compatible."
);

console.info(
    "[HONEY IA] Live SSE + Stop Generation enabled."
);
