/*
==========================================
HONEY IA OS
AUTH CONTROLLER
Professional Authentication Business Logic
V3.0
JWT + MongoDB + Google Authentication
Email Verification + Secure Sessions
==========================================
*/


import bcrypt from "bcrypt";

import jwt from "jsonwebtoken";

import validator from "validator";

import crypto from "crypto";

import { OAuth2Client } from "google-auth-library";

import {

    User,

    Session

} from "./models.js";

import emailservice from "./emailservice.js";



/*
==========================================
CONFIGURATION
==========================================
*/


const JWT_SECRET =

process.env.JWT_SECRET;



const GOOGLE_CLIENT_ID =

process.env.GOOGLE_CLIENT_ID;



const SESSION_DAYS = 30;



const VERIFICATION_CODE_MINUTES = 15;



/*
==========================================
GOOGLE CLIENT
==========================================
*/


const googleClient =

GOOGLE_CLIENT_ID

    ? new OAuth2Client(

        GOOGLE_CLIENT_ID

    )

    : null;



/*
==========================================
SECURITY CHECKS
==========================================
*/


if(!JWT_SECRET){

    console.warn(

        "⚠️ JWT_SECRET não configurado."

    );

}



if(!GOOGLE_CLIENT_ID){

    console.warn(

        "⚠️ GOOGLE_CLIENT_ID não configurado."

    );

}



/*
==========================================
PASSWORD VALIDATION
==========================================
*/


function validatePassword(

    password

){


    if(

        typeof password !==

        "string"

    ){

        return false;

    }



    if(

        password.length < 8

    ){

        return false;

    }



    const hasLowerCase =

        /[a-z]/.test(

            password

        );



    const hasUpperCase =

        /[A-Z]/.test(

            password

        );



    const hasNumber =

        /[0-9]/.test(

            password

        );



    const hasSpecial =

        /[^A-Za-z0-9]/.test(

            password

        );



    return (

        hasLowerCase &&

        hasUpperCase &&

        hasNumber &&

        hasSpecial

    );

}



/*
==========================================
GENERATE VERIFICATION CODE
==========================================
*/


function generateCode(){


    return crypto

        .randomInt(

            100000,

            1000000

        )

        .toString();

}



/*
==========================================
NORMALIZE EMAIL
==========================================
*/


function normalizeEmail(

    email

){


    return String(

        email || ""

    )

        .trim()

        .toLowerCase();

}



/*
==========================================
NORMALIZE NAME
==========================================
*/


function normalizeName(

    value,

    fallback = ""

){


    const name =

        String(

            value || ""

        )

            .trim()

            .replace(

                /\s+/g,

                " "

            );



    return name || fallback;

}



/*
==========================================
CREATE JWT
==========================================
*/


function createToken(

    user

){


    if(!JWT_SECRET){

        throw new Error(

            "JWT_SECRET não configurado."

        );

    }



    return jwt.sign(

        {

            id:

                user._id.toString(),

            email:

                user.email

        },

        JWT_SECRET,

        {

            expiresIn:

                `${SESSION_DAYS}d`

        }

    );

}



/*
==========================================
CREATE DATABASE SESSION
==========================================
*/


async function createSession(

    user,

    req

){


    const token =

        createToken(

            user

        );



    const expiresAt =

        new Date(

            Date.now() +

            SESSION_DAYS *

            24 *

            60 *

            60 *

            1000

        );



    const userAgent =

        req.headers["user-agent"] ||

        "unknown";



    await Session.create({

        userId:

            user._id,

        token,

        device:

            userAgent,

        browser:

            userAgent,

        ip:

            req.ip,

        expiresAt

    });



    return {

        token,

        expiresAt

    };

}



/*
==========================================
SERIALIZE USER
Never expose password or verification data
==========================================
*/


function serializeUser(

    user

){


    if(!user){

        return null;

    }



    return {

        id:

            user._id,

        firstName:

            user.firstName || "",

        lastName:

            user.lastName || "",

        email:

            user.email,

        avatar:

            user.avatar || null,

        plan:

            user.plan || "free",

        emailVerified:

            !!user.emailVerified,

        isActive:

            !!user.isActive,

        googleId:

            user.googleId || null,

        createdAt:

            user.createdAt || null,

        lastLogin:

            user.lastLogin || null

    };

}



/*
==========================================
GET AUTH TOKEN FROM REQUEST
==========================================
*/


