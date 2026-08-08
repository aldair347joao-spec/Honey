/*
==========================================
HONEY IA OS
AUTH MANAGER
Frontend Session Controller
JWT + MongoDB + Google Authentication
V8.0
Production Authentication Architecture
==========================================
*/


class AuthManager {


    constructor(){


        /*
        ==========================================
        CORE STATE
        ==========================================
        */


        this.user = null;


        this.token =

            localStorage.getItem(

                "honey_token"

            );


        this.loading = true;


        this.listeners = [];


        /*
        ==========================================
        SESSION INITIALIZATION
        ==========================================
        */


        this.loadStoredUser();


        this.sessionPromise =

            this.loadSession();

    }


    /*
    ==========================================
    LOAD STORED USER
    ==========================================
    */

    loadStoredUser(){

        try{

            const storedUser =

                localStorage.getItem(

                    "honey_user"

                );


            if(!storedUser){

                this.user = null;

                return;

            }


            const parsedUser =

                JSON.parse(

                    storedUser

                );


            if(

                parsedUser &&

                typeof parsedUser === "object"

            ){

                this.user =

                    this.normalizeUser(

                        parsedUser

                    );

            }

            else{

                this.user = null;


                localStorage.removeItem(

                    "honey_user"

                );

            }

        }

        catch(error){

            console.error(

                "AUTH STORED USER ERROR:",

                error

            );


            this.user = null;


            localStorage.removeItem(

                "honey_user"

            );

        }

    }


    /*
    ==========================================
    RESTORE BACKEND SESSION
    ==========================================
    */

    async loadSession(){

        /*
        --------------------------------------
        SEM TOKEN
        --------------------------------------
        */

        if(!this.token){

            this.user = null;

            this.loading = false;

            this.notify();

            return null;

        }


        /*
        --------------------------------------
        VALIDAR TOKEN NO BACKEND
        --------------------------------------
        */

        try{

            const response =

                await fetch(

                    "/api/auth/me",

                    {

                        method: "GET",

                        headers: {

                            ...this.getAuthHeader(),

                            "Accept":

                                "application/json"

                        },

                        credentials: "same-origin"

                    }

                );


            const data =

                await this.parseResponse(

                    response

                );


            /*
            ----------------------------------
            SESSÃO VÁLIDA
            ----------------------------------
            */

            if(

                response.ok &&

                data.success &&

                data.user

            ){

                this.user =

                    this.normalizeUser(

                        data.user

                    );


                this.saveUser();


                this.loading = false;


                this.notify();


                return this.user;

            }


            /*
            ----------------------------------
            TOKEN INVÁLIDO / EXPIRADO
            ----------------------------------
            */

            if(

                response.status === 401 ||

                response.status === 403

            ){

                this.clearSession(false);


                return null;

            }


            /*
            ----------------------------------
            RESPOSTA INESPERADA
            ----------------------------------
            */

            this.clearSession(false);


            return null;

        }

        catch(error){

            console.error(

                "AUTH SESSION ERROR:",

                error

            );


            /*
            ----------------------------------
            FAIL CLOSED
            ----------------------------------

            Nunca considerar apenas o localStorage
            como autenticação válida.
            ----------------------------------
            */

            this.clearSession(false);


            return null;

        }

    }


    /*
    ==========================================
    WAIT UNTIL AUTH IS READY
    ==========================================
    */

    async waitUntilReady(){

        if(this.sessionPromise){

            try{

                await this.sessionPromise;

            }

            catch(error){

                console.error(

                    "AUTH READY ERROR:",

                    error

                );

            }

        }


        return this.user;

    }


    /*
    ==========================================
    NORMALIZE USER
    ==========================================
    */

