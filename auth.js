/*
==========================================
HONEY IA OS
AUTH MANAGER
Frontend Session Controller
JWT + MongoDB Authentication
V3.0
==========================================
*/


class AuthManager {



    constructor(){


        this.user = null;


        this.token =

        localStorage.getItem(

            "honey_token"

        );


        this.loadSession();


    }









    async loadSession(){


        if(!this.token)

        return;



        try{


            const response =

            await fetch(

                "/api/auth/me",

                {

                    headers:{


                        "Authorization":

                        `Bearer ${this.token}`


                    }


                }

            );








            const data =

            await response.json();








            if(data.success){



                this.user =

                data.user;



                localStorage.setItem(

                    "honey_user",

                    JSON.stringify(

                        this.user

                    )

                );



            }


            else{


                this.logout();


            }




        }


        catch(error){



            console.error(

                "Erro ao recuperar sessão:",

                error

            );



        }


    }









    async register(data){


        const response =

        await fetch(

            "/api/auth/register",

            {


                method:"POST",


                headers:{


                    "Content-Type":

                    "application/json"


                },


                body:

                JSON.stringify(data)



            }


        );








        const result =

        await response.json();








        if(!result.success){


            throw new Error(

                result.error

            );


        }








        return result;



    }









    async verifyEmail(data){



        const response =

        await fetch(

            "/api/auth/verify-email",

            {


                method:"POST",


                headers:{


                    "Content-Type":

                    "application/json"


                },


                body:

                JSON.stringify(data)



            }


        );








        const result =

        await response.json();








        if(!result.success){


            throw new Error(

                result.error

            );


        }








        return result;



    }









    async login(data){



        const response =

        await fetch(

            "/api/auth/login",

            {


                method:"POST",


                headers:{


                    "Content-Type":

                    "application/json"


                },


                body:

                JSON.stringify(data)



            }


        );








        const result =

        await response.json();








        if(!result.success){


            throw new Error(

                result.error

            );


        }








        this.token =

        result.token;








        this.user =

        result.user;








        localStorage.setItem(

            "honey_token",

            this.token

        );








        localStorage.setItem(

            "honey_user",

            JSON.stringify(

                this.user

            )

        );








        return this.user;



    }









    getToken(){


        return this.token;


    }









    getUser(){


        return this.user;


    }









    isAuthenticated(){


        return !!this.token && !!this.user;


    }









    getPlan(){


        return this.user?.plano || "free";


    }









    logout(){



        this.user = null;


        this.token = null;




        localStorage.removeItem(

            "honey_token"

        );



        localStorage.removeItem(

            "honey_user"

        );



    }



}









export default new AuthManager();
