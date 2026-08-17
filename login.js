/*
==========================================
HONEY IA OS
LOGIN CONTROLLER
Social Authentication
V12.0

AUTHENTICATION
------------------------------------------
• Google Identity Services
• Facebook Login
• Automatic account creation
• JWT session
• Workspace authentication gate
• No local registration
• No email/password
• No email verification
• No password recovery

FLOW
------------------------------------------
Google
    ↓
Google Credential
    ↓
/api/auth/google
    ↓
JWT
    ↓
Workspace

Facebook
    ↓
Facebook Access Token
    ↓
/api/auth/facebook
    ↓
JWT
    ↓
Workspace
==========================================
*/


import authmanager from "./auth.js";



class LoginController {


    constructor(){


        /*
        ==========================================
        CORE STATE
        ==========================================
        */


        this.container = null;

        this.initialized = false;

        this.redirecting = false;


        /*
        ==========================================
        GOOGLE STATE
        ==========================================
        */


        this.googleInitialized = false;

        this.googleLoading = false;

        this.googleLoadingPromise = null;

        this.googleClientId = "";

        this.googleScriptPromise = null;

        this.googleConfigPromise = null;

        this.googleCredentialHandler = null;


        /*
        ==========================================
        FACEBOOK STATE
        ==========================================
        */


        this.facebookInitialized = false;

        this.facebookLoading = false;

        this.facebookLoadingPromise = null;

        this.facebookAppId = "";

        this.facebookVersion = "v23.0";

        this.facebookConfigPromise = null;

        this.facebookScriptPromise = null;


        /*
        ==========================================
        GENERAL LOADING
        ==========================================
        */


        this.loadingActions = new Set();


    }









    /*
    ==========================================
    INITIALIZE
    ==========================================
    */


    async init(){


        if(this.initialized){


            if(authmanager.isAuthenticated()){

                this.hideLoginInterface();

            }

            else if(this.container){

                this.showLoginInterface();

            }


            return;

        }



        this.initialized = true;



        /*
        --------------------------------------
        WAIT FOR AUTH SESSION
        --------------------------------------
        */


        await authmanager.waitUntilReady();



        /*
        --------------------------------------
        EXISTING SESSION
        --------------------------------------
        */


        if(authmanager.isAuthenticated()){

            this.hideLoginInterface();

            return;

        }



        /*
        --------------------------------------
        CREATE LOGIN UI
        --------------------------------------
        */


        this.createContainer();

        this.showLoginInterface();

        this.render();

        this.attachEvents();



        /*
        --------------------------------------
        PREPARE SOCIAL AUTH
        --------------------------------------
        */


        this.setupGoogleLogin().catch(

            error => {

                console.warn(

                    "GOOGLE SETUP:",

                    error

                );

            }

        );



        this.setupFacebookLogin().catch(

            error => {

                console.warn(

                    "FACEBOOK SETUP:",

                    error

                );

            }

        );


    }









    /*
    ==========================================
    CREATE CONTAINER
    ==========================================
    */


    createContainer(){


        let container =

            document.getElementById(

                "loginApp"

            );



        if(!container){


            container =

                document.createElement(

                    "main"

                );


            container.id =

                "loginApp";


            container.setAttribute(

                "aria-label",

                "Entrar na Honey IA"

            );


            document.body.appendChild(

                container

            );


        }



        this.container = container;


    }









    /*
    ==========================================
    SHOW LOGIN INTERFACE
    ==========================================
    */


    showLoginInterface(){


        if(!this.container){

            this.createContainer();

        }



        if(!this.container){

            return;

        }



        this.container.style.display = "flex";

        this.container.classList.add(

            "auth-visible"

        );



        document.body.classList.add(

            "honey-auth-active"

        );



        const studio =

            document.getElementById(

                "studioApp"

            );



        if(studio){

            studio.style.display = "none";

            studio.classList.remove(

                "auth-ready"

            );

        }


    }









    /*
    ==========================================
    HIDE LOGIN INTERFACE
    ==========================================
    */


