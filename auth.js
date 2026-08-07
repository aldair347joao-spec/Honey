/*
==========================================
HONEY IA OS
AUTH MANAGER
Professional Frontend Authentication
JWT + MongoDB + Google
V4.0
==========================================
*/


class AuthManager {



    constructor(){


        /*
        ==================================
        INTERNAL STATE
        ==================================
        */


        this.user = null;


        this.token =

        localStorage.getItem(

            "honey_token"

        );


        this.ready =

        this.loadSession();



    }









    /*
    ==========================================
    API REQUEST HELPER
    ==========================================
    */


    async request(

        url,

        options = {}

    ){


        const headers = {

            ...(options.headers || {})

        };



        /*
        --------------------------------------
        JSON CONTENT TYPE
        --------------------------------------
        */


        if(

            options.body &&

            typeof options.body !== "string"

        ){

            headers["Content-Type"] =

                "application/json";



            options.body =

                JSON.stringify(

                    options.body

                );

        }



        /*
        --------------------------------------
        AUTHORIZATION
        --------------------------------------
        */


        if(this.token){

            headers["Authorization"] =

                `Bearer ${this.token}`;

        }



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
        SAFE JSON PARSING
        --------------------------------------
        */


        let data = null;



        try{


            data =

            await response.json();


        }

        catch(error){


            data = {

                success:false,

                error:

                "Resposta inválida do servidor."

            };

        }



        /*
        --------------------------------------
        HTTP ERROR
        --------------------------------------
        */


        if(

            !response.ok ||

            data.success === false

        ){


            const error =

            new Error(

                data.error ||

                "Ocorreu um erro."

            );



            error.status =

                response.status;



            /*
            ----------------------------------
            INVALID SESSION
            ----------------------------------
            */


            if(

                response.status === 401 &&

                url !== "/api/auth/login" &&

                url !== "/api/auth/google"

            ){

                this.clearSession();

            }



            throw error;

        }



        return data;

    }









    /*
    ==========================================
    LOAD SESSION
    RESTORE USER SESSION
    ==========================================
    */


    async loadSession(){


        if(!this.token){

            this.user = null;

            return null;

        }



        try{


            const data =

            await this.request(

                "/api/auth/me",

                {

                    method:"GET"

                }

            );



            if(data.success && data.user){


                this.user =

                    this.normalizeUser(

                        data.user

                    );



                this.saveUser();



                return this.user;

            }



            this.clearSession();



            return null;


        }

        catch(error){


            /*
            ----------------------------------
            Do not destroy session on temporary
            network failure.
            ----------------------------------
            */


            if(

                error.status === 401 ||

                error.status === 403

            ){

                this.clearSession();

            }



            console.warn(

                "Erro ao recuperar sessão:",

                error.message

            );



            return null;

        }


    }









    /*
    ==========================================
    NORMALIZE USER
    Compatibility Layer
    ==========================================
    */


    normalizeUser(user){


        if(!user)

            return null;



        const normalized = {

            ...user

        };



        /*
        --------------------------------------
        New field names
        --------------------------------------
        */


        normalized.firstName =

            user.firstName ||

            user.nome ||

            "";



        normalized.lastName =

            user.lastName ||

            user.apelido ||

            "";



        normalized.plan =

            user.plan ||

            user.plano ||

            "free";



        normalized.avatar =

            user.avatar ||

            null;



        /*
        --------------------------------------
        Legacy compatibility
        --------------------------------------
        */


        normalized.nome =

            normalized.firstName;



        normalized.apelido =

            normalized.lastName;



        normalized.plano =

            normalized.plan;



        return normalized;

    }









    /*
    ==========================================
    SAVE USER
    ==========================================
    */


    saveUser(){


        if(!this.user)

            return;



        localStorage.setItem(

            "honey_user",

            JSON.stringify(

                this.user

            )

        );

    }









    /*
    ==========================================
    REGISTER
    ==========================================
    */


    async register(data){


        const result =

        await this.request(

            "/api/auth/register",

            {

                method:"POST",

                body:data

            }

        );



        return result;

    }









    /*
    ==========================================
    VERIFY EMAIL
    ==========================================
    */


    async verifyEmail(data){


        const result =

        await this.request(

            "/api/auth/verify-email",

            {

                method:"POST",

                body:data

            }

        );



        return result;

    }









    /*
    ==========================================
    RESEND VERIFICATION CODE
    ==========================================
    */


    async resendVerificationCode(

        email

    ){


        const result =

        await this.request(

            "/api/auth/resend-verification",

            {

                method:"POST",

                body:{

                    email

                }

            }

        );



        return result;

    }









    /*
    ==========================================
    LOGIN
    EMAIL + PASSWORD
    ==========================================
    */


    async login(data){


        const result =

        await this.request(

            "/api/auth/login",

            {

                method:"POST",

                body:data

            }

        );



        /*
        --------------------------------------
        STORE TOKEN
        --------------------------------------
        */


        this.token =

            result.token;



        /*
        --------------------------------------
        STORE USER
        --------------------------------------
        */


        this.user =

            this.normalizeUser(

                result.user

            );



        localStorage.setItem(

            "honey_token",

            this.token

        );



        this.saveUser();



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

                "Credencial Google não fornecida."

            );

        }



        const result =

        await this.request(

            "/api/auth/google",

            {

                method:"POST",

                body:{

                    credential

                }

            }

        );



        /*
        --------------------------------------
        STORE TOKEN
        --------------------------------------
        */


        this.token =

            result.token;



        /*
        --------------------------------------
        STORE USER
        --------------------------------------
        */


        this.user =

            this.normalizeUser(

                result.user

            );



        localStorage.setItem(

            "honey_token",

            this.token

        );



        this.saveUser();



        return this.user;

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

            this.user?.plano ||

            "free"

        );

    }









    /*
    ==========================================
    AUTHENTICATION STATUS
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
    SESSION READY
    ==========================================
    */


    async waitUntilReady(){


        return this.ready;

    }









    /*
    ==========================================
    REFRESH SESSION
    ==========================================
    */


    async refreshSession(){


        if(!this.token){

            this.clearSession();

            return null;

        }



        try{


            const data =

            await this.request(

                "/api/auth/me",

                {

                    method:"GET"

                }

            );



            if(

                data.success &&

                data.user

            ){

                this.user =

                    this.normalizeUser(

                        data.user

                    );



                this.saveUser();



                return this.user;

            }



            this.clearSession();



            return null;


        }

        catch(error){


            if(

                error.status === 401 ||

                error.status === 403

            ){

                this.clearSession();

            }



            throw error;

        }

    }









    /*
    ==========================================
    LOGOUT
    SERVER + CLIENT
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

                            `Bearer ${this.token}`

                        }

                    }

                );

            }


        }

        catch(error){


            console.warn(

                "Erro ao terminar sessão no servidor:",

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



        localStorage.removeItem(

            "honey_token"

        );



        localStorage.removeItem(

            "honey_user"

        );

    }









    /*
    ==========================================
    CHECK AUTH
    ==========================================
    */


    requireAuth(){


        if(!this.isAuthenticated()){

            return false;

        }



        return true;

    }



}



/*
==========================================
SINGLETON
==========================================
*/


export default new AuthManager();
