/*
==========================================
HONEY IA OS
LOGIN CONTROLLER
Professional Authentication UI
V6.0
Google Identity Services
Secure Authentication Flow
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

    }



    /*
    ==========================================
    INITIALIZE
    ==========================================
    */


    async init(){


        if(this.initialized){

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

            this.redirectToWorkspace();

            return;

        }



        /*
        --------------------------------------
        CREATE INTERFACE
        --------------------------------------
        */


        this.createContainer();

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


        const existing =

        document.getElementById(

            "loginApp"

        );



        if(existing){

            this.container = existing;

            return;

        }



        const div =

        document.createElement(

            "div"

        );



        div.id = "loginApp";



        document.body.prepend(

            div

        );



        this.container = div;

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

            <div class="honey-auth-card">


                <div class="auth-brand">

                    <div class="auth-logo">

                        🐝

                    </div>

                    <h1>

                        Honey IA

                    </h1>

                    <p>

                        Enterprise AI Studio

                    </p>

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

                    <button

                        id="googleLogin"

                        type="button"

                        class="google-btn"

                        aria-label="Continuar com Google"

                    >

                        <i class="fa-brands fa-google"></i>

                        <span>

                            Continuar com Google

                        </span>

                    </button>



                    <div class="divider">

                        <span>ou</span>

                    </div>



                    <div class="auth-field">

                        <label for="loginEmail">

                            Email

                        </label>

                        <input

                            id="loginEmail"

                            type="email"

                            autocomplete="email"

                            placeholder="seu@email.com"

                            maxlength="254"

                        >

                    </div>



                    <div class="auth-field">

                        <label for="loginPassword">

                            Palavra-passe

                        </label>

                        <input

                            id="loginPassword"

                            type="password"

                            autocomplete="current-password"

                            placeholder="A sua palavra-passe"

                        >

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

                        Criar nova conta

                    </button>

                </div>



                <!-- REGISTER -->

                <div

                    id="registerMode"

                    class="auth-mode"

                    style="display:none;"

                >

                    <div class="auth-field">

                        <label for="registerNome">

                            Primeiro nome

                        </label>

                        <input

                            id="registerNome"

                            type="text"

                            autocomplete="given-name"

                            placeholder="Primeiro nome"

                            maxlength="80"

                        >

                    </div>



                    <div class="auth-field">

                        <label for="registerApelido">

                            Apelido

                        </label>

                        <input

                            id="registerApelido"

                            type="text"

                            autocomplete="family-name"

                            placeholder="Apelido"

                            maxlength="80"

                        >

                    </div>



                    <div class="auth-field">

                        <label for="registerEmail">

                            Email

                        </label>

                        <input

                            id="registerEmail"

                            type="email"

                            autocomplete="email"

                            placeholder="seu@email.com"

                            maxlength="254"

                        >

                    </div>



                    <div class="auth-field">

                        <label for="registerPassword">

                            Palavra-passe

                        </label>

                        <input

                            id="registerPassword"

                            type="password"

                            autocomplete="new-password"

                            placeholder="Criar palavra-passe"

                        >

                    </div>



                    <div class="auth-password-hint">

                        Mínimo 8 caracteres, incluindo

                        maiúscula, minúscula, número e símbolo.

                    </div>



                    <div class="auth-field">

                        <label for="registerConfirm">

                            Confirmar palavra-passe

                        </label>

                        <input

                            id="registerConfirm"

                            type="password"

                            autocomplete="new-password"

                            placeholder="Confirmar palavra-passe"

                        >

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

                        Já tenho conta

                    </button>

                </div>



                <!-- VERIFY -->

                <div

                    id="verifyMode"

                    class="auth-mode"

                    style="display:none;"

                >

                    <div class="auth-verify-icon">

                        ✉️

                    </div>



                    <h3>

                        Confirmar Email

                    </h3>



                    <p id="verifyDescription">

                        Enviámos um código de confirmação

                        para o seu email.

                    </p>



                    <div class="auth-field">

                        <label for="verifyCode">

                            Código de confirmação

                        </label>

                        <input

                            id="verifyCode"

                            type="text"

                            inputmode="numeric"

                            autocomplete="one-time-code"

                            maxlength="6"

                            placeholder="000000"

                        >

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

                    <span>

                        Protegido pela Honey IA

                    </span>

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
    GOOGLE SCRIPT
    ==========================================
    */


    loadGoogleScript(){


        return new Promise(

            (resolve,reject)=>{


                if(

                    window.google &&

                    window.google.accounts &&

                    window.google.accounts.id

                ){

                    resolve();

                    return;

                }



                const existing =

                document.querySelector(

                    'script[data-honey-google="true"]'

                );



                if(existing){


                    existing.addEventListener(

                        "load",

                        () => resolve(),

                        { once:true }

                    );



                    existing.addEventListener(

                        "error",

                        () => reject(

                            new Error(

                                "Não foi possível carregar o Google Identity Services."

                            )

                        ),

                        { once:true }

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

    }



    /*
    ==========================================
    GOOGLE CLIENT ID
    ==========================================
    */


    async getGoogleClientId(){


        if(

            window.HONEY_GOOGLE_CLIENT_ID

        ){

            return window.HONEY_GOOGLE_CLIENT_ID;

        }



        try{


            const response =

            await fetch(

                "/api/auth/google-config",

                {

                    method:"GET",

                    headers:{

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

                return data.clientId;

            }



            throw new Error(

                data.error ||

                "Google Client ID não configurado."

            );

        }

        catch(error){

            throw error;

        }

    }



    /*
    ==========================================
    GOOGLE SETUP
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



            await this.loadGoogleScript();



            this.googleClientId =

            await this.getGoogleClientId();



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



            this.showMessage(

                "Login Google indisponível no momento.",

                "error"

            );



            return false;

        }

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
    LOGIN
    ==========================================
    */


    async login(){


        if(this.loadingActions.has("login")){

            return;

        }



        const email =

        document

        .getElementById("loginEmail")

        ?.value

        .trim();



        const password =

        document

        .getElementById("loginPassword")

        ?.value;



        if(!email){

            this.showMessage(

                "Digite o seu email.",

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



            this.redirectToWorkspace(

                400

            );

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


        if(this.loadingActions.has("register")){

            return;

        }



        const firstName =

        document

        .getElementById("registerNome")

        ?.value

        .trim();



        const lastName =

        document

        .getElementById("registerApelido")

        ?.value

        .trim();



        const email =

        document

        .getElementById("registerEmail")

        ?.value

        .trim();



        const password =

        document

        .getElementById("registerPassword")

        ?.value;



        const confirmPassword =

        document

        .getElementById("registerConfirm")

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



            this.showMessage(

                result.message ||

                "Conta criada. Verifique o seu email.",

                "success"

            );



            this.showMode("verify");

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


        if(this.loadingActions.has("verify")){

            return;

        }



        const code =

        document

        .getElementById("verifyCode")

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

            code.length !== 6

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

            this.loadingActions.has(

                "resend"

            )

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



        this.loadingActions.add(

            "resend"

        );



        this.setLoading(

            "resendCode",

            true,

            "A enviar..."

        );



        try{


            await authmanager.resendVerificationCode(

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

                "O login Google ainda está a ser preparado.",

                "error"

            );



            const ready =

            await this.setupGoogleLogin();



            if(!ready){

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



            this.redirectToWorkspace(

                400

            );

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



        if(!allowedModes.includes(mode)){

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

            ([name,element]) => {


                if(element){

                    element.style.display =

                        name === mode

                        ? "block"

                        : "none";

                }

            }

        );



        this.clearMessage();



        setTimeout(

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

            },

            50

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
    REDIRECT
    ==========================================
    */


    redirectToWorkspace(

        delay = 0

    ){


        setTimeout(

            () => {


                if(

                    window.location.pathname ===

                    "/index.html" ||

                    window.location.pathname ===

                    "/"

                ){

                    window.location.reload();

                    return;

                }



                window.location.href =

                    "/index.html";

            },

            delay

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

            console.warn(

                "Google Identity Services não disponível."

            );



            return false;

        }



        try{


            window.google.accounts.id.initialize({

                client_id:

                    clientId,

                callback:

                    response => {


                        this.handleGoogleCredential(

                            response?.credential

                        );

                    },

                auto_select:

                    false,

                cancel_on_tap_outside:

                    true

            });



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