    normalizeUser(user){

        if(

            !user ||

            typeof user !== "object"

        ){

            return null;

        }


        const normalized = {

            ...user,


            id:

                user.id ||

                user._id ||

                null,


            firstName:

                user.firstName ||

                user.nome ||

                "",


            lastName:

                user.lastName ||

                user.apelido ||

                "",


            email:

                String(

                    user.email ||

                    ""

                )

                    .trim()

                    .toLowerCase(),


            avatar:

                user.avatar ||

                user.picture ||

                null,


            plan:

                user.plan ||

                user.plano ||

                "free",


            emailVerified:

                user.emailVerified === true ||

                user.emailVerificado === true,


            isActive:

                user.isActive !== false,


            googleId:

                user.googleId ||

                null,


            provider:

                user.provider ||

                "local"

        };


        normalized.name =

            [

                normalized.firstName,

                normalized.lastName

            ]

                .filter(Boolean)

                .join(" ")

                ||

                user.name

                ||

                user.nomeCompleto

                ||

                normalized.email

                ||

                "Utilizador";


        return normalized;

    }


    /*
    ==========================================
    REGISTER
    ==========================================
    */

    async register(data){

        const payload = {

            ...(data || {})

        };


        /*
        --------------------------------------
        NORMALIZAR CAMPOS DO FORMULÁRIO
        --------------------------------------
        */

        payload.firstName =

            String(

                payload.firstName ||

                payload.nome ||

                ""

            )

                .trim();


        payload.lastName =

            String(

                payload.lastName ||

                payload.apelido ||

                ""

            )

                .trim();


        payload.email =

            String(

                payload.email ||

                ""

            )

                .trim()

                .toLowerCase();


        payload.password =

            String(

                payload.password ||

                ""

            );


        /*
        --------------------------------------
        VALIDAÇÃO FRONTEND
        --------------------------------------
        */

        if(

            !payload.firstName ||

            !payload.lastName ||

            !payload.email ||

            !payload.password

        ){

            throw new Error(

                "Preencha todos os campos."

            );

        }


        const response =

            await fetch(

                "/api/auth/register",

                {

                    method: "POST",

                    headers: {

                        "Content-Type":

                            "application/json",

                        "Accept":

                            "application/json"

                    },

                    body:

                        JSON.stringify(

                            payload

                        ),

                    credentials: "same-origin"

                }

            );


        const result =

            await this.parseResponse(

                response

            );


        if(

            !response.ok ||

            !result.success

        ){

            throw new Error(

                result.error ||

                "Não foi possível criar a conta."

            );

        }


        /*
        --------------------------------------
        NÃO CRIAR SESSÃO AUTOMATICAMENTE
        --------------------------------------

        A conta deve confirmar o email antes
        do primeiro login.
        --------------------------------------
        */


        return result;

    }


    /*
    ==========================================
    VERIFY EMAIL
    ==========================================
    */

    async verifyEmail(data){

        const payload = {

            ...(data || {})

        };


        if(payload.email){

            payload.email =

                String(

                    payload.email

                )

                    .trim()

                    .toLowerCase();

        }


        if(payload.code){

            payload.code =

                String(

                    payload.code

                )

                    .trim();

        }


        /*
        --------------------------------------
        COMPATIBILIDADE
        --------------------------------------
        */

        if(

            !payload.code &&

            payload.codigo

        ){

            payload.code =

                String(

                    payload.codigo

                )

                    .trim();

        }


        const response =

            await fetch(

                "/api/auth/verify-email",

                {

                    method: "POST",

                    headers: {

                        "Content-Type":

                            "application/json",

                        "Accept":

                            "application/json"

                    },

                    body:

                        JSON.stringify(

                            payload

                        ),

                    credentials: "same-origin"

                }

            );


        const result =

            await this.parseResponse(

                response

            );


        if(

            !response.ok ||

            !result.success

        ){

            throw new Error(

                result.error ||

                "Não foi possível confirmar o email."

            );

        }


        return result;

    }


    /*
    ==========================================
    RESEND VERIFICATION
    ==========================================
    */