function getRequestToken(

    req

){


    const authorization =

        req.headers.authorization;



    if(

        !authorization ||

        typeof authorization !==

        "string"

    ){

        return null;

    }



    const match =

        authorization.match(

            /^Bearer\s+(.+)$/i

        );



    if(!match){

        return null;

    }



    return match[1].trim() ||

        null;

}



/*
==========================================
REGISTER USER
CREATE ACCOUNT
==========================================
*/


export async function registerUser(

    req,

    res

){


    try{


        const {

            firstName,

            lastName,

            email,

            password,

            confirmPassword

        } = req.body || {};



        /*
        ==============================
        REQUIRED FIELDS
        ==============================
        */


        if(

            !firstName ||

            !lastName ||

            !email ||

            !password ||

            !confirmPassword

        ){

            return res.status(400).json({

                success:false,

                error:

                    "Preencha todos os campos."

            });

        }



        /*
        ==============================
        NORMALIZE DATA
        ==============================
        */


        const normalizedFirstName =

            normalizeName(

                firstName

            );



        const normalizedLastName =

            normalizeName(

                lastName

            );



        const normalizedEmail =

            normalizeEmail(

                email

            );



        if(

            !normalizedFirstName ||

            !normalizedLastName

        ){

            return res.status(400).json({

                success:false,

                error:

                    "Nome e apelido são obrigatórios."

            });

        }



        /*
        ==============================
        EMAIL VALIDATION
        ==============================
        */


        if(

            !validator.isEmail(

                normalizedEmail

            )

        ){

            return res.status(400).json({

                success:false,

                error:

                    "Email inválido."

            });

        }



        /*
        ==============================
        PASSWORD MATCH
        ==============================
        */


        if(

            password !==

            confirmPassword

        ){

            return res.status(400).json({

                success:false,

                error:

                    "As palavras-passe não coincidem."

            });

        }



        /*
        ==============================
        PASSWORD STRENGTH
        ==============================
        */


        if(

            !validatePassword(

                password

            )

        ){

            return res.status(400).json({

                success:false,

                error:

                    "A palavra-passe deve ter no mínimo 8 caracteres, uma letra maiúscula, uma letra minúscula, um número e um símbolo."

            });

        }



        /*
        ==============================
        CHECK EXISTING USER
        ==============================
        */


        const existingUser =

            await User.findOne({

                email:

                    normalizedEmail

            });



        if(existingUser){


            /*
            --------------------------
            GOOGLE ONLY ACCOUNT
            --------------------------
            */


            if(

                existingUser.googleId &&

                !existingUser.password

            ){

                return res.status(409).json({

                    success:false,

                    error:

                        "Este email já está associado ao Google. Entre com o Google."

                });

            }



            return res.status(409).json({

                success:false,

                error:

                    "Este email já está registado."

            });

        }



        /*
        ==============================
        HASH PASSWORD
        ==============================
        */


        const hashedPassword =

            await bcrypt.hash(

                password,

                12

            );



        /*
        ==============================
        VERIFICATION CODE
        ==============================
        */


        const verificationCode =

            generateCode();



        const verificationExpires =

            new Date(

                Date.now() +

                VERIFICATION_CODE_MINUTES *

                60 *

                1000

            );



        /*
        ==============================
        CREATE USER
        ==============================
        */


        const user =

            await User.create({

                firstName:

                    normalizedFirstName,

                lastName:

                    normalizedLastName,

                email:

                    normalizedEmail,

                password:

                    hashedPassword,

                emailVerified:false,

                verificationCode,

                verificationExpires,

                plan:"free",

                isActive:true

            });



        /*
        ==============================
        SEND VERIFICATION EMAIL
        ==============================
        */


        try{


            await emailservice

                .sendVerificationCode(

                    user.email,

                    verificationCode,

                    user.firstName

                );


        }

        catch(emailError){


            console.error(

                "VERIFICATION EMAIL ERROR:",

                emailError

            );



            /*
            --------------------------------
            Remove incomplete account
            --------------------------------
            */


            await User.deleteOne({

                _id:

                    user._id

            });



            return res.status(503).json({

                success:false,

                error:

                    "Não foi possível enviar o email de confirmação. Tente novamente."

            });

        }



        /*
        ==============================
        RESPONSE
        ==============================
        */


        return res.status(201).json({

            success:true,

            message:

                "Conta criada. Verifique o código enviado para o seu email.",

            userId:

                user._id

        });


    }

    catch(error){


        console.error(

            "REGISTER ERROR:",

            error

        );



        return res.status(500).json({

            success:false,

            error:

                "Erro ao criar conta."

        });

    }

}



/*
==========================================
VERIFY EMAIL
CONFIRM ACCOUNT
==========================================
*/


