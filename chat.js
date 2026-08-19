/*
==========================================================
HONEY IA OS
CHAT ENGINE
V5.0
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
- User Controlled Scroll
- Buffered Streaming Rendering
- Generation Isolation
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
    Distância máxima do fim para considerar que
    o utilizador ainda está acompanhando a resposta.
*/
const SCROLL_BOTTOM_THRESHOLD = 72;

/*
    Intervalo mínimo entre renders visuais do streaming.
    O texto continua sendo acumulado imediatamente,
    mas o DOM não é reconstruído a cada micro-chunk.
*/
const STREAM_RENDER_INTERVAL = 32;


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

    /*
        Indica se o utilizador está próximo do fim.
        O chat nunca deve forçar o scroll quando false.
    */
    userNearBottom:
        true,

    /*
        Durante streaming, o conteúdo é acumulado aqui
        e renderizado em ciclos controlados.
    */
    streamRenderQueued:
        false,

    streamRenderTimer:
        null,

    streamLastRenderAt:
        0,

    streamRenderGenerationId:
        null,

    /*
        Evita renders concorrentes.
    */
    streamRenderRequested:
        false,

    /*
        Guarda se já houve conteúdo efetivamente renderizado.
    */
    streamHasRenderedContent:
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
                    credentials: "include"
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

    /*
        O botão usa um único listener.
        O comportamento muda conforme state.isSending.
    */

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

    /*
        Quando o chat é aberto pela primeira vez,
        consideramos que está no fim.
    */

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


/*
==========================================================
CREATE CONVERSATION
==========================================================
*/

async function createNewConversation(
    notify = true
){

    /*
        Criar uma nova conversa implica abandonar a geração
        anterior. O utilizador deve poder mudar de contexto
        sem ficar bloqueado.
    */

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

    /*
        Não esperamos um tempo artificialmente longo.
        Apenas permitimos que o event loop processe o abort.
    */

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

    /*
        Se o utilizador abrir outra conversa enquanto uma
        resposta está sendo gerada, cancelamos a geração
        anterior em vez de bloquear a navegação.
    */

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
            [];

        state.tools =
            [];

        state.currentGenerationId =
            null;

        state.generationStatus =
            "idle";

        clearStreamRenderTimer();

        clearChatMessages();

        renderMessages(
            state.messages
        );

        updateConversationHeader(
            state.conversation
        );

        removeAttachment();

        /*
            Depois de abrir uma conversa, o comportamento natural
            é mostrar o final do histórico.
        */

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

    /*
        Depois de enviar uma mensagem, colocamos o viewport
        no final porque esta foi uma ação explícita do utilizador.
    */

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

            /*
                Não mostrar erro para uma interrupção
                intencional.
            */

            if(
                stillCurrent &&
                state.currentAssistantContent.trim()
            ){

                finalizeInterruptedAssistant(
                    assistantElement
                );

            }

        }
        else if(stillCurrent){

            /*
                Se já existe resposta parcial, mantemos.
                Apenas informamos que a geração terminou com erro.
            */

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

        /*
            Só fazemos scroll final se o utilizador já estava
            acompanhando o fim da conversa.
        */

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
                state.workspace

        },

        memory: [],

        mode:
            "chat"

    };

    state.generationStatus =
        "streaming";

    /*
        Mantemos o request normal, mas agora com AbortController.
    */

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

    /*
        Não forçamos scroll aqui.
        O utilizador controla o viewport.
    */

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

        /*
            Atualizamos a flag interrupted se necessário,
            sem criar uma segunda mensagem.
        */

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

    const status =
        document.createElement(
            "div"
        );

    status.className =
        "assistant-status";

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

    /*
        A criação da mensagem é consequência direta do envio
        do utilizador, portanto podemos ir ao fim.
    */

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

    /*
        Durante streaming evitamos o highlighting completo.
        No final fazemos a operação completa.
    */

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

    if(result.provider){

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

    element.dateTime =
        date.toISOString();

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

    /*
        Erro provocado diretamente pelo envio deve aparecer
        imediatamente no final. Depois disso o utilizador
        volta a controlar o viewport.
    */

    state.userNearBottom =
        true;

    scrollChatToBottom(
        true
    );

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

    /*
        Não bloqueamos os botões de nova conversa.
        O utilizador deve poder abandonar o contexto atual.
    */

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

    /*
        Se estiver eliminando a conversa atual durante geração,
        interrompemos primeiro.
    */

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
                state.userNearBottom

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
    "[HONEY IA] Chat Engine V5.0 initialized."
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

console.info(
    "[HONEY IA] User-controlled scroll enabled."
);

console.info(
    "[HONEY IA] Buffered streaming rendering enabled."
);

console.info(
    "[HONEY IA] Generation isolation enabled."
);
