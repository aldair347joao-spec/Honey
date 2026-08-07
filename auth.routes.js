/*
==========================================
HONEY IA OS
AUTH ROUTES
API Authentication
V1.0
==========================================
*/


import express from "express";

import authService from "./auth.service.js";





const router = express.Router();









router.post(

"/register",

async(req,res)=>{


    try{


        const result =

        await authService.register(

            req.body

        );



        res.json({

            success:true,

            ...result

        });



    }


    catch(error){


        res.status(400)

        .json({

            success:false,

            error:error.message

        });


    }



}

);









router.post(

"/verify-email",

async(req,res)=>{


    try{


        const result =

        await authService.verifyEmail(

            req.body.email,

            req.body.code

        );



        res.json({

            success:true,

            ...result

        });



    }


    catch(error){


        res.status(400)

        .json({

            success:false,

            error:error.message

        });


    }



}

);









router.post(

"/login",

async(req,res)=>{


    try{


        const result =

        await authService.login(

            req.body.email,

            req.body.password

        );



        res.json({

            success:true,

            ...result

        });



    }


    catch(error){


        res.status(401)

        .json({

            success:false,

            error:error.message

        });


    }



}

);









export default router;
