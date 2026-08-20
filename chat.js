/*
==========================================================
HONEY IA OS
CHAT ENGINE
V7.0
PRODUCTION AI STUDIO CHAT ENGINE

CORE
----------------------------------------------------------
- JWT Authentication
- Persistent MongoDB Conversations
- Unlimited Conversation History
- Groq + Gemini Compatible Backend
- JSON Response
- SSE Streaming
- NDJSON Streaming
- Plain Text Streaming
- Abort / Stop Generation
- User Controlled Scroll
- Buffered Streaming Rendering
- Generation Isolation
- File Context
- Voice Input
- Markdown
- Code Highlighting
- Artifacts
- Universal Artifact Preview
- HTML / CSS / JS Preview
- Text / Markdown Preview
- JSON / CSV / SVG Preview
- Editable Preview
- Live Edit
- Artifact Versions
- Version Compare
- Version Restore
- Fullscreen Preview
- Download Artifact
- Share Preview
- Deploy Integration Hooks
- Tool Activity
- Conversation Management
- Search
- Responsive Workspace
- Secure HTML Rendering
- Production Error Handling

IMPORTANT
----------------------------------------------------------
The frontend does not pretend to execute arbitrary Python,
Node or backend code locally.

Execution / deployment can be connected to backend endpoints
when available.
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

const MAX_ARTIFACT_VERSIONS = 30;

const SCROLL_BOTTOM_THRESHOLD = 72;

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

    generationAbortController: null,

    currentGenerationId: null,

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

    generationCancelled: false,

    generationStatus: "idle",

    userNearBottom: true,

    streamRenderQueued: false,

    streamRenderTimer: null,

    streamLastRenderAt: 0,

    streamRenderGenerationId: null,

    streamRenderRequested: false,

    streamHasRenderedContent: false,

    streamReader: null,

    streamBuffer: "",

    streamFormat: null,

    artifactVersions: {},

    activeArtifactKey: null,

    previewArtifact: null,

    previewMode: "preview",

    previewEditor: null,

    previewIframeReady: false,

    previewFullscreen: false,

    previewShareToken: null

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

    const token = getAuthToken();

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

    const token = getAuthToken();

    const headers = {

        Accept:
            options.accept ||
            "application/json",

        ...(options.headers || {})

    };

    if(
        options.body &&
        !(options.body instanceof FormData)
    ){

        headers["Content-Type"] =
            headers["Content-Type"] ||
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

        throw error;

    }

    if(response.status === 401){

        const error =
            new Error(
                "Sessão expirada."
            );

        error.status = 401;

        throw error;

    }

    const contentType =
        response.headers.get(
            "content-type"
        ) || "";

    let data = null;

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
STREAM REQUEST
==========================================================
*/

async function streamRequest(
    endpoint,
    payload,
    signal,
    onChunk
){

    const token =
        getAuthToken();

    const headers = {

        Accept:
            [
                "text/event-stream",
                "application/x-ndjson",
                "application/json",
                "text/plain"
            ].join(", "),

        "Content-Type":
            "application/json"

    };

    if(token){

        headers.Authorization =
            `Bearer ${token}`;

    }

    const response =
        await fetch(
            `${API_BASE}${endpoint}`,
            {

                method:
                    "POST",

                headers,

                credentials:
                    "include",

                body:
                    JSON.stringify(
                        payload
                    ),

                signal

            }
        );

    if(response.status === 401){

        const error =
            new Error(
                "Sessão expirada."
            );

        error.status = 401;

        throw error;

    }

    if(!response.ok){

        let message =
            `Erro HTTP ${response.status}.`;

        try{

            const text =
                await response.text();

            if(text){

                try{

                    const parsed =
                        JSON.parse(text);

                    message =
                        parsed?.error ||
                        parsed?.message ||
                        message;

                }
                catch(error){

                    message =
                        text.slice(
                            0,
                            500
                        );

                }

            }

        }
        catch(error){

            /*
                Ignore body parsing errors.
            */

        }

        const apiError =
            new Error(
                message
            );

        apiError.status =
            response.status;

        throw apiError;

    }

    const contentType =
        (
            response.headers.get(
                "content-type"
            ) || ""
        ).toLowerCase();

    if(
        !response.body
    ){

        const text =
            await response.text();

        return {

            streamed:
                false,

            data:
                parsePossibleJSON(
                    text
                ),

            text

        };

    }

    if(
        contentType.includes(
            "application/json"
        ) &&
        !contentType.includes(
            "text/event-stream"
        )
    ){

        const data =
            await response.json();

        return {

            streamed:
                false,

            data,

            text:
                extractResponseText(
                    data
                )

        };

    }

    return consumeReadableStream(
        response.body,
        signal,
        onChunk
    );

}


/*
==========================================================
READABLE STREAM
==========================================================
*/

async function consumeReadableStream(
    body,
    signal,
    onChunk
){

    const reader =
        body.getReader();

    state.streamReader =
        reader;

    const decoder =
        new TextDecoder(
            "utf-8"
        );

    let buffer = "";

    let fullText = "";

    let finalData = null;

    try{

        while(true){

            if(signal?.aborted){

                try{

                    await reader.cancel(
                        "Honey IA generation stopped"
                    );

                }
                catch(error){

                    /*
                        Stream may already be cancelled.
                    */

                }

                break;

            }

            const {
                done,
                value
            } =
                await reader.read();

            if(done){

                break;

            }

            if(signal?.aborted){

                break;

            }

            const chunk =
                decoder.decode(
                    value,
                    {
                        stream:
                            true
                    }
                );

            if(!chunk){

                continue;

            }

            buffer += chunk;

            if(
                buffer.length >
                SSE_BUFFER_LIMIT
            ){

                buffer =
                    buffer.slice(
                        -SSE_BUFFER_LIMIT
                    );

            }

            const parsed =
                parseStreamBuffer(
                    buffer
                );

            buffer =
                parsed.remaining;

            for(
                const item of parsed.items
            ){

                if(
                    item.type ===
                    "text"
                ){

                    fullText +=
                        item.text;

                    onChunk?.(
                        item.text,
                        null
                    );

                }

                else if(
                    item.type ===
                    "data"
                ){

                    finalData =
                        mergeStreamData(
                            finalData,
                            item.data
                        );

                    const extracted =
                        extractDeltaText(
                            item.data
                        );

                    if(extracted){

                        fullText +=
                            extracted;

                        onChunk?.(
                            extracted,
                            item.data
                        );

                    }

                }

            }

        }

        const remainingDecoded =
            decoder.decode();

        if(remainingDecoded){

            buffer +=
                remainingDecoded;

        }

        const finalParsed =
            parseStreamBuffer(
                buffer,
                true
            );

        for(
            const item of finalParsed.items
        ){

            if(
                item.type ===
                "text"
            ){

                fullText +=
                    item.text;

                onChunk?.(
                    item.text,
                    null
                );

            }

            else if(
                item.type ===
                "data"
            ){

                finalData =
                    mergeStreamData(
                        finalData,
                        item.data
                    );

                const extracted =
                    extractDeltaText(
                        item.data
                    );

                if(extracted){

                    fullText +=
                        extracted;

                    onChunk?.(
                        extracted,
                        item.data
                    );

                }

            }

        }

        return {

            streamed:
                true,

            data:
                finalData,

            text:
                fullText

        };

    }
    finally{

        state.streamReader =
            null;

    }

}


/*
==========================================================
STREAM PARSER
==========================================================
*/

function parseStreamBuffer(
    input,
    flush = false
){

    let buffer =
        String(
            input || ""
        );

    const items = [];

    /*
        SSE
        --------------------------------------------------
        data: {...}

        data: text

        [DONE]
    */

    while(
        buffer.includes("\n\n") ||
        buffer.includes("\r\n\r\n")
    ){

        const separator =
            buffer.includes(
                "\r\n\r\n"
            )
                ? "\r\n\r\n"
                : "\n\n";

        const index =
            buffer.indexOf(
                separator
            );

        if(index < 0){

            break;

        }

        const record =
            buffer.slice(
                0,
                index
            );

        buffer =
            buffer.slice(
                index +
                separator.length
            );

        parseStreamRecord(
            record,
            items
        );

    }

    /*
        NDJSON / line-based
    */

    const lines =
        buffer.split(
            /\r?\n/
        );

    if(
        lines.length > 1
    ){

        const last =
            lines.pop();

        for(
            const line of lines
        ){

            parseStreamLine(
                line,
                items
            );

        }

        buffer =
            last || "";

    }

    if(flush && buffer.trim()){

        parseStreamRecord(
            buffer,
            items
        );

        buffer = "";

    }

    return {

        items,

        remaining:
            buffer

    };

}


function parseStreamRecord(
    record,
    items
){

    const normalized =
        String(
            record || ""
        ).trim();

    if(!normalized){

        return;

    }

    const lines =
        normalized.split(
            /\r?\n/
        );

    const dataLines = [];

    let hasSSE =
        false;

    for(
        const line of lines
    ){

        if(
            line.startsWith(
                "data:"
            )
        ){

            hasSSE = true;

            dataLines.push(
                line.slice(
                    5
                ).trimStart()
            );

        }

    }

    if(hasSSE){

        const value =
            dataLines.join(
                "\n"
            );

        if(
            value ===
            "[DONE]"
        ){

            return;

        }

        parseStreamValue(
            value,
            items
        );

        return;

    }

    parseStreamValue(
        normalized,
        items
    );

}


