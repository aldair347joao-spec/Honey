/*
==========================================
HONEY IA OS
FRONTEND CHAT ENGINE
V1.0
Production Chat Interface
MongoDB Persistent Conversations
JWT Authentication
Conversation History
Markdown Rendering
Code Highlighting
Live SSE
File Context
Artifacts Preview
Responsive Workspace
==========================================
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

const DEFAULT_HISTORY_LIMIT = 100;

const MAX_MESSAGE_LENGTH = 50000;

const MAX_FILE_SIZE = 1024 * 1024;

const SUPPORTED_TEXT_EXTENSIONS = [

    "txt",
    "md",
    "markdown",
    "json",
    "csv",
    "xml",
    "html",
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
    "yaml",
    "yml"

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

    liveAbortController: null,

    currentAssistantElement: null,

    currentAssistantContent: "",

    currentMode: DEFAULT_MODE,

    agentId: DEFAULT_AGENT,

    workspace: "main"

};


/*
==========================================================
DOM REFERENCES
==========================================================
*/


const dom = {};


/*
==========================================================
INITIALIZATION
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

            "fileInput"

        );


    dom.attachmentBar =

        document.getElementById(

            "attachment-bar"

        );


    dom.attachedFileName =

        document.getElementById(

            "attached-file-name"

        );


    dom.btnRemoveAttachment =

        document.getElementById(

            "btn-remove-attachment"

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


    dom.conversationTitle =

        document.getElementById(

            "conversationTitle"

        );


    dom.historyContainer =

        document.getElementById(

            "historyContainer"

        );


    dom.projectsContainer =

        document.getElementById(

            "projectsContainer"

        );


    dom.previewPane =

        document.getElementById(

            "preview-pane"

        );


    dom.previewIframe =

        document.getElementById(

            "live-preview-iframe"

        );


    dom.btnClosePreview =

        document.getElementById(

            "btn-close-preview"

        );


    dom.globalSearch =

        document.getElementById(

            "globalSearch"

        );


    dom.toastContainer =

        document.getElementById(

            "toastContainer"

        );


    dom.planBadge =

        document.getElementById(

            "planBadge"

        );


    dom.userBox =

        document.getElementById(

            "userBox"

        );

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


        if(

            error?.status === 401

        ){

            redirectToLogin();

            return;

        }


        showToast(

            "Não foi possível carregar o seu Chat.",

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


        return (

            typeof token === "string" &&

            token.trim()

        )

            ?

            token.trim()

            :

            null;

    }

    catch(error){

        return null;

    }

}



function redirectToLogin(){

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

    endpoint,

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


    const response =

        await fetch(

            `${API_BASE}${endpoint}`,

            {

                ...options,

                headers,

                credentials:

                    "include"

            }

        );


    if(

        response.status === 401

    ){

        const error =

            new Error(

                "Sessão expirada."

            );


        error.status = 401;


        throw error;

    }


    let data = null;


    try{

        data =

            await response.json();

    }

    catch(error){

        data = null;

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


        error.data = data;


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


    const navItems =

        document.querySelectorAll(

            ".nav-item"

        );


    navItems.forEach(

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

        () => {

            sendCurrentMessage();

        }

    );


    dom.chatInput?.addEventListener(

        "keydown",

        event => {

            if(

                event.key === "Enter" &&

                !event.shiftKey

            ){

                event.preventDefault();

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



function autoResizeInput(){

    if(!dom.chatInput){

        return;

    }


    dom.chatInput.style.height =

        "auto";


    dom.chatInput.style.height =

        `${Math.min(

            dom.chatInput.scrollHeight,

            220

        )}px`;

}



function focusChatInput(){

    setTimeout(

        () => {

            dom.chatInput?.focus();

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

    const buttons =

        document.querySelectorAll(

            ".suggestion-button"

        );


    buttons.forEach(

        button => {

            button.addEventListener(

                "click",

                () => {

                    const prompt =

                        button.dataset.prompt || "";


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
MODE SWITCH
==========================================================
*/


function setupModeSwitch(){

    dom.btnChatMode?.addEventListener(

        "click",

        () => {

            setChatMode(

                "chat"

            );

        }

    );


    dom.btnLiveMode?.addEventListener(

        "click",

        () => {

            setChatMode(

                "live"

            );

        }

    );

}