export async function verifyEmail(

    req,

    res

){


    try{


        const {

            email,

            code

        } = req.body || {};



        const normalizedEmail =

            normalizeEmail(

                email

            );



        const normalizedCode =

            String(

                code || ""

            ).trim();



        /*
        ==============================
        VALIDATION
        ==============================
        */


        if(

            !validator.isEmail(

                normalizedEmail

            )

        ){

            return res.status(400).json({

                success:false,

                error:

                    "Email inválido."

            });

        }



        if(

            !/^\d{6}$/.test(

                normalizedCode

            )

        ){

            return res.status(400).json({

                success:false,

                error:

                    "Código inválido."

            });

        }



        /*
        ==============================
        FIND USER
        ==============================
        */


        const user =

            await User.findOne({

                email:

                    normalizedEmail

            });



        if(!user){

            return res.status(404).json({

                success:false,

                error:

                    "Utilizador não encontrado."

            });

        }



        /*
        ==============================
        ALREADY VERIFIED
        ==============================
        */


        if(user.emailVerified){

            return res.json({

                success:true,

                message:

                    "Email já confirmado."

            });

        }



        /*
        ==============================
        CODE VALIDATION
        ==============================
        */


        if(

            user.verificationCode !==

            normalizedCode

        ){

            return res.status(400).json({

                success:false,

                error:

                    "Código inválido."

            });

        }



        /*
        ==============================
        CODE EXPIRATION
        ==============================
        */


        if(

            !user.verificationExpires ||

            user.verificationExpires <

            new Date()

        ){

            return res.status(400).json({

                success:false,

                error:

                    "Código expirado. Solicite um novo código."

            });

        }



        /*
        ==============================
        VERIFY ACCOUNT
        ==============================
        */


        user.emailVerified = true;

        user.verificationCode = null;

        user.verificationExpires = null;



        await user.save();



        /*
        ==============================
        WELCOME EMAIL
        ==============================
        */


        try{


            await emailservice

                .sendWelcomeEmail(

                    user.email,

                    user.firstName

                );


        }

        catch(error){


            console.error(

                "WELCOME EMAIL ERROR:",

                error

            );

        }



        /*
        ==============================
        RESPONSE
        ==============================
        */


        return res.json({

            success:true,

            message:

                "Email confirmado com sucesso."

        });


    }

    catch(error){


        console.error(

            "VERIFY EMAIL ERROR:",

            error

        );



        return res.status(500).json({

            success:false,

            error:

                "Erro ao confirmar email."

        });

    }

}



/*
==========================================
RESEND VERIFICATION CODE
==========================================
*/


export async function resendVerificationCode(

    req,

    res

){


    try{


        const email =

            normalizeEmail(

                req.body?.email

            );



        /*
        ==============================
        EMAIL VALIDATION
        ==============================
        */


        if(

            !validator.isEmail(

                email

            )

        ){

            return res.status(400).json({

                success:false,

                error:

                    "Email inválido."

            });

        }



        /*
        ==============================
        FIND USER
        ==============================
        */


        const user =

            await User.findOne({

                email

            });



        if(!user){

            return res.status(404).json({

                success:false,

                error:

                    "Utilizador não encontrado."

            });

        }



        /*
        ==============================
        ALREADY VERIFIED
        ==============================
        */


        if(user.emailVerified){

            return res.status(400).json({

                success:false,

                error:

                    "Este email já está confirmado."

            });

        }



        /*
        ==============================
        NEW CODE
        ==============================
        */


        const code =

            generateCode();



        user.verificationCode =

            code;



        user.verificationExpires =

            new Date(

                Date.now() +

                VERIFICATION_CODE_MINUTES *

                60 *

                1000

            );



        await user.save();



        /*
        ==============================
        SEND EMAIL
        ==============================
        */


        try{


            await emailservice

                .sendVerificationCode(

                    user.email,

                    code,

                    user.firstName

                );


        }

        catch(error){


            console.error(

                "RESEND EMAIL ERROR:",

                error

            );



            return res.status(503).json({

                success:false,

                error:

                    "Não foi possível enviar o código. Tente novamente."

            });

        }



        return res.json({

            success:true,

            message:

                "Novo código enviado para o seu email."

        });


    }

    catch(error){


        console.error(

            "RESEND CODE ERROR:",

            error

        );



        return res.status(500).json({

            success:false,

            error:

                "Não foi possível reenviar o código."

        });

    }

}



/*
==========================================
LOGIN USER
EMAIL + PASSWORD
==========================================
*/


