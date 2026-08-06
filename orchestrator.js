/*
==========================================
HONEY IA OS
ORCHESTRATOR ENGINE V5.0
FULL MULTI-AGENT PRODUCTION
30 SPECIALIST AGENTS
==========================================
*/


// ==========================================
// CORE AGENTS
// ==========================================

import generalagent from "./agents/generalagent.js";
import architectagent from "./agents/architectagent.js";
import designeragent from "./agents/designeragent.js";
import developeragent from "./agents/developeragent.js";
import educationagent from "./agents/educationagent.js";
import excelagent from "./agents/excelagent.js";
import financeagent from "./agents/financeagent.js";
import healthcareagent from "./agents/healthcareagent.js";
import imageagent from "./agents/imageagent.js";
import legalagent from "./agents/legalagent.js";
import marketingagent from "./agents/marketingagent.js";
import salesagent from "./agents/salesagent.js";
import securityagent from "./agents/securityagent.js";
import videoagent from "./agents/videoagent.js";


// ==========================================
// ENTERPRISE AGENTS
// ==========================================

import writeragent from "./agents/writeragent.js";
import documentagent from "./agents/documentagent.js";
import bankingagent from "./agents/bankingagent.js";
import entrepreneuragent from "./agents/entrepreneuragent.js";
import interiordesignagent from "./agents/interiordesignagent.js";
import ecommerceagent from "./agents/ecommerceagent.js";
import socialmediaagent from "./agents/socialmediaagent.js";
import researchagent from "./agents/researchagent.js";
import automationagent from "./agents/automationagent.js";
import analyticsagent from "./agents/analyticsagent.js";
import customeragent from "./agents/customeragent.js";
import translationagent from "./agents/translationagent.js";
import businessagent from "./agents/businessagent.js";
import accountingagent from "./agents/accountingagent.js";
import strategistagent from "./agents/strategistagent.js";



// ==========================================
// CENTRAL AGENT REGISTRY
// ==========================================


const agents_registry = {


    general: generalagent,


    architect: architectagent,


    designer: designeragent,


    developer: developeragent,


    education: educationagent,


    excel: excelagent,


    finance: financeagent,


    healthcare: healthcareagent,


    image: imageagent,


    legal: legalagent,


    marketing: marketingagent,


    sales: salesagent,


    security: securityagent,


    video: videoagent,



    // ENTERPRISE


    writer: writeragent,


    document: documentagent,


    banking: bankingagent,


    entrepreneur: entrepreneuragent,


    interiordesign: interiordesignagent,


    ecommerce: ecommerceagent,


    socialmedia: socialmediaagent,


    research: researchagent,


    automation: automationagent,


    analytics: analyticsagent,


    customer: customeragent,


    translation: translationagent,


    business: businessagent,


    accounting: accountingagent,


    strategist: strategistagent


};



// ==========================================
// NORMALIZAÇÃO DOS AGENTES
// ==========================================


Object.entries(
    agents_registry
)
.forEach(
([key,agent])=>{


    if(!agent)
    return;



    if(!agent.id){

        agent.id = key;

    }



    if(!agent.name){

        agent.name =
        `Agente ${key}`;

    }



    if(!agent.tools){

        agent.tools = [];

    }



    if(!agent.category){

        agent.category =
        "Tecnologia";

    }



});/*
==========================================
AGENT ROUTER
SMART SPECIALIST SELECTION ENGINE
==========================================
*/


export class agentrouter {



