/*
==========================================
HONEY IA
LIVE ROUTE
Comunicação em tempo real com agentes
Versão 2.0
==========================================
*/

import express from "express";
import LiveEngine from "./LiveEngine.js";
import Groq from "groq-sdk";


const router = express.Router();


const groq = new Groq({

    apiKey: process.env.GROQ_API_KEY

});





/*
==========================================
SELECIONAR AGENTE LIVE
==========================================
*/

router.post("/live/agent", async (req,res)=>{


    try{


        const { agentId } = req.body;



        if(!agentId){

            return res.status(400).json({

                success:false,

                error:"Nenhum agente informado."

            });

        }



        const selected =
            LiveEngine.switchAgent(agentId);



        if(!selected){

            return res.status(404).json({

                success:false,

                error:"Agente não encontrado."

            });

        }



        res.json({

            success:true,

            agent:
            LiveEngine.getIdentity()

        });



    }catch(error){


        res.status(500).json({

            success:false,

            error:error.message

        });


    }


});







/*
==========================================
INICIAR SESSÃO LIVE
==========================================
*/


router.post("/live/start", async(req,res)=>{


    try{


        const { agentId } = req.body;



        const session =
            LiveEngine.start(agentId);



        res.json({

            success:true,

            session

        });



    }catch(error){


        res.status(500).json({

            success:false,

            error:error.message

        });


    }


});









/*
==========================================
CHAT LIVE
==========================================
*/


router.post("/live/chat", async(req,res)=>{


    try{


        const { message } = req.body;




        if(!message){


            return res.status(400).json({

                success:false,

                error:"Mensagem vazia."

            });


        }






        const context =
            LiveEngine.getLiveContext();






        if(!context.active){


            return res.status(400).json({

                success:false,

                error:"Nenhuma sessão Live ativa."

            });


        }






        LiveEngine.addMessage(

            "user",

            message

        );







        const completion =
        await groq.chat.completions.create({



            model:
            "llama-3.3-70b-versatile",




            messages:[



                {


                    role:"system",


                    content:
                    context.systemPrompt


                },



                ...context.messages.map(msg=>({


                    role:msg.role,


                    content:msg.content



                }))





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

        "Não consegui responder neste momento.";








        LiveEngine.addMessage(

            "assistant",

            response

        );








        res.json({



            success:true,



            agent:
            LiveEngine.getIdentity(),



            response,



            context:
            LiveEngine.getLiveContext()



        });






    }catch(error){



        console.error(

            "Erro Live Engine:",

            error

        );



        res.status(500).json({


            success:false,


            error:error.message


        });



    }



});









/*
==========================================
ENCERRAR LIVE
==========================================
*/


router.post("/live/stop", async(req,res)=>{


    try{


        const session =
            LiveEngine.stop();



        res.json({

            success:true,

            session

        });



    }catch(error){


        res.status(500).json({

            success:false,

            error:error.message

        });


    }


});






export default router;