export async function loginUser(

    req,

    res

){


    try{


        const {

            email,

            password

        } = req.body || {};



        const normalizedEmail =

            normalizeEmail(

                email

            );



        /*
        ==============================
        BASIC VALIDATION
        ==============================
        */


        if(

            !validator.isEmail(

                normalizedEmail

            ) ||

            typeof password !==

            "string" ||

            !password

        ){

            return res.status(400).json({

                success:false,

                error:

                    "Email ou palavra-passe inválidos."

            });

        }



        /*
        ==============================
        FIND USER
        ==============================
        */


        const user =

            await User.findOne({

                email:

                    normalizedEmail

            });



        /*
        ==============================
        GENERIC CREDENTIAL ERROR
        ==============================
        */


        if(!user){

            return res.status(401).json({

                success:false,

                error:

                    "Email ou palavra-passe incorretos."

            });

        }



        /*
        ==============================
        ACCOUNT STATUS
        ==============================
        */


        if(!user.isActive){

            return res.status(403).json({

                success:false,

                error:

                    "Esta conta está desativada."

            });

        }



        /*
        ==============================
        GOOGLE ONLY ACCOUNT
        ==============================
        */


        if(

            !user.password &&

            user.googleId

        ){

            return res.status(400).json({

                success:false,

                error:

                    "Esta conta utiliza o Google. Entre com o Google."

            });

        }



        /*
        ==============================
        EMAIL VERIFICATION
        ==============================
        */


        if(!user.emailVerified){

            return res.status(403).json({

                success:false,

                error:

                    "Confirme o seu email antes de entrar."

            });

        }



        /*
        ==============================
        PASSWORD
        ==============================
        */


        const passwordMatch =

            await bcrypt.compare(

                password,

                user.password

            );



        if(!passwordMatch){

            return res.status(401).json({

                success:false,

                error:

                    "Email ou palavra-passe incorretos."

            });

        }



        /*
        ==============================
        UPDATE LAST LOGIN
        ==============================
        */


        user.lastLogin =

            new Date();



        await user.save();



        /*
        ==============================
        CREATE SESSION
        ==============================
        */


        const session =

            await createSession(

                user,

                req

            );



        /*
        ==============================
        RESPONSE
        ==============================
        */


        return res.json({

            success:true,

            token:

                session.token,

            expiresAt:

                session.expiresAt,

            user:

                serializeUser(

                    user

                )

        });


    }

    catch(error){


        console.error(

            "LOGIN ERROR:",

            error

        );



        return res.status(500).json({

            success:false,

            error:

                "Erro ao realizar login."

        });

    }

}



/*
==========================================
GOOGLE LOGIN
GOOGLE ID TOKEN AUTHENTICATION
==========================================
*/