function setChatMode(

    mode

){

    state.currentMode =

        mode === "live"

            ? "live"

            : "chat";


    const isLive =

        state.currentMode ===

        "live";


    dom.btnChatMode?.classList.toggle(

        "active",

        !isLive

    );


    dom.btnLiveMode?.classList.toggle(

        "active",

        isLive

    );


    dom.btnChatMode?.setAttribute(

        "aria-pressed",

        String(!isLive)

    );


    dom.btnLiveMode?.setAttribute(

        "aria-pressed",

        String(isLive)

    );


    if(dom.chatInput){

        dom.chatInput.placeholder =

            isLive

                ?

                "Fale ou escreva para a Honey IA..."

                :

                "Escreva uma mensagem para a Honey IA...";

    }

}



/*
==========================================================
CONVERSATION LOADING
==========================================================
*/


async function loadConversations(){

    const data =

        await apiRequest(

            "/conversations?limit=100"

        );


    state.conversations =

        Array.isArray(

            data?.conversations

        )

            ?

            data.conversations

            :

            [];


    renderHistory();

}



async function ensureInitialConversation(){

    if(

        state.conversationId

    ){

        return;

    }


    const existingConversation =

        state.conversations[0];


    if(existingConversation){

        await openConversation(

            getConversationId(

                existingConversation

            ),

            false

        );

        return;

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
CREATE NEW CONVERSATION
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


        state.conversation =

            conversation;


        state.conversationId =

            getConversationId(

                conversation

            );


        state.messages = [];


        state.currentAssistantElement =

            null;


        state.currentAssistantContent =

            "";


        clearChatMessages();


        showWelcome();


        updateConversationHeader(

            conversation

        );


        removeAttachment();


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


    try{

        const data =

            await apiRequest(

                `/conversations/${encodeURIComponent(

                    conversationId

                )}?limit=${DEFAULT_HISTORY_LIMIT}`

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

                ?

                data.messages

                :

                [];


        state.agentId =

            data.conversation.agentId ||

            DEFAULT_AGENT;


        state.workspace =

            data.conversation.workspace ||

            "main";


        clearChatMessages();


        hideWelcome();


        renderMessages(

            state.messages

        );


        updateConversationHeader(

            state.conversation

        );


        if(activate){

            activateWorkspace(

                "chat"

            );

        }


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
SEND MESSAGE
==========================================================
*/


async function sendCurrentMessage(){

    if(state.isSending){

        return;

    }


    if(state.isLive){

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


    await sendMessage(

        prompt

    );

}



async function sendMessage(

    prompt

){

    if(state.isSending){

        return;

    }


    state.isSending = true;


    setSendingState(

        true

    );


    hideWelcome();


    const userMessage = {

        role:

            "user",

        content:

            prompt,

        createdAt:

            new Date().toISOString()

    };


    appendMessage(

        userMessage

    );


    scrollChatToBottom();


    const assistantElement =

        createStreamingAssistantMessage();


    state.currentAssistantElement =

        assistantElement;


    state.currentAssistantContent =

        "";


    try{

        if(state.currentMode === "live"){

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


        showErrorMessage(

            error?.message ||

            "Não foi possível processar a mensagem."

        );

    }

    finally{

        state.isSending = false;

        state.isLive = false;


        setSendingState(

            false

        );


        state.currentAssistantElement =

            null;


        state.currentAssistantContent =

            "";


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

            "chat",

        historyLimit:

            20

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

            "A Honey IA não conseguiu processar o pedido."

        );

    }


    synchronizeConversation(

        data.conversation

    );


    const response =

        data.response ||

        data.message?.assistant?.content ||

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


    renderArtifacts(

        data.artifacts

    );


    renderTools(

        data.tools

    );


    updateConversationInList(

        data.conversation

    );


    renderHistory();

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

    state.isLive = true;


    state.liveAbortController =

        new AbortController();


    const token =

        getAuthToken();


    const response =

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

                        ?

                        {

                            Authorization:

                                `Bearer ${token}`

                        }

                        :

                        {}

                    )

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

                        historyLimit:

                            20

                    }),

                signal:

                    state.liveAbortController.signal

            }

        );


    if(response.status === 401){

        redirectToLogin();

        return;

    }


    if(!response.ok){

        let errorMessage =

            `Erro HTTP ${response.status}.`;


        try{

            const errorData =

                await response.json();


            errorMessage =

                errorData?.error ||

                errorMessage;

        }

        catch(error){

            // Ignore invalid error body.

        }


        throw new Error(

            errorMessage

        );

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


    let buffer = "";


    try{

        while(true){

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


            const events =

                buffer.split(

                    "\n\n"

                );


            buffer =

                events.pop() || "";


            for(const event of events){

                processSSEEvent(

                    event,

                    assistantElement

                );

            }

        }


        if(buffer.trim()){

            processSSEEvent(

                buffer,

                assistantElement

            );

        }

    }

    finally{

        reader.releaseLock();

    }

}



function processSSEEvent(

    rawEvent,

    assistantElement

){

    const lines =

        rawEvent.split(

            "\n"

        );


    const dataLines =

        lines

            .filter(

                line =>

                    line.startsWith(

                        "data:"

                    )

            )

            .map(

                line =>

                    line.slice(

                        5

                    ).trim()

            );


    if(!dataLines.length){

        return;

    }


    const rawData =

        dataLines.join(

            "\n"

        );


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

        return;

    }


    if(payload.connected){

        setAssistantStatus(

            assistantElement,

            "A Honey IA está a responder..."

        );

        return;

    }


    if(payload.text){

        state.currentAssistantContent +=

            payload.text;


        renderAssistantContent(

            assistantElement,

            state.currentAssistantContent

        );


        scrollChatToBottom();

    }


    if(payload.done){

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

        }


        if(payload.conversationId){

            state.conversationId =

                String(

                    payload.conversationId

                );

        }


        if(payload.agent){

            state.agentId =

                payload.agent.id ||

                state.agentId;

        }


        renderResponseMetadata(

            assistantElement,

            payload

        );


        setAssistantStatus(

            assistantElement,

            ""

        );


        refreshCurrentConversation();


        return;

    }


    if(payload.error){

        throwStreamError(

            payload.error

        );

    }

}



