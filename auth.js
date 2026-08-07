/*
==========================================
HONEY IA OS
AUTH MANAGER
Frontend Session Controller
JWT + MongoDB + Google Authentication
V5.0
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
        --------------------------------------
        Restore local user
        --------------------------------------
        */


        this.loadStoredUser();



        /*
        --------------------------------------
        Restore backend session
        --------------------------------------
        */


        this.loadSession();



        /*
        --------------------------------------
        Initialize Google
        --------------------------------------
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



            if(storedUser){


                this.user =

                JSON.parse(

                    storedUser

                );


            }


        }


        catch(error){


            console.error(

                "Erro ao recuperar utilizador local:",

                error

            );


            localStorage.removeItem(

                "honey_user"

            );


            this.user = null;


        }


    }









    /*
    ==========================================
    RESTORE SESSION
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

                        "Authorization":

                        `Bearer ${this.token}`,

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

                data.user;


                this.saveUser();


                this.loading = false;


                this.notify();


                return this.user;


            }



            /*
            ----------------------------------
            Backend rejected session
            ----------------------------------
            */


            this.clearSession();


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
            Temporary network failure
            Keep existing local session.
            ----------------------------------
            */


            this.loading = false;


            this.notify();


            return null;


        }


    }









    /*
    ==========================================
    WAIT UNTIL AUTH IS READY
    ==========================================
    */


    async waitUntilReady(){


        while(this.loading){


            await new Promise(

                resolve =>

                setTimeout(

                    resolve,

                    50

                )

            );


        }



        return this.user;


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

                JSON.stringify(data)

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

                JSON.stringify(data)

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

                    email

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

                JSON.stringify(data)

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



        this.setSession(

            result.token,

            result.user

        );



        return this.user;


    }









    /*
    ==========================================
    GOOGLE LOGIN ALIAS
    Compatibility
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


        /*
        --------------------------------------
        If client ID is not available,
        do not break authentication.
        --------------------------------------
        */


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



        /*
        --------------------------------------
        Verify library
        --------------------------------------
        */


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


            /*
            ----------------------------------
            Import login controller dynamically
            ----------------------------------
            */


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


        this.user = user || null;



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

            !!this.user

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


        try{


            if(this.token){


                await fetch(

                    "/api/auth/logout",

                    {

                        method:"POST",


                        headers:{

                            "Authorization":

                            `Bearer ${this.token}`,

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


    clearSession(){


        this.user = null;


        this.token = null;


        this.loading = false;



        localStorage.removeItem(

            "honey_token"

        );



        localStorage.removeItem(

            "honey_user"

        );



        this.notify();


    }









    /*
    ==========================================
    REFRESH USER
    ==========================================
    */


    async refreshUser(){


        if(!this.token){


            return null;


        }



        try{


            const response =

            await fetch(

                "/api/auth/me",

                {

                    method:"GET",


                    headers:{

                        "Authorization":

                        `Bearer ${this.token}`,

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

                data.user;


                this.saveUser();


                this.notify();


                return this.user;


            }



            this.clearSession();


            return null;


        }


        catch(error){


            console.error(

                "Erro ao atualizar utilizador:",

                error

            );


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

        options={}

    ){


        const headers = {

            ...(options.headers || {}),

            ...this.getAuthHeader()

        };



        return fetch(

            url,

            {

                ...options,

                headers

            }

        );


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
    EVENT LISTENERS
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
