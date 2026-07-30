/*
==========================================
HONEY IA
LIVE ROUTE V3.0
Real Time Agent Communication
Orchestrator Integration
==========================================
*/


import express from "express";
import LiveEngine from "./LiveEngine.js";
import Orchestrator from "./Orchestrator.js";


const router = express.Router();







/*
==========================================
SELECIONAR AGENTE LIVE
==========================================
*/


router.post("/live/agent", async(req,res)=>{


    try{


        const {
            agentId
        } = req.body;





        if(!agentId){


            return res.status(400).json({


                success:false,


                error:"Agente não informado."


            });


        }







        const changed =
        LiveEngine.switchAgent(agentId);






        if(!changed){


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
INICIAR LIVE
==========================================
*/


router.post("/live/start", async(req,res)=>{


    try{


        const {
            agentId
        } = req.body;






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



        const {
            message,
            userId="guest"
        } = req.body;






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


                error:"Sessão Live não iniciada."



            });



        }









        LiveEngine.addMessage(

            "user",

            message

        );








        const result =
        await Orchestrator.process({



            userId,


            message,



            agent:
            context.agentId,



            mode:"live"



        });









        /*
        Aqui o backend principal
        usa o prompt construído
        pelo Orchestrator.
        */








        const response =
        result.prompt;









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

            "Erro Live:",

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
PARAR LIVE
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