    async resendVerification(email){

        const cleanEmail =

            String(

                email || ""

            )

                .trim()

                .toLowerCase();


        if(!cleanEmail){

            throw new Error(

                "Email de confirmação não encontrado."

            );

        }


        const response =

            await fetch(

                "/api/auth/resend-verification",

                {

                    method: "POST",

                    headers: {

                        "Content-Type":

                            "application/json",

                        "Accept":

                            "application/json"

                    },

                    body:

                        JSON.stringify({

                            email:

                                cleanEmail

                        }),

                    credentials: "same-origin"

                }

            );


        const result =

            await this.parseResponse(

                response

            );


        if(

            !response.ok ||

            !result.success

        ){

            throw new Error(

                result.error ||

                "Não foi possível reenviar o código."

            );

        }


        return result;

    }


    /*
    ==========================================
    LOGIN
    EMAIL + PASSWORD
    ==========================================
    */

    async login(data){

        const payload = {

            ...(data || {})

        };


        payload.email =

            String(

                payload.email ||

                ""

            )

                .trim()

                .toLowerCase();


        payload.password =

            String(

                payload.password ||

                ""

            );


        if(

            !payload.email ||

            !payload.password

        ){

            throw new Error(

                "Introduza o email e a palavra-passe."

            );

        }


        const response =

            await fetch(

                "/api/auth/login",

                {

                    method: "POST",

                    headers: {

                        "Content-Type":

                            "application/json",

                        "Accept":

                            "application/json"

                    },

                    body:

                        JSON.stringify(

                            payload

                        ),

                    credentials: "same-origin"

                }

            );


        const result =

            await this.parseResponse(

                response

            );


        if(

            !response.ok ||

            !result.success

        ){

            throw new Error(

                result.error ||

                "Não foi possível realizar o login."

            );

        }


        if(!result.token){

            throw new Error(

                "O servidor não devolveu um token de sessão."

            );

        }


        this.setSession(

            result.token,

            result.user

        );


        /*
        --------------------------------------
        CONFIRMAR SESSÃO NO BACKEND
        --------------------------------------
        */

        await this.refreshUser();


        if(!this.isAuthenticated()){

            throw new Error(

                "A sessão não pôde ser confirmada."

            );

        }


        return this.user;

    }


    /*
    ==========================================
    GOOGLE LOGIN
    ==========================================
    */

    async loginWithGoogle(

        credential

    ){

        if(

            !credential ||

            typeof credential !== "string"

        ){

            throw new Error(

                "Credenciais do Google não encontradas."

            );

        }


        const response =

            await fetch(

                "/api/auth/google",

                {

                    method: "POST",

                    headers: {

                        "Content-Type":

                            "application/json",

                        "Accept":

                            "application/json"

                    },

                    body:

                        JSON.stringify({

                            credential

                        }),

                    credentials: "same-origin"

                }

            );


        const result =

            await this.parseResponse(

                response

            );


        if(

            !response.ok ||

            !result.success

        ){

            throw new Error(

                result.error ||

                "Não foi possível entrar com o Google."

            );

        }


        if(!result.token){

            throw new Error(

                "O servidor não devolveu um token Google válido."

            );

        }


        this.setSession(

            result.token,

            result.user

        );


        /*
        --------------------------------------
        CONFIRMAR SESSÃO GOOGLE
        --------------------------------------
        */

        await this.refreshUser();


        if(!this.isAuthenticated()){

            throw new Error(

                "A sessão Google não pôde ser confirmada."

            );

        }


        return this.user;

    }


    /*
    ==========================================
    GOOGLE LOGIN ALIAS
    ==========================================
    */

    async googleLogin(

        credential

    ){

        return this.loginWithGoogle(

            credential

        );

    }


    /*
    ==========================================
    SET SESSION
    ==========================================
    */

