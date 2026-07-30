/*
==========================================
HONEY IA
LIVE ENGINE
Agent Identity + Live Session Manager
Versão 3.0
==========================================
*/

import AgentStudio from "./agentStudio.js";


class LiveEngine {


    constructor(){

        this.session = null;

    }




    /*
    ======================================
    INICIAR SESSÃO LIVE
    ======================================
    */


    start(agentId = null){


        let agent;


        if(agentId){

            AgentStudio.selectAgent(agentId);

        }



        agent = AgentStudio.getActiveAgent();



        if(!agent){

            throw new Error(
                "Nenhum agente disponível para iniciar Live."
            );

        }



        this.session = {


            active:true,


            agentId:agent.id,


            identity:{


                id:agent.id,

                name:agent.name,

                role:agent.description,

                emoji:agent.emoji


            },


            messages:[],


            startedAt:new Date(),


            lastActivity:new Date()


        };



        return this.session;


    }







    /*
    ======================================
    TROCAR AGENTE DURANTE LIVE
    ======================================
    */


    switchAgent(agentId){


        const result =
            AgentStudio.selectAgent(agentId);



        if(!result){

            return false;

        }




        const agent =
            AgentStudio.getActiveAgent();




        if(this.session && agent){



            this.session.agentId =
                agent.id;



            this.session.identity = {


                id:agent.id,

                name:agent.name,

                role:agent.description,

                emoji:agent.emoji


            };



            this.addMessage(
                "system",
                `Agente alterado para ${agent.name}`
            );


        }




        return true;


    }







    /*
    ======================================
    IDENTIDADE ATUAL
    ======================================
    */


    getIdentity(){


        if(!this.session){

            return null;

        }


        return this.session.identity;


    }








    /*
    ======================================
    ADICIONAR MENSAGEM LIVE
    ======================================
    */


    addMessage(role,content){



        if(!this.session){

            return;

        }



        this.session.messages.push({


            role,


            content,


            time:new Date()


        });



        this.session.lastActivity =
            new Date();


    }







    /*
    ======================================
    HISTÓRICO LIVE
    ======================================
    */


    getMessages(){


        if(!this.session){

            return [];

        }


        return this.session.messages;


    }







    /*
    ======================================
    ENCERRAR LIVE
    ======================================
    */


    stop(){


        if(this.session){


            this.session.active=false;


        }


        return this.session;


    }








    /*
    ======================================
    PROMPT DE IDENTIDADE DO AGENTE
    ======================================
    */


    buildSystemIdentity(){



        const identity =
            this.getIdentity();




        if(!identity){


            return `
Você é a Honey IA.
`;

        }






        return `


Você é ${identity.name} ${identity.emoji}.



Sua função é:

${identity.role}



Modo:

Conversação ao vivo.



Regras:



- Mantenha sempre esta identidade.

- Nunca diga que é outro agente.

- Nunca mude de personalidade.

- Responda dentro da sua especialidade.

- Preserve o contexto desta sessão.



`;



    }








    /*
    ======================================
    CONTEXTO COMPLETO LIVE
    ======================================
    */


    getLiveContext(){



        return {


            active:
                this.session?.active || false,


            agentId:
                this.session?.agentId || null,


            identity:
                this.getIdentity(),



            messages:
                this.getMessages(),



            systemPrompt:
                this.buildSystemIdentity()



        };


    }



}



export default new LiveEngine();