    static selectagent(
        usermessage = "",
        forcedagentid = null
    ){



        const normalizedforcedid =
        forcedagentid
        ?
        String(forcedagentid)
        .toLowerCase()
        .trim()
        :
        null;





        /*
        ======================================
        FORCE AGENT SELECTION
        ======================================
        */


        if(
            normalizedforcedid &&
            agents_registry[normalizedforcedid]
        ){


            return {


                agent:
                agents_registry[
                    normalizedforcedid
                ],


                score:1,


                reason:
                "forced_by_user"



            };


        }









        /*
        ======================================
        DEFAULT FALLBACK
        ======================================
        */


        if(
            !usermessage ||
            typeof usermessage !== "string"
        ){


            return {


                agent:
                generalagent,


                score:1,


                reason:
                "default_general"



            };


        }









        const text =
        usermessage
        .toLowerCase()
        .trim();




        let selected =
        generalagent;



        let bestScore = 0;









        /*
        ======================================
        ANALYSIS OF ALL AGENTS
        ======================================
        */


        for(
            const [id,agent]
            of Object.entries(
                agents_registry
            )
        ){



            if(!agent)
            continue;



            let score = 0;





            /*
            -------------------------------
            Agent Custom Logic
            -------------------------------
            */


            if(
                typeof agent.canHandle ===
                "function"
            ){


                try{


                    const result =
                    agent.canHandle(
                        text
                    );



                    if(result === true){


                        score += 0.8;


                    }


                    else if(
                        typeof result ===
                        "number"
                    ){


                        score += result;


                    }



                }

                catch(error){


                    console.warn(

                    `[Router] Erro no agente ${id}:`,
                    error.message

                    );


                }


            }









            /*
            -------------------------------
            Keyword Detection
            -------------------------------
            */


            if(
                Array.isArray(
                    agent.keywords
                )
            ){


                const matches =
                agent.keywords
                .filter(
                    keyword =>
                    text.includes(
                        keyword
                        .toLowerCase()
                    )
                );



                if(
                    matches.length
                ){


                    score +=
                    Math.min(
                        0.6,
                        matches.length *
                        0.2
                    );


                }


            }









            /*
            -------------------------------
            Description Matching
            -------------------------------
            */


            if(
                agent.description &&
                text.includes(
                    agent.description
                    .toLowerCase()
                )
            ){


                score += 0.2;


            }









            if(
                score >
                bestScore
            ){


                bestScore =
                score;



                selected =
                agent;



            }


        }









        /*
        ======================================
        LOW CONFIDENCE
        ======================================
        */


        if(
            bestScore < 0.3
        ){


            return {


                agent:
                generalagent,


                score:0,


                reason:
                "low_confidence"



            };


        }









        return {


            agent:selected,


            score:
            Number(
                bestScore
                .toFixed(2)
            ),



            reason:
            "smart_agent_match"



        };



    }


}/*
==========================================
PROMPT FACTORY
SYSTEM PROMPT GENERATION ENGINE
==========================================
*/


export class promptfactory {



    /*
    ======================================
    EXTRACT AGENT SYSTEM PROMPT
    ======================================
    */


    static extractsystemprompt(agent){



        if(!agent){


            return `
            Você é a Honey IA,
            uma inteligência artificial
            profissional.
            `;


        }






        if(
            typeof agent.systemPrompt ===
            "function"
        ){


            try{


                return agent.systemPrompt();



            }

            catch(error){


                console.warn(

                "[PromptFactory] Erro no systemPrompt:",
                error.message

                );


            }


        }








        if(
            typeof agent.systemPrompt ===
            "string"
        ){


            return agent.systemPrompt;


        }








        return `

        Você é ${agent.name || "um agente Honey IA"}.

        Especialidade:
        ${
            agent.description ||
            "Assistência inteligente profissional."
        }

        Responda de forma clara,
        profissional e útil.

        `;



    }









    /*
    ======================================
    WORKSPACE CONTEXT INJECTION
    ======================================
    */


    static injectworkspacecontext(

        baseprompt,

        workspaceContext = {},

        userMemory = []

    ){



        let finalPrompt =
        baseprompt;








        if(
            workspaceContext &&
            Object.keys(
                workspaceContext
            ).length
        ){


            finalPrompt += `


=== CONTEXTO DO WORKSPACE ===


`;



            if(
                workspaceContext.projectName
            ){


                finalPrompt += `

Projeto:
${workspaceContext.projectName}

`;

            }





            if(
                workspaceContext.activeFile
            ){


                finalPrompt += `

Ficheiro ativo:
${workspaceContext.activeFile}

`;

            }





            if(
                workspaceContext.language
            ){


                finalPrompt += `

Tecnologia:
${workspaceContext.language}

`;

            }





        }









        if(
            Array.isArray(
                userMemory
            ) &&
            userMemory.length
        ){



            finalPrompt += `


=== MEMÓRIA DO UTILIZADOR ===

`;



            userMemory.forEach(

                (memory,index)=>{


                    finalPrompt += `

${index + 1}.
${memory}

`;


                }

            );



        }






        return finalPrompt;



    }









