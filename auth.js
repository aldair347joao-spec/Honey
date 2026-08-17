/*
==========================================
HONEY IA OS
AUTH MANAGER
Frontend Session Controller
JWT + MongoDB + Google + Facebook
V9.0

PRODUCTION AUTHENTICATION ARCHITECTURE

AUTHENTICATION
------------------------------------------
• Google OAuth / Identity Services
• Facebook Login
• Automatic account creation
• JWT session
• MongoDB backend session
• Persistent user state
• Workspace authentication
• Subscription / plan awareness

NO LONGER USED
------------------------------------------
• Local registration
• Email + password login
• Password management
• Email verification
• Verification codes

STORAGE
------------------------------------------
honey_token
honey_user

BACKEND
------------------------------------------
GET  /api/auth/me
POST /api/auth/google
POST /api/auth/facebook
POST /api/auth/logout
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
        NO TOKEN
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
        VALIDATE TOKEN
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
            VALID SESSION
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
            INVALID SESSION
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
            UNEXPECTED RESPONSE
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



            this.clearSession(false);


            return null;


        }


    }









    /*
    ==========================================
    WAIT UNTIL AUTH READY
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

                user.profilePicture ||

                null,



            plan:

                user.plan ||

                user.plano ||

                "free",



            emailVerified:

                user.emailVerified === true ||

                user.emailVerificado === true,



            isActive:

                user.isActive !== false &&

                user.isActive !== "false",



            googleId:

                user.googleId ||

                null,



            facebookId:

                user.facebookId ||

                null,



            provider:

                user.provider ||

                "google"

        };



        /*
        --------------------------------------
        NORMALIZE PROVIDER
        --------------------------------------
        */


        normalized.provider =

            String(

                normalized.provider || "google"

            )

                .trim()

                .toLowerCase();



        /*
        --------------------------------------
        DISPLAY NAME
        --------------------------------------
        */


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



        /*
        --------------------------------------
        CREATE SESSION
        --------------------------------------
        */


        this.setSession(

            result.token,

            result.user

        );



        /*
        --------------------------------------
        CONFIRM SESSION
        --------------------------------------
        */


        const verifiedUser =

            await this.refreshUser();



        if(

            !verifiedUser ||

            !this.isAuthenticated()

        ){


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
    FACEBOOK LOGIN
    ==========================================
    */


    async loginWithFacebook(

        accessToken

    ){


        if(

            !accessToken ||

            typeof accessToken !== "string"

        ){


            throw new Error(

                "Token do Facebook não encontrado."

            );


        }



        const response =

            await fetch(

                "/api/auth/facebook",

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

                            accessToken

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

                "Não foi possível entrar com o Facebook."

            );


        }



        if(!result.token){


            throw new Error(

                "O servidor não devolveu um token Facebook válido."

            );


        }



        /*
        --------------------------------------
        CREATE SESSION
        --------------------------------------
        */


        this.setSession(

            result.token,

            result.user

        );



        /*
        --------------------------------------
        CONFIRM SESSION
        --------------------------------------
        */


        const verifiedUser =

            await this.refreshUser();



        if(

            !verifiedUser ||

            !this.isAuthenticated()

        ){


            throw new Error(

                "A sessão Facebook não pôde ser confirmada."

            );


        }



        return this.user;


    }









    /*
    ==========================================
    FACEBOOK LOGIN ALIAS
    ==========================================
    */


    async facebookLogin(

        accessToken

    ){


        return this.loginWithFacebook(

            accessToken

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



        const cleanToken =

            token.trim();



        if(!cleanToken){


            throw new Error(

                "Token de autenticação inválido."

            );


        }



        this.token =

            cleanToken;



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


            /*
            ----------------------------------
            FACEBOOK LOGOUT
            ----------------------------------
            */


            try{


                if(

                    window.FB &&

                    typeof window.FB.getLoginStatus ===

                        "function"

                ){


                    window.FB.getLoginStatus(

                        response => {


                            if(

                                response?.status ===

                                    "connected"

                            ){


                                window.FB.logout(

                                    () => {}

                                );


                            }


                        }

                    );


                }


            }

            catch(error){


                console.warn(

                    "FACEBOOK LOGOUT ERROR:",

                    error

                );


            }



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



            /*
            ----------------------------------
            VALID SESSION
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
            INVALID SESSION
            ----------------------------------
            */


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
        401
        --------------------------------------
        */


        if(

            response.status === 401

        ){


            this.clearSession();


            return response;


        }



        /*
        --------------------------------------
        403
        --------------------------------------

        Não limpar automaticamente.
        Pode significar plano/permissão.
        --------------------------------------
        */


        if(

            response.status === 403

        ){


            let shouldClear = false;



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



                const sessionError =

                    errorMessage.includes(

                        "sessão"

                    ) ||

                    errorMessage.includes(

                        "session"

                    ) ||

                    errorMessage.includes(

                        "token"

                    ) ||

                    errorMessage.includes(

                        "unauthorized"

                    ) ||

                    errorMessage.includes(

                        "não autorizado"

                    ) ||

                    errorMessage.includes(

                        "autenticação"

                    ) ||

                    errorMessage.includes(

                        "authentication"

                    );



                const planError =

                    errorMessage.includes(

                        "plano"

                    ) ||

                    errorMessage.includes(

                        "plan"

                    ) ||

                    errorMessage.includes(

                        "funcionalidade"

                    );



                if(

                    sessionError &&

                    !planError

                ){

                    shouldClear = true;

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


        if(this.loading){

            return false;

        }



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









    /*
    ==========================================
    GET AUTH PROVIDER
    ==========================================
    */


    getProvider(){


        return (

            this.user?.provider ||

            null

        );


    }









    /*
    ==========================================
    IS GOOGLE USER
    ==========================================
    */


    isGoogleUser(){


        return (

            this.getProvider() ===

                "google"

        );


    }









    /*
    ==========================================
    IS FACEBOOK USER
    ==========================================
    */


    isFacebookUser(){


        return (

            this.getProvider() ===

                "facebook"

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
