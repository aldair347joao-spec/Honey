/*
==========================================
HONEY IA
LIVE ROUTE
Comunicação em tempo real com agentes
==========================================
*/

import express from "express";
import LiveEngine from "./LiveEngine.js";
import Groq from "groq-sdk";


const router = express.Router();


const groq = new Groq({

    apiKey: process.env.GROQ_API_KEY

});




// Iniciar sessão Live
router.post("/live/start", async (req,res)=>{

    try{


        const session = LiveEngine.start();


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






// Conversa Live
router.post("/live/chat", async (req,res)=>{


    try{


        const {message}=req.body;



        if(!message){

            return res.status(400).json({

                success:false,

                error:"Mensagem vazia."

            });

        }




        const context = LiveEngine.getLiveContext();



        LiveEngine.addMessage(
            "user",
            message
        );





        const completion = await groq.chat.completions.create({

            model:"llama-3.3-70b-versatile",


            messages:[


                {

                    role:"system",

                    content:context.systemPrompt

                },


                ...context.messages,


                {

                    role:"user",

                    content:message

                }


            ],


            temperature:0.7,


            max_tokens:2048


        });





        const response =
        completion.choices[0].message.content;




        LiveEngine.addMessage(
            "assistant",
            response
        );





        res.json({

            success:true,

            agent:context.identity,

            response

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





export default router;
