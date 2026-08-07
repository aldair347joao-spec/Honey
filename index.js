/*
==========================================
HONEY IA OS
SERVER CORE V6
Enterprise AI Backend
==========================================
*/
import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import rateLimit from "express-rate-limit";
import kernel from "./kernel.js";
import orchestratorinstance from "./orchestrator.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);








/*
==========================================
PATH CONFIGURATION
==========================================
*/








/*
==========================================
EXPRESS APPLICATION
==========================================
*/


await kernel.boot();



const app =
kernel.getApp();









/*
==========================================
STATIC FRONTEND
==========================================
*/


app.use(express.static(path.join(__dirname)));


/*
==========================================
DATABASE CONNECTION
==========================================
*/


async function connectDatabase(){



    const mongoURI =
    process.env.MONGODB_URI;



    if(!mongoURI){


        console.warn(

        "⚠️ MONGODB_URI não encontrada. A iniciar sem base de dados."

        );


        return;


    }






    try{


        await mongoose.connect(
            mongoURI
        );



        console.log(

        "✅ MongoDB conectado com sucesso."

        );



    }


    catch(error){



        console.error(

        "❌ Erro MongoDB:",
        error.message

        );


    }



}






await connectDatabase();









/*
==========================================
RATE LIMIT
==========================================
*/


const apiLimiter =
rateLimit({


    windowMs:

    60 *

    1000,



    max:

    20,



    message:{


        error:

        "Muitas requisições. Aguarde alguns segundos."



    }



});









/*
==========================================
API HEALTH
==========================================
*/


app.get("/api/health", (req, res) => {
    res.json({
        system: "Honey IA OS",
        status: "online",
        version: "6.0.0"
    });
});









/*
==========================================
AI REQUEST ROUTE
==========================================
*/


app.post(

    "/gerar-gratis",

    apiLimiter,

    async(req,res)=>{


        try{



            const {


                prompt,


                agentId,


                history,


                workspaceContext,


                memory,


                mode



            } = req.body;









            if(!prompt){


                return res.status(400)
                .json({


                    error:

                    "Prompt vazio."



                });



            }









            const result =

            await orchestratorinstance
            .processRequest({



                userPrompt:

                prompt,



                agentId:

                agentId || null,



                history:

                history || [],



                workspaceContext:

                workspaceContext || {},



                userMemory:

                memory || [],



                mode:

                mode || "chat"



            });









            res.json(
                result
            );



        }


        catch(error){



            console.error(

            "[API ERROR]",
            error

            );



            res.status(500)
            .json({


                success:false,


                error:

                error.message



            });



        }



    }

);/*
==========================================
LIVE AI STREAM ROUTE
REAL TIME RESPONSES
==========================================
*/


app.post(

    "/gerar-live",

    apiLimiter,

    async(req,res)=>{



        try{



            const {


                prompt,


                agentId,


                history,


                workspaceContext,


                memory



            } = req.body;









            if(!prompt){


                return res.status(400)
                .json({


                    error:

                    "Prompt vazio."



                });


            }









            res.setHeader(

                "Content-Type",

                "text/event-stream"

            );



            res.setHeader(

                "Cache-Control",

                "no-cache"

            );



            res.setHeader(

                "Connection",

                "keep-alive"

            );









            await orchestratorinstance
            .processStream({



                userPrompt:

                prompt,



                agentId:

                agentId || null,



                history:

                history || [],



                workspaceContext:

                workspaceContext || {},



                userMemory:

                memory || [],



                mode:

                "live",







                onChunk:(chunk)=>{



                    res.write(

                    `data: ${JSON.stringify({

                        text:chunk

                    })}\n\n`

                    );



                },








                onComplete:(result)=>{



                    res.write(

                    `data: ${JSON.stringify({

                        done:true,

                        agent:
                        result.agent,

                        latency:
                        result.latency

                    })}\n\n`

                    );



                    res.end();



                },








                onError:(error)=>{



                    res.write(

                    `data: ${JSON.stringify({

                        error:
                        error.message

                    })}\n\n`

                    );



                    res.end();



                }



            });



        }


        catch(error){



            console.error(

            "[LIVE ERROR]",

            error

            );



            res.end();



        }



    }

);









/*
==========================================
AGENTS API
LIST ALL SPECIALISTS
==========================================
*/


app.get(

    "/agents",

 async   (req,res)=>{



        try{



            const {

                agents_registry

            } = await import(

                "./orchestrator.js"

            );



            res.json({


                success:true,


                total:

                Object.keys(
                    agents_registry
                )
                .length,



                agents:

                Object.values(
                    agents_registry
                )
                .map(agent=>({


                    id:
                    agent.id,


                    name:
                    agent.name,


                    description:
                    agent.description || "",


                    category:
                    agent.category || "Tecnologia",


                    emoji:
                    agent.emoji || "🤖"



                }))



            });



        }


        catch(error){



            res.status(500)
            .json({


                success:false,


                error:
                error.message



            });



        }



    }

);









/*
==========================================
ORCHESTRATOR STATUS
==========================================
*/


app.get(

    "/system/status",

    (req,res)=>{



        res.json(

            orchestratorinstance
            .getTelemetry()

        );



    }

);/*
==========================================
FRONTEND FALLBACK
SERVE HONEY IA APP
==========================================
*/


app.get(
    "*",
    (req, res) => {
        res.sendFile(
            path.join(
                __dirname,
                "index.html"
            )
        );
    }
);










/*
==========================================
ERROR HANDLER
GLOBAL SERVER ERRORS
==========================================
*/


app.use(

    (err,req,res,next)=>{


        console.error(

            "❌ Server Error:",

            err

        );



        res.status(500)
        .json({


            success:false,


            error:

            "Erro interno no servidor."



        });



    }

);









/*
==========================================
START SERVER
RENDER COMPATIBILITY
==========================================
*/


const PORT =

process.env.PORT ||

3000;





app.listen(

    PORT,

    ()=>{


        console.log(

        "🐝 =================================="

        );


        console.log(

        "🚀 Honey IA OS Online"

        );


        console.log(

        `🌐 Porta: ${PORT}`

        );


        console.log(

        "🤖 30 Agentes carregados"

        );


        console.log(

        "🧠 Orchestrator V5 ativo"

        );


        console.log(

        "🐝 =================================="

        );



    }

);
