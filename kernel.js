/*
==========================================
HONEY IA OS
KERNEL ENGINE V6
Core System Initializer
==========================================
*/


import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Groq from "groq-sdk";

import orchestratorinstance from "./orchestrator.js";


// Carrega variáveis de ambiente

dotenv.config();





class Kernel {



    constructor(){


        this.app =
        express();


        this.groq =
        null;


        this.isInitialized =
        false;


        this.modules =
        {};



    }









    /*
    ======================================
    MODULE REGISTRY
    ======================================
    */


    register(
        name,
        module
    ){


        this.modules[name] =
        module;



        console.log(

        `🐝 [Kernel] Módulo registado: ${name} (${module})`

        );


    }









    /*
    ======================================
    BOOT SYSTEM
    ======================================
    */


    async boot(){



        if(
            this.isInitialized
        ){

            return;

        }






        console.log(

        "🚀 [Honey IA Kernel] Inicializando sistema..."

        );









        /*
        ==================================
        GROQ INITIALIZATION
        ==================================
        */


        const apiKey =
        process.env.GROQ_API_KEY;



        if(!apiKey){


            console.warn(

            "⚠️ GROQ_API_KEY não encontrada."

            );


        }

        else{



            this.groq =
            new Groq({

                apiKey

            });




            orchestratorinstance
            .setGroqClient(
                this.groq
            );



            console.log(

            "✅ Groq conectada ao Orchestrator."

            );



        }









        /*
        ==================================
        EXPRESS MIDDLEWARES
        ==================================
        */


        this.app.use(

            cors({

                origin:"*"

            })

        );




        this.app.use(

            express.json({

                limit:"50mb"

            })

        );




        this.app.use(

            express.urlencoded({

                extended:true,

                limit:"50mb"

            })

        );









        /*
        ==================================
        HEALTH CHECK
        ==================================
        */


        this.app.get(

            "/health",

            (req,res)=>{


                res.json({


                    status:
                    "online",



                    system:
                    "Honey IA OS",



                    version:
                    "6.0.0",



                    orchestrator:
                    orchestratorinstance
                    .getTelemetry()



                });



            }

        );









        this.isInitialized =
        true;



        console.log(

        "✅ [Honey IA Kernel] Sistema pronto."

        );



    }









    /*
    ======================================
    GET EXPRESS APP
    ======================================
    */


    getApp(){


        return this.app;


    }



}









const kernelInstance =
new Kernel();



export default kernelInstance;