function throwStreamError(

    message

){

    throw new Error(

        message ||

        "Erro no modo Live."

    );

}



/*
==========================================================
REFRESH CURRENT CONVERSATION
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

                )}?limit=100`

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

                data.messages;

        }


        await loadConversations();

    }

    catch(error){

        if(error?.status === 401){

            redirectToLogin();

        }

    }

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

                getConversationId(

                    item

                ) === id

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


    dom.chatMessages.innerHTML = "";

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


    dom.chatMessages.innerHTML = `

        <div class="welcome-message" id="chatWelcome">

            <div class="welcome-icon">
                🐝
            </div>

            <h3>
                Olá, sou a Honey IA
            </h3>

            <p>
                Como posso ajudar hoje?
            </p>

        </div>

    `;


    dom.chatWelcome =

        document.getElementById(

            "chatWelcome"

        );

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


    if(!role){

        return null;

    }


    const content =

        typeof message?.content === "string"

            ?

            message.content

            :

            "";


    if(!content){

        return null;

    }


    const wrapper =

        document.createElement(

            "div"

        );


    wrapper.className =

        `chat-message message-${role}`;


    wrapper.dataset.role =

        role;


    const avatar =

        document.createElement(

            "div"

        );


    avatar.className =

        "message-avatar";


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



function createStreamingAssistantMessage(){

    if(!dom.chatMessages){

        return null;

    }


    hideWelcome();


    const wrapper =

        document.createElement(

            "div"

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



function renderResponseMetadata(

    element,

    result

){

    if(!element || !result){

        return;

    }


    const metadata = [];


    if(result.agent){

        const agentName =

            typeof result.agent === "string"

                ?

                result.agent

                :

                result.agent.name;


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

                Number(result.latency)

            )} ms`

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


    const existing =

        body.querySelector(

            ".message-meta"

        );


    existing?.remove();


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


    if(Number.isNaN(date.getTime())){

        return null;

    }


    const element =

        document.createElement(

            "div"

        );


    element.className =

        "message-time";


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



function normalizeMessageRole(

    role

){

    if(

        typeof role !== "string"

    ){

        return null;

    }


    const normalized =

        role.trim().toLowerCase();


    if(

        [

            "user",

            "assistant",

            "system",

            "tool"

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

        typeof content !== "string" ||

        !content

    ){

        return "";

    }


    if(

        typeof marked === "undefined"

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



function highlightCode(

    container

){

    if(

        !container ||

        typeof hljs === "undefined"

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



function sanitizeHTML(

    html

){

    const parser =

        new DOMParser();


    const documentFragment =

        parser.parseFromString(

            html,

            "text/html"

        );


    const forbidden =

        documentFragment.querySelectorAll(

            "script,iframe,object,embed,form,style,link,meta"

        );


    forbidden.forEach(

        element =>

            element.remove()

    );


    documentFragment

        .querySelectorAll(

            "*"

        )

        .forEach(

            element => {

                Array.from(

                    element.attributes

                ).forEach(

                    attribute => {

                        const name =

                            attribute.name

                                .toLowerCase();


                        const value =

                            attribute.value

                                .trim()

                                .toLowerCase();


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

                            (

                                name === "href" ||

                                name === "src"

                            ) &&

                            (

                                value.startsWith(

                                    "javascript:"

                                ) ||

                                value.startsWith(

                                    "data:"

                                ) ||

                                value.startsWith(

                                    "vbscript:"

                                )

                            )

                        ){

                            element.removeAttribute(

                                attribute.name

                            );

                        }

                    }

                );

            }

        );


    return documentFragment

        .body

        .innerHTML;

}



function escapeHTML(

value

){

    const element =

        document.createElement(

            "div"

        );


    element.textContent =

        value;


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

        !Array.isArray(artifacts) ||

        !artifacts.length

    ){

        return;

    }


    artifacts.forEach(

        artifact => {

            if(!artifact){

                return;

            }


            const content =

                typeof artifact.content === "string"

                    ?

                    artifact.content

                    :

                    "";


            if(!content){

                return;

            }


            const name =

                artifact.name ||

                "Honey IA Result";


            const card =

                document.createElement(

                    "div"

                );


            card.className =

                "chat-artifact";


            const header =

                document.createElement(

                    "div"

                );


            header.className =

                "chat-artifact-header";


            const title =

                document.createElement(

                    "strong"

                );


            title.textContent =

                name;


            const button =

                document.createElement(

                    "button"

                );


            button.type =

                "button";


            button.textContent =

                "Abrir Preview";


            button.addEventListener(

                "click",

                () => {

                    openArtifactPreview(

                        artifact

                    );

                }

            );


            header.appendChild(

                title

            );


            header.appendChild(

                button

            );


            card.appendChild(

                header

            );


            const parent =

                dom.chatMessages;


            parent?.appendChild(

                card

            );

        }

    );

}



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

        typeof artifact?.content === "string"

            ?

            artifact.content

            :

            "";


    const type =

        (

            artifact?.mime ||

            artifact?.type ||

            ""

        ).toLowerCase();


    let documentContent =

        content;


    if(

        type.includes(

            "html"

        ) ||

        artifact?.language === "html"

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

<meta name="viewport" content="width=device-width, initial-scale=1.0">

<style>

body{

    margin:0;

    padding:24px;

    background:#07080a;

    color:#f4f4f5;

    font-family:Inter,Arial,sans-serif;

}

pre{

    white-space:pre-wrap;

    word-break:break-word;

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


    dom.previewIframe.srcdoc =

        documentContent;


    dom.previewPane.classList.add(

        "open"

    );

}



function setupPreview(){

    dom.btnClosePreview?.addEventListener(

        "click",

        () => {

            dom.previewPane?.classList.remove(

                "open"

            );


            if(dom.previewIframe){

                dom.previewIframe.srcdoc =

                    "";

            }

        }

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

        !tools.length

    ){

        return;

    }


    tools.forEach(

        tool => {

            if(!tool){

                return;

            }


            const element =

                document.createElement(

                    "div"

                );


            element.className =

                "chat-tool-result";


            const name =

                tool.name ||

                "Ferramenta";


            const status =

                tool.success === false

                    ?

                    "Falhou"

                    :

                    "Concluído";


            element.textContent =

                `${name} · ${status}`;


            dom.chatMessages?.appendChild(

                element

            );

        }

    );

}



/*
==========================================================
ERROR MESSAGE
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


    element.innerHTML = `

        <i class="fa-solid fa-circle-exclamation"></i>

        <span>${escapeHTML(

            message

        )}</span>

    `;


    dom.chatMessages?.appendChild(

        element

    );


    scrollChatToBottom();

}



function removeStreamingAssistantIfEmpty(

element

){

    if(!element){

        return;

    }


    const content =

        state.currentAssistantContent

            .trim();


    if(!content){

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

            sending;


        dom.btnSend.classList.toggle(

            "loading",

            sending

        );


        dom.btnSend.innerHTML =

            sending

                ?

                `<i class="fa-solid fa-spinner fa-spin"></i>`

                :

                `<i class="fa-solid fa-paper-plane"></i>`;

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

}



function clearInputAfterSend(){

    if(!dom.chatInput){

        return;

    }


    dom.chatInput.value = "";


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

            dom.fileInput?.click();

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

        () => {

            removeAttachment();

        }

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


    state.selectedFileContent = "";


    if(

        !state.selectedFileSupported

    ){

        updateAttachmentUI(

            file.name,

            "Ficheiro selecionado. O conteúdo deste tipo de ficheiro não pode ser enviado diretamente pelo Chat."

        );


        showToast(

            "Este tipo de ficheiro não possui leitura de conteúdo integrada no Chat.",

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

    if(dom.attachmentBar){

        dom.attachmentBar.classList.remove(

            "hidden"

        );

    }


    if(dom.attachedFileName){

        dom.attachedFileName.textContent =

            description

                ?

                `${fileName} — ${description}`

                :

                fileName;

    }

}



function removeAttachment(){

    state.selectedFile = null;

    state.selectedFileContent = "";

    state.selectedFileSupported = false;


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

        dom.fileInput.value = "";

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


    const content =

        state.selectedFileContent

            .slice(

                0,

                Math.max(

                    0,

                    MAX_MESSAGE_LENGTH -

                    prompt.length -

                    1000

                )

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


    const recognition =

        new SpeechRecognition();


    recognition.lang =

        "pt-PT";


    recognition.interimResults =

        false;


    recognition.maxAlternatives =

        1;


    if(dom.btnVoice){

        dom.btnVoice.classList.add(

            "recording"

        );

    }


    recognition.onresult =

        event => {

            const transcript =

                event.results?.[0]?.[0]?.transcript || "";


            if(dom.chatInput){

                dom.chatInput.value =

                    `${dom.chatInput.value} ${transcript}`

                        .trim();


                autoResizeInput();

                focusChatInput();

            }

        };


    recognition.onerror =

        error => {

            console.warn(

                "[HONEY CHAT] Voice error:",

                error

            );


            showToast(

                "Não foi possível utilizar a entrada de voz.",

                "error"

            );

        };


    recognition.onend =

        () => {

            dom.btnVoice?.classList.remove(

                "recording"

            );

        };


    try{

        recognition.start();

    }

    catch(error){

        dom.btnVoice?.classList.remove(

            "recording"

        );

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

            const query =

                dom.globalSearch.value

                    .trim()

                    .toLowerCase();


            if(

                document.body.classList.contains(

                    "searching-chat"

                )

            ){

                // Keep the search behavior local to conversations.

            }


            if(query){

                filterHistory(

                    query

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

                        conversation.title || ""

                    ).toLowerCase();


                const agent =

                    String(

                        conversation.agentId || ""

                    ).toLowerCase();


                return (

                    title.includes(query) ||

                    agent.includes(query)

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

conversations = state.conversations

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


            const content =

                document.createElement(

                    "div"

                );


            content.className =

                "conversation-history-content";


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


    dom.historyContainer.innerHTML = "";


    dom.historyContainer.appendChild(

        wrapper

    );

}



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


    if(Number.isNaN(date.getTime())){

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

                    ) !== conversationId

            );


        if(

            state.conversationId ===

            conversationId

        ){

            state.conversationId = null;

            state.conversation = null;

            state.messages = [];


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

            response.status === 401

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


        const name =

            user.firstName ||

            user.name ||

            user.fullName ||

            "Utilizador";


        const lastName =

            user.lastName || "";


        const fullName =

            `${name} ${lastName}`

                .trim();


        const email =

            user.email || "";


        const avatar =

            user.avatar ||

            user.picture ||

            null;


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

                user.planName ||

                user.plan ||

                "Plano Gratuito";

        }


        if(avatarElement){

            if(avatar){

                avatarElement.innerHTML = `

                    <img
                        src="${escapeAttribute(

                            avatar

                        )}"
                        alt=""
                    >

                `;

            }

            else{

                avatarElement.textContent =

                    fullName

                        .charAt(

                            0

                        )

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

                    user.planName ||

                    user.plan ||

                    "Gratuito";

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



function escapeAttribute(

value

){

    return escapeHTML(

        String(

            value || ""

        )

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
TOASTS
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


    toast.innerHTML = `

        <i class="fa-solid ${

            iconMap[type] ||

            iconMap.info

        }"></i>

        <span>${escapeHTML(

            message

        )}</span>

    `;


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
ERROR HANDLING
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

        error?.status === 401

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

                state.isSending

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

            typeof prompt === "string"

                ?

                prompt.trim()

                :

                "";


        if(!normalized){

            return;

        }


        return sendMessage(

            normalized

        );

    },


    setMode(

        mode

    ){

        setChatMode(

            mode

        );

    }

};



/*
==========================================================
STARTUP LOG
==========================================================
*/


console.info(

    "[HONEY IA] Frontend Chat Engine V1.0 initialized."

);
