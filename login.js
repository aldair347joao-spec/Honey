/*
==========================================
HONEY IA OS
LOGIN CONTROLLER
Professional Authentication UI
V4.0
==========================================
*/


import authmanager from "./auth.js";



class LoginController {



    constructor(){


        this.container = null;


        this.mode = "login";


        this.pendingEmail = null;


        this.initialized = false;


    }









    /*
    ==========================================
    INITIALIZE
    ==========================================
    */


    async init(){


        /*
        --------------------------------------
        Prevent duplicate initialization
        --------------------------------------
        */


        if(this.initialized)

            return;



        this.initialized = true;



        /*
        --------------------------------------
        If already authenticated, do not
        show login screen.
        --------------------------------------
        */


        await authmanager.waitUntilReady();



        if(authmanager.isAuthenticated()){


            this.redirectToWorkspace();


            return;

        }



        this.createContainer();


        this.render();


        this.attachEvents();


    }









    /*
    ==========================================
    CREATE LOGIN CONTAINER
    ==========================================
    */


    createContainer(){


        let existing =

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



        div.id =

        "loginApp";



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


        if(!this.container)

            return;



        this.container.innerHTML = `

        <div class="honey-auth-wrapper">

            <div class="honey-auth-card">


                <!-- BRAND -->

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


                    <button

                        id="googleLogin"

                        type="button"

                        class="google-btn"

                    >

                        <i class="fa-brands fa-google"></i>

                        <span>

                            Continuar com Google

                        </span>

                    </button>



                    <div class="divider">

                        <span>

                            ou

                        </span>

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

                        <span>

                            Entrar

                        </span>

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

                        <span>

                            Criar conta

                        </span>

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

                        <span>

                            Confirmar email

                        </span>

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



                <!-- FOOTER -->

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


        const loginButton =

        document.getElementById(

            "loginButton"

        );



        const googleLogin =

        document.getElementById(

            "googleLogin"

        );



        const registerButton =

        document.getElementById(

            "registerButton"

        );



        const verifyButton =

        document.getElementById(

            "verifyButton"

        );



        const resendCode =

        document.getElementById(

            "resendCode"

        );



        const showRegister =

        document.getElementById(

            "showRegister"

        );



        const backLogin =

        document.getElementById(

            "backLogin"

        );



        const backVerifyLogin =

        document.getElementById(

            "backVerifyLogin"

        );



        /*
        --------------------------------------
        LOGIN
        --------------------------------------
        */


        loginButton?.addEventListener(

            "click",

            () => this.login()

        );



        /*
        --------------------------------------
        GOOGLE
        --------------------------------------
        */


        googleLogin?.addEventListener(

            "click",

            () => this.googleLogin()

        );



        /*
        --------------------------------------
        REGISTER
        --------------------------------------
        */


        registerButton?.addEventListener(

            "click",

            () => this.register()

        );



        /*
        --------------------------------------
        VERIFY
        --------------------------------------
        */


        verifyButton?.addEventListener(

            "click",

            () => this.verifyEmail()

        );



        /*
        --------------------------------------
        RESEND CODE
        --------------------------------------
        */


        resendCode?.addEventListener(

            "click",

            () => this.resendVerificationCode()

        );



        /*
        --------------------------------------
        MODE SWITCH
        --------------------------------------
        */


        showRegister?.addEventListener(

            "click",

            () => this.showMode("register")

        );



        backLogin?.addEventListener(

            "click",

            () => this.showMode("login")

        );



        backVerifyLogin?.addEventListener(

            "click",

            () => this.showMode("login")

        );



        /*
        --------------------------------------
        ENTER KEY
        --------------------------------------
        */


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



        /*
        --------------------------------------
        CODE INPUT
        --------------------------------------
        */


        const verifyCode =

        document.getElementById(

            "verifyCode"

        );



        verifyCode?.addEventListener(

            "input",

            event => {


                event.target.value =

                event.target.value

                .replace(

                    /\D/g,

                    ""

                )

                .slice(

                    0,

                    6

                );


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


        const element =

        document.getElementById(id);



        element?.addEventListener(

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


        const email =

        document.getElementById(

            "loginEmail"

        )?.value.trim();



        const password =

        document.getElementById(

            "loginPassword"

        )?.value;



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



            setTimeout(

                () => this.redirectToWorkspace(),

                500

            );


        }

        catch(error){


            this.showMessage(

                error.message ||

                "Não foi possível realizar o login.",

                "error"

            );


        }

        finally{


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


        const firstName =

        document.getElementById(

            "registerNome"

        )?.value.trim();



        const lastName =

        document.getElementById(

            "registerApelido"

        )?.value.trim();



        const email =

        document.getElementById(

            "registerEmail"

        )?.value.trim();



        const password =

        document.getElementById(

            "registerPassword"

        )?.value;



        const confirmPassword =

        document.getElementById(

            "registerConfirm"

        )?.value;



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



            this.pendingEmail =

                email;



            this.showMessage(

                result.message ||

                "Conta criada. Verifique o seu email.",

                "success"

            );



            this.showMode(

                "verify"

            );


        }

        catch(error){


            this.showMessage(

                error.message ||

                "Não foi possível criar a conta.",

                "error"

            );


        }

        finally{


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


        const code =

        document.getElementById(

            "verifyCode"

        )?.value.trim();



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

                    this.showMode(

                        "login"

                    );


                    const emailInput =

                    document.getElementById(

                        "loginEmail"

                    );



                    if(emailInput)

                        emailInput.value =

                            this.pendingEmail;


                },

                900

            );


        }

        catch(error){


            this.showMessage(

                error.message ||

                "Código inválido.",

                "error"

            );


        }

        finally{


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


        if(!this.pendingEmail){


            this.showMessage(

                "Email de confirmação não encontrado.",

                "error"

            );


            return;

        }



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


            this.showMessage(

                error.message ||

                "Não foi possível reenviar o código.",

                "error"

            );


        }

        finally{


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


        /*
        --------------------------------------
        The Google Identity Services library
        must provide the credential.
        --------------------------------------
        */


        if(

            typeof google ===

            "undefined" ||

            !google.accounts ||

            !google.accounts.id

        ){


            this.showMessage(

                "O login Google ainda não está disponível. Verifique a configuração do Google Identity Services.",

                "error"

            );


            return;

        }



        /*
        --------------------------------------
        Start Google authentication.
        --------------------------------------
        */


        try{


            this.setLoading(

                "googleLogin",

                true,

                "A conectar..."

            );



            google.accounts.id.prompt(

                notification => {


                    /*
                    --------------------------
                    Google may return no
                    credential when the user
                    closes the prompt.
                    --------------------------
                    */


                    if(

                        notification.isNotDisplayed?.()

                    ){

                        this.showMessage(

                            "A janela de login Google não pôde ser apresentada.",

                            "error"

                        );



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

                "GOOGLE LOGIN ERROR:",

                error

            );



            this.showMessage(

                "Não foi possível iniciar o login Google.",

                "error"

            );



            this.setLoading(

                "googleLogin",

                false,

                "Continuar com Google"

            );

        }

    }









    /*
    ==========================================
    GOOGLE CREDENTIAL HANDLER
    ==========================================
    */


    async handleGoogleCredential(

        credential

    ){


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



            setTimeout(

                () => this.redirectToWorkspace(),

                500

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


        this.mode =

            mode;



        const loginMode =

        document.getElementById(

            "loginMode"

        );



        const registerMode =

        document.getElementById(

            "registerMode"

        );



        const verifyMode =

        document.getElementById(

            "verifyMode"

        );



        if(loginMode)

            loginMode.style.display =

                mode === "login"

                ? "block"

                : "none";



        if(registerMode)

            registerMode.style.display =

                mode === "register"

                ? "block"

                : "none";



        if(verifyMode)

            verifyMode.style.display =

                mode === "verify"

                ? "block"

                : "none";



        this.clearMessage();



        /*
        --------------------------------------
        Focus
        --------------------------------------
        */


        setTimeout(

            () => {


                if(mode === "login"){


                    document

                    .getElementById(

                        "loginEmail"

                    )?.focus();


                }



                if(mode === "register"){


                    document

                    .getElementById(

                        "registerNome"

                    )?.focus();


                }



                if(mode === "verify"){


                    document

                    .getElementById(

                        "verifyCode"

                    )?.focus();


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



        if(!element)

            return;



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



        if(!element)

            return;



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



        if(!button)

            return;



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

                    ${loadingText}

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


    redirectToWorkspace(){


        /*
        --------------------------------------
        Keep existing Honey IA architecture.
        --------------------------------------
        */


        const target =

            "/index.html";



        window.location.href =

            target;

    }









    /*
    ==========================================
    GOOGLE INITIALIZATION
    ==========================================
    */


    initializeGoogleLogin(

        clientId

    ){


        if(

            !clientId ||

            typeof google ===

            "undefined" ||

            !google.accounts ||

            !google.accounts.id

        ){

            console.warn(

                "Google Identity Services não disponível."

            );


            return false;

        }



        try{


            google.accounts.id.initialize({

                client_id:

                    clientId,

                callback:

                    response =>

                    this.handleGoogleCredential(

                        response.credential

                    ),

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



export default logincontroller;
