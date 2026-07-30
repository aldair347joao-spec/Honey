/*
==========================================
HONEY IA
ORCHESTRATOR V4.0
Enterprise Multi-Agent Brain
Groq Integration
==========================================
*/


import Groq from "groq-sdk";

import Agents from "./agents.js";
import Workspace from "./workspace.js";
import { listMemories } from "./memory.js";
import { getRecentMessages } from "./chat.js";
import Tools from "./tools.js";



const groq = new Groq({

    apiKey:
    process.env.GROQ_API_KEY

});






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

        user={},

        agent="general",

        mode="chat"



    }){



        const started =
        Date.now();




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







            if(
                agent &&
                agent !== "general"
            ){


                selectedAgent =
                Agents.getById(agent);



            }else{


                selectedAgent =
                Agents.detect(message);


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








            let toolResult=null;








            if(
                Tools &&
                Tools.shouldUseTool(message)
            ){


                toolResult =
                await Tools.executeByMessage(
                    message
                );


            }








            const systemPrompt =
            this.buildPrompt({


                agent:selectedAgent,


                workspace,


                user,


                memories,


                history,


                toolResult,


                mode


            });









            const completion =
            await groq.chat.completions.create({



                model:
                "llama-3.3-70b-versatile",




                messages:[


                    {


                        role:"system",


                        content:
                        systemPrompt


                    },



                    {


                        role:"user",


                        content:
                        message


                    }



                ],






                temperature:0.7,



                max_tokens:2048



            });








            const response =

            completion
            .choices[0]
            ?.message
            ?.content

            ||

            "Não consegui responder agora.";









            this.metrics.requests++;


            this.metrics.success++;


            this.metrics.totalTime +=

            Date.now()-started;









            return {


                response,



                agentId:
                selectedAgent.id,



                agent:
                selectedAgent,



                context:{


                    workspace,


                    memories,


                    history


                },



                toolResult,



                mode


            };








        }catch(error){



            this.metrics.requests++;


            this.metrics.errors++;




            console.error(

                "Orchestrator Error:",

                error

            );




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



Você é ${agent.name} ${agent.emoji || ""}.



Especialidade:

${agent.description}





==============================

IDENTIDADE

==============================



Você mantém sempre esta identidade.



Nunca diga que é outro agente.



Nunca altere sua personalidade.



==============================

MODO

==============================



${
mode==="live"

?

"Conversa em tempo real."

:

"Conversa escrita."

}





==============================

UTILIZADOR

==============================



${JSON.stringify(user)}







==============================

WORKSPACE

==============================



${
workspace
?
workspace.name
:
"Sem workspace"
}







==============================

MEMÓRIA

==============================



${JSON.stringify(memories)}







==============================

HISTÓRICO

==============================



${JSON.stringify(history)}







==============================

FERRAMENTAS

==============================



${JSON.stringify(toolResult)}







REGRAS:



- Responda sempre em Português.

- Ajude de forma profissional.

- Gere código completo quando solicitado.

- Não invente informações.

- Preserve contexto.



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


            this.metrics.requests===0

            ?

            0

            :

            Math.round(

                this.metrics.totalTime /

                this.metrics.requests

            )



        };


    }




}



export default new Orchestrator();
