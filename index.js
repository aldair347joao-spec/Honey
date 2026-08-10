/*
==========================================
HONEY IA OS
SERVER CORE V9.0
Enterprise AI Backend
Authentication + AI + Chat + Workspace
MongoDB + JWT + Google Authentication
Render Ready
==========================================
*/


/*
==========================================
ENVIRONMENT
==========================================
*/

import "dotenv/config";

import express from "express";

import path from "path";

import { fileURLToPath } from "url";

import mongoose from "mongoose";

import rateLimit from "express-rate-limit";


import kernel from "./kernel.js";

import orchestratorinstance from "./orchestrator.js";

import authRoutes from "./auth.routes.js";

import chatRoutes from "./chat.routes.js";


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
ENVIRONMENT CONFIGURATION
==========================================
*/

const PORT =

    process.env.PORT ||

    3000;


const NODE_ENV =

    process.env.NODE_ENV ||

    "development";


const hasMongoDB =

    Boolean(

        process.env.MONGODB_URI

    );


const hasJWT =

    Boolean(

        process.env.JWT_SECRET

    );


const hasGoogle =

    Boolean(

        process.env.GOOGLE_CLIENT_ID

    );


/*
==========================================
STARTUP INFORMATION
==========================================
*/

console.log(

    "🐝 Honey IA OS environment:",

    NODE_ENV

);


if(!hasJWT){

    console.warn(

        "⚠️ JWT_SECRET não configurado."

    );

}


if(!hasGoogle){

    console.warn(

        "⚠️ GOOGLE_CLIENT_ID não configurado. Login Google ficará indisponível."

    );

}


if(!hasMongoDB){

    console.warn(

        "⚠️ MONGODB_URI não configurada."

    );

}


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
TRUST PROXY
Render / Reverse Proxy
==========================================
*/

app.set(

    "trust proxy",

    1

);


/*
==========================================
BODY PARSER
==========================================
*/

app.use(

    express.json({

        limit:

            "15mb"

    })

);


