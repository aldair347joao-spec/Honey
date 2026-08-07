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
    logoutUser,
    getCurrentUser,
    googleLogin
} from "./authcontroller.js";


import { authMiddleware } from "./auth.middleware.js";



/*
==========================================
ROUTER
==========================================
*/


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

router.post(

    "/resend-verification",

    resendVerificationCode

);

/*
==========================================
LOGIN
Email + Palavra-passe
==========================================
*/


router.post(

    "/login",

    loginUser

);



/*
==========================================
GOOGLE LOGIN
Entrar/Criar conta com Google
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
Restaurar sessão autenticada
==========================================
*/


router.get(

    "/me",

    authMiddleware,

    getCurrentUser

);



/*
==========================================
EXPORT ROUTER
==========================================
*/


export default router;