    setSession(

        token,

        user

    ){

        if(

            !token ||

            typeof token !== "string"

        ){

            throw new Error(

                "Token de autenticação inválido."

            );

        }


        this.token =

            token.trim();


        this.user =

            this.normalizeUser(

                user

            );


        localStorage.setItem(

            "honey_token",

            this.token

        );


        if(this.user){

            this.saveUser();

        }


        this.loading = false;


        this.notify();

    }


    /*
    ==========================================
    SAVE USER
    ==========================================
    */

    saveUser(){

        if(!this.user){

            localStorage.removeItem(

                "honey_user"

            );

            return;

        }


        localStorage.setItem(

            "honey_user",

            JSON.stringify(

                this.user

            )

        );

    }


    /*
    ==========================================
    GET TOKEN
    ==========================================
    */

    getToken(){

        return this.token;

    }


    /*
    ==========================================
    GET USER
    ==========================================
    */

    getUser(){

        return this.user;

    }


    /*
    ==========================================
    GET PLAN
    ==========================================
    */

    getPlan(){

        return (

            this.user?.plan ||

            "free"

        );

    }


    /*
    ==========================================
    AUTHENTICATED
    ==========================================
    */

    isAuthenticated(){

        return (

            Boolean(this.token) &&

            Boolean(this.user) &&

            this.user.isActive !== false

        );

    }


    /*
    ==========================================
    SESSION LOADING
    ==========================================
    */

    isLoading(){

        return this.loading;

    }


    /*
    ==========================================
    LOGOUT
    ==========================================
    */

    async logout(){

        const currentToken =

            this.token;


        try{

            if(currentToken){

                await fetch(

                    "/api/auth/logout",

                    {

                        method: "POST",

                        headers: {

                            "Authorization":

                                `Bearer ${currentToken}`,

                            "Accept":

                                "application/json"

                        },

                        credentials: "same-origin"

                    }

                );

            }

        }

        catch(error){

            console.warn(

                "AUTH LOGOUT SERVER ERROR:",

                error

            );

        }

        finally{

            this.clearSession();

        }

    }


    /*
    ==========================================
    CLEAR SESSION
    ==========================================
    */

    clearSession(

        notify = true

    ){

        this.user = null;

        this.token = null;

        this.loading = false;


        localStorage.removeItem(

            "honey_token"

        );


        localStorage.removeItem(

            "honey_user"

        );


        if(notify){

            this.notify();

        }

    }


    /*
    ==========================================
    REFRESH USER
    ==========================================
    */

    async refreshUser(){

        if(!this.token){

            this.user = null;

            this.saveUser();

            return null;

        }


        try{

            const response =

                await fetch(

                    "/api/auth/me",

                    {

                        method: "GET",

                        headers: {

                            ...this.getAuthHeader(),

                            "Accept":

                                "application/json"

                        },

                        credentials: "same-origin"

                    }

                );


            const data =

                await this.parseResponse(

                    response

                );


            if(

                response.ok &&

                data.success &&

                data.user

            ){

                this.user =

                    this.normalizeUser(

                        data.user

                    );


                this.saveUser();


                this.notify();


                return this.user;

            }


            if(

                response.status === 401 ||

                response.status === 403

            ){

                this.clearSession();

                return null;

            }


            this.clearSession();

            return null;

        }

        catch(error){

            console.error(

                "AUTH REFRESH USER ERROR:",

                error

            );


            this.clearSession();

            return null;

        }

    }


    /*
    ==========================================
    AUTH HEADER
    ==========================================
    */

    getAuthHeader(){

        if(!this.token){

            return {};

        }


        return {

            "Authorization":

                `Bearer ${this.token}`

        };

    }


    /*
    ==========================================
    AUTH FETCH
    ==========================================
    */