    /*
    ======================================
    MODE RULES
    ======================================
    */


    static applymoderules(

        prompt,

        mode = "chat"

    ){



        if(
            mode === "live"
        ){


            return prompt + `


=== MODO LIVE ===

- Responda naturalmente.
- Seja direto.
- Use frases curtas.
- Fale como numa conversa em tempo real.


`;



        }








        return prompt + `


=== MODO TEXTO ===

- Estruture a resposta.
- Use Markdown quando necessário.
- Explique como especialista.
- Forneça soluções profissionais.


`;



    }









    /*
    ======================================
    BUILD GROQ MESSAGES
    ======================================
    */


    static buildmessagespayload({

        agent,

        userPrompt,

        history = [],

        workspaceContext = {},

        userMemory = [],

        mode = "chat"


    }){



        let systemPrompt =
        this.extractsystemprompt(
            agent
        );



        systemPrompt =
        this.injectworkspacecontext(

            systemPrompt,

            workspaceContext,

            userMemory

        );



        systemPrompt =
        this.applymoderules(

            systemPrompt,

            mode

        );







        const formattedHistory =
        history.map(
            item=>({


                role:
                item.role === "user"
                ?
                "user"
                :
                "assistant",


                content:
                item.content || ""


            })
        );








        return [


            {


                role:"system",


                content:
                systemPrompt



            },



            ...formattedHistory,



            {


                role:"user",


                content:
                userPrompt



            }


        ];



    }


}/*
==========================================
TOOLS ORCHESTRATOR
AGENT CAPABILITIES MANAGER
==========================================
*/


export class toolorchestrator {



    static getavailabletools(agent){



        if(
            !agent ||
            !Array.isArray(agent.tools)
        ){

            return undefined;

        }








        const tools = [];









        if(
            agent.tools.includes(
                "web"
            )
        ){


            tools.push({


                type:"function",


                function:{


                    name:
                    "web_search",



                    description:
                    "Pesquisa informações atualizadas.",



                    parameters:{


                        type:"object",


                        properties:{


                            query:{


                                type:"string"


                            }


                        },


                        required:[
                            "query"
                        ]


                    }


                }


            });


        }









        if(
            agent.tools.includes(
                "analytics"
            )
        ){


            tools.push({


                type:"function",


                function:{


                    name:
                    "get_analytics",



                    description:
                    "Obtém métricas do sistema.",



                    parameters:{


                        type:"object",


                        properties:{


                            metric:{


                                type:"string"


                            }


                        },


                        required:[
                            "metric"
                        ]


                    }


                }


            });


        }









        return tools.length
        ?
        tools
        :
        undefined;



    }


}









/*
==========================================
ORCHESTRATOR MAIN ENGINE
==========================================
*/


export class Orchestrator {



    constructor(
        groqClient = null
    ){


        this.groq =
        groqClient;


    }









    setGroqClient(client){


        this.groq =
        client;


    }