app.use(

    express.urlencoded({

        extended:

            true,

        limit:

            "15mb"

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

            "⚠️ MONGODB_URI não encontrada."

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


const databaseConnected =

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
CHAT RATE LIMIT
==========================================
*/

const chatLimiter =

    rateLimit({

        windowMs:

            60 * 1000,

        max:

            30,

        standardHeaders:

            true,

        legacyHeaders:

            false,

        message:{

            success:false,

            error:

                "Muitas mensagens em pouco tempo. Aguarde alguns segundos."

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
CHAT API
CONVERSATIONS + MESSAGES
==========================================
*/

app.use(

    "/api/chat",

    chatLimiter,

    chatRoutes

);


/*
==========================================
API HEALTH
==========================================
*/

app.get(

    "/api/health",

    (req,res)=>{


        return res.json({

            success:

                true,

            system:

                "Honey IA OS",

            status:

                "online",

            version:

                "9.0.0",

            environment:

                NODE_ENV,

            database:

                mongoose.connection.readyState === 1

                    ?

                    "connected"

                    :

                    "disconnected",

            authentication:{

                jwt:

                    hasJWT,

                google:

                    hasGoogle

            },

            chat:{

                enabled:

                    true,

                endpoint:

                    "/api/chat"

            }

        });


    }

);


/*
==========================================
AI REQUEST ROUTE
LEGACY / STANDARD AI RESPONSE
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

                mode,

                anexoBase64,

                fileName

            } = req.body || {};


            if(

                !prompt ||

                typeof prompt !== "string" ||

                !prompt.trim()

            ){

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

                            prompt.trim(),

                        agentId:

                            agentId || null,

                        history:

                            Array.isArray(history)

                                ?

                                history

                                :

                                [],

                        workspaceContext:

                            workspaceContext || {},

                        userMemory:

                            Array.isArray(memory)

                                ?

                                memory

                                :

                                [],

                        mode:

                            mode || "chat",

                        anexoBase64:

                            anexoBase64 || null,

                        fileName:

                            fileName || null

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

                        error.message ||

                        "Erro ao processar pedido."

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

            } = req.body || {};


            if(

                !prompt ||

                typeof prompt !== "string" ||

                !prompt.trim()

            ){

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

                        prompt.trim(),

                    agentId:

                        agentId || null,

                    history:

                        Array.isArray(history)

                            ?

                            history

                            :

                            [],

                    workspaceContext:

                        workspaceContext || {},

                    userMemory:

                        Array.isArray(memory)

                            ?

                            memory

                            :

                            [],

                    mode:

                        "live",


                    onChunk:(chunk)=>{


                        if(

                            res.writableEnded

                        ){

                            return;

                        }


                        res.write(

                            `data: ${JSON.stringify({

                                text:

                                    chunk

                            })}\n\n`

                        );

                    },


                    onComplete:(result)=>{


                        if(

                            res.writableEnded

                        ){

                            return;

                        }


                        res.write(

                            `data: ${JSON.stringify({

                                done:true,

                                agent:

                                    result?.agent ||

                                    null,

                                latency:

                                    result?.latency ||

                                    null

                            })}\n\n`

                        );


                        res.end();

                    },


                    onError:(error)=>{


                        if(

                            res.writableEnded

                        ){

                            return;

                        }


                        res.write(

                            `data: ${JSON.stringify({

                                error:

                                    error?.message ||

                                    "Erro no modo Live."

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


            if(

                !res.headersSent

            ){

                return res

                    .status(500)

                    .json({

                        success:false,

                        error:

                            error.message ||

                            "Erro no modo Live."

                    });

            }


            if(

                !res.writableEnded

            ){

                res.end();

            }

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

                    agents_registry || {}

                )

                .map(agent=>({

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

                success:

                    true,

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

                        error.message ||

                        "Erro ao carregar agentes."

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


            console.error(

                "[SYSTEM STATUS ERROR]",

                error

            );


            return res

                .status(500)

                .json({

                    success:false,

                    error:

                        error.message ||

                        "Erro ao obter estado do sistema."

                });

        }

    }

);


/*
==========================================
FRONTEND FALLBACK
EXPRESS 5 COMPATIBLE
==========================================
*/

app.get(

    "/{*splat}",

    (req,res)=>{


        /*
        ----------------------------------
        NÃO TRANSFORMAR API DESCONHECIDA
        EM index.html
        ----------------------------------
        */

        if(

            req.path.startsWith(

                "/api/"

            )

        ){

            return res

                .status(404)

                .json({

                    success:false,

                    error:

                        "Endpoint API não encontrado."

                });

        }


        /*
        ----------------------------------
        FRONTEND
        ----------------------------------
        */

        return res.sendFile(

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


        if(

            res.headersSent

        ){

            return next(err);

        }


        return res

            .status(

                err.status ||

                500

            )

            .json({

                success:false,

                error:

                    err.message ||

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

const server =

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

                `🌍 Environment: ${NODE_ENV}`

            );


            console.log(

                `🍃 MongoDB: ${

                    databaseConnected

                        ?

                        "CONNECTED"

                        :

                        "DISCONNECTED"

                }`

            );


            console.log(

                `🔐 JWT: ${

                    hasJWT

                        ?

                        "CONFIGURED"

                        :

                        "MISSING"

                }`

            );


            console.log(

                `🔵 Google Auth: ${

                    hasGoogle

                        ?

                        "CONFIGURED"

                        :

                        "MISSING"

                }`

            );


            console.log(

                "💬 Chat API: /api/chat"

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

                "🐝 =================================="

            );

        }

);


/*
==========================================
GRACEFUL SHUTDOWN
==========================================
*/

async function shutdown(signal){


    console.log(

        `\n🛑 ${signal} recebido. A encerrar Honey IA...`

    );


    try{


        await mongoose.connection.close();


        server.close(()=>{


            console.log(

                "✅ Servidor encerrado."

            );


            process.exit(0);

        });


    }


    catch(error){


        console.error(

            "❌ Erro durante shutdown:",

            error

        );


        process.exit(1);

    }

}


process.on(

    "SIGTERM",

    ()=>shutdown("SIGTERM")

);


process.on(

    "SIGINT",

    ()=>shutdown("SIGINT")

);