    hideLoginInterface(){


        if(this.container){

            this.container.classList.remove(

                "auth-visible"

            );

            this.container.style.display = "none";

        }



        document.body.classList.remove(

            "honey-auth-active"

        );



        const studio =

            document.getElementById(

                "studioApp"

            );



        if(studio){

            studio.style.display = "";

            studio.classList.add(

                "auth-ready"

            );

        }


    }









    /*
    ==========================================
    RENDER LOGIN
    ==========================================
    */


    render(){


        if(!this.container){

            return;

        }



        this.container.innerHTML = `

            <div class="honey-auth-wrapper">


                <div class="honey-auth-background">

                    <div class="auth-orb auth-orb-one"></div>

                    <div class="auth-orb auth-orb-two"></div>

                    <div class="auth-grid"></div>

                </div>



                <div class="honey-auth-card">


                    <!-- BRAND -->

                    <div class="auth-brand">

                        <div class="auth-logo">

                            <span>H</span>

                        </div>


                        <div class="auth-brand-text">

                            <h1>Honey IA</h1>

                            <p>Enterprise AI Studio</p>

                        </div>

                    </div>



                    <!-- MESSAGE -->

                    <div
                        id="authMessage"
                        class="auth-message"
                        role="alert"
                        aria-live="polite"
                    ></div>



                    <!-- LOGIN -->

                    <div
                        id="loginMode"
                        class="auth-mode"
                    >


                        <div class="auth-heading">

                            <h2>Bem-vindo</h2>

                            <p>
                                Entre no seu Workspace
                                de forma simples e segura.
                            </p>

                        </div>



                        <!-- GOOGLE -->

                        <button
                            id="googleLogin"
                            type="button"
                            class="google-btn"
                            aria-label="Continuar com Google"
                            disabled
                        >

                            <span class="google-icon">

                                <i class="fa-brands fa-google"></i>

                            </span>

                            <span class="google-button-text">

                                Preparando Google...

                            </span>

                        </button>



                        <!--
                        Google Identity Services usa
                        este elemento internamente quando
                        necessário.
                        -->

                        <div
                            id="googleOfficialButton"
                            class="google-official-button"
                            aria-hidden="true"
                            style="display:none;"
                        ></div>



                        <!-- FACEBOOK -->

                        <button
                            id="facebookLogin"
                            type="button"
                            class="facebook-btn"
                            aria-label="Continuar com Facebook"
                            disabled
                        >

                            <span class="facebook-icon">

                                <i class="fa-brands fa-facebook-f"></i>

                            </span>

                            <span class="facebook-button-text">

                                Preparando Facebook...

                            </span>

                        </button>



                        <!-- TERMS -->

                        <div class="auth-terms">

                            <p>

                                Ao continuar, aceita os

                                <a
                                    href="/terms.html"
                                    class="auth-terms-link"
                                >
                                    Termos de Uso
                                </a>

                                e a

                                <a
                                    href="/privacy.html"
                                    class="auth-terms-link"
                                >
                                    Política de Privacidade
                                </a>.

                            </p>

                        </div>


                    </div>



                    <!-- FOOTER -->

                    <div class="auth-footer">

                        <div class="auth-footer-line"></div>

                        <span>

                            <i class="fa-solid fa-shield-halved"></i>

                            Protegido pela Honey IA

                        </span>

                        <div class="auth-footer-line"></div>

                    </div>


                </div>


            </div>

        `;


    }









    /*
    ==========================================
    ATTACH EVENTS
    ==========================================
    */


    attachEvents(){


        document

            .getElementById(

                "googleLogin"

            )

            ?.addEventListener(

                "click",

                () => this.googleLogin()

            );



        document

            .getElementById(

                "facebookLogin"

            )

            ?.addEventListener(

                "click",

                () => this.facebookLogin()

            );


    }









    /*
    ==========================================
    LOAD GOOGLE SCRIPT
    ==========================================
    */


