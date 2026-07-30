/*
==========================================
HONEY IA
LIVE ENGINE
Agent Identity + Live Session Manager
Versão 4.0
==========================================
*/


import AgentStudio from "./agentStudio.js";



class LiveEngine {



    constructor(){


        this.session=null;


    }









    /*
    ======================================
    INICIAR SESSÃO LIVE
    ======================================
    */


    start(agentId=null){



        let agent;





        if(agentId){


            AgentStudio.setAgent(
                agentId
            );


        }







        agent =
        AgentStudio.getActiveAgent();







        if(!agent){


            throw new Error(
                "Nenhum agente disponível para iniciar Live."
            );


        }







        this.session={


            active:true,



            agentId:
            agent.id,



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
    TROCAR AGENTE LIVE
    ======================================
    */


    switchAgent(agentId){



        const agent =
        AgentStudio.setAgent(
            agentId
        );





        if(!agent){


            return false;


        }








        if(this.session){



            this.session.agentId =
            agent.id;





            this.session.identity={



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
    IDENTIDADE
    ======================================
    */


    getIdentity(){



        return this.session
        ?
        this.session.identity
        :
        null;



    }









    /*
    ======================================
    MENSAGENS
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








    getMessages(){


        return this.session
        ?
        this.session.messages
        :
        [];



    }









    /*
    ======================================
    ENCERRAR
    ======================================
    */


    stop(){



        const oldSession =
        this.session;





        if(this.session){


            this.session.active=false;


        }






        this.session=null;






        return oldSession;



    }









    /*
    ======================================
    IDENTIDADE SYSTEM PROMPT
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



Sua função:

${identity.role}



Você está em uma conversa ao vivo.



REGRAS:



- Mantenha sempre esta identidade.

- Nunca diga que é outro agente.

- Nunca mude de personalidade.

- Responda dentro da sua especialidade.

- Preserve o contexto da sessão.



`;



    }









    /*
    ======================================
    CONTEXTO LIVE
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
