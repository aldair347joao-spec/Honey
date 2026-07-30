/*
==========================================
HONEY IA
AGENT STUDIO
Agent Manager
Versão 2.0
==========================================
*/


import Agents from "./agents.js";


class AgentStudio {



    constructor(){


        this.currentAgent = "general";


        this.mode = "chat";


        this.status = "idle";


    }






    /*
    ======================================
    DEFINIR AGENTE
    ======================================
    */


    setAgent(agentId){


        const agent =
        Agents.getById(agentId);



        if(!agent){


            throw new Error(
                "Agente não encontrado."
            );


        }



        this.currentAgent =
        agent.id;



        return agent;


    }







    /*
    ======================================
    OBTER ID DO AGENTE
    ======================================
    */


    getAgent(){


        return this.currentAgent;


    }







    /*
    ======================================
    OBTER AGENTE COMPLETO
    ======================================
    */


    getActiveAgent(){


        return Agents.getById(
            this.currentAgent
        );


    }








    /*
    ======================================
    MODO CHAT/LIVE
    ======================================
    */


    setMode(mode){


        if(
            mode !== "chat" &&
            mode !== "live"
        ){

            return;

        }



        this.mode =
        mode;



    }






    getMode(){


        return this.mode;


    }








    /*
    ======================================
    STATUS DO AGENTE
    ======================================
    */


    setStatus(status){


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



export default new AgentStudio();