    loadGoogleScript(){


        if(

            window.google &&

            window.google.accounts &&

            window.google.accounts.id

        ){

            return Promise.resolve();

        }



        if(this.googleScriptPromise){

            return this.googleScriptPromise;

        }



        this.googleScriptPromise =

            new Promise(

                (resolve, reject) => {


                    const existing =

                        document.querySelector(

                            'script[data-honey-google="true"]'

                        );



                    if(existing){


                        const checkGoogle = () => {


                            if(

                                window.google &&

                                window.google.accounts &&

                                window.google.accounts.id

                            ){

                                resolve();

                            }

                            else{

                                reject(

                                    new Error(

                                        "Google Identity Services não está disponível."

                                    )

                                );

                            }


                        };



                        existing.addEventListener(

                            "load",

                            checkGoogle,

                            {once:true}

                        );



                        existing.addEventListener(

                            "error",

                            () => reject(

                                new Error(

                                    "Não foi possível carregar o Google Identity Services."

                                )

                            ),

                            {once:true}

                        );



                        if(

                            window.google &&

                            window.google.accounts &&

                            window.google.accounts.id

                        ){

                            checkGoogle();

                        }


                        return;

                    }



                    const script =

                        document.createElement(

                            "script"

                        );



                    script.src =

                        "https://accounts.google.com/gsi/client";



                    script.async = true;

                    script.defer = true;



                    script.dataset.honeyGoogle =

                        "true";



                    script.onload = () => {


                        if(

                            window.google &&

                            window.google.accounts &&

                            window.google.accounts.id

                        ){

                            resolve();

                        }

                        else{

                            reject(

                                new Error(

                                    "Google Identity Services não está disponível."

                                )

                            );

                        }


                    };



                    script.onerror = () => {


                        reject(

                            new Error(

                                "Não foi possível carregar o Google Identity Services."

                            )

                        );


                    };



                    document.head.appendChild(

                        script

                    );


                }

            );



        return this.googleScriptPromise;


    }









    /*
    ==========================================
    GET GOOGLE CLIENT ID
    ==========================================
    */


    async getGoogleClientId(){


        if(this.googleClientId){

            return this.googleClientId;

        }



        if(this.googleConfigPromise){

            return this.googleConfigPromise;

        }



        this.googleConfigPromise =

            (async()=>{


                /*
                ----------------------------------
                GLOBAL CONFIG
                ----------------------------------
                */


                if(window.HONEY_GOOGLE_CLIENT_ID){

                    const id = String(

                        window.HONEY_GOOGLE_CLIENT_ID

                    ).trim();



                    if(id){

                        return id;

                    }

                }



                if(window.GOOGLE_CLIENT_ID){

                    const id = String(

                        window.GOOGLE_CLIENT_ID

                    ).trim();



                    if(id){

                        return id;

                    }

                }



                /*
                ----------------------------------
                SERVER CONFIG
                ----------------------------------
                */


                const response =

                    await fetch(

                        "/api/auth/google-config",

                        {

                            method: "GET",

                            headers: {

                                "Accept":

                                    "application/json"

                            },

                            credentials: "same-origin",

                            cache: "no-store"

                        }

                    );



                const data =

                    await this.parseResponse(

                        response

                    );



                if(

                    !response.ok ||

                    !data?.success ||

                    !data?.clientId

                ){

                    throw new Error(

                        data?.error ||

                        "Google Client ID não configurado."

                    );

                }



                return String(

                    data.clientId

                ).trim();


            })();



        try{


            const clientId =

                await this.googleConfigPromise;



            if(!clientId){

                throw new Error(

                    "Google Client ID vazio."

                );

            }



            this.googleClientId =

                clientId;



            return clientId;


        }

        finally{


            this.googleConfigPromise =

                null;


        }


    }









    /*
    ==========================================
    SETUP GOOGLE LOGIN
    ==========================================
    */