export async function googleLogin(

    req,

    res

){


    try{


        const {

            credential

        } = req.body || {};



        /*
        ==============================
        VALIDATE CREDENTIAL
        ==============================
        */


        if(

            !credential ||

            typeof credential !==

            "string"

        ){

            return res.status(400).json({

                success:false,

                error:

                    "Credencial Google não fornecida."

            });

        }



        /*
        ==============================
        GOOGLE CONFIG
        ==============================
        */


        if(

            !GOOGLE_CLIENT_ID ||

            !googleClient

        ){

            console.error(

                "❌ GOOGLE_CLIENT_ID não configurado."

            );



            return res.status(500).json({

                success:false,

                error:

                    "Login Google não configurado no servidor."

            });

        }



        /*
        ==============================
        VERIFY GOOGLE ID TOKEN
        ==============================
        */


        let ticket;



        try{


            ticket =

                await googleClient

                    .verifyIdToken({

                        idToken:

                            credential,

                        audience:

                            GOOGLE_CLIENT_ID

                    });


        }

        catch(error){


            console.error(

                "GOOGLE TOKEN VERIFY ERROR:",

                error

            );



            return res.status(401).json({

                success:false,

                error:

                    "Credencial Google inválida ou expirada."

            });

        }



        const payload =

            ticket.getPayload();



        if(!payload){

            return res.status(401).json({

                success:false,

                error:

                    "Dados Google inválidos."

            });

        }



        /*
        ==============================
        GOOGLE EMAIL
        ==============================
        */


        if(

            !payload.email ||

            payload.email_verified !== true

        ){

            return res.status(401).json({

                success:false,

                error:

                    "O email Google não está confirmado."

            });

        }



        /*
        ==============================
        GOOGLE DATA
        ==============================
        */


        const googleId =

            payload.sub;



        const email =

            normalizeEmail(

                payload.email

            );



        const firstName =

            normalizeName(

                payload.given_name,

                "Utilizador"

            );



        const lastName =

            normalizeName(

                payload.family_name,

                ""

            );



        const avatar =

            payload.picture ||

            null;



        /*
        ==============================
        FIND BY GOOGLE ID
        ==============================
        */


        let user =

            await User.findOne({

                googleId

            });



        /*
        ==============================
        FIND BY EMAIL
        ==============================
        */


        if(!user){

            user =

                await User.findOne({

                    email

                });

        }



        /*
        ==============================
        CREATE NEW GOOGLE USER
        ==============================
        */


        if(!user){


            user =

                await User.create({

                    firstName,

                    lastName,

                    email,

                    googleId,

                    avatar,

                    password:null,

                    emailVerified:true,

                    verificationCode:null,

                    verificationExpires:null,

                    plan:"free",

                    isActive:true

                });


        }

        else{


            /*
            --------------------------------
            ACCOUNT STATUS
            --------------------------------
            */


            if(!user.isActive){

                return res.status(403).json({

                    success:false,

                    error:

                        "Esta conta está desativada."

                });

            }



            /*
            --------------------------------
            LINK GOOGLE
            --------------------------------
            */


            if(

                user.googleId &&

                user.googleId !==

                googleId

            ){

                return res.status(409).json({

                    success:false,

                    error:

                        "Este email já está associado a outra conta Google."

                });

            }



            if(!user.googleId){

                user.googleId =

                    googleId;

            }



            /*
            --------------------------------
            UPDATE PROFILE
            --------------------------------
            */


            if(

                !user.avatar &&

                avatar

            ){

                user.avatar =

                    avatar;

            }



            if(

                !user.firstName &&

                firstName

            ){

                user.firstName =

                    firstName;

            }



            if(

                !user.lastName &&

                lastName

            ){

                user.lastName =

                    lastName;

            }



            /*
            --------------------------------
            GOOGLE VERIFIED EMAIL
            --------------------------------
            */


            user.emailVerified =

                true;



            user.lastLogin =

                new Date();



            await user.save();

        }



        /*
        ==============================
        LAST LOGIN
        ==============================
        */


        if(

            !user.lastLogin ||

            user.lastLogin <

            new Date(

                Date.now() -

                60 *

                1000

            )

        ){

            user.lastLogin =

                new Date();



            await user.save();

        }



        /*
        ==============================
        CREATE SESSION
        ==============================
        */


        const session =

            await createSession(

                user,

                req

            );



        /*
        ==============================
        RESPONSE
        ==============================
        */


        return res.json({

            success:true,

            token:

                session.token,

            expiresAt:

                session.expiresAt,

            user:

                serializeUser(

                    user

                )

        });


    }

    catch(error){


        console.error(

            "GOOGLE LOGIN ERROR:",

            error

        );



        return res.status(500).json({

            success:false,

            error:

                "Erro ao entrar com Google."

        });

    }

}



/*
==========================================
GET CURRENT USER
RESTORE SESSION
==========================================
*/


export async function getCurrentUser(

    req,

    res

){


    try{


        if(!req.user){

            return res.status(401).json({

                success:false,

                error:

                    "Sessão não encontrada."

            });

        }



        /*
        ==============================
        ACCOUNT STATUS
        ==============================
        */


        if(!req.user.isActive){

            return res.status(403).json({

                success:false,

                error:

                    "Esta conta está desativada."

            });

        }



        return res.json({

            success:true,

            user:

                serializeUser(

                    req.user

                )

        });


    }

    catch(error){


        console.error(

            "CURRENT USER ERROR:",

            error

        );



        return res.status(500).json({

            success:false,

            error:

                "Erro ao recuperar utilizador."

        });

    }

}



/*
==========================================
LOGOUT USER
REMOVE CURRENT SESSION
==========================================
*/


export async function logoutUser(

    req,

    res

){


    try{


        const token =

            req.auth?.token ||

            getRequestToken(

                req

            );



        if(token){


            await Session.deleteOne({

                token

            });

        }



        return res.json({

            success:true,

            message:

                "Sessão encerrada com sucesso."

        });


    }

    catch(error){


        console.error(

            "LOGOUT ERROR:",

            error

        );



        return res.status(500).json({

            success:false,

            error:

                "Erro ao terminar sessão."

        });

    }

}



/*
==========================================
EXPORT CONTROLLER
==========================================
*/


export default {

    registerUser,

    verifyEmail,

    resendVerificationCode,

    loginUser,

    googleLogin,

    getCurrentUser,

    logoutUser

};
