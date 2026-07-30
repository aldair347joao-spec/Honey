/*
==========================================
HONEY IA
ORCHESTRATOR V4.0
Enterprise Multi-Agent Core
14 Agents Integrated
==========================================
*/

import Agents from "./agents.js";
import Workspace from "./workspace.js";
import { listMemories } from "./memory.js";
import { getRecentMessages } from "./chat.js";
import Tools from "./tools.js";


class Orchestrator {


    constructor(){


        this.metrics = {

            requests:0,

            success:0,

            errors:0,

            totalTime:0

        };


    }







    async process({

        userId,

        message,

        user = {},

        agent = "general",

        mode = "chat"


    }){


        const started = Date.now();



        try{



            const workspace =
                Workspace.getCurrent();





            const memories =
                await listMemories(userId);





            const history =
                await getRecentMessages(
                    userId,
                    15
                );






            let selectedAgent;






            /*
            ======================================
            SELEÇÃO DO AGENTE
            ======================================
            */


            if(
                agent &&
                agent !== "general"
            ){


                selectedAgent =
                    Agents.getById(agent);


            }

            else{


                selectedAgent =
                    Agents.detect(
                        message || ""
                    );


            }






            if(!selectedAgent){


                selectedAgent =
                    Agents.getById(
                        "general"
                    );


            }







            Agents.setActive(
                selectedAgent.id
            );








            let toolResult = null;






            if(
                Tools &&
                typeof Tools.shouldUseTool === "function" &&
                Tools.shouldUseTool(message)
            ){



                toolResult =
                    await Tools.executeByMessage(
                        message
                    );



            }









            const prompt =
                this.buildPrompt({


                    agent:selectedAgent,

                    workspace,

                    user,

                    memories,

                    history,

                    toolResult,

                    mode


                });







            this.metrics.requests++;

            this.metrics.success++;

            this.metrics.totalTime +=
                Date.now() - started;








            return {



                prompt,



                context:{


                    workspace,


                    memories,


                    history



                },



                toolResult,



                agentId:
                    selectedAgent.id,



                agent:selectedAgent,



                mode,



                memories,



                history



            };








        }

        catch(error){



            this.metrics.requests++;

            this.metrics.errors++;



            throw error;



        }



    }









    buildPrompt({


        agent,


        workspace,


        user,


        memories,


        history,


        toolResult,


        mode



    }){






        return `



====================================

IDENTIDADE DO AGENTE

====================================


Você é ${agent.name} ${agent.emoji || ""}.


Especialidade:

${agent.description}



====================================

MODO ATUAL

====================================


${
mode === "live"

?

"Conversa ao vivo. Responda de forma natural e próxima, como uma conversa por voz."

:

"Conversa escrita. Responda de forma clara e profissional."

}




====================================

UTILIZADOR

====================================


${JSON.stringify(user)}




====================================

WORKSPACE

====================================


${
workspace

?

workspace.name

:

"Sem Workspace ativo"

}





====================================

MEMÓRIA

====================================


${JSON.stringify(memories)}






====================================

HISTÓRICO

====================================


${JSON.stringify(history)}







====================================

FERRAMENTAS

====================================


${JSON.stringify(toolResult)}






====================================

REGRAS PRINCIPAIS

====================================


- Você é sempre ${agent.name}.

- Nunca diga que é outro agente.

- Nunca altere a sua identidade durante a conversa.

- Responda sempre dentro da sua especialidade.

- Se a pergunta estiver fora da sua área, ajude mantendo a personalidade do agente.

- Preserve o contexto do utilizador.

- Gere código completo quando solicitado.

- Não invente informações.

- Responda sempre em Português.



`;





    }









    stats(){



        return {


            requests:
                this.metrics.requests,



            success:
                this.metrics.success,



            errors:
                this.metrics.errors,



            average:


                this.metrics.requests === 0


                ? 0


                :

                Math.round(

                    this.metrics.totalTime /

                    this.metrics.requests

                )



        };



    }




}




export default new Orchestrator();