    async setupGoogleLogin(){


        const button =

            document.getElementById(

                "googleLogin"

            );



        if(!button){

            return false;

        }



        if(

            this.googleInitialized &&

            this.googleClientId

        ){

            this.enableGoogleButton();

            return true;

        }



        if(this.googleLoadingPromise){

            return this.googleLoadingPromise;

        }



        this.googleLoadingPromise =

            (async()=>{


                try{


                    button.disabled = true;



                    this.setGoogleButtonText(

                        "Preparando Google..."

                    );



                    await this.loadGoogleScript();



                    const clientId =

                        await this.getGoogleClientId();



                    if(!clientId){

                        throw new Error(

                            "Google Client ID vazio."

                        );

                    }



                    const initialized =

                        this.initializeGoogleLogin(

                            clientId

                        );



                    if(!initialized){

                        throw new Error(

                            "Não foi possível inicializar o Google Identity Services."

                        );

                    }



                    this.googleInitialized = true;



                    this.enableGoogleButton();



                    return true;


                }

                catch(error){


                    console.error(

                        "GOOGLE SETUP ERROR:",

                        error

                    );



                    this.googleInitialized = false;



                    button.disabled = false;



                    this.setGoogleButtonText(

                        "Continuar com Google"

                    );



                    return false;


                }

                finally{


                    this.googleLoadingPromise =

                        null;


                }


            })();



        return this.googleLoadingPromise;


    }









    /*
    ==========================================
    INITIALIZE GOOGLE
    ==========================================
    */


    initializeGoogleLogin(clientId){


        if(

            !clientId ||

            !window.google ||

            !window.google.accounts ||

            !window.google.accounts.id

        ){

            return false;

        }



        try{


            this.googleCredentialHandler =

                response => {


                    this.handleGoogleCredential(

                        response?.credential

                    );


                };



            window.google.accounts.id.initialize({

                client_id: clientId,

                callback:

                    this.googleCredentialHandler,

                auto_select: false,

                cancel_on_tap_outside: true,

                use_fedcm_for_prompt: true

            });



            this.googleClientId =

                clientId;



            this.googleInitialized =

                true;



            return true;


        }

        catch(error){


            console.error(

                "GOOGLE INITIALIZATION ERROR:",

                error

            );



            this.googleInitialized = false;



            return false;


        }


    }









    /*
    ==========================================
    ENABLE GOOGLE
    ==========================================
    */


    enableGoogleButton(){


        const button =

            document.getElementById(

                "googleLogin"

            );



        if(!button){

            return;

        }



        button.disabled = false;

        button.dataset.ready = "true";



        this.setGoogleButtonText(

            "Continuar com Google"

        );


    }









    /*
    ==========================================
    GOOGLE BUTTON TEXT
    ==========================================
    */


    setGoogleButtonText(text){


        const button =

            document.getElementById(

                "googleLogin"

            );



        const element =

            button?.querySelector(

                ".google-button-text"

            );



        if(element){

            element.textContent =

                text;

        }


    }









    /*
    ==========================================
    GOOGLE LOGIN
    ==========================================
    */


    async googleLogin(){


        if(this.googleLoading){

            return;

        }



        if(

            !this.googleInitialized ||

            !window.google?.accounts?.id

        ){


            const ready =

                await this.setupGoogleLogin();



            if(!ready){

                this.showMessage(

                    "O login Google não está disponível neste momento.",

                    "error"

                );

                return;

            }


        }



        this.googleLoading = true;



        this.setLoading(

            "googleLogin",

            true,

            "A conectar..."

        );



        this.clearMessage();



        try{


            window.google.accounts.id.prompt(

                notification => {


                    if(

                        notification?.isNotDisplayed?.()

                    ){

                        console.warn(

                            "Google prompt não apresentado:",

                            notification

                                .getNotDisplayedReason?.()

                        );

                    }



                    if(

                        notification?.isSkippedMoment?.()

                    ){

                        console.warn(

                            "Google prompt ignorado."

                        );

                    }



                    if(

                        notification?.isDismissedMoment?.()

                    ){

                        this.googleLoading = false;



                        this.setLoading(

                            "googleLogin",

                            false,

                            "Continuar com Google"

                        );

                    }


                }

            );


        }

        catch(error){


            console.error(

                "GOOGLE PROMPT ERROR:",

                error

            );



            this.googleLoading = false;



            this.setLoading(

                "googleLogin",

                false,

                "Continuar com Google"

            );



            this.showMessage(

                "Não foi possível iniciar o login Google.",

                "error"

            );


        }


    }