    async authFetch(

        url,

        options = {}

    ){

        const headers = {

            ...(options.headers || {}),

            ...this.getAuthHeader()

        };


        const response =

            await fetch(

                url,

                {

                    ...options,

                    headers,

                    credentials:

                        options.credentials ||

                        "same-origin"

                }

            );


        /*
        --------------------------------------
        SESSÃO INVALIDADA PELO BACKEND
        --------------------------------------
        */

        if(

            response.status === 401 ||

            response.status === 403

        ){

            let shouldClear =

                true;


            try{

                const clone =

                    response.clone();


                const data =

                    await clone.json();


                const errorMessage =

                    String(

                        data?.error ||

                        data?.message ||

                        ""

                    )

                        .toLowerCase();


                /*
                ----------------------------------
                403 DE PLANO NÃO É NECESSARIAMENTE
                UMA SESSÃO INVÁLIDA
                ----------------------------------
                */

                if(

                    response.status === 403 &&

                    (

                        errorMessage.includes(

                            "plano"

                        ) ||

                        errorMessage.includes(

                            "plan"

                        ) ||

                        errorMessage.includes(

                            "funcionalidade"

                        )

                    )

                ){

                    shouldClear = false;

                }

            }

            catch(error){

                console.warn(

                    "AUTH FETCH RESPONSE ERROR:",

                    error

                );

            }


            if(shouldClear){

                this.clearSession();

            }

        }


        return response;

    }


    /*
    ==========================================
    RESPONSE PARSER
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

                "AUTH RESPONSE PARSE ERROR:",

                error

            );


            return {

                success: false,

                error:

                    "Resposta inválida do servidor."

            };

        }

    }


    /*
    ==========================================
    SUBSCRIBE
    ==========================================
    */

    subscribe(callback){

        if(

            typeof callback !== "function"

        ){

            return () => {};

        }


        this.listeners.push(

            callback

        );


        return () => {

            this.listeners =

                this.listeners.filter(

                    listener =>

                        listener !== callback

                );

        };

    }


    /*
    ==========================================
    NOTIFY
    ==========================================
    */

    notify(){

        if(

            !Array.isArray(

                this.listeners

            )

        ){

            return;

        }


        this.listeners.forEach(

            callback => {

                try{

                    callback(

                        this.user

                    );

                }

                catch(error){

                    console.error(

                        "AUTH LISTENER ERROR:",

                        error

                    );

                }

            }

        );

    }


    /*
    ==========================================
    REQUIRE AUTH
    ==========================================
    */

    requireAuth(

        redirect = "/"

    ){

        if(

            !this.isAuthenticated()

        ){

            window.location.href =

                redirect;


            return false;

        }


        return true;

    }


    /*
    ==========================================
    REQUIRE PLAN
    ==========================================
    */

    requirePlan(

        allowedPlans = []

    ){

        if(

            !Array.isArray(

                allowedPlans

            )

        ){

            return false;

        }


        return allowedPlans.includes(

            this.getPlan()

        );

    }


    /*
    ==========================================
    GET DISPLAY NAME
    ==========================================
    */

    getDisplayName(){

        if(!this.user){

            return "Utilizador";

        }


        const firstName =

            this.user.firstName ||

            "";


        const lastName =

            this.user.lastName ||

            "";


        const fullName =

            `${firstName} ${lastName}`

                .trim();


        return (

            fullName ||

            this.user.name ||

            this.user.email ||

            "Utilizador"

        );

    }


    /*
    ==========================================
    GET AVATAR
    ==========================================
    */

    getAvatar(){

        return (

            this.user?.avatar ||

            null

        );

    }


    /*
    ==========================================
    GET EMAIL
    ==========================================
    */

    getEmail(){

        return (

            this.user?.email ||

            ""

        );

    }


    /*
    ==========================================
    GET USER ID
    ==========================================
    */

    getUserId(){

        return (

            this.user?.id ||

            this.user?._id ||

            null

        );

    }

}


/*
==========================================
GLOBAL AUTH INSTANCE
==========================================
*/

const authmanager =

    new AuthManager();


/*
==========================================
EXPORT
==========================================
*/

export default authmanager;
