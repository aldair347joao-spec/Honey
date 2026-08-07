/*
==========================================
HONEY IA OS
AUTH CONTROLLER
Authentication Business Logic
V2.0
Local + Google Authentication
JWT + MongoDB Sessions
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
CONFIG
==========================================
*/


const JWT_SECRET =

process.env.JWT_SECRET;


const GOOGLE_CLIENT_ID =

process.env.GOOGLE_CLIENT_ID;



/*
==========================================
SECURITY CONFIGURATION
==========================================
*/


const SESSION_DAYS = 30;


const VERIFICATION_MINUTES = 15;



/*
==========================================
GOOGLE CLIENT
==========================================
*/


const googleClient =

new OAuth2Client(

    GOOGLE_CLIENT_ID

);



/*
==========================================
PASSWORD VALIDATION
==========================================
*/


function validatePassword(password){


    if(

        !password ||

        typeof password !== "string" ||

        password.length < 8

    ){

        return false;

    }


    const hasUpperCase =

    /[A-Z]/.test(password);


    const hasLowerCase =

    /[a-z]/.test(password);


    const hasNumber =

    /[0-9]/.test(password);


    const hasSpecial =

    /[^A-Za-z0-9]/.test(password);


    return (

        hasUpperCase &&

        hasLowerCase &&

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


    return crypto.randomInt(

        100000,

        1000000

    ).toString();

}



/*
==========================================
NORMALIZE EMAIL
==========================================
*/


function normalizeEmail(email){


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


function normalizeName(value){


    return String(

        value || ""

    )

    .trim();

}



/*
==========================================
CREATE JWT SESSION
==========================================
*/


async function createSession(

    user,

    req

){


    if(!JWT_SECRET){

        throw new Error(

            "JWT_SECRET não configurado no servidor."

        );

    }


    const token =

    jwt.sign(

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


    return token;

}



/*
==========================================
USER RESPONSE
REMOVE PRIVATE DATA
==========================================
*/


function sanitizeUser(user){


    return {

        id:

        user._id,

        firstName:

        user.firstName,

        lastName:

        user.lastName,

        email:

        user.email,

        provider:

        user.provider,

        avatar:

        user.avatar,

        emailVerified:

        user.emailVerified,

        plan:

        user.plan,

        isActive:

        user.isActive,

        createdAt:

        user.createdAt,

        lastLogin:

        user.lastLogin

    };

}



/*
==========================================
REGISTER USER
CREATE LOCAL ACCOUNT
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

        } = req.body;


        const cleanFirstName =

        normalizeName(firstName);


        const cleanLastName =

        normalizeName(lastName);


        const cleanEmail =

        normalizeEmail(email);



        /*
        ----------------------------------
        REQUIRED FIELDS
        ----------------------------------
        */


        if(

            !cleanFirstName ||

            !cleanLastName ||

            !cleanEmail ||

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
        ----------------------------------
        EMAIL
        ----------------------------------
        */


        if(

            !validator.isEmail(

                cleanEmail

            )

        ){

            return res.status(400).json({

                success:false,

                error:

                "Email inválido."

            });

        }



        /*
        ----------------------------------
        PASSWORD MATCH
        ----------------------------------
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
        ----------------------------------
        PASSWORD SECURITY
        ----------------------------------
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
        ----------------------------------
        EXISTING USER
        ----------------------------------
        */


        const existingUser =

        await User.findOne({

            email:

            cleanEmail

        });


        if(existingUser){


            if(

                existingUser.provider ===

                "google"

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
        ----------------------------------
        PASSWORD HASH
        ----------------------------------
        */


        const hashedPassword =

        await bcrypt.hash(

            password,

            12

        );



        /*
        ----------------------------------
        EMAIL VERIFICATION
        ----------------------------------
        */


        const verificationCode =

        generateCode();


        const verificationExpires =

        new Date(

            Date.now() +

            VERIFICATION_MINUTES *

            60 *

            1000

        );



        /*
        ----------------------------------
        CREATE USER
        ----------------------------------
        */


        const newUser =

        await User.create({

            firstName:

            cleanFirstName,

            lastName:

            cleanLastName,

            email:

            cleanEmail,

            password:

            hashedPassword,

            provider:

            "local",

            googleId:

            null,

            avatar:

            null,

            emailVerified:

            false,

            verificationCode,

            verificationExpires,

            plan:

            "free",

            isActive:

            true

        });



        /*
        ----------------------------------
        SEND VERIFICATION EMAIL
        ----------------------------------
        */


        try{


            await emailservice.sendVerificationCode(

                newUser.email,

                verificationCode,

                newUser.firstName

            );


        }

        catch(emailError){


            console.error(

                "EMAIL VERIFICATION ERROR:",

                emailError

            );


            /*
            --------------------------------
            Remove conta se email não puder
            ser enviado.
            --------------------------------
            */


            await User.deleteOne({

                _id:

                newUser._id

            });


            return res.status(503).json({

                success:false,

                error:

                "Não foi possível enviar o email de confirmação. Tente novamente."

            });

        }



        /*
        ----------------------------------
        SUCCESS
        ----------------------------------
        */


        return res.status(201).json({

            success:true,

            message:

            "Conta criada. Verifique o código enviado para o seu email.",

            userId:

            newUser._id

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
CONFIRM LOCAL ACCOUNT
==========================================
*/


export async function verifyEmail(

    req,

    res

){


    try{


        const email =

        normalizeEmail(

            req.body.email

        );


        const code =

        String(

            req.body.code || ""

        ).trim();



        /*
        ----------------------------------
        VALIDATION
        ----------------------------------
        */


        if(

            !email ||

            !code

        ){

            return res.status(400).json({

                success:false,

                error:

                "Email e código são obrigatórios."

            });

        }



        /*
        ----------------------------------
        FIND USER
        ----------------------------------
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
        ----------------------------------
        ALREADY VERIFIED
        ----------------------------------
        */


        if(user.emailVerified){

            return res.json({

                success:true,

                message:

                "Email já confirmado."

            });

        }



        /*
        ----------------------------------
        CODE
        ----------------------------------
        */


        if(

            user.verificationCode !==

            code

        ){

            return res.status(400).json({

                success:false,

                error:

                "Código inválido."

            });

        }



        /*
        ----------------------------------
        EXPIRATION
        ----------------------------------
        */


        if(

            !user.verificationExpires ||

            user.verificationExpires <

            new Date()

        ){

            return res.status(400).json({

                success:false,

                error:

                "Código expirado."

            });

        }



        /*
        ----------------------------------
        VERIFY
        ----------------------------------
        */


        user.emailVerified = true;

        user.verificationCode = null;

        user.verificationExpires = null;


        await user.save();



        /*
        ----------------------------------
        WELCOME EMAIL
        ----------------------------------
        */


        try{

            await emailservice.sendWelcomeEmail(

                user.email,

                user.firstName

            );

        }

        catch(emailError){

            console.error(

                "WELCOME EMAIL ERROR:",

                emailError

            );

        }



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
LOGIN USER
LOCAL AUTHENTICATION
==========================================
*/


export async function loginUser(

    req,

    res

){


    try{


        const email =

        normalizeEmail(

            req.body.email

        );


        const password =

        String(

            req.body.password || ""

        );



        /*
        ----------------------------------
        REQUIRED
        ----------------------------------
        */


        if(

            !email ||

            !password

        ){

            return res.status(400).json({

                success:false,

                error:

                "Email e palavra-passe são obrigatórios."

            });

        }



        /*
        ----------------------------------
        FIND USER
        ----------------------------------
        */


        const user =

        await User.findOne({

            email

        });


        if(!user){

            return res.status(401).json({

                success:false,

                error:

                "Email ou palavra-passe incorretos."

            });

        }



        /*
        ----------------------------------
        ACCOUNT STATUS
        ----------------------------------
        */


        if(!user.isActive){

            return res.status(403).json({

                success:false,

                error:

                "Esta conta está desativada."

            });

        }



        /*
        ----------------------------------
        GOOGLE ACCOUNT
        ----------------------------------
        */


        if(

            user.provider ===

            "google" &&

            !user.password

        ){

            return res.status(400).json({

                success:false,

                error:

                "Esta conta utiliza o Google. Entre com o Google."

            });

        }



        /*
        ----------------------------------
        EMAIL VERIFICATION
        ----------------------------------
        */


        if(!user.emailVerified){

            return res.status(403).json({

                success:false,

                error:

                "Confirme o seu email antes de entrar."

            });

        }



        /*
        ----------------------------------
        PASSWORD
        ----------------------------------
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
        ----------------------------------
        UPDATE LAST LOGIN
        ----------------------------------
        */


        user.lastLogin =

        new Date();


        await user.save();



        /*
        ----------------------------------
        CREATE SESSION
        ----------------------------------
        */


        const token =

        await createSession(

            user,

            req

        );



        /*
        ----------------------------------
        RESPONSE
        ----------------------------------
        */


        return res.json({

            success:true,

            token,

            user:

            sanitizeUser(user)

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
VERIFY GOOGLE ID TOKEN
==========================================
*/


export async function googleLogin(

    req,

    res

){


    try{


        const {

            credential

        } = req.body;



        /*
        ----------------------------------
        VALIDATION
        ----------------------------------
        */


        if(!credential){

            return res.status(400).json({

                success:false,

                error:

                "Credencial Google não fornecida."

            });

        }



        if(!GOOGLE_CLIENT_ID){

            console.error(

                "GOOGLE_CLIENT_ID não configurado."

            );

            return res.status(500).json({

                success:false,

                error:

                "Login com Google não está configurado."

            });

        }



        /*
        ----------------------------------
        VERIFY TOKEN
        ----------------------------------
        */


        const ticket =

        await googleClient.verifyIdToken({

            idToken:

            credential,

            audience:

            GOOGLE_CLIENT_ID

        });


        const payload =

        ticket.getPayload();



        if(!payload){

            return res.status(401).json({

                success:false,

                error:

                "Credencial Google inválida."

            });

        }



        /*
        ----------------------------------
        GOOGLE DATA
        ----------------------------------
        */


        const googleId =

        payload.sub;


        const email =

        normalizeEmail(

            payload.email

        );


        const firstName =

        normalizeName(

            payload.given_name

        ) || "Utilizador";


        const lastName =

        normalizeName(

            payload.family_name

        ) || "";


        const avatar =

        payload.picture || null;


        const emailVerified =

        payload.email_verified === true;



        if(

            !googleId ||

            !email

        ){

            return res.status(401).json({

                success:false,

                error:

                "Não foi possível obter os dados da conta Google."

            });

        }



        if(!emailVerified){

            return res.status(403).json({

                success:false,

                error:

                "A conta Google precisa ter o email confirmado."

            });

        }



        /*
        ----------------------------------
        FIND BY GOOGLE ID
        ----------------------------------
        */


        let user =

        await User.findOne({

            googleId

        });



        /*
        ----------------------------------
        IF NOT FOUND, FIND BY EMAIL
        ----------------------------------
        */


        if(!user){

            user =

            await User.findOne({

                email

            });

        }



        /*
        ----------------------------------
        EXISTING USER
        ----------------------------------
        */


        if(user){



            if(!user.isActive){

                return res.status(403).json({

                    success:false,

                    error:

                    "Esta conta está desativada."

                });

            }



            /*
            --------------------------------
            LINK GOOGLE ACCOUNT
            --------------------------------
            */


            if(

                !user.googleId

            ){

                user.googleId =

                googleId;

            }


            /*
            --------------------------------
            Update provider only when safe
            --------------------------------
            */


            if(

                user.provider !==

                "google"

            ){

                user.provider =

                "google";

            }



            /*
            --------------------------------
            Update profile data
            --------------------------------
            */


            user.avatar =

            avatar ||

            user.avatar;


            user.emailVerified =

            true;


            user.lastLogin =

            new Date();


            await user.save();

        }



        /*
        ----------------------------------
        NEW GOOGLE USER
        ----------------------------------
        */


        else{


            user =

            await User.create({

                firstName,

                lastName,

                email,

                password:null,

                provider:"google",

                googleId,

                avatar,

                emailVerified:true,

                verificationCode:null,

                verificationExpires:null,

                plan:"free",

                isActive:true,

                lastLogin:

                new Date()

            });

        }



        /*
        ----------------------------------
        CREATE SESSION
        ----------------------------------
        */


        const token =

        await createSession(

            user,

            req

        );



        /*
        ----------------------------------
        RESPONSE
        ----------------------------------
        */


        return res.json({

            success:true,

            token,

            user:

            sanitizeUser(user)

        });


    }

    catch(error){


        console.error(

            "GOOGLE LOGIN ERROR:",

            error

        );


        return res.status(401).json({

            success:false,

            error:

            "Não foi possível autenticar com o Google."

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


        const user =

        await User.findById(

            req.user.id

        )

        .select(

            "-password -verificationCode -verificationExpires"

        );


        if(!user){

            return res.status(404).json({

                success:false,

                error:

                "Utilizador não encontrado."

            });

        }



        if(!user.isActive){

            return res.status(403).json({

                success:false,

                error:

                "Esta conta está desativada."

            });

        }



        return res.json({

            success:true,

            user:

            sanitizeUser(user)

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
REMOVE SESSION
==========================================
*/


export async function logoutUser(

    req,

    res

){


    try{


        const token =

        req.headers.authorization

        ?.replace(

            /^Bearer\s+/i,

            ""

        )

        .trim();



        if(token){


            await Session.deleteOne({

                token

            });

        }



        return res.json({

            success:true,

            message:

            "Sessão encerrada."

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

    loginUser,

    googleLogin,

    getCurrentUser,

    logoutUser

};
