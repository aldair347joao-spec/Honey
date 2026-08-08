/*
==========================================
HONEY IA OS
LOGIN CONTROLLER
Professional Authentication UI
V9.0
Google Identity Services
Secure Authentication Flow
Independent Authentication Interface
==========================================
*/


import authmanager from "./auth.js";



class LoginController {


    constructor(){


        this.container = null;

        this.mode = "login";

        this.pendingEmail = null;

        this.initialized = false;

        this.googleInitialized = false;

        this.googleLoading = false;

        this.loadingActions = new Set();

        this.googleClientId = "";

        this.googleScriptPromise = null;

        this.googleCredentialHandler = null;


    }









    /*
    ==========================================
    INITIALIZE
    ==========================================
    */


    async init(){


        if(this.initialized){


            if(

                authmanager.isAuthenticated()

            ){

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
        WAIT FOR AUTH SYSTEM
        --------------------------------------
        */


        await authmanager.waitUntilReady();



        /*
        --------------------------------------
        EXISTING SESSION
        --------------------------------------
        */


        if(

            authmanager.isAuthenticated()

        ){


            this.hideLoginInterface();

            return;


        }



        /*
        --------------------------------------
        CREATE INTERFACE
        --------------------------------------
        */


        this.createContainer();

        this.showLoginInterface();

        this.render();

        this.attachEvents();



        /*
        --------------------------------------
        GOOGLE
        --------------------------------------
        */


        await this.setupGoogleLogin();


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

                    "div"

                );


            container.id = "loginApp";



            container.setAttribute(

                "aria-label",

                "Autenticação Honey IA"

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
    RENDER
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


                    <div class="auth-brand">


                        <div class="auth-logo">

                            <span>H</span>

                        </div>


                        <div class="auth-brand-text">

                            <h1>Honey IA</h1>

                            <p>Enterprise AI Studio</p>

                        </div>


                    </div>



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

                            <h2>Bem-vindo de volta</h2>

                            <p>
                                Entre na sua área de trabalho
                                inteligente.
                            </p>

                        </div>



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

                                Continuar com Google

                            </span>

                        </button>



                        <div class="divider">

                            <span>ou continuar com email</span>

                        </div>



                        <div class="auth-field">


                            <label for="loginEmail">

                                Email

                            </label>


                            <div class="auth-input-wrapper">

                                <i class="fa-regular fa-envelope"></i>

                                <input
                                    id="loginEmail"
                                    type="email"
                                    autocomplete="email"
                                    placeholder="seu@email.com"
                                    maxlength="254"
                                >

                            </div>


                        </div>



                        <div class="auth-field">


                            <label for="loginPassword">

                                Palavra-passe

                            </label>


                            <div class="auth-input-wrapper">

                                <i class="fa-solid fa-lock"></i>

                                <input
                                    id="loginPassword"
                                    type="password"
                                    autocomplete="current-password"
                                    placeholder="A sua palavra-passe"
                                >

                            </div>


                        </div>



                        <button
                            id="loginButton"
                            type="button"
                            class="auth-button"
                        >

                            <span>Entrar</span>

                        </button>



                        <button
                            id="showRegister"
                            type="button"
                            class="auth-link"
                        >

                            Ainda não tem uma conta?
                            <strong>Criar conta</strong>

                        </button>


                    </div>



                    <!-- REGISTER -->

                    <div
                        id="registerMode"
                        class="auth-mode"
                        style="display:none;"
                    >


                        <div class="auth-heading">

                            <h2>Criar conta</h2>

                            <p>
                                Comece a trabalhar com a
                                inteligência da Honey IA.
                            </p>

                        </div>



                        <div class="auth-row">


                            <div class="auth-field">


                                <label for="registerNome">

                                    Primeiro nome

                                </label>


                                <div class="auth-input-wrapper">

                                    <i class="fa-regular fa-user"></i>

                                    <input
                                        id="registerNome"
                                        type="text"
                                        autocomplete="given-name"
                                        placeholder="Primeiro nome"
                                        maxlength="80"
                                    >

                                </div>


                            </div>



                            <div class="auth-field">


                                <label for="registerApelido">

                                    Apelido

                                </label>


                                <div class="auth-input-wrapper">

                                    <i class="fa-regular fa-user"></i>

                                    <input
                                        id="registerApelido"
                                        type="text"
                                        autocomplete="family-name"
                                        placeholder="Apelido"
                                        maxlength="80"
                                    >

                                </div>


                            </div>


                        </div>



                        <div class="auth-field">


                            <label for="registerEmail">

                                Email

                            </label>


                            <div class="auth-input-wrapper">

                                <i class="fa-regular fa-envelope"></i>

                                <input
                                    id="registerEmail"
                                    type="email"
                                    autocomplete="email"
                                    placeholder="seu@email.com"
                                    maxlength="254"
                                >

                            </div>


                        </div>



                        <div class="auth-field">


                            <label for="registerPassword">

                                Palavra-passe

                            </label>


                            <div class="auth-input-wrapper">

                                <i class="fa-solid fa-lock"></i>

                                <input
                                    id="registerPassword"
                                    type="password"
                                    autocomplete="new-password"
                                    placeholder="Criar palavra-passe"
                                >

                            </div>


                        </div>



                        <div class="auth-password-hint">

                            <i class="fa-solid fa-shield-halved"></i>

                            <span>
                                Mínimo 8 caracteres, incluindo
                                maiúscula, minúscula, número e símbolo.
                            </span>

                        </div>



                        <div class="auth-field">


                            <label for="registerConfirm">

                                Confirmar palavra-passe

                            </label>


                            <div class="auth-input-wrapper">

                                <i class="fa-solid fa-lock"></i>

                                <input
                                    id="registerConfirm"
                                    type="password"
                                    autocomplete="new-password"
                                    placeholder="Confirmar palavra-passe"
                                >

                            </div>


                        </div>



                        <button
                            id="registerButton"
                            type="button"
                            class="auth-button"
                        >

                            <span>Criar conta</span>

                        </button>



                        <button
                            id="backLogin"
                            type="button"
                            class="auth-link"
                        >

                            Já tenho uma conta?
                            <strong>Entrar</strong>

                        </button>


                    </div>



                    <!-- VERIFY -->

                    <div
                        id="verifyMode"
                        class="auth-mode"
                        style="display:none;"
                    >


                        <div class="auth-verify-icon">

                            <i class="fa-regular fa-envelope"></i>

                        </div>



                        <div class="auth-heading">

                            <h2>Confirmar email</h2>

                            <p id="verifyDescription">

                                Enviámos um código de confirmação
                                para o seu email.

                            </p>

                        </div>



                        <div class="auth-field">


                            <label for="verifyCode">

                                Código de confirmação

                            </label>


                            <div class="auth-input-wrapper">

                                <i class="fa-solid fa-shield-halved"></i>

                                <input
                                    id="verifyCode"
                                    type="text"
                                    inputmode="numeric"
                                    autocomplete="one-time-code"
                                    maxlength="6"
                                    placeholder="000000"
                                >

                            </div>


                        </div>



                        <button
                            id="verifyButton"
                            type="button"
                            class="auth-button"
                        >

                            <span>Confirmar email</span>

                        </button>



                        <button
                            id="resendCode"
                            type="button"
                            class="auth-link"
                        >

                            Reenviar código

                        </button>



                        <button
                            id="backVerifyLogin"
                            type="button"
                            class="auth-link secondary"
                        >

                            Voltar ao login

                        </button>


                    </div>



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

            .getElementById("loginButton")

            ?.addEventListener(

                "click",

                () => this.login()

            );



        document

            .getElementById("googleLogin")

            ?.addEventListener(

                "click",

                () => this.googleLogin()

            );



        document

            .getElementById("registerButton")

            ?.addEventListener(

                "click",

                () => this.register()

            );



        document

            .getElementById("verifyButton")

            ?.addEventListener(

                "click",

                () => this.verifyEmail()

            );



        document

            .getElementById("resendCode")

            ?.addEventListener(

                "click",

                () => this.resendVerificationCode()

            );



        document

            .getElementById("showRegister")

            ?.addEventListener(

                "click",

                () => this.showMode("register")

            );



        document

            .getElementById("backLogin")

            ?.addEventListener(

                "click",

                () => this.showMode("login")

            );



        document

            .getElementById("backVerifyLogin")

            ?.addEventListener(

                "click",

                () => this.showMode("login")

            );



        this.attachEnterKey(

            "loginEmail",

            () => this.login()

        );



        this.attachEnterKey(

            "loginPassword",

            () => this.login()

        );



        this.attachEnterKey(

            "registerNome",

            () => this.register()

        );



        this.attachEnterKey(

            "registerApelido",

            () => this.register()

        );



        this.attachEnterKey(

            "registerEmail",

            () => this.register()

        );



        this.attachEnterKey(

            "registerPassword",

            () => this.register()

        );



        this.attachEnterKey(

            "registerConfirm",

            () => this.register()

        );



        this.attachEnterKey(

            "verifyCode",

            () => this.verifyEmail()

        );



        const verifyCode =

            document.getElementById(

                "verifyCode"

            );



        verifyCode?.addEventListener(

            "input",

            event => {


                event.target.value =

                    event.target.value

                        .replace(/\D/g, "")

                        .slice(0, 6);


            }

        );


    }









    /*
    ==========================================
    ENTER KEY
    ==========================================
    */


    attachEnterKey(

        id,

        callback

    ){


        document

            .getElementById(id)

            ?.addEventListener(

                "keydown",

                event => {


                    if(

                        event.key === "Enter"

                    ){


                        event.preventDefault();

                        callback();


                    }


                }

            );


    }









    /*
    ==========================================
    GOOGLE SCRIPT
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



                        if(

                            window.google &&

                            window.google.accounts &&

                            window.google.accounts.id

                        ){

                            checkGoogle();

                            return;

                        }



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


        if(

            window.HONEY_GOOGLE_CLIENT_ID

        ){

            return String(

                window.HONEY_GOOGLE_CLIENT_ID

            ).trim();

        }



        if(

            window.GOOGLE_CLIENT_ID

        ){

            return String(

                window.GOOGLE_CLIENT_ID

            ).trim();

        }



        const response =

            await fetch(

                "/api/auth/google-config",

                {

                    method: "GET",

                    headers: {

                        "Accept":

                            "application/json"

                    }

                }

            );



        const data =

            await this.parseResponse(

                response

            );



        if(

            response.ok &&

            data.success &&

            data.clientId

        ){

            return String(

                data.clientId

            ).trim();

        }



        throw new Error(

            data.error ||

            "Google Client ID não configurado."

        );


    }









    /*
    ==========================================
    SETUP GOOGLE
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



        try{


            button.disabled = true;

            button.dataset.ready = "false";



            await this.loadGoogleScript();



            this.googleClientId =

                await this.getGoogleClientId();



            if(!this.googleClientId){

                throw new Error(

                    "Google Client ID vazio."

                );

            }



            const initialized =

                this.initializeGoogleLogin(

                    this.googleClientId

                );



            if(!initialized){

                throw new Error(

                    "Não foi possível inicializar o Google."

                );

            }



            this.googleInitialized = true;



            button.disabled = false;

            button.dataset.ready = "true";



            return true;


        }

        catch(error){


            console.error(

                "GOOGLE SETUP ERROR:",

                error

            );



            this.googleInitialized = false;



            button.disabled = false;

            button.dataset.ready = "false";



            return false;


        }


    }









    /*
    ==========================================
    INITIALIZE GOOGLE
    ==========================================
    */


    initializeGoogleLogin(

        clientId

    ){


        if(

            !clientId ||

            !window.google ||

            !window.google.accounts ||

            !window.google.accounts.id

        ){

            return false;

        }



        try{


            if(this.googleInitialized){

                return true;

            }



            window.google.accounts.id.initialize({

                client_id: clientId,

                callback:

                    response => {


                        this.handleGoogleCredential(

                            response?.credential

                        );


                    },

                auto_select: false,

                cancel_on_tap_outside: true

            });



            this.googleClientId = clientId;



            this.googleInitialized = true;



            return true;


        }

        catch(error){


            console.error(

                "GOOGLE INITIALIZATION ERROR:",

                error

            );


            return false;


        }


    }









    /*
    ==========================================
    LOGIN
    ==========================================
    */


    async login(){


        if(

            this.loadingActions.has("login")

        ){

            return;

        }



        const email =

            document

                .getElementById(

                    "loginEmail"

                )

                ?.value

                .trim()

                .toLowerCase();



        const password =

            document

                .getElementById(

                    "loginPassword"

                )

                ?.value;



        if(!email){

            this.showMessage(

                "Digite o seu email.",

                "error"

            );

            return;

        }



        if(!this.isValidEmail(email)){

            this.showMessage(

                "Digite um email válido.",

                "error"

            );

            return;

        }



        if(!password){

            this.showMessage(

                "Digite a sua palavra-passe.",

                "error"

            );

            return;

        }



        this.loadingActions.add("login");



        this.setLoading(

            "loginButton",

            true,

            "Entrando..."

        );



        this.clearMessage();



        try{


            await authmanager.login({

                email,

                password

            });



            this.showMessage(

                "Login realizado com sucesso.",

                "success"

            );



            this.redirectToWorkspace(300);


        }

        catch(error){


            console.error(

                "LOGIN ERROR:",

                error

            );



            this.showMessage(

                error.message ||

                "Não foi possível realizar o login.",

                "error"

            );


        }

        finally{


            this.loadingActions.delete(

                "login"

            );



            this.setLoading(

                "loginButton",

                false,

                "Entrar"

            );


        }


    }









    /*
    ==========================================
    REGISTER
    ==========================================
    */


    async register(){


        if(

            this.loadingActions.has("register")

        ){

            return;

        }



        const firstName =

            document

                .getElementById(

                    "registerNome"

                )

                ?.value

                .trim();



        const lastName =

            document

                .getElementById(

                    "registerApelido"

                )

                ?.value

                .trim();



        const email =

            document

                .getElementById(

                    "registerEmail"

                )

                ?.value

                .trim()

                .toLowerCase();



        const password =

            document

                .getElementById(

                    "registerPassword"

                )

                ?.value;



        const confirmPassword =

            document

                .getElementById(

                    "registerConfirm"

                )

                ?.value;



        if(

            !firstName ||

            !lastName ||

            !email ||

            !password ||

            !confirmPassword

        ){

            this.showMessage(

                "Preencha todos os campos.",

                "error"

            );

            return;

        }



        if(!this.isValidEmail(email)){

            this.showMessage(

                "Digite um email válido.",

                "error"

            );

            return;

        }



        if(password.length < 8){

            this.showMessage(

                "A palavra-passe deve ter pelo menos 8 caracteres.",

                "error"

            );

            return;

        }



        if(

            !/[A-Z]/.test(password) ||

            !/[a-z]/.test(password) ||

            !/[0-9]/.test(password) ||

            !/[^A-Za-z0-9]/.test(password)

        ){

            this.showMessage(

                "A palavra-passe deve incluir maiúscula, minúscula, número e símbolo.",

                "error"

            );

            return;

        }



        if(password !== confirmPassword){

            this.showMessage(

                "As palavras-passe não coincidem.",

                "error"

            );

            return;

        }



        this.loadingActions.add("register");



        this.setLoading(

            "registerButton",

            true,

            "A criar conta..."

        );



        this.clearMessage();



        try{


            const result =

                await authmanager.register({

                    firstName,

                    lastName,

                    email,

                    password,

                    confirmPassword

                });



            this.pendingEmail = email;



            const description =

                document.getElementById(

                    "verifyDescription"

                );



            if(description){

                description.textContent =

                    `Enviámos um código de confirmação para ${email}.`;

            }



            this.showMode("verify");



            this.showMessage(

                result.message ||

                "Conta criada. Verifique o seu email.",

                "success"

            );


        }

        catch(error){


            console.error(

                "REGISTER ERROR:",

                error

            );



            this.showMessage(

                error.message ||

                "Não foi possível criar a conta.",

                "error"

            );


        }

        finally{


            this.loadingActions.delete(

                "register"

            );



            this.setLoading(

                "registerButton",

                false,

                "Criar conta"

            );


        }


    }









    /*
    ==========================================
    VERIFY EMAIL
    ==========================================
    */


    async verifyEmail(){


        if(

            this.loadingActions.has("verify")

        ){

            return;

        }



        const code =

            document

                .getElementById(

                    "verifyCode"

                )

                ?.value

                .trim();



        if(!this.pendingEmail){

            this.showMessage(

                "Email de confirmação não encontrado.",

                "error"

            );

            return;

        }



        if(

            !code ||

            !/^\d{6}$/.test(code)

        ){

            this.showMessage(

                "Digite o código de 6 dígitos.",

                "error"

            );

            return;

        }



        this.loadingActions.add("verify");



        this.setLoading(

            "verifyButton",

            true,

            "A confirmar..."

        );



        this.clearMessage();



        try{


            await authmanager.verifyEmail({

                email:

                    this.pendingEmail,

                code

            });



            this.showMessage(

                "Email confirmado com sucesso. Já pode entrar.",

                "success"

            );



            setTimeout(

                () => {


                    this.showMode("login");



                    const emailInput =

                        document.getElementById(

                            "loginEmail"

                        );



                    if(emailInput){

                        emailInput.value =

                            this.pendingEmail;

                    }



                },

                700

            );


        }

        catch(error){


            console.error(

                "VERIFY EMAIL ERROR:",

                error

            );



            this.showMessage(

                error.message ||

                "Código inválido.",

                "error"

            );


        }

        finally{


            this.loadingActions.delete(

                "verify"

            );



            this.setLoading(

                "verifyButton",

                false,

                "Confirmar email"

            );


        }


    }









    /*
    ==========================================
    RESEND VERIFICATION
    ==========================================
    */


    async resendVerificationCode(){


        if(

            this.loadingActions.has("resend")

        ){

            return;

        }



        if(!this.pendingEmail){

            this.showMessage(

                "Email de confirmação não encontrado.",

                "error"

            );

            return;

        }



        this.loadingActions.add("resend");



        this.setLoading(

            "resendCode",

            true,

            "A enviar..."

        );



        this.clearMessage();



        try{


            await authmanager.resendVerification(

                this.pendingEmail

            );



            this.showMessage(

                "Novo código enviado para o seu email.",

                "success"

            );


        }

        catch(error){


            console.error(

                "RESEND VERIFICATION ERROR:",

                error

            );



            this.showMessage(

                error.message ||

                "Não foi possível reenviar o código.",

                "error"

            );


        }

        finally{


            this.loadingActions.delete(

                "resend"

            );



            this.setLoading(

                "resendCode",

                false,

                "Reenviar código"

            );


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

            !window.google ||

            !window.google.accounts ||

            !window.google.accounts.id

        ){


            this.showMessage(

                "A preparar o login Google...",

                "info"

            );



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


            /*
            ----------------------------------
            Use Google One Tap
            ----------------------------------
            */


            window.google.accounts.id.prompt(

                notification => {


                    if(

                        notification.isNotDisplayed?.()

                    ){

                        console.warn(

                            "Google prompt não apresentado:",

                            notification

                                .getNotDisplayedReason?.()

                        );

                    }



                    if(

                        notification.isSkippedMoment?.()

                    ){

                        console.warn(

                            "Google prompt ignorado."

                        );

                    }



                    if(

                        notification.isDismissedMoment?.()

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



        this.setLoading(

            "googleLogin",

            true,

            "A entrar..."

        );



        try{


            await authmanager.loginWithGoogle(

                credential

            );



            this.showMessage(

                "Login Google realizado com sucesso.",

                "success"

            );



            this.redirectToWorkspace(300);


        }

        catch(error){


            console.error(

                "GOOGLE AUTH ERROR:",

                error

            );



            this.showMessage(

                error.message ||

                "Não foi possível entrar com Google.",

                "error"

            );


        }

        finally{


            this.googleLoading = false;



            this.setLoading(

                "googleLogin",

                false,

                "Continuar com Google"

            );


        }


    }









    /*
    ==========================================
    SHOW MODE
    ==========================================
    */


    showMode(mode){


        const allowedModes = [

            "login",

            "register",

            "verify"

        ];



        if(

            !allowedModes.includes(mode)

        ){

            mode = "login";

        }



        this.mode = mode;



        const modes = {

            login:

                document.getElementById(

                    "loginMode"

                ),


            register:

                document.getElementById(

                    "registerMode"

                ),


            verify:

                document.getElementById(

                    "verifyMode"

                )

        };



        Object.entries(modes).forEach(

            ([name, element]) => {


                if(element){

                    element.style.display =

                        name === mode

                            ? "block"

                            : "none";

                }


            }

        );



        this.clearMessage();



        requestAnimationFrame(

            () => {


                if(mode === "login"){

                    document

                        .getElementById(

                            "loginEmail"

                        )

                        ?.focus();

                }



                if(mode === "register"){

                    document

                        .getElementById(

                            "registerNome"

                        )

                        ?.focus();

                }



                if(mode === "verify"){

                    document

                        .getElementById(

                            "verifyCode"

                        )

                        ?.focus();

                }


            }

        );


    }









    /*
    ==========================================
    MESSAGE
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

        element.className = "auth-message";

        element.style.display = "none";


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


            if(

                !button.dataset.originalText

            ){

                button.dataset.originalText =

                    button.textContent.trim();

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



            button.textContent =

                loadingText ||

                button.dataset.originalText ||

                "Continuar";


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


                if(

                    !authmanager.isAuthenticated()

                ){


                    this.showLoginInterface();

                    return;

                }



                this.hideLoginInterface();



                /*
                ----------------------------------
                Reveal Honey IA workspace
                ----------------------------------
                */


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



                /*
                ----------------------------------
                Dispatch authentication event
                ----------------------------------
                */


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


            },

            delay

        );


    }









    /*
    ==========================================
    VALIDATE EMAIL
    ==========================================
    */


    isValidEmail(email){


        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(

            email

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

                !contentType.includes(

                    "application/json"

                )

            ){


                return {

                    success:false,

                    error:

                        `Resposta inválida do servidor (${response.status}).`

                };


            }



            return await response.json();


        }

        catch(error){


            console.error(

                "AUTH RESPONSE ERROR:",

                error

            );



            return {

                success:false,

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
