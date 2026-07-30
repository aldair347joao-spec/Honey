/*
==========================================
HONEY IA
LIVE ENGINE V4.0
Agent Identity + Live Session Manager
Compatible with AgentEngine V3
==========================================
*/


import agentstudio from "./agentstudio.js";



class liveengine {



    constructor(){


        this.session = null;


    }








    /*
    ======================================
    INICIAR SESSÃO LIVE
    ======================================
    */


    start(agentId = null){



        try {



            if(agentId){


                agentstudio.setagent(agentId);


            }






            const agent =
            agentstudio.getActiveAgent();






            if(!agent){


                throw new Error(

                    "Nenhum agente disponível."

                );


            }







            this.session = {



                active:true,



                agentId:agent.id,



                identity:this.createIdentity(agent),



                messages:[],



                startedAt:new Date(),



                lastActivity:new Date()



            };







            return this.session;








        }catch(error){



            throw error;


        }



    }









    /*
    ======================================
    CRIAR IDENTIDADE
    ======================================
    */


    createIdentity(agent){



        return {


            id:agent.id,


            name:agent.name,


            role:agent.description,


            emoji:agent.emoji || "🐝"



        };


    }









    /*
    ======================================
    ALTERAR AGENTE LIVE
    ======================================
    */


    switchAgent(agentId){



        try {



            const agent =
            agentstudio.setagent(agentId);







            if(!agent){


                return false;


            }








            if(this.session){



                this.session.agentId =
                agent.id;





                this.session.identity =
                this.createIdentity(agent);






                this.addMessage(

                    "system",

                    `Agente alterado para ${agent.name}`

                );



            }






            return true;






        }catch(error){



            console.error(

                "Erro ao trocar agente:",

                error

            );



            return false;


        }



    }









    /*
    ======================================
    IDENTIDADE ATUAL
    ======================================
    */


    getIdentity(){


        return this.session?.identity || null;


    }









    /*
    ======================================
    ADICIONAR MENSAGEM
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
    HISTÓRICO
    ======================================
    */


    getMessages(){



        return this.session?.messages || [];


    }









    /*
    ======================================
    PARAR LIVE
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
    SYSTEM PROMPT DO AGENTE
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



Especialidade:

${identity.role}



Modo:

Conversa Live em tempo real.



Regras:


- Mantenha sempre a identidade atual.

- Nunca diga que é outro agente.

- Nunca mude de personalidade.

- Ajude dentro da sua especialidade.

- Preserve o contexto da conversa.



`;



    }









    /*
    ======================================
    CONTEXTO LIVE COMPLETO
    ======================================
    */


    getlivecontext(){



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



export default new liveengine();
