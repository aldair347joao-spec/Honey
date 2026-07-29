/*
==========================================
HONEY IA
LIVE ENGINE
Agent Identity Integration
==========================================
*/

import AgentStudio from "./agentStudio.js";


class LiveEngine {


    constructor(){

        this.session = null;

    }



    start(){

        const agent = AgentStudio.getActiveAgent();


        this.session = {

            agentId: agent.id,

            identity: {

                name: agent.name,

                role: agent.description,

                emoji: agent.emoji

            },

            startedAt: new Date()

        };


        return this.session;

    }




    getIdentity(){

        if(!this.session){

            return null;

        }


        return this.session.identity;

    }




    buildSystemIdentity(){


        const identity = this.getIdentity();


        if(!identity){

            return "Você é a Honey IA.";

        }



        return `

Você é ${identity.name}.

Sua função é:
${identity.role}

Mantenha essa identidade durante toda a conversa ao vivo.

Nunca responda como outro agente.

`;

    }


}


export default new LiveEngine();