    /*
    ==========================================
    GOOGLE CREDENTIAL
    ==========================================
    */


    async handleGoogleCredential(

        credential

    ){


        if(!credential){


            this.googleLoading = false;



            this.setLoading(

                "googleLogin",

                false,

                "Continuar com Google"

            );



            this.showMessage(

                "O Google não forneceu uma credencial válida.",

                "error"

            );



            return;

        }



        this.googleLoading = true;



        this.setLoading(

            "googleLogin",

            true,

            "A entrar..."

        );



        this.clearMessage();



        try{


            await authmanager.loginWithGoogle(

                credential

            );



            if(!authmanager.isAuthenticated()){

                throw new Error(

                    "A sessão Google não foi estabelecida."

                );

            }



            await this.finishAuthentication(

                "Login Google realizado com sucesso."

            );


        }

        catch(error){


            console.error(

                "GOOGLE AUTH ERROR:",

                error

            );



            this.showMessage(

                this.getSocialAuthErrorMessage(

                    error,

                    "Google"

                ),

                "error"

            );


        }

        finally{


            this.googleLoading = false;



            if(!this.redirecting){

                this.setLoading(

                    "googleLogin",

                    false,

                    "Continuar com Google"

                );

            }


        }


    }









    /*
    ==========================================
    LOAD FACEBOOK SDK
    ==========================================
    */


    loadFacebookScript(){


        if(window.FB){

            return Promise.resolve();

        }



        if(this.facebookScriptPromise){

            return this.facebookScriptPromise;

        }



        this.facebookScriptPromise =

            new Promise(

                (resolve, reject) => {


                    const existing =

                        document.querySelector(

                            'script[data-honey-facebook="true"]'

                        );



                    if(existing){


                        const checkFacebook = () => {


                            if(window.FB){

                                resolve();

                            }

                            else{

                                reject(

                                    new Error(

                                        "Facebook SDK não está disponível."

                                    )

                                );

                            }


                        };



                        existing.addEventListener(

                            "load",

                            checkFacebook,

                            {once:true}

                        );



                        existing.addEventListener(

                            "error",

                            () => reject(

                                new Error(

                                    "Não foi possível carregar o Facebook SDK."

                                )

                            ),

                            {once:true}

                        );



                        if(window.FB){

                            checkFacebook();

                        }


                        return;

                    }



                    window.fbAsyncInit = () => {


                        if(window.FB){

                            resolve();

                        }

                        else{

                            reject(

                                new Error(

                                    "Facebook SDK não está disponível."

                                )

                            );

                        }


                    };



                    const script =

                        document.createElement(

                            "script"

                        );



                    script.src =

                        "https://connect.facebook.net/en_US/sdk.js";



                    script.async = true;

                    script.defer = true;



                    script.dataset.honeyFacebook =

                        "true";



                    script.onload = () => {


                        if(window.FB){

                            resolve();

                        }

                    };



                    script.onerror = () => {


                        reject(

                            new Error(

                                "Não foi possível carregar o Facebook SDK."

                            )

                        );


                    };



                    document.body.appendChild(

                        script

                    );


                }

            );



        return this.facebookScriptPromise;


    }









    /*
    ==========================================
    GET FACEBOOK CONFIG
    ==========================================
    */