    async processRequest({

        userPrompt,

        agentId = null,

        history = [],

        workspaceContext = {},

        userMemory = [],

        mode = "chat"


    }){



        const start =
        Date.now();









        const selection =
        agentrouter.selectagent(

            userPrompt,

            agentId

        );



        const agent =
        selection.agent;









        try{



            if(
                !this.groq
            ){


                throw new Error(

                "Groq SDK não inicializada."

                );


            }









            const messages =
            promptfactory
            .buildmessagespayload({


                agent,


                userPrompt,


                history,


                workspaceContext,


                userMemory,


                mode



            });









            const tools =
            toolorchestrator
            .getavailabletools(
                agent
            );









            const payload = {


                model:

                agent.model ||

                "llama-3.3-70b-versatile",



                messages,



                temperature:

                agent.temperature ??

                0.5,



                max_tokens:

                agent.maxTokens ||

                4096



            };









            if(tools){


                payload.tools =
                tools;


            }









            const completion =
            await this.groq
            .chat
            .completions
            .create(
                payload
            );









            let response =

            completion
            .choices[0]
            ?.message
            ?.content

            ||

            "Sem resposta gerada.";









            if(
                typeof agent.after ===
                "function"
            ){


                response =
                agent.after(
                    response
                );


            }









            return {


                success:true,



                agent:{


                    id:
                    agent.id,


                    name:
                    agent.name,


                    emoji:
                    agent.emoji || "🤖"



                },



                routing:{


                    score:
                    selection.score,


                    reason:
                    selection.reason



                },



                response,



                usage:
                completion.usage || null,



                latency:

                Date.now() -
                start



            };



        }

        catch(error){



            console.error(

            "[Orchestrator Error]",
            error

            );



            return {


                success:false,


                agent:{


                    id:
                    agent?.id ||
                    "general"



                },



                error:
                error.message



            };



        }



    }/*
==========================================
STREAM PROCESSING
LIVE RESPONSE ENGINE
==========================================
*/


    async processStream({

        userPrompt,

        agentId = null,

        history = [],

        workspaceContext = {},

        userMemory = [],

        mode = "live",

        onChunk,

        onComplete,

        onError


    }){



        const start =
        Date.now();





        const selection =
        agentrouter.selectagent(

            userPrompt,

            agentId

        );



        const agent =
        selection.agent;







        try{



            if(
                !this.groq
            ){


                throw new Error(
                    "Groq SDK não inicializada."
                );


            }









            const messages =
            promptfactory
            .buildmessagespayload({


                agent,


                userPrompt,


                history,


                workspaceContext,


                userMemory,


                mode



            });









            const stream =
            await this.groq
            .chat
            .completions
            .create({


                model:

                agent.model ||

                "llama-3.3-70b-versatile",



                messages,



                temperature:

                agent.temperature ??

                0.5,



                max_tokens:

                agent.maxTokens ||

                4096,



                stream:true



            });









            let completeResponse = "";









            for await(
                const chunk
                of stream
            ){



                const text =

                chunk
                .choices[0]
                ?.delta
                ?.content

                ||

                "";





                if(text){



                    completeResponse +=
                    text;



                    if(
                        typeof onChunk ===
                        "function"
                    ){


                        onChunk(
                            text
                        );


                    }



                }



            }









            let finalResponse =
            completeResponse;









            if(
                typeof agent.after ===
                "function"
            ){



                finalResponse =
                agent.after(
                    completeResponse
                );



            }









            const result = {


                success:true,



                agent:{


                    id:
                    agent.id,


                    name:
                    agent.name,


                    emoji:
                    agent.emoji || "🤖"



                },



                response:
                finalResponse,



                latency:

                Date.now() -
                start



            };









            if(
                typeof onComplete ===
                "function"
            ){


                onComplete(
                    result
                );


            }









            return result;



        }

        catch(error){



            console.error(

            "[Orchestrator Stream Error]",
            error

            );





            if(
                typeof onError ===
                "function"
            ){


                onError(
                    error
                );


            }



            throw error;



        }



    }









/*
==========================================
TELEMETRY
SYSTEM MONITORING
==========================================
*/


    getTelemetry(){



        return {


            status:
            "online",



            engine:
            "Honey IA Orchestrator V5",



            agents:

            Object.keys(
                agents_registry
            )
            .length,



            timestamp:
            Date.now()



        };



    }



}









/*
==========================================
CREATE INSTANCE
==========================================
*/


const orchestratorinstance =
new Orchestrator();



export {

    agents_registry

};



export default orchestratorinstance;
