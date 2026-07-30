/*
==========================================
HONEY IA
LIVE CLIENT
Frontend Live Controller
Versão 2.0
==========================================
*/


class LiveClient {


    constructor(){

        this.active = false;

        this.agent = null;

    }






    async changeAgent(agentId){


        const response =
        await fetch(
            "/api/live/agent",
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


            this.agent =
            data.agent;


        }



        return data;


    }








    async start(agentId=null){



        try{



            if(agentId){


                await this.changeAgent(agentId);


            }






            const response =
            await fetch(
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


                this.active=true;



                this.agent =
                data.session.identity;



            }




            return data;





        }catch(error){



            throw new Error(
                "Falha ao iniciar Live: "
                +
                error.message
            );


        }



    }









    async send(message){



        if(!this.active){


            throw new Error(
                "Modo Live não iniciado."
            );


        }






        const response =
        await fetch(
            "/api/live/chat",
            {

                method:"POST",


                headers:{
                    "Content-Type":"application/json"
                },


                body:JSON.stringify({

                    message

                })


            }
        );






        const data =
        await response.json();





        if(data.agent){


            this.agent =
            data.agent;


        }






        return data;



    }









    async stop(){



        try{


            await fetch(
                "/api/live/stop",
                {

                    method:"POST",

                    headers:{
                        "Content-Type":"application/json"
                    }

                }
            );


        }catch(error){


            console.warn(
                "Erro ao fechar Live:",
                error.message
            );


        }






        this.active=false;


        this.agent=null;



    }









    getAgent(){


        return this.agent;


    }






}



export default new LiveClient();