    async getFacebookConfig(){


        if(

            this.facebookAppId

        ){

            return {

                appId:

                    this.facebookAppId,

                version:

                    this.facebookVersion

            };

        }



        if(this.facebookConfigPromise){

            return this.facebookConfigPromise;

        }



        this.facebookConfigPromise =

            (async()=>{


                /*
                ----------------------------------
                GLOBAL CONFIG
                ----------------------------------
                */


                const globalAppId =

                    window.HONEY_FACEBOOK_APP_ID ||

                    window.FACEBOOK_APP_ID ||

                    "";



                const globalVersion =

                    window.HONEY_FACEBOOK_VERSION ||

                    window.FACEBOOK_VERSION ||

                    "";



                if(String(globalAppId).trim()){

                    return {

                        appId:

                            String(

                                globalAppId

                            ).trim(),

                        version:

                            String(

                                globalVersion

                            ).trim() ||

                            this.facebookVersion

                    };

                }



                /*
                ----------------------------------
                SERVER CONFIG
                ----------------------------------
                */


                const response =

                    await fetch(

                        "/api/auth/facebook-config",

                        {

                            method: "GET",

                            headers: {

                                "Accept":

                                    "application/json"

                            },

                            credentials: "same-origin",

                            cache: "no-store"

                        }

                    );



                const data =

                    await this.parseResponse(

                        response

                    );



                if(

                    !response.ok ||

                    !data?.success ||

                    !data?.appId

                ){

                    throw new Error(

                        data?.error ||

                        "Facebook App ID não configurado."

                    );

                }



                return {

                    appId:

                        String(

                            data.appId

                        ).trim(),

                    version:

                        String(

                            data.version ||

                            this.facebookVersion

                        ).trim()

                };


            })();



        try{


            const config =

                await this.facebookConfigPromise;



            if(!config?.appId){

                throw new Error(

                    "Facebook App ID vazio."

                );

            }



            this.facebookAppId =

                config.appId;



            this.facebookVersion =

                config.version ||

                this.facebookVersion;



            return config;


        }

        finally{


            this.facebookConfigPromise =

                null;


        }


    }









    /*
    ==========================================
    SETUP FACEBOOK
    ==========================================
    */


    async setupFacebookLogin(){


        const button =

            document.getElementById(

                "facebookLogin"

            );



        if(!button){

            return false;

        }



        if(this.facebookInitialized){

            this.enableFacebookButton();

            return true;

        }



        if(this.facebookLoadingPromise){

            return this.facebookLoadingPromise;

        }



        this.facebookLoadingPromise =

            (async()=>{


                try{


                    button.disabled = true;



                    this.setFacebookButtonText(

                        "Preparando Facebook..."

                    );



                    const config =

                        await this.getFacebookConfig();



                    await this.loadFacebookScript();



                    if(!window.FB){

                        throw new Error(

                            "Facebook SDK não está disponível."

                        );

                    }



                    window.FB.init({

                        appId:

                            config.appId,

                        cookie: true,

                        xfbml: false,

                        version:

                            config.version ||

                            this.facebookVersion

                    });



                    this.facebookInitialized = true;



                    this.enableFacebookButton();



                    return true;


                }

                catch(error){


                    console.error(

                        "FACEBOOK SETUP ERROR:",

                        error

                    );



                    this.facebookInitialized = false;



                    button.disabled = false;



                    this.setFacebookButtonText(

                        "Continuar com Facebook"

                    );



                    return false;


                }

                finally{


                    this.facebookLoadingPromise =

                        null;


                }


            })();



        return this.facebookLoadingPromise;


    }









    /*
    ==========================================
    ENABLE FACEBOOK
    ==========================================
    */


    enableFacebookButton(){


        const button =

            document.getElementById(

                "facebookLogin"

            );



        if(!button){

            return;

        }



        button.disabled = false;

        button.dataset.ready = "true";



        this.setFacebookButtonText(

            "Continuar com Facebook"

        );


    }









    /*
    ==========================================
    FACEBOOK BUTTON TEXT
    ==========================================
    */


    setFacebookButtonText(text){


        const button =

            document.getElementById(

                "facebookLogin"

            );



        const element =

            button?.querySelector(

                ".facebook-button-text"

            );



        if(element){

            element.textContent =

                text;

        }


    }









    /*
    ==========================================
    FACEBOOK LOGIN
    ==========================================
    */


