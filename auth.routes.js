/*
==========================================
HONEY IA OS
AUTH ROUTES
Professional Authentication API
V2.0
==========================================
*/


import express from "express";


import {

    registerUser,

    verifyEmail,

    resendVerificationCode,

    loginUser,

    googleLogin,

    logoutUser,

    getCurrentUser

} from "./authcontroller.js";


import {

    authMiddleware

} from "./auth.middleware.js";



const router = express.Router();









/*
==========================================
REGISTER
Criar nova conta
==========================================
*/


router.post(

    "/register",

    registerUser

);









/*
==========================================
VERIFY EMAIL
Confirmar código enviado
==========================================
*/


router.post(

    "/verify-email",

    verifyEmail

);









/*
==========================================
RESEND VERIFICATION
Reenviar código de confirmação
==========================================
*/


router.post(

    "/resend-verification",

    resendVerificationCode

);









/*
==========================================
LOGIN
Email + palavra-passe
==========================================
*/


router.post(

    "/login",

    loginUser

);









/*
==========================================
GOOGLE LOGIN
Authentication with Google
==========================================
*/


router.post(

    "/google",

    googleLogin

);









/*
==========================================
LOGOUT
Encerrar sessão atual
==========================================
*/


router.post(

    "/logout",

    authMiddleware,

    logoutUser

);









/*
==========================================
CURRENT USER
Restaurar sessão
==========================================
*/


router.get(

    "/me",

    authMiddleware,

    getCurrentUser

);









/*
==========================================
ROUTER HEALTH
Authentication API status
==========================================
*/


router.get(

    "/status",

    (req, res) => {


        res.json({

            success:true,

            system:"Honey IA OS",

            service:"Authentication",

            status:"online"

        });


    }

);









/*
==========================================
EXPORT ROUTER
==========================================
*/


export default router;
