/*
==========================================
HONEY IA OS
SERVER CORE V7
Enterprise AI Backend
Authentication + AI + Workspace
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

import authRoutes from "./auth.routes.js";



/*
==========================================
ENVIRONMENT
==========================================
*/


dotenv.config();









/*
==========================================
PATH CONFIGURATION
==========================================
*/


const __filename =

fileURLToPath(import.meta.url);


const __dirname =

path.dirname(__filename);









/*
==========================================
APPLICATION BOOT
==========================================
*/


await kernel.boot();


const app =

kernel.getApp();









/*
==========================================
BODY PARSER
==========================================
*/


app.use(

    express.json({

        limit:"15mb"

    })

);


app.use(

    express.urlencoded({

        extended:true,

        limit:"15mb"

    })

);









/*
==========================================
STATIC FRONTEND
==========================================
*/


app.use(

    express.static(

        path.join(

            __dirname

        )

    )

);









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


        return false;


    }



    try{


        await mongoose.connect(

            mongoURI

        );


        console.log(

            "✅ MongoDB conectado com sucesso."

        );


        return true;


    }


    catch(error){


        console.error(

            "❌ Erro MongoDB:",

            error.message

        );


        return false;


    }


}









await connectDatabase();









/*
==========================================
RATE LIMIT
GLOBAL API PROTECTION
==========================================
*/


const apiLimiter =

rateLimit({

    windowMs:

    60 * 1000,


    max:

    20,


    standardHeaders:

    true,


    legacyHeaders:

    false,


    message:{

        success:false,

        error:

        "Muitas requisições. Aguarde alguns segundos."

    }

});









/*
==========================================
AUTHENTICATION API
==========================================
*/


app.use(

    "/api/auth",

    authRoutes

);









/*
==========================================
API HEALTH
==========================================
*/


app.get(

    "/api/health",

    (req,res)=>{


        res.json({

            success:true,

            system:"Honey IA OS",

            status:"online",

            version:"7.0.0",

            database:

            mongoose.connection.readyState === 1

            ? "connected"

            : "disconnected"

        });


    }

);









/*
==========================================
AI REQUEST ROUTE
STANDARD AI RESPONSE
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

                return res

                .status(400)

                .json({

                    success:false,

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



            return res.json(

                result

            );


        }


        catch(error){


            console.error(

                "[API ERROR]",

                error

            );


            return res

            .status(500)

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


                return res

                .status(400)

                .json({

                    success:false,

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



            res.flushHeaders?.();



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


                    if(res.writableEnded)

                    return;



                    res.write(

                        `data: ${JSON.stringify({

                            text:chunk

                        })}\n\n`

                    );


                },



                onComplete:(result)=>{


                    if(res.writableEnded)

                    return;



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


                    if(res.writableEnded)

                    return;



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


            if(!res.headersSent){


                return res

                .status(500)

                .json({

                    success:false,

                    error:

                    error.message

                });


            }


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

    async(req,res)=>{


        try{


            const {

                agents_registry

            } = await import(

                "./orchestrator.js"

            );



            const agents =

            Object.values(

                agents_registry

            ).map(agent=>({


                id:

                agent.id,


                name:

                agent.name,


                description:

                agent.description || "",


                category:

                agent.category ||

                "Tecnologia",


                emoji:

                agent.emoji ||

                "🤖"


            }));



            return res.json({

                success:true,

                total:

                agents.length,

                agents

            });


        }


        catch(error){


            console.error(

                "[AGENTS API ERROR]",

                error

            );


            return res

            .status(500)

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


        try{


            return res.json(

                orchestratorinstance

                .getTelemetry()

            );


        }


        catch(error){


            return res

            .status(500)

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
FRONTEND FALLBACK
SERVE HONEY IA APP
==========================================
*/


app.get(

    "*",

    (req,res)=>{


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
GLOBAL ERROR HANDLER
==========================================
*/


app.use(

    (err,req,res,next)=>{


        console.error(

            "❌ Server Error:",

            err

        );



        if(res.headersSent){

            return next(err);

        }



        return res

        .status(500)

        .json({

            success:false,

            error:

            "Erro interno no servidor."

        });


    }

);









/*
==========================================
SERVER START
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

            "🧠 Orchestrator ativo"

        );


        console.log(

            "🔐 Authentication System ativo"

        );


        console.log(

            "🍃 MongoDB Authentication ativo"

        );


        console.log(

            "🐝 =================================="

        );


    }

);