    async facebookLogin(){


        if(this.facebookLoading){

            return;

        }



        if(

            !this.facebookInitialized ||

            !window.FB

        ){


            const ready =

                await this.setupFacebookLogin();



            if(!ready){

                this.showMessage(

                    "O login Facebook não está disponível neste momento.",

                    "error"

                );

                return;

            }


        }



        this.facebookLoading = true;



        this.setLoading(

            "facebookLogin",

            true,

            "A conectar..."

        );



        this.clearMessage();



        try{


            await new Promise(

                (resolve, reject) => {


                    window.FB.login(

                        response => {


                            if(

                                response?.authResponse?.accessToken

                            ){

                                resolve(

                                    response

                                        .authResponse

                                        .accessToken

                                );

                                return;

                            }



                            reject(

                                new Error(

                                    "O login Facebook foi cancelado ou não autorizou o acesso."

                                )

                            );


                        },

                        {

                            scope:

                                "email,public_profile",

                            return_scopes:

                                true

                        }

                    );


                }

            )

                .then(

                    accessToken =>

                        this.handleFacebookCredential(

                            accessToken

                        )

                );


        }

        catch(error){


            console.error(

                "FACEBOOK LOGIN ERROR:",

                error

            );



            this.facebookLoading = false;



            this.setLoading(

                "facebookLogin",

                false,

                "Continuar com Facebook"

            );



            this.showMessage(

                this.getSocialAuthErrorMessage(

                    error,

                    "Facebook"

                ),

                "error"

            );


        }


    }









    /*
    ==========================================
    FACEBOOK CREDENTIAL
    ==========================================
    */


    async handleFacebookCredential(

        accessToken

    ){


        if(

            !accessToken ||

            typeof accessToken !== "string"

        ){

            throw new Error(

                "O Facebook não forneceu um token válido."

            );

        }



        this.setLoading(

            "facebookLogin",

            true,

            "A entrar..."

        );



        try{


            await authmanager.loginWithFacebook(

                accessToken

            );



            if(!authmanager.isAuthenticated()){

                throw new Error(

                    "A sessão Facebook não foi estabelecida."

                );

            }



            await this.finishAuthentication(

                "Login Facebook realizado com sucesso."

            );


        }

        catch(error){


            console.error(

                "FACEBOOK AUTH ERROR:",

                error

            );



            throw error;


        }

        finally{


            this.facebookLoading = false;



            if(!this.redirecting){

                this.setLoading(

                    "facebookLogin",

                    false,

                    "Continuar com Facebook"

                );

            }


        }


    }









    /*
    ==========================================
    FINISH AUTHENTICATION
    ==========================================
    */


    async finishAuthentication(

        successMessage

    ){


        if(this.redirecting){

            return;

        }



        if(!authmanager.isAuthenticated()){

            throw new Error(

                "A autenticação foi concluída, mas a sessão não está ativa."

            );

        }



        this.showMessage(

            successMessage,

            "success"

        );



        this.redirecting = true;



        this.redirectToWorkspace(

            350

        );


    }









    /*
    ==========================================
    SHOW MESSAGE
    ==========================================
    */


    showMessage(

        message,

        type = "info"

    ){


        const element =

            document.getElementById(

                "authMessage"

            );



        if(!element){

            return;

        }



        element.textContent =

            message || "";



        element.className =

            `auth-message ${type}`;



        element.style.display =

            message

                ? "block"

                : "none";


    }









    /*
    ==========================================
    CLEAR MESSAGE
    ==========================================
    */


    clearMessage(){


        const element =

            document.getElementById(

                "authMessage"

            );



        if(!element){

            return;

        }



        element.textContent = "";



        element.className =

            "auth-message";



        element.style.display =

            "none";


    }









    /*
    ==========================================
    LOADING STATE
    ==========================================
    */


    setLoading(

        buttonId,

        loading,

        loadingText

    ){


        const button =

            document.getElementById(

                buttonId

            );



        if(!button){

            return;

        }



        if(loading){


            if(!button.dataset.originalText){

                button.dataset.originalText =

                    button

                        .textContent

                        .trim();

            }



            button.disabled = true;

            button.classList.add(

                "loading"

            );



            button.innerHTML = `

                <span class="auth-spinner"></span>

                <span>

                    ${loadingText || "Aguarde..."}

                </span>

            `;


        }

        else{


            button.disabled = false;

            button.classList.remove(

                "loading"

            );



            button.innerHTML = `

                <span class="${
                    buttonId === "googleLogin"
                        ? "google-icon"
                        : "facebook-icon"
                }">

                    <i class="${
                        buttonId === "googleLogin"
                            ? "fa-brands fa-google"
                            : "fa-brands fa-facebook-f"
                    }"></i>

                </span>

                <span class="${
                    buttonId === "googleLogin"
                        ? "google-button-text"
                        : "facebook-button-text"
                }">

                    ${
                        loadingText ||
                        button.dataset.originalText ||
                        "Continuar"
                    }

                </span>

            `;


        }


    }