function parseStreamLine(
    line,
    items
){

    const normalized =
        String(
            line || ""
        ).trim();

    if(!normalized){

        return;

    }

    if(
        normalized.startsWith(
            "data:"
        )
    ){

        const value =
            normalized
                .slice(5)
                .trim();

        if(
            value ===
            "[DONE]"
        ){

            return;

        }

        parseStreamValue(
            value,
            items
        );

        return;

    }

    if(
        normalized.startsWith(
            "{"
        )
    ){

        parseStreamValue(
            normalized,
            items
        );

        return;

    }

    items.push({

        type:
            "text",

        text:
            normalized

    });

}


function parseStreamValue(
    value,
    items
){

    const text =
        String(
            value || ""
        );

    if(!text){

        return;

    }

    try{

        const data =
            JSON.parse(
                text
            );

        items.push({

            type:
                "data",

            data

        });

    }
    catch(error){

        items.push({

            type:
                "text",

            text

        });

    }

}


/*
==========================================================
STREAM DATA MERGE
==========================================================
*/

function mergeStreamData(
    previous,
    next
){

    if(!next){

        return previous;

    }

    if(!previous){

        return next;

    }

    if(
        typeof previous ===
            "object" &&
        typeof next ===
            "object"
    ){

        return {

            ...previous,
            ...next

        };

    }

    return next;

}


/*
==========================================================
EXTRACT DELTA
==========================================================
*/

function extractDeltaText(
    data
){

    if(
        data === null ||
        data === undefined
    ){

        return "";

    }

    if(
        typeof data ===
        "string"
    ){

        return data;

    }

    const candidates = [

        data.delta,

        data.text,

        data.content,

        data.token,

        data.chunk,

        data.response?.delta,

        data.response?.text,

        data.response?.content,

        data.message?.delta,

        data.message?.content,

        data.message?.assistant?.content,

        data.choices?.[0]?.delta?.content,

        data.choices?.[0]?.message?.content

    ];

    for(
        const value of candidates
    ){

        if(
            typeof value ===
            "string" &&
            value
        ){

            return value;

        }

    }

    return "";

}


/*
==========================================================
EXTRACT FINAL RESPONSE
==========================================================
*/

function extractResponseText(
    data
){

    if(!data){

        return "";

    }

    if(
        typeof data ===
        "string"
    ){

        return data;

    }

    const candidates = [

        data.response,

        data.text,

        data.content,

        data.message?.assistant?.content,

        data.message?.content,

        data.assistant?.content,

        data.result?.content,

        data.result?.text,

        data.data?.response,

        data.data?.content,

        data.data?.text

    ];

    for(
        const value of candidates
    ){

        if(
            typeof value ===
            "string" &&
            value.trim()
        ){

            return value;

        }

    }

    return "";

}


