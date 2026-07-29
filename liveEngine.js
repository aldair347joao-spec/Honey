/*
==========================================
HONEY IA
LIVE ENGINE
Agent Identity + Session Memory
Versão 2.0
==========================================
*/

import AgentStudio from "./agentStudio.js";


class LiveEngine {

switchActiveAgent(agentId){

    const result = AgentStudio.selectAgent(agentId);


    if(this.session){

        const agent = AgentStudio.getActiveAgent();


        this.session.agentId = agent.id;


        this.session.identity = {

            name: agent.name,

            role: agent.description,

            emoji: agent.emoji

        };


    }


    return result;

}
    constructor(){

        this.session = null;

    }



    start(){

        const agent = AgentStudio.getActiveAgent();


        if(!agent){

            throw new Error("Nenhum agente ativo encontrado.");

        }



        this.session = {

            agentId: agent.id,

            identity: {

                name: agent.name,

                role: agent.description,

                emoji: agent.emoji

            },


            messages: [],

            startedAt: new Date()

        };


        return this.session;

    }




    switchAgent(agentId){

        const result = AgentStudio.selectAgent(agentId);


        this.session = null;


        return result;

    }





    getIdentity(){

        if(!this.session){

            return null;

        }


        return this.session.identity;

    }





    addMessage(role, content){

        if(!this.session){

            return;

        }


        this.session.messages.push({

            role,

            content,

            time:new Date()

        });

    }





    getMessages(){

        if(!this.session){

            return [];

        }


        return this.session.messages;

    }






    buildSystemIdentity(){


        const identity = this.getIdentity();



        if(!identity){

            return "Você é a Honey IA.";

        }




        return `

Você é ${identity.name}.

Identidade:
${identity.role}

Regra principal:
Mantenha esta personalidade durante toda a conversa ao vivo.

Não mude de agente.
Não diga que é outro assistente.
Responda sempre dentro da sua especialidade.

`;

    }






    getLiveContext(){


        return {

            identity:this.getIdentity(),

            messages:this.getMessages(),

            systemPrompt:this.buildSystemIdentity()

        };


    }



}


export default new LiveEngine();
