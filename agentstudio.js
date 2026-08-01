/*
==========================================
HONEY IA
AGENT STUDIO
Agent Manager
Versão 2.0
==========================================
*/


import agents from "./agents.js";


class agentstudio {



    constructor(){


        this.currentagent = "general";


        this.mode = "chat";


        this.status = "idle";


    }






    /*
    ======================================
    DEFINIR AGENTE
    ======================================
    */


    setagent(agentid){


        const agent =
        agents.getbyid(agentid);



        if(!agent){


            throw new Error(
                "Agente não encontrado."
            );


        }



        this.currentagent =
        agent.id;



        return agent;


    }







    /*
    ======================================
    OBTER ID DO AGENTE
    ======================================
    */


    getagent(){


        return this.currentagent;


    }







    /*
    ======================================
    OBTER AGENTE COMPLETO
    ======================================
    */


    getactiveagent(){


        return agents.getbyid(
            this.currentagent
        );


    }








    /*
    ======================================
    MODO CHAT/LIVE
    ======================================
    */


    setmode(mode){


        if(
            mode !== "chat" &&
            mode !== "live"
        ){

            return;

        }



        this.mode =
        mode;



    }






    getmode(){


        return this.mode;


    }








    /*
    ======================================
    STATUS DO AGENTE
    ======================================
    */


    setstatus(status){


        this.status =
        status;



        document.dispatchEvent(

            new CustomEvent(
                "agent-status",
                {

                    detail:{

                        status

                    }

                }

            )

        );


    }





    getStatus(){


        return this.status;


    }






}



export default new agentstudio();