function parsePossibleJSON(
    text
){

    const value =
        String(
            text || ""
        ).trim();

    if(!value){

        return null;

    }

    try{

        return JSON.parse(
            value
        );

    }
    catch(error){

        return null;

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

                    if(target){

                        activateWorkspace(
                            target
                        );

                    }

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

    document
        .querySelectorAll(
            ".workspace-view"
        )
        .forEach(
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

    if(
        target ===
        "history"
    ){

        renderHistory();

    }

    if(
        target ===
        "chat"
    ){

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
                event.key ===
                "Enter" &&
                !event.shiftKey
            ){

                event.preventDefault();

                if(!state.isSending){

                    sendCurrentMessage();

                }

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
KEYBOARD
==========================================================
*/

function setupGlobalKeyboardShortcuts(){

    document.addEventListener(
        "keydown",
        event => {

            if(
                event.key ===
                "Escape" &&
                state.isSending
            ){

                event.preventDefault();

                stopGeneration();

                return;

            }

            if(
                event.ctrlKey &&
                event.key ===
                "Enter"
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
SCROLL
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

            if(!dom.chatMessages){

                return;

            }

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
        window.innerWidth <=
        700
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

                        if(
                            dom.chatInput &&
                            prompt
                        ){

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
        () =>
            setChatMode(
                "chat"
            )
    );

    dom.btnLiveMode?.addEventListener(
        "click",
        () =>
            setChatMode(
                "live"
            )
    );

    setChatMode(
        state.currentMode
    );

}


function setChatMode(
    mode
){

    state.currentMode =
        mode ===
        "live"
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
        String(
            !live
        )
    );

    dom.btnLiveMode?.setAttribute(
        "aria-pressed",
        String(
            live
        )
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
GENERATION
==========================================================
*/

function createGeneration(){

    const id =
        createClientMessageId();

    const controller =
        new AbortController();

    state.currentGenerationId =
        id;

    state.generationAbortController =
        controller;

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

    state.streamBuffer =
        "";

    clearStreamRenderTimer();

    return {

        id,

        controller

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

    state.generationStatus =
        "stopping";

    const generationId =
        state.currentGenerationId;

    const controller =
        state.generationAbortController;

    /*
        AbortController interrompe o fetch e o body stream.
    */

    if(controller){

        try{

            controller.abort(
                "User stopped generation"
            );

        }
        catch(error){

            try{

                controller.abort();

            }
            catch(ignore){

                /*
                    Already aborted.
                */

            }

        }

    }

    /*
        Cancela também o reader se estiver ativo.
    */

    if(state.streamReader){

        try{

            state.streamReader.cancel(
                "User stopped generation"
            );

        }
        catch(error){

            /*
                Reader may already be released.
            */

        }

    }

    if(state.liveAbortController){

        try{

            state.liveAbortController.abort();

        }
        catch(error){

            /*
                Ignore.
            */

        }

    }

    clearStreamRenderTimer();

    /*
        Renderiza imediatamente o conteúdo já recebido.
    */

    if(
        state.currentAssistantElement &&
        state.currentAssistantContent
    ){

        renderAssistantContent(
            state.currentAssistantElement,
            state.currentAssistantContent,
            {
                final:
                    true
            }
        );

        setAssistantStatus(
            state.currentAssistantElement,
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

    state.isSending =
        false;

    state.isLive =
        false;

    setSendingState(
        false
    );

    state.generationStatus =
        "stopped";

    state.generationStartedAt =
        null;

    state.generationAbortController =
        null;

    state.liveAbortController =
        null;

    state.currentAssistantElement =
        null;

    state.currentAssistantContent =
        "";

    state.currentAssistantMessageId =
        null;

    if(
        generationId &&
        state.currentGenerationId ===
        generationId
    ){

        state.currentGenerationId =
            null;

    }

    clearInputAfterSend();

    showToast(
        "Geração interrompida.",
        "info"
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

        stopGeneration();

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
RESET
==========================================================
*/

function resetConversationState(){

    clearStreamRenderTimer();

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

    state.generationStatus =
        "idle";

    state.currentGenerationId =
        null;

    state.generationAbortController =
        null;

    state.liveAbortController =
        null;

    state.streamReader =
        null;

    state.streamBuffer =
        "";

    state.streamRenderGenerationId =
        null;

    state.streamRenderQueued =
        false;

    state.streamRenderRequested =
        false;

    state.streamHasRenderedContent =
        false;

    state.artifactVersions =
        {};

    state.activeArtifactKey =
        null;

    state.previewArtifact =
        null;

    removeAttachment();

    closeArtifactPreview(
        false
    );

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

        stopGeneration();

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
                []
            );

        state.tools =
            Array.isArray(
                data.tools
            )
                ? data.tools
                : [];

        clearChatMessages();

        renderMessages(
            state.messages
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

        if(
            error?.name ===
            "AbortError" ||
            state.generationCancelled ||
            generation.controller.signal.aborted
        ){

            /*
                A interrupção intencional não é um erro.
            */

            if(
                isCurrentGeneration(
                    generationId
                ) &&
                state.currentAssistantContent.trim()
            ){

                renderAssistantContent(
                    assistantElement,
                    state.currentAssistantContent,
                    {
                        final:
                            true
                    }
                );

                setAssistantStatus(
                    assistantElement,
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

        }
        else if(
            isCurrentGeneration(
                generationId
            )
        ){

            if(
                state.currentAssistantContent.trim()
            ){

                renderAssistantContent(
                    assistantElement,
                    state.currentAssistantContent,
                    {
                        final:
                            true
                    }
                );

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

        if(
            error?.status ===
            401
        ){

            redirectToLogin();

        }

    }
    finally{

        if(
            !isCurrentGeneration(
                generationId
            ) &&
            !generation.controller.signal.aborted
        ){

            return;

        }

        clearStreamRenderTimer();

        /*
            Se stopGeneration() já fez o cleanup,
            não o repetimos de maneira destrutiva.
        */

        if(
            isCurrentGeneration(
                generationId
            )
        ){

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

            if(
                state.userNearBottom
            ){

                scrollChatToBottom();

            }

            state.currentGenerationId =
                null;

        }

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

    if(!controller){

        throw new Error(
            "Controlador de geração indisponível."
        );

    }

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
        IMPORTANTE:
        O request recebe o MESMO AbortSignal usado pelo
        botão Stop.
    */

    const result =
        await streamRequest(
            "",
            payload,
            controller.signal,
            (
                delta,
                metadata
            ) => {

                if(
                    !isCurrentGeneration(
                        generationId
                    )
                ){

                    return;

                }

                if(
                    controller.signal.aborted ||
                    state.generationCancelled
                ){

                    return;

                }

                if(delta){

                    appendAssistantDelta(
                        assistantElement,
                        delta,
                        generationId
                    );

                }

                if(
                    metadata?.artifacts
                ){

                    renderArtifacts(
                        metadata.artifacts
                    );

                }

                if(
                    metadata?.tools
                ){

                    renderTools(
                        metadata.tools
                    );

                }

            }
        );

    if(
        !isCurrentGeneration(
            generationId
        ) &&
        !controller.signal.aborted
    ){

        return;

    }

    if(
        controller.signal.aborted ||
        state.generationCancelled
    ){

        return;

    }

    /*
        Backend pode ter devolvido JSON normal.
    */

    let response =
        result?.text ||
        "";

    const data =
        result?.data ||
        null;

    if(
        !response &&
        data
    ){

        response =
            extractResponseText(
                data
            );

    }

    /*
        Se o stream enviou deltas, state já possui o texto.
    */

    if(
        !response &&
        state.currentAssistantContent
    ){

        response =
            state.currentAssistantContent;

    }

    if(!response){

        throw new Error(
            "A Honey IA não devolveu uma resposta."
        );

    }

    /*
        Se JSON contém uma resposta completa diferente
        do acumulado, usamos a resposta final.
    */

    if(
        data &&
        !result?.streamed
    ){

        response =
            extractResponseText(
                data
            ) ||
            response;

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

    }
    else{

        flushAssistantRender(
            assistantElement,
            generationId,
            true
        );

    }

    synchronizeConversation(
        data?.conversation
    );

    const artifacts =
        data?.artifacts ||
        [];

    if(
        Array.isArray(
            artifacts
        )
    ){

        renderArtifacts(
            artifacts
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

    renderResponseMetadata(
        assistantElement,
        data
    );

    addAssistantMessageOnce(
        response,
        data || {}
    );

    updateConversationInList(
        data?.conversation
    );

    renderHistory();

    processArtifactsFromResponse(
        data
    );

}


/*
==========================================================
APPEND ASSISTANT DELTA
==========================================================
*/

function appendAssistantDelta(
    element,
    delta,
    generationId
){

    if(
        !element ||
        !delta ||
        !isCurrentGeneration(
            generationId
        )
    ){

        return;

    }

    state.currentAssistantContent +=
        delta;

    state.streamHasRenderedContent =
        true;

    queueAssistantRender(
        element,
        generationId
    );

}


/*
==========================================================
STREAM RENDER
==========================================================
*/

function queueAssistantRender(
    element,
    generationId
){

    if(
        !isCurrentGeneration(
            generationId
        )
    ){

        return;

    }

    state.streamRenderRequested =
        true;

    if(state.streamRenderQueued){

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

                flushAssistantRender(
                    element,
                    generationId,
                    false
                );

            },
            delay
        );

}


function flushAssistantRender(
    element,
    generationId,
    final = false
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
        !state.currentAssistantContent
    ){

        return;

    }

    renderAssistantContent(
        element,
        state.currentAssistantContent,
        {
            final
        }
    );

    state.streamLastRenderAt =
        Date.now();

    state.streamRenderRequested =
        false;

    if(state.userNearBottom){

        scrollChatToBottom();

    }

}


function clearStreamRenderTimer(){

    if(
        state.streamRenderTimer
    ){

        clearTimeout(
            state.streamRenderTimer
        );

    }

    state.streamRenderTimer =
        null;

    state.streamRenderQueued =
        false;

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

    /*
        Live continua usando o mesmo motor de streaming.
        Se o backend tiver endpoint próprio /live,
        pode utilizá-lo; caso contrário usamos /.
    */

    state.isLive =
        true;

    const controller =
        state.generationAbortController;

    state.liveAbortController =
        controller;

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
            "live",

        live:
            true

    };

    state.generationStatus =
        "streaming";

    const result =
        await streamRequest(
            "/",
            payload,
            controller.signal,
            (
                delta,
                metadata
            ) => {

                if(
                    controller.signal.aborted ||
                    state.generationCancelled
                ){

                    return;

                }

                if(
                    isCurrentGeneration(
                        generationId
                    ) &&
                    delta
                ){

                    appendAssistantDelta(
                        assistantElement,
                        delta,
                        generationId
                    );

                }

                if(
                    metadata?.artifacts
                ){

                    renderArtifacts(
                        metadata.artifacts
                    );

                }

            }
        );

    if(
        controller.signal.aborted ||
        state.generationCancelled
    ){

        return;

    }

    let response =
        result?.text ||
        "";

    if(
        !response &&
        result?.data
    ){

        response =
            extractResponseText(
                result.data
            );

    }

    if(
        !response &&
        state.currentAssistantContent
    ){

        response =
            state.currentAssistantContent;

    }

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

    synchronizeConversation(
        result?.data?.conversation
    );

    renderResponseMetadata(
        assistantElement,
        result?.data
    );

    addAssistantMessageOnce(
        response,
        result?.data || {}
    );

    processArtifactsFromResponse(
        result?.data
    );

}


/*
==========================================================
ASSISTANT MESSAGE
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

    state.userNearBottom =
        true;

    scrollChatToBottom(
        true
    );

    return wrapper;

}


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
        options.final ===
        true
    ){

        highlightCode(
            contentElement
        );

    }

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

        element
            .querySelector(
                ".message-body"
            )
            ?.appendChild(
                statusElement
            );

    }

    statusElement.textContent =
        status;

}


/*
==========================================================
MESSAGE RENDER
==========================================================
*/

function clearChatMessages(){

    if(dom.chatMessages){

        dom.chatMessages.innerHTML =
            "";

    }

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
        !Array.isArray(
            messages
        ) ||
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
ROLE
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
        normalized === "user" ||
        normalized === "assistant"
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
        "string"
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
                    }

            }
        );

    }

    /*
        Fallback conservative.
    */

    const template =
        document.createElement(
            "template"
        );

    template.innerHTML =
        html;

    template.content
        .querySelectorAll(
            "script, iframe, object, embed, form"
        )
        .forEach(
            node =>
                node.remove()
        );

    template.content
        .querySelectorAll(
            "[onerror],[onclick],[onload],[onmouseover]"
        )
        .forEach(
            node => {

                [
                    "onerror",
                    "onclick",
                    "onload",
                    "onmouseover"
                ].forEach(
                    attr =>
                        node.removeAttribute(
                            attr
                        )
                );

            }
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

    /*
        We intentionally do not display latency/time
        in the chat UI.
    */

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
ARTIFACT NORMALIZATION
==========================================================
*/

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

    if(!content){

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
            "Honey IA Result",

        content,

        mime:
            normalizeMime(
                artifact.mime ||
                artifact.type ||
                ""
            ),

        language:
            normalizeLanguage(
                artifact.language ||
                artifact.lang ||
                artifact.fileType ||
                artifact.extension ||
                ""
            ),

        editable:
            artifact.editable !==
            false,

        createdAt:
            artifact.createdAt ||
            new Date().toISOString()

    };

}


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
        )
        .slice(
            -MAX_VISIBLE_ARTIFACTS
        );

}


function normalizeMime(
    mime
){

    const value =
        String(
            mime || ""
        )
            .toLowerCase()
            .trim();

    if(!value){

        return "";

    }

    if(
        value ===
        "text/html"
    ){

        return "text/html";

    }

    if(
        value ===
        "application/json"
    ){

        return "application/json";

    }

    if(
        value.includes(
            "javascript"
        )
    ){

        return "text/javascript";

    }

    if(
        value.includes(
            "css"
        )
    ){

        return "text/css";

    }

    if(
        value.includes(
            "csv"
        )
    ){

        return "text/csv";

    }

    if(
        value.includes(
            "markdown"
        )
    ){

        return "text/markdown";

    }

    if(
        value.includes(
            "svg"
        )
    ){

        return "image/svg+xml";

    }

    return value;

}


function normalizeLanguage(
language
){

    let value =
        String(
            language || ""
        )
            .toLowerCase()
            .trim();

    value =
        value.replace(
            /^\./,
            ""
        );

    const aliases = {

        html:
            "html",

        htm:
            "html",

        javascript:
            "javascript",

        js:
            "javascript",

        mjs:
            "javascript",

        cjs:
            "javascript",

        typescript:
            "typescript",

        ts:
            "typescript",

        jsx:
            "jsx",

        tsx:
            "tsx",

        css:
            "css",

        python:
            "python",

        py:
            "python",

        json:
            "json",

        csv:
            "csv",

        md:
            "markdown",

        markdown:
            "markdown",

        svg:
            "svg",

        xml:
            "xml",

        java:
            "java",

        c:
            "c",

        cpp:
            "cpp",

        sql:
            "sql",

        sh:
            "shell",

        bash:
            "shell"

    };

    return aliases[value] ||
        value;

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
        `${artifact.name || "artifact"}:${artifact.language || ""}`
    );

}


/*
==========================================================
ARTIFACT RESPONSE PROCESSING
==========================================================
*/

function processArtifactsFromResponse(
data
){

    if(!data){

        return;

    }

    const candidates = [

        data.artifacts,

        data.artifact,

        data.result?.artifacts,

        data.message?.artifacts,

        data.response?.artifacts

    ];

    for(
        const candidate of candidates
    ){

        if(
            Array.isArray(
                candidate
            )
        ){

            renderArtifacts(
                candidate
            );

        }
        else if(
            candidate &&
            typeof candidate ===
            "object"
        ){

            renderArtifacts(
                [candidate]
            );

        }

    }

    /*
        Alguns backends devolvem o artefacto diretamente
        como objeto da resposta.
    */

    if(
        data.content &&
        (
            data.filename ||
            data.fileName ||
            data.mime ||
            data.language ||
            data.type
        )
    ){

        renderArtifacts(
            [data]
        );

    }

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
        !artifacts.length
    ){

        return;

    }

    artifacts.forEach(
        artifact => {

            const normalized =
                normalizeArtifact(
                    artifact
                );

            if(!normalized){

                return;

            }

            const key =
                getArtifactKey(
                    normalized
                );

            const existing =
                state.artifacts.findIndex(
                    item =>
                        getArtifactKey(
                            item
                        ) ===
                        key
                );

            if(existing >= 0){

                state.artifacts[
                    existing
                ] = {

                    ...state.artifacts[
                        existing
                    ],

                    ...normalized

                };

            }
            else{

                state.artifacts.push(
                    normalized
                );

            }

            registerArtifactVersion(
                normalized
            );

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

    if(
        !state.artifacts.length
    ){

        return;

    }

    state.artifacts.forEach(
        artifact => {

            const card =
                document.createElement(
                    "article"
                );

            card.className =
                "honey-artifact-card";

            card.dataset.artifactKey =
                getArtifactKey(
                    artifact
                );

            const header =
                document.createElement(
                    "div"
                );

            header.className =
                "honey-artifact-header";

            const title =
                document.createElement(
                    "strong"
                );

            title.textContent =
                artifact.name;

            const type =
                document.createElement(
                    "span"
                );

            type.textContent =
                artifact.language ||
                artifact.mime ||
                "arquivo";

            header.appendChild(
                title
            );

            header.appendChild(
                type
            );

            const actions =
                document.createElement(
                    "div"
                );

            actions.className =
                "honey-artifact-actions";

            actions.appendChild(
                createArtifactButton(
                    "Abrir Preview",
                    "fa-eye",
                    () =>
                        openArtifactPreview(
                            artifact
                        )
                )
            );

            actions.appendChild(
                createArtifactButton(
                    "Baixar",
                    "fa-download",
                    () =>
                        downloadArtifact(
                            artifact
                        )
                )
            );

            card.appendChild(
                header
            );

            card.appendChild(
                actions
            );

            dom.chatMessages.appendChild(
                card
            );

        }
    );

}


function createArtifactButton(
    title,
    icon,
    handler
){

    const button =
        document.createElement(
            "button"
        );

    button.type =
        "button";

    button.title =
        title;

    button.innerHTML =
        `<i class="fa-solid ${icon}"></i>`;

    button.addEventListener(
        "click",
        handler
    );

    return button;

}


/*
==========================================================
ARTIFACT VERSIONS
==========================================================
*/

function registerArtifactVersion(
    artifact
){

    const key =
        getArtifactKey(
            artifact
        );

    if(!key){

        return;

    }

    if(
        !state.artifactVersions[key]
    ){

        state.artifactVersions[key] =
            [];

    }

    const versions =
        state.artifactVersions[key];

    const latest =
        versions[
            versions.length - 1
        ];

    if(
        latest &&
        latest.content ===
        artifact.content
    ){

        return;

    }

    versions.push({

        id:
            createClientMessageId(),

        version:
            versions.length + 1,

        name:
            artifact.name,

        content:
            artifact.content,

        mime:
            artifact.mime,

        language:
            artifact.language,

        createdAt:
            new Date().toISOString()

    });

    if(
        versions.length >
        MAX_ARTIFACT_VERSIONS
    ){

        versions.splice(
            0,
            versions.length -
            MAX_ARTIFACT_VERSIONS
        );

    }

}


function getArtifactVersions(
    artifact
){

    if(!artifact){

        return [];

    }

    return (
        state.artifactVersions[
            getArtifactKey(
                artifact
            )
        ] ||
        []
    );

}


/*
==========================================================
PREVIEW SETUP
==========================================================
*/

function setupPreview(){

    /*
    ======================================================
    FECHAR PREVIEW
    ======================================================
    */

    dom.btnClosePreview?.addEventListener(
        "click",
        () => {

            closeArtifactPreview();

        }
    );


    /*
    ======================================================
    IFRAME READY
    ======================================================
    */

    if(dom.previewIframe){

        dom.previewIframe.addEventListener(
            "load",
            () => {

                state.previewIframeReady =
                    true;

            }
        );

    }


    /*
    ======================================================
    ESC
    ======================================================
    */

    if(!state.previewKeyboardBound){

        document.addEventListener(
            "keydown",
            event => {

                /*
                ------------------------------------------
                ESC DO FULLSCREEN
                ------------------------------------------
                */

                if(
                    event.key === "Escape" &&
                    state.previewFullscreen
                ){

                    event.preventDefault();

                    exitPreviewFullscreen();

                    return;

                }


                /*
                ------------------------------------------
                ESC DO PREVIEW
                ------------------------------------------
                */

                if(
                    event.key === "Escape" &&
                    dom.previewPane &&
                    dom.previewPane.classList.contains(
                        "open"
                    )
                ){

                    event.preventDefault();

                    closeArtifactPreview();

                }

            }
        );

        state.previewKeyboardBound =
            true;

    }

}


/*
==========================================================
OPEN PREVIEW
UNIVERSAL FULLSCREEN OVERLAY
==========================================================
*/

function openArtifactPreview(
    artifact
){

    /*
    ======================================================
    NORMALIZA ARTIFACT
    ======================================================
    */

    const normalized =
        normalizeArtifact(
            artifact
        );


    if(!normalized){

        showToast(
            "Este resultado não pode ser visualizado.",
            "warning"
        );

        return;

    }


    /*
    ======================================================
    GUARDA O ARTIFACT ACTIVO
    ======================================================
    */

    state.previewArtifact =
        normalized;

    state.activeArtifactKey =
        getArtifactKey(
            normalized
        );

    state.previewMode =
        "preview";


    /*
    ======================================================
    GARANTE QUE O PREVIEW EXISTE
    ======================================================
    */

    if(!dom.previewPane){

        createPreviewPaneFallback();

    }


    if(!dom.previewPane){

        console.error(
            "Honey IA: preview pane não pôde ser criado."
        );

        return;

    }


    /*
    ======================================================
    IMPORTANTE
    ======================================================

    O PREVIEW NÃO DEVE PARTICIPAR DO LAYOUT DO CHAT.

    Ele funciona como uma camada independente sobre
    toda a aplicação.

    ======================================================
    */


    /*
    ------------------------------------------------------
    REMOVE QUALQUER ESTADO DE SPLIT / DOCK
    ------------------------------------------------------
    */

    dom.previewPane.classList.remove(
        "split",
        "side",
        "docked",
        "embedded",
        "active"
    );


    /*
    ------------------------------------------------------
    MARCA COMO OVERLAY
    ------------------------------------------------------
    */

    dom.previewPane.classList.add(
        "open",
        "honey-preview-overlay"
    );


    /*
    ------------------------------------------------------
    FORÇA POSICIONAMENTO FORA DO LAYOUT DO CHAT
    ------------------------------------------------------
    */

    Object.assign(
        dom.previewPane.style,
        {

            position:
                "fixed",

            top:
                "0",

            right:
                "0",

            bottom:
                "0",

            left:
                "0",

            width:
                "100vw",

            height:
                "100vh",

            minWidth:
                "100vw",

            minHeight:
                "100vh",

            maxWidth:
                "100vw",

            maxHeight:
                "100vh",

            margin:
                "0",

            padding:
                "0",

            display:
                "flex",

            flexDirection:
                "column",

            zIndex:
                "99999"

        }
    );


    /*
    ======================================================
    MARCA O DOCUMENTO COMO PREVIEW ABERTO
    ======================================================
    */

    document.documentElement.classList.add(
        "honey-preview-open"
    );

    document.body.classList.add(
        "honey-preview-open"
    );


    /*
    ======================================================
    RENDER SHELL
    ======================================================
    */

    renderPreviewShell();


    /*
    ======================================================
    RENDER ARTIFACT
    ======================================================
    */

    renderPreviewArtifact(
        normalized
    );


    /*
    ======================================================
    MOSTRA O PREVIEW
    ======================================================
    */

    dom.previewPane.style.display =
        "flex";


    /*
    ======================================================
    FOCO
    ======================================================
    */

    requestAnimationFrame(
        () => {

            try{

                dom.previewPane.focus();

            }catch(error){

                console.warn(
                    "Honey IA Preview focus:",
                    error
                );

            }

        }
    );

}


/*
==========================================================
PREVIEW FALLBACK
UNIVERSAL FULLSCREEN OVERLAY
==========================================================
*/

function createPreviewPaneFallback(){

    /*
    ======================================================
    CRIA CONTAINER PRINCIPAL
    ======================================================
    */

    const pane =
        document.createElement(
            "aside"
        );


    pane.id =
        "preview-pane";


    pane.className =
        "honey-preview-pane honey-preview-overlay";


    pane.setAttribute(
        "role",
        "dialog"
    );


    pane.setAttribute(
        "aria-modal",
        "true"
    );


    pane.setAttribute(
        "tabindex",
        "-1"
    );


    /*
    ======================================================
    ESTRUTURA
    ======================================================
    */

    pane.innerHTML = `

        <div class="honey-preview-header">

            <div class="honey-preview-title">
                Preview
            </div>

            <div class="honey-preview-actions"></div>

        </div>


        <div class="honey-preview-body">

            <iframe
                id="live-preview-iframe"
                title="Honey IA Preview"
                sandbox="allow-scripts allow-forms allow-modals"
            ></iframe>

        </div>

    `;


    /*
    ======================================================
    IMPORTANTE

    O PREVIEW É INSERIDO DIRECTAMENTE NO BODY.

    NÃO É INSERIDO DENTRO DO CHAT.
    NÃO É INSERIDO DENTRO DO CHAT PANEL.
    NÃO É INSERIDO DENTRO DO COMPOSER.

    ======================================================
    */

    document.body.appendChild(
        pane
    );


    /*
    ======================================================
    ESTADO INICIAL
    ======================================================
    */

    Object.assign(
        pane.style,
        {

            position:
                "fixed",

            top:
                "0",

            right:
                "0",

            bottom:
                "0",

            left:
                "0",

            width:
                "100vw",

            height:
                "100vh",

            minWidth:
                "100vw",

            minHeight:
                "100vh",

            maxWidth:
                "100vw",

            maxHeight:
                "100vh",

            margin:
                "0",

            padding:
                "0",

            display:
                "none",

            flexDirection:
                "column",

            zIndex:
                "99999",

            boxSizing:
                "border-box"

        }
    );


    /*
    ======================================================
    GUARDA DOM
    ======================================================
    */

    dom.previewPane =
        pane;


    dom.previewIframe =
        pane.querySelector(
            "#live-preview-iframe"
        );


    /*
    ======================================================
    INICIALIZA EVENTOS
    ======================================================
    */

    setupPreview();

}


/*
==========================================================
PREVIEW SHELL
UNIVERSAL FULLSCREEN
==========================================================
*/

function renderPreviewShell(){

    if(!dom.previewPane){

        return;

    }


    /*
    ======================================================
    HEADER
    ======================================================
    */

    let header =
        dom.previewPane.querySelector(
            ".honey-preview-header"
        );


    if(!header){

        header =
            document.createElement(
                "div"
            );

        header.className =
            "honey-preview-header";

        dom.previewPane.prepend(
            header
        );

    }


    /*
    ======================================================
    LIMPA HEADER
    ======================================================
    */

    header.innerHTML =
        "";


    /*
    ======================================================
    TÍTULO
    ======================================================
    */

    const title =
        document.createElement(
            "div"
        );


    title.className =
        "honey-preview-title";


    title.textContent =
        state.previewArtifact?.name ||
        "Preview";


    /*
    ======================================================
    ACÇÕES
    ======================================================
    */

    const actions =
        document.createElement(
            "div"
        );


    actions.className =
        "honey-preview-actions";


    /*
    ======================================================
    BOTÃO PREVIEW
    ======================================================
    */

    actions.appendChild(

        createPreviewButton(
            "Preview",
            "fa-eye",
            () => {

                state.previewMode =
                    "preview";

                renderPreviewArtifact(
                    state.previewArtifact
                );

            }
        )

    );


    /*
    ======================================================
    BOTÃO EDITAR
    ======================================================
    */

    if(
        state.previewArtifact?.editable !==
        false
    ){

        actions.appendChild(

            createPreviewButton(
                "Editar",
                "fa-code",
                () => {

                    state.previewMode =
                        "edit";

                    renderPreviewEditor(
                        state.previewArtifact
                    );

                }
            )

        );

    }


    /*
    ======================================================
    TELA CHEIA
    ======================================================
    */

    actions.appendChild(

        createPreviewButton(
            "Tela cheia",
            "fa-expand",
            enterPreviewFullscreen
        )

    );


    /*
    ======================================================
    DOWNLOAD
    ======================================================
    */

    actions.appendChild(

        createPreviewButton(
            "Baixar",
            "fa-download",
            () =>
                downloadArtifact(
                    state.previewArtifact
                )
        )

    );


    /*
    ======================================================
    PARTILHAR
    ======================================================
    */

    actions.appendChild(

        createPreviewButton(
            "Partilhar",
            "fa-share-nodes",
            shareArtifactPreview
        )

    );


    /*
    ======================================================
    PUBLICAR
    ======================================================
    */

    actions.appendChild(

        createPreviewButton(
            "Publicar",
            "fa-cloud-arrow-up",
            deployArtifact
        )

    );


    /*
    ======================================================
    FECHAR
    ======================================================
    */

    actions.appendChild(

        createPreviewButton(
            "Fechar",
            "fa-xmark",
            () => {

                closeArtifactPreview();

            }
        )

    );


    /*
    ======================================================
    MONTA HEADER
    ======================================================
    */

    header.appendChild(
        title
    );


    header.appendChild(
        actions
    );


    /*
    ======================================================
    VERSION BAR
    ======================================================
    */

    renderVersionBar();

}


/*
==========================================================
VERSION BAR
==========================================================
*/

function renderVersionBar(){

    if(!dom.previewPane){

        return;

    }


    /*
    ======================================================
    REMOVE BARRA ANTERIOR
    ======================================================
    */

    dom.previewPane
        .querySelector(
            ".honey-preview-version-bar"
        )
        ?.remove();


    const artifact =
        state.previewArtifact;


    if(!artifact){

        return;

    }


    /*
    ======================================================
    VERSÕES
    ======================================================
    */

    const versions =
        getArtifactVersions(
            artifact
        );


    if(!versions.length){

        return;

    }


    /*
    ======================================================
    CRIA BARRA
    ======================================================
    */

    const bar =
        document.createElement(
            "div"
        );


    bar.className =
        "honey-preview-version-bar";


    /*
    ======================================================
    LABEL
    ======================================================
    */

    const label =
        document.createElement(
            "span"
        );


    label.textContent =
        "Versão:";


    /*
    ======================================================
    SELECT
    ======================================================
    */

    const select =
        document.createElement(
            "select"
        );


    versions.forEach(
        version => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                version.id;


            option.textContent =
                `v${version.version}`;


            if(
                version.content ===
                artifact.content
            ){

                option.selected =
                    true;

            }


            select.appendChild(
                option
            );

        }
    );


    /*
    ======================================================
    TROCA DE VERSÃO
    ======================================================
    */

    select.addEventListener(
        "change",
        () => {

            const selected =
                versions.find(
                    version =>
                        version.id ===
                        select.value
                );


            if(!selected){

                return;

            }


            state.previewArtifact = {

                ...artifact,

                content:
                    selected.content,

                mime:
                    selected.mime,

                language:
                    selected.language

            };


            renderPreviewArtifact(
                state.previewArtifact
            );

        }
    );


    /*
    ======================================================
    COMPARAR
    ======================================================
    */

    const compare =
        document.createElement(
            "button"
        );


    compare.type =
        "button";


    compare.textContent =
        "Comparar";


    compare.addEventListener(
        "click",
        event => {

            event.preventDefault();

            event.stopPropagation();

            compareArtifactVersions(
                artifact
            );

        }
    );


    /*
    ======================================================
    REVERTER
    ======================================================
    */

    const restore =
        document.createElement(
            "button"
        );


    restore.type =
        "button";


    restore.textContent =
        "Reverter";


    restore.addEventListener(
        "click",
        event => {

            event.preventDefault();

            event.stopPropagation();

            restoreArtifactVersion(
                artifact,
                select.value
            );

        }
    );


    /*
    ======================================================
    MONTA BARRA
    ======================================================
    */

    bar.appendChild(
        label
    );


    bar.appendChild(
        select
    );


    bar.appendChild(
        compare
    );


    bar.appendChild(
        restore
    );


    dom.previewPane.prepend(
        bar
    );

}


/*
==========================================================
RENDER PREVIEW
UNIVERSAL ARTIFACT RENDERER
==========================================================
*/

function renderPreviewArtifact(
    artifact
){

    if(!artifact){

        return;

    }


    /*
    ======================================================
    EDITOR
    ======================================================
    */

    if(
        state.previewMode ===
        "edit"
    ){

        renderPreviewEditor(
            artifact
        );

        return;

    }


    /*
    ======================================================
    PREVIEW PANE
    ======================================================
    */

    if(!dom.previewPane){

        return;

    }


    const body =
        ensurePreviewBody();


    if(!body){

        return;

    }


    /*
    ======================================================
    LIMPA CONTEÚDO
    ======================================================
    */

    body.innerHTML =
        "";


    /*
    ======================================================
    DETECTA TIPO
    ======================================================
    */

    const type =
        detectArtifactType(
            artifact
        );


    /*
    ======================================================
    HTML
    ======================================================
    */

    if(
        type ===
        "html"
    ){

        const iframe =
            document.createElement(
                "iframe"
            );


        iframe.id =
            "live-preview-iframe";


        iframe.title =
            artifact.name ||
            "Honey IA Preview";


        iframe.setAttribute(
            "sandbox",
            "allow-scripts allow-forms allow-modals"
        );


        iframe.setAttribute(
            "loading",
            "eager"
        );


        iframe.srcdoc =
            buildHTMLPreviewDocument(
                artifact.content
            );


        body.appendChild(
            iframe
        );


        dom.previewIframe =
            iframe;


        state.previewIframeReady =
            false;


        iframe.addEventListener(
            "load",
            () => {

                state.previewIframeReady =
                    true;

            }
        );


        return;

    }


    /*
    ======================================================
    SVG
    ======================================================
    */

    if(
        type ===
        "svg"
    ){

        const iframe =
            document.createElement(
                "iframe"
            );


        iframe.title =
            artifact.name ||
            "SVG Preview";


        iframe.setAttribute(
            "sandbox",
            ""
        );


        iframe.srcdoc = `

            <!doctype html>

            <html>

            <head>

                <meta charset="utf-8">

                <meta
                    name="viewport"
                    content="width=device-width,initial-scale=1"
                >

                <style>

                    html,
                    body{

                        margin:0;
                        width:100%;
                        min-height:100%;
                        background:#fff;

                    }

                    body{

                        display:flex;
                        align-items:center;
                        justify-content:center;

                        padding:40px;

                        box-sizing:border-box;

                    }

                    svg{

                        display:block;

                        width:auto;
                        height:auto;

                        max-width:100%;
                        max-height:90vh;

                    }

                </style>

            </head>

            <body>

                ${sanitizeSVG(
                    artifact.content
                )}

            </body>

            </html>

        `;


        body.appendChild(
            iframe
        );


        dom.previewIframe =
            iframe;


        return;

    }


    /*
    ======================================================
    MARKDOWN
    ======================================================
    */

    if(
        type ===
        "markdown"
    ){

        const article =
            document.createElement(
                "article"
            );


        article.className =
            "honey-preview-document";


        article.innerHTML =
            renderMarkdown(
                artifact.content
            );


        highlightCode(
            article
        );


        body.appendChild(
            article
        );


        return;

    }


    /*
    ======================================================
    JSON
    ======================================================
    */

    if(
        type ===
        "json"
    ){

        const pre =
            document.createElement(
                "pre"
            );


        pre.textContent =
            formatJSON(
                artifact.content
            );


        body.appendChild(
            pre
        );


        return;

    }


    /*
    ======================================================
    CSV
    ======================================================
    */

    if(
        type ===
        "csv"
    ){

        const table =
            renderCSVTable(
                artifact.content
            );


        body.appendChild(
            table
        );


        return;

    }


    /*
    ======================================================
    CÓDIGO
    ======================================================
    */

    const codeWrapper =
        document.createElement(
            "div"
        );


    codeWrapper.className =
        "honey-preview-code";


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
        artifact.content;


    pre.appendChild(
        code
    );


    codeWrapper.appendChild(
        pre
    );


    body.appendChild(
        codeWrapper
    );


    highlightCode(
        codeWrapper
    );

}


/*
==========================================================
PREVIEW EDITOR
==========================================================
*/

function renderPreviewEditor(
    artifact
){

    if(!dom.previewPane){

        return;

    }


    const body =
        ensurePreviewBody();


    if(!body){

        return;

    }


    /*
    ======================================================
    LIMPA
    ======================================================
    */

    body.innerHTML =
        "";


    /*
    ======================================================
    LAYOUT
    ======================================================
    */

    const layout =
        document.createElement(
            "div"
        );


    layout.className =
        "honey-preview-editor";


    /*
    ======================================================
    EDITOR
    ======================================================
    */

    const editor =
        document.createElement(
            "textarea"
        );


    editor.className =
        "honey-preview-editor-input";


    editor.value =
        artifact.content;


    editor.spellcheck =
        false;


    /*
    ======================================================
    RESULTADO
    ======================================================
    */

    const preview =
        document.createElement(
            "div"
        );


    preview.className =
        "honey-preview-editor-result";


    /*
    ======================================================
    MONTA EDITOR
    ======================================================
    */

    layout.appendChild(
        editor
    );


    layout.appendChild(
        preview
    );


    body.appendChild(
        layout
    );


    /*
    ======================================================
    GUARDA EDITOR
    ======================================================
    */

    state.previewEditor =
        editor;


    /*
    ======================================================
    UPDATE
    ======================================================
    */

    const update =
        debounce(
            () => {

                const content =
                    editor.value;


                const updated = {

                    ...artifact,

                    content

                };


                state.previewArtifact =
                    updated;


                updateArtifactInState(
                    updated
                );


                renderInlineEditorResult(
                    updated,
                    preview
                );

            },
            80
        );


    /*
    ======================================================
    INPUT
    ======================================================
    */

    editor.addEventListener(
        "input",
        update
    );


    /*
    ======================================================
    PRIMEIRO RENDER
    ======================================================
    */

    renderInlineEditorResult(
        artifact,
        preview
    );

}


/*
==========================================================
INLINE EDIT RESULT
==========================================================
*/

function renderInlineEditorResult(
    artifact,
    container
){

    container.innerHTML = "";

    const type =
        detectArtifactType(
            artifact
        );

    if(
        type ===
        "html"
    ){

        const iframe =
            document.createElement(
                "iframe"
            );

        iframe.setAttribute(
            "sandbox",
            "allow-scripts allow-forms"
        );

        iframe.srcdoc =
            buildHTMLPreviewDocument(
                artifact.content
            );

        container.appendChild(
            iframe
        );

        return;

    }

    if(
        type ===
        "markdown"
    ){

        container.innerHTML =
            renderMarkdown(
                artifact.content
            );

        highlightCode(
            container
        );

        return;

    }

    if(
        type ===
        "json"
    ){

        const pre =
            document.createElement(
                "pre"
            );

        pre.textContent =
            formatJSON(
                artifact.content
            );

        container.appendChild(
            pre
        );

        return;

    }

    if(
        type ===
        "csv"
    ){

        container.appendChild(
            renderCSVTable(
                artifact.content
            )
        );

        return;

    }

    const pre =
        document.createElement(
            "pre"
        );

    pre.textContent =
        artifact.content;

    container.appendChild(
        pre
    );

}


/*
==========================================================
UPDATE ARTIFACT
==========================================================
*/

function updateArtifactInState(
    artifact
){

    const key =
        getArtifactKey(
            artifact
        );

    const index =
        state.artifacts.findIndex(
            item =>
                getArtifactKey(
                    item
                ) ===
                key
        );

    if(index < 0){

        state.artifacts.push(
            artifact
        );

    }
    else{

        state.artifacts[index] =
            artifact;

    }

}


/*
==========================================================
PREVIEW BODY
==========================================================
*/

function ensurePreviewBody(){

    if(!dom.previewPane){

        return null;

    }

    let body =
        dom.previewPane.querySelector(
            ".honey-preview-body"
        );

    if(!body){

        body =
            document.createElement(
                "div"
            );

        body.className =
            "honey-preview-body";

        dom.previewPane.appendChild(
            body
        );

    }

    return body;

}


/*
==========================================================
HTML PREVIEW
==========================================================
*/

function buildHTMLPreviewDocument(
content
){

    const raw =
        String(
            content || ""
        );

    if(
        /<html[\s>]/i.test(
            raw
        )
    ){

        return injectPreviewSecurity(
            raw
        );

    }

    return `

        <!doctype html>

        <html lang="pt">

        <head>

            <meta charset="UTF-8">

            <meta
                name="viewport"
                content="width=device-width,initial-scale=1"
            >

        </head>

        <body>

            ${raw}

        </body>

        </html>

    `;

}


function injectPreviewSecurity(
html
){

    return String(
        html
    )
        .replace(
            /<head([^>]*)>/i,
            `<head$1>
                <meta charset="UTF-8">
                <meta
                    name="viewport"
                    content="width=device-width,initial-scale=1"
                >`
        )
        .replace(
            /<script[^>]*src=["']([^"']+)["'][^>]*><\/script>/gi,
            ""
        );

}


/*
==========================================================
ARTIFACT TYPE
==========================================================
*/

function detectArtifactType(
artifact
){

    const language =
        normalizeLanguage(
            artifact?.language
        );

    const mime =
        normalizeMime(
            artifact?.mime
        );

    const name =
        String(
            artifact?.name ||
            ""
        ).toLowerCase();

    if(
        language ===
        "html" ||
        mime ===
        "text/html" ||
        /\.(html?|htm)$/.test(
            name
        )
    ){

        return "html";

    }

    if(
        language ===
        "svg" ||
        mime ===
        "image/svg+xml" ||
        /\.svg$/.test(
            name
        )
    ){

        return "svg";

    }

    if(
        language ===
        "markdown" ||
        mime ===
        "text/markdown" ||
        /\.(md|markdown)$/.test(
            name
        )
    ){

        return "markdown";

    }

    if(
        language ===
        "json" ||
        mime ===
        "application/json" ||
        /\.json$/.test(
            name
        )
    ){

        return "json";

    }

    if(
        language ===
        "csv" ||
        mime ===
        "text/csv" ||
        /\.csv$/.test(
            name
        )
    ){

        return "csv";

    }

    return "code";

}


/*
==========================================================
SVG SANITIZATION
==========================================================
*/

function sanitizeSVG(
svg
){

    const template =
        document.createElement(
            "template"
        );

    template.innerHTML =
        String(
            svg || ""
        );

    template.content
        .querySelectorAll(
            "script,foreignObject"
        )
        .forEach(
            node =>
                node.remove()
        );

    template.content
        .querySelectorAll(
            "*"
        )
        .forEach(
            node => {

                [...node.attributes]
                    .forEach(
                        attribute => {

                            if(
                                attribute.name
                                    .toLowerCase()
                                    .startsWith(
                                        "on"
                                    )
                            ){

                                node.removeAttribute(
                                    attribute.name
                                );

                            }

                        }
                    );

            }
        );

    return template.innerHTML;

}


/*
==========================================================
JSON
==========================================================
*/

function formatJSON(
content
){

    try{

        return JSON.stringify(
            JSON.parse(
                content
            ),
            null,
            2
        );

    }
    catch(error){

        return String(
            content || ""
        );

    }

}


/*
==========================================================
CSV
==========================================================
*/

function renderCSVTable(
content
){

    const table =
        document.createElement(
            "table"
        );

    table.className =
        "honey-preview-table";

    const rows =
        parseCSV(
            content
        );

    if(!rows.length){

        return table;

    }

    rows.forEach(
        (row, rowIndex) => {

            const tr =
                document.createElement(
                    "tr"
                );

            row.forEach(
                cell => {

                    const element =
                        document.createElement(
                            rowIndex === 0
                                ? "th"
                                : "td"
                        );

                    element.textContent =
                        cell;

                    tr.appendChild(
                        element
                    );

                }
            );

            table.appendChild(
                tr
            );

        }
    );

    return table;

}


function parseCSV(
content
){

    const rows = [];

    let row = [];

    let cell = "";

    let quoted = false;

    const text =
        String(
            content || ""
        );

    for(
        let i = 0;
        i < text.length;
        i++
    ){

        const char =
            text[i];

        const next =
            text[i + 1];

        if(
            char ===
            '"' &&
            quoted &&
            next ===
            '"'
        ){

            cell += '"';

            i++;

            continue;

        }

        if(
            char ===
            '"'
        ){

            quoted =
                !quoted;

            continue;

        }

        if(
            char ===
            "," &&
            !quoted
        ){

            row.push(
                cell
            );

            cell =
                "";

            continue;

        }

        if(
            (
                char ===
                "\n" ||
                char ===
                "\r"
            ) &&
            !quoted
        ){

            if(
                char ===
                "\r" &&
                next ===
                "\n"
            ){

                i++;

            }

            row.push(
                cell
            );

            rows.push(
                row
            );

            row = [];

            cell =
                "";

            continue;

        }

        cell +=
            char;

    }

    if(
        cell ||
        row.length
    ){

        row.push(
            cell
        );

        rows.push(
            row
        );

    }

    return rows;

}


/*
==========================================================
DOWNLOAD
==========================================================
*/

function downloadArtifact(
artifact
){

    if(!artifact){

        return;

    }

    const content =
        String(
            artifact.content ||
            ""
        );

    const mime =
        artifact.mime ||
        mimeFromArtifact(
            artifact
        );

    const blob =
        new Blob(
            [content],
            {
                type:
                    mime
            }
        );

    const url =
        URL.createObjectURL(
            blob
        );

    const anchor =
        document.createElement(
            "a"
        );

    anchor.href =
        url;

    anchor.download =
        ensureArtifactFilename(
            artifact
        );

    document.body.appendChild(
        anchor
    );

    anchor.click();

    anchor.remove();

    setTimeout(
        () =>
            URL.revokeObjectURL(
                url
            ),
        1000
    );

}


function ensureArtifactFilename(
artifact
){

    let name =
        String(
            artifact.name ||
            "honey-result"
        ).trim();

    if(
        /\.[a-z0-9]+$/i.test(
            name
        )
    ){

        return name;

    }

    const extension =
        extensionFromArtifact(
            artifact
        );

    return `${name}.${extension}`;

}


function extensionFromArtifact(
artifact
){

    const language =
        normalizeLanguage(
            artifact?.language
        );

    const map = {

        html:
            "html",

        javascript:
            "js",

        typescript:
            "ts",

        jsx:
            "jsx",

        tsx:
            "tsx",

        css:
            "css",

        python:
            "py",

        java:
            "java",

        json:
            "json",

        csv:
            "csv",

        markdown:
            "md",

        svg:
            "svg",

        sql:
            "sql",

        shell:
            "sh"

    };

    return map[language] ||
        "txt";

}


function mimeFromArtifact(
artifact
){

    const type =
        detectArtifactType(
            artifact
        );

    const map = {

        html:
            "text/html;charset=utf-8",

        svg:
            "image/svg+xml;charset=utf-8",

        markdown:
            "text/markdown;charset=utf-8",

        json:
            "application/json;charset=utf-8",

        csv:
            "text/csv;charset=utf-8",

        code:
            "text/plain;charset=utf-8"

    };

    return map[type] ||
        "text/plain;charset=utf-8";

}


/*
==========================================================
FULLSCREEN PREVIEW
==========================================================
*/

async function enterPreviewFullscreen(){

    if(!dom.previewPane){

        return;

    }

    try{

        if(
            dom.previewPane.requestFullscreen
        ){

            await dom.previewPane.requestFullscreen();

            state.previewFullscreen =
                true;

            return;

        }

        dom.previewPane.classList.add(
            "honey-preview-fullscreen"
        );

        state.previewFullscreen =
            true;

    }
    catch(error){

        dom.previewPane.classList.add(
            "honey-preview-fullscreen"
        );

        state.previewFullscreen =
            true;

    }

}


async function exitPreviewFullscreen(){

    try{

        if(
            document.fullscreenElement
        ){

            await document.exitFullscreen();

        }

    }
    catch(error){

        /*
            Ignore.
        */

    }

    dom.previewPane?.classList.remove(
        "honey-preview-fullscreen"
    );

    state.previewFullscreen =
        false;

}


/*
==========================================================
CLOSE PREVIEW
==========================================================
*/

function closeArtifactPreview(
    notify = false
){

    /*
     * O Preview é um overlay independente.
     * Fechar o Preview NÃO deve:
     *
     * - alterar o layout do Chat
     * - esconder o Chat
     * - alterar a largura do Chat
     * - alterar a posição do composer
     * - alterar o cabeçalho
     * - remover elementos do Chat
     */

    if(dom.previewPane){

        dom.previewPane.classList.remove(
            "open",
            "active",
            "fullscreen"
        );

        /*
         * Mantemos o Preview no DOM para poder
         * reabri-lo rapidamente.
         */

        dom.previewPane.style.display =
            "none";

        dom.previewPane.style.position =
            "";

        dom.previewPane.style.inset =
            "";

        dom.previewPane.style.width =
            "";

        dom.previewPane.style.height =
            "";

        dom.previewPane.style.maxWidth =
            "";

        dom.previewPane.style.maxHeight =
            "";

        dom.previewPane.style.zIndex =
            "";

    }

    /*
     * Limpa apenas o estado relacionado ao Preview.
     */

    state.previewFullscreen =
        false;

    state.previewArtifact =
        null;

    state.activeArtifactKey =
        null;

    state.previewEditor =
        null;

    state.previewIframeReady =
        false;

    /*
     * Remove apenas as classes globais usadas
     * pelo overlay do Preview.
     *
     * Nenhuma classe do Chat é alterada.
     */

    document.documentElement.classList.remove(
        "honey-preview-open"
    );

    document.body.classList.remove(
        "honey-preview-open"
    );

    /*
     * Não chamamos:
     *
     * exitPreviewFullscreen()
     *
     * porque o Preview já é tratado como fullscreen
     * através do próprio overlay.
     */

    if(notify){

        showToast(
            "Preview fechado.",
            "info"
        );

    }

}

/*
==========================================================
PREVIEW FULLSCREEN
==========================================================
*/

/*
 * Abre o Preview como uma camada independente,
 * ocupando toda a viewport.
 *
 * IMPORTANTE:
 * Não altera a estrutura, largura ou posição do Chat.
 */

function enterPreviewFullscreen(){

    if(!dom.previewPane){

        return;

    }

    state.previewFullscreen =
        true;

    dom.previewPane.classList.add(
        "open",
        "active",
        "fullscreen"
    );

    dom.previewPane.style.display =
        "flex";

    dom.previewPane.style.position =
        "fixed";

    dom.previewPane.style.top =
        "0";

    dom.previewPane.style.right =
        "0";

    dom.previewPane.style.bottom =
        "0";

    dom.previewPane.style.left =
        "0";

    dom.previewPane.style.width =
        "100vw";

    dom.previewPane.style.height =
        "100vh";

    dom.previewPane.style.maxWidth =
        "100vw";

    dom.previewPane.style.maxHeight =
        "100vh";

    dom.previewPane.style.zIndex =
        "99999";

    document.documentElement.classList.add(
        "honey-preview-open"
    );

    document.body.classList.add(
        "honey-preview-open"
    );

}


/*
 * Sai do modo fullscreen do Preview.
 *
 * Não altera absolutamente nada no Chat.
 */

function exitPreviewFullscreen(){

    if(!dom.previewPane){

        state.previewFullscreen =
            false;

        return;

    }

    state.previewFullscreen =
        false;

    dom.previewPane.classList.remove(
        "fullscreen"
    );

    dom.previewPane.style.display =
        "none";

    dom.previewPane.style.position =
        "";

    dom.previewPane.style.top =
        "";

    dom.previewPane.style.right =
        "";

    dom.previewPane.style.bottom =
        "";

    dom.previewPane.style.left =
        "";

    dom.previewPane.style.width =
        "";

    dom.previewPane.style.height =
        "";

    dom.previewPane.style.maxWidth =
        "";

    dom.previewPane.style.maxHeight =
        "";

    dom.previewPane.style.zIndex =
        "";

    document.documentElement.classList.remove(
        "honey-preview-open"
    );

    document.body.classList.remove(
        "honey-preview-open"
    );

}
/*
==========================================================
VERSION COMPARE
==========================================================
*/

function compareArtifactVersions(
artifact
){

    const versions =
        getArtifactVersions(
            artifact
        );

    if(
        versions.length <
        2
    ){

        showToast(
            "Ainda não existem versões suficientes para comparar.",
            "info"
        );

        return;

    }

    const current =
        versions[
            versions.length - 1
        ];

    const previous =
        versions[
            versions.length - 2
        ];

    const container =
        document.createElement(
            "div"
        );

    container.className =
        "honey-version-compare";

    const left =
        document.createElement(
            "pre"
        );

    const right =
        document.createElement(
            "pre"
        );

    left.textContent =
        previous.content;

    right.textContent =
        current.content;

    container.appendChild(
        createVersionPanel(
            `v${previous.version}`,
            left
        )
    );

    container.appendChild(
        createVersionPanel(
            `v${current.version}`,
            right
        )
    );

    const body =
        ensurePreviewBody();

    body.innerHTML = "";

    body.appendChild(
        container
    );

}


function createVersionPanel(
title,
content
){

    const panel =
        document.createElement(
            "section"
        );

    const heading =
        document.createElement(
            "h3"
        );

    heading.textContent =
        title;

    panel.appendChild(
        heading
    );

    panel.appendChild(
        content
    );

    return panel;

}


/*
==========================================================
RESTORE VERSION
==========================================================
*/

function restoreArtifactVersion(
artifact,
versionId
){

    const versions =
        getArtifactVersions(
            artifact
        );

    const selected =
        versions.find(
            version =>
                version.id ===
                versionId
        );

    if(!selected){

        return;

    }

    const restored = {

        ...artifact,

        content:
            selected.content,

        mime:
            selected.mime,

        language:
            selected.language

    };

    updateArtifactInState(
        restored
    );

    state.previewArtifact =
        restored;

    registerArtifactVersion(
        restored
    );

    renderVersionBar();

    renderPreviewArtifact(
        restored
    );

    showToast(
        `Versão v${selected.version} restaurada.`,
        "success"
    );

}


/*
==========================================================
SHARE PREVIEW
==========================================================
*/

async function shareArtifactPreview(){

    const artifact =
        state.previewArtifact;

    if(!artifact){

        return;

    }

    /*
        Primeiro tenta o backend.
        Se ainda não existir endpoint de partilha,
        criamos uma partilha local temporária baseada no
        conteúdo atual.
    */

    try{

        const data =
            await apiRequest(
                "/preview/share",
                {

                    method:
                        "POST",

                    body:
                        JSON.stringify({

                            conversationId:
                                state.conversationId,

                            artifact: {

                                name:
                                    artifact.name,

                                content:
                                    artifact.content,

                                mime:
                                    artifact.mime,

                                language:
                                    artifact.language

                            }

                        })

                }
            );

        const url =
            data?.url ||
            data?.shareUrl ||
            data?.previewUrl;

        if(url){

            await copyShareURL(
                url
            );

            return;

        }

    }
    catch(error){

        /*
            Endpoint may not exist yet.
            Use local fallback.
        */

        console.info(
            "[HONEY PREVIEW] Share API unavailable; using local preview."
        );

    }

    const payload = {

        name:
            artifact.name,

        mime:
            artifact.mime,

        language:
            artifact.language,

        content:
            artifact.content

    };

    try{

        const encoded =
            base64EncodeUnicode(
                JSON.stringify(
                    payload
                )
            );

        const url =
            `${window.location.origin}${window.location.pathname}#preview=${encoded}`;

        await copyShareURL(
            url
        );

    }
    catch(error){

        showToast(
            "Não foi possível criar a partilha.",
            "error"
        );

    }

}


async function copyShareURL(
url
){

    const copied =
        await copyText(
            url
        );

    if(
        copied
    ){

        showToast(
            "Link do Preview copiado.",
            "success"
        );

    }
    else{

        showToast(
            "Link gerado: " + url,
            "info"
        );

    }

}


function base64EncodeUnicode(
value
){

    return btoa(
        encodeURIComponent(
            value
        ).replace(
            /%([0-9A-F]{2})/g,
            (_, p1) =>
                String.fromCharCode(
                    parseInt(
                        p1,
                        16
                    )
                )
        )
    );

}


/*
==========================================================
DEPLOY
==========================================================
*/

async function deployArtifact(){

    const artifact =
        state.previewArtifact;

    if(!artifact){

        return;

    }

    showToast(
        "A preparar publicação...",
        "info"
    );

    try{

        const data =
            await apiRequest(
                "/preview/deploy",
                {

                    method:
                        "POST",

                    body:
                        JSON.stringify({

                            conversationId:
                                state.conversationId,

                            artifact: {

                                name:
                                    artifact.name,

                                content:
                                    artifact.content,

                                mime:
                                    artifact.mime,

                                language:
                                    artifact.language

                            }

                        })

                }
            );

        const url =
            data?.url ||
            data?.deployUrl ||
            data?.deploymentUrl;

        if(url){

            const open =
                window.confirm(
                    "O projeto foi publicado. Deseja abrir o endereço público?"
                );

            if(open){

                window.open(
                    url,
                    "_blank",
                    "noopener,noreferrer"
                );

            }

            return;

        }

        showToast(
            "O serviço de publicação não devolveu um endereço.",
            "warning"
        );

    }
    catch(error){

        /*
            Não fingimos que o deploy funcionou.
        */

        showToast(
            "O deploy ainda precisa de uma integração de publicação no backend.",
            "warning"
        );

        console.warn(
            "[HONEY PREVIEW] Deploy:",
            error
        );

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
        !Array.isArray(
            tools
        )
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
                        String(
                            item.id
                        ) ===
                        String(
                            normalized.id
                        )
                );

            if(index >= 0){

                state.tools[index] = {

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

    const nearBottom =
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

            text.textContent =
                `${tool.name} · ${
                    tool.success
                        ? "Concluído"
                        : "Falhou"
                }`;

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
        nearBottom;

    if(nearBottom){

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

    if(!dom.chatMessages){

        return;

    }

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

    dom.chatMessages.appendChild(
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
EMPTY STREAM
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

            dom.btnSend.innerHTML =
                `<i class="fa-solid fa-stop"></i>`;

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

            dom.btnSend.innerHTML =
                `<i class="fa-solid fa-paper-plane"></i>`;

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

    /*
        NÃO desativamos o input durante a geração.
        Isto evita sensação de bloqueio e mantém o workspace
        responsivo.

        O botão Send transforma-se em Stop.
    */

    if(dom.chatInput){

        dom.chatInput.disabled =
            false;

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

    if(dom.chatInput){

        dom.chatInput.value =
            "";

        dom.chatInput.style.height =
            "auto";

    }

    removeAttachment();

}


/*
==========================================================
VOICE
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
                Already stopped.
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
                    event.results[index][0]
                        ?.transcript ||
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
        event => {

            console.warn(
                "[HONEY CHAT] Voice error:",
                event
            );

            if(
                event?.error !==
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

    const extension =
        getFileExtension(
            file.name
        );

    const supported =
        SUPPORTED_TEXT_EXTENSIONS.includes(
            extension
        );

    state.selectedFile =
        file;

    state.selectedFileSupported =
        supported;

    if(
        !supported
    ){

        state.selectedFileContent =
            "";

        updateAttachmentUI();

        showToast(
            "O ficheiro foi anexado, mas o seu formato não pode ser lido diretamente pelo chat.",
            "warning"
        );

        return;

    }

    try{

        state.selectedFileContent =
            await file.text();

        updateAttachmentUI();

        showToast(
            "Ficheiro anexado.",
            "success"
        );

    }
    catch(error){

        removeAttachment();

        showToast(
            "Não foi possível ler o ficheiro.",
            "error"
        );

    }

}


function updateAttachmentUI(){

    if(
        dom.attachmentBar
    ){

        dom.attachmentBar.style.display =
            state.selectedFile
                ? ""
                : "none";

    }

    if(
        dom.attachedFileName
    ){

        dom.attachedFileName.textContent =
            state.selectedFile?.name ||
            "";

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


function getFileExtension(
filename
){

    const name =
        String(
            filename ||
            ""
        ).toLowerCase();

    const parts =
        name.split(
            "."
        );

    return parts.length >
        1
        ? parts.pop()
        : "";

}


function buildPromptWithFileContext(
prompt
){

    const filename =
        state.selectedFile?.name ||
        "ficheiro";

    return `

${prompt}

==================================================
FICHEIRO ANEXADO
==================================================

Nome:
${filename}

Conteúdo:
--------------------------------------------------
${state.selectedFileContent}
--------------------------------------------------

Use o conteúdo do ficheiro como contexto da solicitação.
Não invente conteúdo que não esteja presente no ficheiro.

`;

}


/*
==========================================================
SEARCH
==========================================================
*/

function setupSearch(){

    dom.globalSearch?.addEventListener(
        "input",
        event => {

            state.searchQuery =
                String(
                    event.target.value ||
                    ""
                ).trim().toLowerCase();

            renderHistory();

        }
    );

}


function filterConversations(
conversations
){

    if(
        !state.searchQuery
    ){

        return conversations;

    }

    return conversations.filter(
        conversation =>
            String(
                conversation.title ||
                ""
            )
                .toLowerCase()
                .includes(
                    state.searchQuery
                )
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

    const filtered =
        filterConversations(
            Array.isArray(
                conversations
            )
                ? conversations
                : []
        );

    if(!filtered.length){

        dom.historyContainer.innerHTML = `

            <div class="empty-state">

                <div class="empty-icon">

                    <i class="fa-solid fa-comments"></i>

                </div>

                <h3>
                    ${
                        state.searchQuery
                            ? "Nenhuma conversa encontrada"
                            : "O seu histórico aparecerá aqui"
                    }
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

    filtered.forEach(
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
                () =>
                    openConversation(
                        id
                    )
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

        stopGeneration();

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
                    String(
                        conversationId
                    )
            );

        if(
            String(
                state.conversationId
            ) ===
            String(
                conversationId
            )
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

    if(!dom.userBox){

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
            dom.userBox.querySelector(
                "strong"
            );

        const small =
            dom.userBox.querySelector(
                "small"
            );

        const avatarElement =
            dom.userBox.querySelector(
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


function updateConversationHeader(
conversation
){

    if(
        dom.conversationTitle &&
        conversation
    ){

        dom.conversationTitle.textContent =
            conversation.title ||
            "Nova Conversa";

    }

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
                ) ===
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

    if(conversation){

        addConversationToState(
            conversation
        );

    }

}


/*
==========================================================
REFRESH
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
                "[HONEY CHAT] Refresh failed:",
                error
            );

        }

    }

}


/*
==========================================================
DEBOUNCE
==========================================================
*/

function debounce(
callback,
delay
){

    let timer =
        null;

    return function(...args){

        clearTimeout(
            timer
        );

        timer =
            setTimeout(
                () =>
                    callback.apply(
                        this,
                        args
                    ),
                delay
            );

    };

}


/*
==========================================================
API ERROR
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
UTILITY
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

    return `honey-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`;

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

            previewArtifact:
                state.previewArtifact,

            previewMode:
                state.previewMode

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


    downloadArtifact(
        artifact
    ){

        downloadArtifact(
            artifact
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
    "[HONEY IA] Chat Engine V7.0 initialized."
);

console.info(
    "[HONEY IA] JSON + SSE + NDJSON + text streaming enabled."
);

console.info(
    "[HONEY IA] AbortController generation control enabled."
);

console.info(
    "[HONEY IA] User controlled scroll enabled."
);

console.info(
    "[HONEY IA] Universal artifact preview enabled."
);

console.info(
    "[HONEY IA] Live artifact editing enabled."
);

console.info(
    "[HONEY IA] Artifact versioning enabled."
);

console.info(
    "[HONEY IA] Fullscreen / download / share / deploy hooks enabled."
);
