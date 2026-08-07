/*
==========================================
HONEY IA OS
AUTH MANAGER
Frontend Session Controller
JWT + MongoDB + Google Authentication
V5.1
==========================================
*/


class AuthManager {


    constructor(){


        this.user = null;


        this.token =

        localStorage.getItem(

            "honey_token"

        );


        this.loading = true;


        this.listeners = [];


        this.googleInitialized = false;


        this.googleClientId =

        window.HONEY_GOOGLE_CLIENT_ID ||

        window.GOOGLE_CLIENT_ID ||

        "";



        /*
        ======================================
        RESTORE LOCAL USER
        ======================================
        */


        this.loadStoredUser();



        /*
        ======================================
        RESTORE BACKEND SESSION
        ======================================
        */


        this.sessionPromise =

        this.loadSession();



        /*
        ======================================
        INITIALIZE GOOGLE
        ======================================
        */


        this.initializeGoogleWhenReady();


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

                parsedUser;


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

                "Erro ao recuperar utilizador local:",

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


        if(!this.token){


            this.loading = false;


            this.notify();


            return null;


        }



        try{


            const response =

            await fetch(

                "/api/auth/me",

                {

                    method:"GET",


                    headers:{

                        ...this.getAuthHeader(),

                        "Accept":

                        "application/json"

                    }


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


                this.clearSession(

                    false

                );


            }



            this.loading = false;


            this.notify();


            return null;


        }


        catch(error){


            console.error(

                "Erro ao recuperar sessão:",

                error

            );



            /*
            ----------------------------------
            Network failure
            ----------------------------------
            */


            this.loading = false;


            this.notify();


            return this.user;


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

            "",


            lastName:

            user.lastName ||

            "",


            email:

            user.email ||

            "",


            avatar:

            user.avatar ||

            null,


            plan:

            user.plan ||

            "free",


            emailVerified:

            user.emailVerified === true,


            isActive:

            user.isActive !== false,


            googleId:

            user.googleId ||

            null


        };



        /*
        ----------------------------------
        Compatibility with older UI
        ----------------------------------
        */


        normalized.name =

        [

            normalized.firstName,

            normalized.lastName

        ]

        .filter(Boolean)

        .join(" ")

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


        const response =

        await fetch(

            "/api/auth/register",

            {

                method:"POST",


                headers:{

                    "Content-Type":

                    "application/json",

                    "Accept":

                    "application/json"

                },


                body:

                JSON.stringify(

                    data || {}

                )

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



        return result;


    }









    /*
    ==========================================
    VERIFY EMAIL
    ==========================================
    */


    async verifyEmail(data){


        const response =

        await fetch(

            "/api/auth/verify-email",

            {

                method:"POST",


                headers:{

                    "Content-Type":

                    "application/json",

                    "Accept":

                    "application/json"

                },


                body:

                JSON.stringify(

                    data || {}

                )

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


        const response =

        await fetch(

            "/api/auth/resend-verification",

            {

                method:"POST",


                headers:{

                    "Content-Type":

                    "application/json",

                    "Accept":

                    "application/json"

                },


                body:

                JSON.stringify({

                    email:

                    String(

                        email || ""

                    )

                    .trim()

                    .toLowerCase()

                })

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


        const response =

        await fetch(

            "/api/auth/login",

            {

                method:"POST",


                headers:{

                    "Content-Type":

                    "application/json",

                    "Accept":

                    "application/json"

                },


                body:

                JSON.stringify(

                    data || {}

                )

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


        if(!credential){


            throw new Error(

                "Credenciais do Google não encontradas."

            );


        }



        const response =

        await fetch(

            "/api/auth/google",

            {

                method:"POST",


                headers:{

                    "Content-Type":

                    "application/json",

                    "Accept":

                    "application/json"

                },


                body:

                JSON.stringify({

                    credential

                })

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
    INITIALIZE GOOGLE
    ==========================================
    */


    async initializeGoogleWhenReady(){


        if(!this.googleClientId){


            console.warn(

                "GOOGLE_CLIENT_ID não disponível no frontend."

            );


            return false;


        }



        /*
        --------------------------------------
        Wait for Google Identity Services
        --------------------------------------
        */


        for(

            let attempt = 0;

            attempt < 100;

            attempt++

        ){


            if(

                typeof window.google !==

                "undefined" &&

                window.google.accounts &&

                window.google.accounts.id

            ){


                break;


            }



            await new Promise(

                resolve =>

                setTimeout(

                    resolve,

                    100

                )

            );


        }



        if(

            typeof window.google ===

            "undefined" ||

            !window.google.accounts ||

            !window.google.accounts.id

        ){


            console.warn(

                "Google Identity Services não foi carregado."

            );


            return false;


        }



        try{


            const module =

            await import(

                "./login.js"

            );



            const logincontroller =

            module.default;



            if(

                !logincontroller ||

                typeof logincontroller

                    .initializeGoogleLogin !==

                "function"

            ){


                console.warn(

                    "Login controller Google não disponível."

                );


                return false;


            }



            const initialized =

            logincontroller

                .initializeGoogleLogin(

                    this.googleClientId

                );



            this.googleInitialized =

                initialized === true;



            return this.googleInitialized;


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
    SET SESSION
    ==========================================
    */


    setSession(

        token,

        user

    ){


        if(!token){


            throw new Error(

                "Token de autenticação inválido."

            );


        }



        this.token = token;


        this.user =

        this.normalizeUser(

            user

        );



        localStorage.setItem(

            "honey_token",

            token

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

            !!this.token &&

            !!this.user &&

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

                        method:"POST",


                        headers:{

                            "Authorization":

                            `Bearer ${currentToken}`,

                            "Accept":

                            "application/json"

                        }


                    }

                );


            }


        }


        catch(error){


            console.warn(

                "Não foi possível encerrar a sessão no servidor:",

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


        this.googleInitialized =

        false;


        localStorage.removeItem(

            "honey_token"

        );


        localStorage.removeItem(

            "honey_user"

        );



        this.loading = false;



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

                    method:"GET",


                    headers:{

                        ...this.getAuthHeader(),

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


            }



            return null;


        }


        catch(error){


            console.error(

                "Erro ao atualizar utilizador:",

                error

            );


            return this.user;


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

        options={}

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

                headers

            }

        );



        /*
        --------------------------------------
        Automatic session invalidation
        --------------------------------------
        */


        if(

            response.status === 401 ||

            response.status === 403

        ){


            /*
            Do not immediately destroy the
            session on every protected request
            unless the server confirms it.
            */


            const clone =

            response.clone();



            try{


                const data =

                await clone.json();



                if(

                    data?.error &&

                    (

                        data.error

                            .toLowerCase()

                            .includes("sessão") ||

                        data.error

                            .toLowerCase()

                            .includes("token")

                    )

                ){


                    this.clearSession();


                }


            }


            catch(error){


                console.warn(

                    "AUTH FETCH RESPONSE ERROR:",

                    error

                );


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

            response.headers

                .get(

                    "content-type"

                ) || "";



            if(

                !contentType

                    .includes(

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

                "Resposta inválida do servidor:",

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
    SUBSCRIBE
    ==========================================
    */


    subscribe(callback){


        if(

            typeof callback !==

            "function"

        ){


            return ()=>{};


        }



        this.listeners.push(

            callback

        );



        /*
        --------------------------------------
        Return unsubscribe function
        --------------------------------------
        */


        return ()=>{


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


        this.listeners.forEach(

            callback => {


                try{


                    callback(

                        this.user

                    );


                }


                catch(error){


                    console.error(

                        "Auth listener error:",

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

        redirect="/"

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

        allowedPlans=[]

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
