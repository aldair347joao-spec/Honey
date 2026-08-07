/*
==========================================
HONEY IA OS
AUTH ROUTES
User Authentication API
V1.0
==========================================
*/


import express from "express";

import {
    registerUser,
    verifyEmail,
    loginUser,
    logoutUser,
    getCurrentUser
} from "./authcontroller.js";



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
LOGIN
Entrar na conta
==========================================
*/


router.post(

    "/login",

    loginUser

);









/*
==========================================
LOGOUT
Encerrar sessão
==========================================
*/


router.post(

    "/logout",

    logoutUser

);









/*
==========================================
CURRENT USER
Buscar utilizador autenticado
==========================================
*/


router.get(

    "/me",

    getCurrentUser

);









/*
==========================================
EXPORT ROUTER
==========================================
*/


export default router;
