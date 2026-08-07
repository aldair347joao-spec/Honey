/*
==========================================
HONEY IA OS
AUTH ROUTES
Authentication API Routes
V3.0
==========================================
*/


import express from "express";


import {

    registerUser,

    verifyEmail,

    resendVerificationCode,

    loginUser,

    googleLogin,

    getCurrentUser,

    logoutUser

} from "./authcontroller.js";


import {

    authMiddleware

} from "./auth.middleware.js";



/*
==========================================
ROUTER
==========================================
*/


const router =

express.Router();



/*
==========================================
PUBLIC AUTH ROUTES
==========================================
*/


/*
------------------------------------------
REGISTER
POST /api/auth/register
------------------------------------------
*/


router.post(

    "/register",

    registerUser

);



/*
------------------------------------------
VERIFY EMAIL
POST /api/auth/verify-email
------------------------------------------
*/


router.post(

    "/verify-email",

    verifyEmail

);



/*
------------------------------------------
RESEND VERIFICATION CODE
POST /api/auth/resend-verification
------------------------------------------
*/


router.post(

    "/resend-verification",

    resendVerificationCode

);



/*
------------------------------------------
LOGIN
POST /api/auth/login
------------------------------------------
*/


router.post(

    "/login",

    loginUser

);



/*
------------------------------------------
GOOGLE LOGIN
POST /api/auth/google
------------------------------------------
*/


router.post(

    "/google",

    googleLogin

);



/*
==========================================
PROTECTED AUTH ROUTES
==========================================
*/


/*
------------------------------------------
CURRENT USER
GET /api/auth/me
------------------------------------------
*/


router.get(

    "/me",

    authMiddleware,

    getCurrentUser

);



/*
------------------------------------------
LOGOUT
POST /api/auth/logout
------------------------------------------
*/


router.post(

    "/logout",

    authMiddleware,

    logoutUser

);



/*
==========================================
EXPORT
==========================================
*/


export default router;