    /*
    ==========================================
    REDIRECT TO WORKSPACE
    ==========================================
    */


    redirectToWorkspace(

        delay = 0

    ){


        setTimeout(

            () => {


                if(!authmanager.isAuthenticated()){


                    this.redirecting = false;



                    this.showLoginInterface();



                    this.showMessage(

                        "A sessão não foi autorizada.",

                        "error"

                    );



                    return;

                }



                this.hideLoginInterface();



                const studio =

                    document.getElementById(

                        "studioApp"

                    );



                if(studio){

                    studio.style.display = "";

                    studio.classList.add(

                        "auth-ready"

                    );

                }



                const dashboard =

                    document.getElementById(

                        "dashboard"

                    );



                if(dashboard){

                    dashboard.style.display = "";

                }



                document.dispatchEvent(

                    new CustomEvent(

                        "honey:authenticated",

                        {

                            detail: {

                                user:

                                    authmanager.getUser(),

                                plan:

                                    authmanager.getPlan()

                            }

                        }

                    )

                );



                this.redirecting = false;


            },

            delay

        );


    }









    /*
    ==========================================
    SOCIAL AUTH ERROR
    ==========================================
    */


    getSocialAuthErrorMessage(

        error,

        provider

    ){


        const message =

            String(

                error?.message ||

                ""

            ).trim();



        const lower =

            message.toLowerCase();



        if(

            lower.includes(

                "cancelado"

            ) ||

            lower.includes(

                "cancelled"

            ) ||

            lower.includes(

                "canceled"

            )

        ){

            return (

                `Login com ${provider} cancelado.`

            );

        }



        if(

            lower.includes(

                "client id"

            ) ||

            lower.includes(

                "client_id"

            ) ||

            lower.includes(

                "app id"

            ) ||

            lower.includes(

                "appid"

            )

        ){

            return (

                `A configuração do ${provider} da Honey IA não está correta.`

            );

        }



        if(

            lower.includes(

                "token"

            ) ||

            lower.includes(

                "credential"

            ) ||

            lower.includes(

                "credencial"

            )

        ){

            return (

                `A credencial do ${provider} não foi aceite pelo servidor.`

            );

        }



        if(

            lower.includes(

                "unauthorized"

            ) ||

            lower.includes(

                "não autorizado"

            ) ||

            lower.includes(

                "autorização"

            ) ||

            lower.includes(

                "authentication"

            ) ||

            lower.includes(

                "autenticação"

            )

        ){

            return (

                `O ${provider} autenticou a conta, mas o servidor da Honey IA recusou a autorização.`

            );

        }



        return (

            message ||

            `Não foi possível concluir o login com ${provider}.`

        );


    }









    /*
    ==========================================
    PARSE RESPONSE
    ==========================================
    */


    async parseResponse(

        response

    ){


        try{


            const contentType =

                response.headers.get(

                    "content-type"

                ) || "";



            if(

                !contentType

                    .toLowerCase()

                    .includes(

                        "application/json"

                    )

            ){

                return {

                    success: false,

                    error:

                        `Resposta inválida do servidor (${response.status}).`

                };

            }



            return await response.json();


        }

        catch(error){


            console.error(

                "LOGIN RESPONSE ERROR:",

                error

            );



            return {

                success: false,

                error:

                    "Resposta inválida do servidor."

            };


        }


    }


}









/*
==========================================
SINGLETON
==========================================
*/


const logincontroller =

    new LoginController();









/*
==========================================
EXPORT
==========================================
*/


export default logincontroller;
