/*
==========================================
HONEY IA
LIVE CLIENT V3.0
Frontend Live Controller
Agent Studio Integration
==========================================
*/


class liveclient {


    constructor(){


        this.active = false;


        this.agent = null;


        this.session = null;


    }







    /*
    ======================================
    INICIAR LIVE
    ======================================
    */


    async start(agentId = null){



        try {



            const response = await fetch(

                "/api/live/start",

                {

                    method:"POST",

                    headers:{

                        "Content-Type":"application/json"

                    },


                    body:JSON.stringify({

                        agentId

                    })


                }

            );






            const data =
            await response.json();






            if(data.success){



                this.active = true;



                this.session =
                data.session;





                this.agent =
                data.session.identity;






                document.dispatchEvent(

                    new CustomEvent(
                        "live-started",
                        {

                            detail:this.agent

                        }

                    )

                );



            }






            return data;






        } catch(error){



            console.error(

                "Erro ao iniciar Live:",

                error

            );



            return {

                success:false,

                error:error.message

            };


        }


    }









    /*
    ======================================
    ENVIAR MENSAGEM
    ======================================
    */


    async send(message){



        if(!this.active){


            throw new Error(

                "Modo Live não iniciado."

            );


        }






        try {



            const response =
            await fetch(

                "/api/live/chat",

                {


                    method:"POST",


                    headers:{


                        "Content-Type":
                        "application/json"


                    },



                    body:JSON.stringify({

                        message

                    })

                }

            );






            const data =
            await response.json();







            if(data.success){



                this.session =
                data.context;



                this.agent =
                data.agent;





                document.dispatchEvent(

                    new CustomEvent(
                        "live-message",
                        {

                            detail:data

                        }

                    )

                );


            }







            return data;







        }catch(error){



            console.error(

                "Erro Live Chat:",

                error

            );



            return {


                success:false,

                error:error.message


            };



        }



    }









    /*
    ======================================
    TROCAR AGENTE
    ======================================
    */


    async changeagent(agentId){



        try {



            const response =
            await fetch(

                "/api/live/agent",

                {


                    method:"POST",


                    headers:{


                        "Content-Type":
                        "application/json"


                    },


                    body:JSON.stringify({

                        agentId

                    })


                }

            );






            const data =
            await response.json();






            if(data.success){



                this.agent =
                data.agent;






                document.dispatchEvent(

                    new CustomEvent(
                        "agent-changed",
                        {

                            detail:
                            this.agent

                        }

                    )

                );



            }






            return data;







        }catch(error){



            console.error(

                "Erro ao trocar agente:",

                error

            );



            return {


                success:false,

                error:error.message


            };



        }




    }









    /*
    ======================================
    PARAR LIVE
    ======================================
    */


    async stop(){



        try {



            await fetch(

                "/api/live/stop",

                {

                    method:"POST"

                }

            );



        }catch(error){



            console.error(

                error

            );


        }






        this.active=false;


        this.agent=null;


        this.session=null;






        document.dispatchEvent(

            new Event(
                "live-stopped"
            )

        );





    }








    /*
    ======================================
    GETTERS
    ======================================
    */


    getagent(){


        return this.agent;


    }





    isActive(){


        return this.active;


    }





    getsession(){


        return this.session;


    }





}



export default new liveclient();
