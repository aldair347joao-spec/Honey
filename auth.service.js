/*
==========================================
HONEY IA OS
AUTH SERVICE
Business Authentication Logic
V3.0
Production Authentication System
Local + Google + JWT + MongoDB Session
Email Verification
Secure Session Management
==========================================
*/

import bcrypt from "bcrypt";

import jwt from "jsonwebtoken";

import validator from "validator";

import crypto from "crypto";

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


const JWT_CONFIG = {

    algorithm: "HS256",

    issuer: "honey-ia",

    audience: "honey-ia-client",

    expiresIn: "30d"

};


const SESSION_DAYS = 30;


const VERIFICATION_CODE_MINUTES = 15;



/*
==========================================
SECURITY
==========================================
*/

if(!JWT_SECRET){

    console.error(

        "❌ AUTH SERVICE: JWT_SECRET não configurado."

    );

}



/*
==========================================
AUTH ERROR
==========================================
*/

class AuthError extends Error{

    constructor(

        message,

        status = 400

    ){

        super(message);

        this.name = "AuthError";

        this.status = status;

    }

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

function normalizeName(

    value,

    fallback = ""

){

    return String(

        value || ""

    )

    .trim()

    .replace(

        /\s+/g,

        " "

    ) || fallback;

}



/*
==========================================
PASSWORD VALIDATION
==========================================
*/

function validatePassword(password){

    if(

        typeof password !== "string"

    ){

        return false;

    }


    return (

        password.length >= 8 &&

        /[a-z]/.test(password) &&

        /[A-Z]/.test(password) &&

        /[0-9]/.test(password) &&

        /[^A-Za-z0-9]/.test(password)

    );

}



/*
==========================================
GENERATE VERIFICATION CODE
==========================================
*/

function generateVerificationCode(){

    return crypto

        .randomInt(

            100000,

            1000000

        )

        .toString();

}



/*
==========================================
CREATE JWT
==========================================
*/

function createToken(user){

    if(!JWT_SECRET){

        throw new AuthError(

            "JWT_SECRET não configurado.",

            500

        );

    }


    return jwt.sign(

        {

            id:

                user._id.toString(),

            email:

                user.email,

            provider:

                user.provider ||

                "local"

        },

        JWT_SECRET,

        {

            algorithm:

                JWT_CONFIG.algorithm,

            issuer:

                JWT_CONFIG.issuer,

            audience:

                JWT_CONFIG.audience,

            expiresIn:

                JWT_CONFIG.expiresIn

        }

    );

}



/*
==========================================
GET SESSION EXPIRATION
==========================================
*/

function getSessionExpiration(){

    return new Date(

        Date.now() +

        SESSION_DAYS *

        24 *

        60 *

        60 *

        1000

    );

}



/*
==========================================
CREATE DATABASE SESSION
==========================================
*/

async function createSession(

    user,

    token,

    request = null

){

    const expiresAt =

        getSessionExpiration();


    return Session.create({

        userId:

            user._id,

        token,

        device:

            request

                ?.headers

                ?.["sec-ch-ua-platform"] ||

            request

                ?.headers

                ?.["user-agent"] ||

            "unknown",

        browser:

            request

                ?.headers

                ?.["user-agent"] ||

            "unknown",

        ip:

            request

                ?.ip ||

            null,

        expiresAt

    });

}



/*
==========================================
PUBLIC USER
Never expose sensitive authentication data
==========================================
*/

function publicUser(user){

    if(!user){

        return null;

    }


    return {

        id:

            user._id.toString(),

        firstName:

            user.firstName || "",

        lastName:

            user.lastName || "",

        name:

            [

                user.firstName,

                user.lastName

            ]

                .filter(Boolean)

                .join(" "),

        email:

            user.email,

        provider:

            user.provider ||

            "local",

        avatar:

            user.avatar ||

            null,

        emailVerified:

            user.emailVerified === true,

        plan:

            user.plan ||

            "free",

        isActive:

            user.isActive === true,

        createdAt:

            user.createdAt ||

            null,

        lastLogin:

            user.lastLogin ||

            null

    };

}



/*
==========================================
SEND VERIFICATION EMAIL
==========================================
*/

async function sendVerificationEmail(

    user,

    code

){

    if(

        !emailservice ||

        typeof emailservice.sendVerificationCode !==

            "function"

    ){

        throw new AuthError(

            "Serviço de email não configurado.",

            503

        );

    }


    await emailservice.sendVerificationCode(

        user.email,

        code,

        user.firstName

    );

}



/*
==========================================
AUTH SERVICE
==========================================
*/

class AuthService{



    /*
    ======================================
    REGISTER
    ======================================
    */

    async register(

        data,

        request = null

    ){

        const firstName =

            normalizeName(

                data?.firstName ??

                data?.nome

            );


        const lastName =

            normalizeName(

                data?.lastName ??

                data?.apelido

            );


        const email =

            normalizeEmail(

                data?.email

            );


        const password =

            String(

                data?.password ??

                ""

            );


        const confirmPassword =

            String(

                data?.confirmPassword ??

                data?.confirm_password ??

                data?.passwordConfirmation ??

                password

            );



        /*
        ----------------------------------
        REQUIRED FIELDS
        ----------------------------------
        */

        if(

            !firstName ||

            !lastName ||

            !email ||

            !password

        ){

            throw new AuthError(

                "Preencha todos os campos.",

                400

            );

        }



        /*
        ----------------------------------
        NAME LIMITS
        ----------------------------------
        */

        if(

            firstName.length > 80 ||

            lastName.length > 80

        ){

            throw new AuthError(

                "Nome demasiado longo.",

                400

            );

        }



        /*
        ----------------------------------
        EMAIL
        ----------------------------------
        */

        if(

            !validator.isEmail(email)

        ){

            throw new AuthError(

                "Email inválido.",

                400

            );

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

            throw new AuthError(

                "As palavras-passe não coincidem.",

                400

            );

        }



        /*
        ----------------------------------
        PASSWORD STRENGTH
        ----------------------------------
        */

        if(

            !validatePassword(password)

        ){

            throw new AuthError(

                "A palavra-passe deve ter mínimo 8 caracteres, uma maiúscula, uma minúscula, um número e um símbolo.",

                400

            );

        }



        /*
        ----------------------------------
        EXISTING USER
        ----------------------------------
        */

        const exists =

            await User.findOne({

                email

            });


        if(exists){

            if(

                exists.googleId &&

                !exists.password

            ){

                throw new AuthError(

                    "Este email já está associado ao Google. Entre com a sua conta Google.",

                    409

                );

            }


            throw new AuthError(

                "Este email já está registado.",

                409

            );

        }



        /*
        ----------------------------------
        PASSWORD HASH
        ----------------------------------
        */

        const encryptedPassword =

            await bcrypt.hash(

                password,

                12

            );



        /*
        ----------------------------------
        VERIFICATION
        ----------------------------------
        */

        const verificationCode =

            generateVerificationCode();


        const verificationExpires =

            new Date(

                Date.now() +

                VERIFICATION_CODE_MINUTES *

                60 *

                1000

            );



        /*
        ----------------------------------
        CREATE USER
        ----------------------------------
        */

        const user =

            await User.create({

                firstName,

                lastName,

                email,

                password:

                    encryptedPassword,

                provider:

                    "local",

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

            await sendVerificationEmail(

                user,

                verificationCode

            );

        }

        catch(error){

            console.error(

                "❌ AUTH REGISTER EMAIL ERROR:",

                error

            );


            /*
            ----------------------------------
            ROLLBACK USER
            ----------------------------------
            */

            try{

                await User.deleteOne({

                    _id:

                        user._id

                });

            }

            catch(deleteError){

                console.error(

                    "❌ AUTH ROLLBACK ERROR:",

                    deleteError

                );

            }


            throw new AuthError(

                "Não foi possível enviar o email de confirmação. Tente novamente.",

                503

            );

        }



        /*
        ----------------------------------
        RESULT
        ----------------------------------
        */

        return {

            success: true,

            message:

                "Conta criada. Verifique o código enviado para o seu email.",

            userId:

                user._id.toString(),

            email:

                user.email,

            requiresVerification:

                true

        };

    }



    /*
    ======================================
    VERIFY EMAIL
    ======================================
    */

    async verifyEmail(

        email,

        code

    ){

        const normalizedEmail =

            normalizeEmail(email);


        const verificationCode =

            String(

                code || ""

            )

            .trim();



        if(

            !validator.isEmail(

                normalizedEmail

            )

        ){

            throw new AuthError(

                "Email inválido.",

                400

            );

        }


        if(

            !/^\d{6}$/.test(

                verificationCode

            )

        ){

            throw new AuthError(

                "Código inválido.",

                400

            );

        }



        const user =

            await User.findOne({

                email:

                    normalizedEmail

            });


        if(!user){

            throw new AuthError(

                "Utilizador não encontrado.",

                404

            );

        }



        if(user.emailVerified){

            return {

                success: true,

                message:

                    "Email já confirmado."

            };

        }



        if(

            user.verificationCode !==

                verificationCode

        ){

            throw new AuthError(

                "Código incorreto.",

                400

            );

        }



        if(

            !user.verificationExpires ||

            user.verificationExpires <=

                new Date()

        ){

            throw new AuthError(

                "Código expirado. Solicite um novo código.",

                400

            );

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

        if(

            emailservice &&

            typeof emailservice.sendWelcomeEmail ===

                "function"

        ){

            try{

                await emailservice.sendWelcomeEmail(

                    user.email,

                    user.firstName

                );

            }

            catch(error){

                console.error(

                    "⚠️ WELCOME EMAIL ERROR:",

                    error

                );

            }

        }



        return {

            success: true,

            message:

                "Email confirmado com sucesso."

        };

    }



    /*
    ======================================
    RESEND VERIFICATION CODE
    ======================================
    */

    async resendVerificationCode(

        email

    ){

        const normalizedEmail =

            normalizeEmail(email);



        if(

            !validator.isEmail(

                normalizedEmail

            )

        ){

            throw new AuthError(

                "Email inválido.",

                400

            );

        }



        const user =

            await User.findOne({

                email:

                    normalizedEmail

            });


        if(!user){

            throw new AuthError(

                "Utilizador não encontrado.",

                404

            );

        }



        if(user.emailVerified){

            throw new AuthError(

                "Este email já está confirmado.",

                400

            );

        }



        /*
        ----------------------------------
        NEW CODE
        ----------------------------------
        */

        const code =

            generateVerificationCode();


        const expires =

            new Date(

                Date.now() +

                VERIFICATION_CODE_MINUTES *

                60 *

                1000

            );



        /*
        ----------------------------------
        SEND FIRST
        ----------------------------------
        */

        try{

            await sendVerificationEmail(

                user,

                code

            );

        }

        catch(error){

            console.error(

                "❌ RESEND VERIFICATION EMAIL ERROR:",

                error

            );


            throw new AuthError(

                "Não foi possível enviar o novo código. Tente novamente.",

                503

            );

        }



        /*
        ----------------------------------
        SAVE NEW CODE
        ----------------------------------
        */

        user.verificationCode = code;

        user.verificationExpires = expires;


        await user.save();



        return {

            success: true,

            message:

                "Novo código enviado para o seu email."

        };

    }



    /*
    ======================================
    LOGIN
    ======================================
    */

    async login(

        email,

        password,

        request = null

    ){

        const normalizedEmail =

            normalizeEmail(email);



        if(

            !validator.isEmail(

                normalizedEmail

            ) ||

            typeof password !== "string" ||

            !password

        ){

            throw new AuthError(

                "Email ou palavra-passe inválidos.",

                400

            );

        }



        const user =

            await User.findOne({

                email:

                    normalizedEmail

            });


        if(!user){

            throw new AuthError(

                "Email ou palavra-passe incorretos.",

                401

            );

        }



        if(!user.isActive){

            throw new AuthError(

                "Esta conta está desativada.",

                403

            );

        }



        /*
        ----------------------------------
        GOOGLE-ONLY ACCOUNT
        ----------------------------------
        */

        if(

            !user.password &&

            user.googleId

        ){

            throw new AuthError(

                "Esta conta utiliza o Google. Entre com a sua conta Google.",

                400

            );

        }



        if(!user.emailVerified){

            throw new AuthError(

                "Confirme o seu email antes de entrar.",

                403

            );

        }



        if(!user.password){

            throw new AuthError(

                "Esta conta não possui palavra-passe local.",

                400

            );

        }



        const valid =

            await bcrypt.compare(

                password,

                user.password

            );


        if(!valid){

            throw new AuthError(

                "Email ou palavra-passe incorretos.",

                401

            );

        }



        /*
        ----------------------------------
        LOGIN SUCCESS
        ----------------------------------
        */

        user.lastLogin =

            new Date();


        await user.save();



        const token =

            createToken(user);


        const session =

            await createSession(

                user,

                token,

                request

            );



        return {

            success: true,

            token,

            expiresAt:

                session.expiresAt,

            user:

                publicUser(user)

        };

    }



    /*
    ======================================
    GOOGLE LOGIN
    ======================================
    */

    async googleLogin(

        googleProfile,

        request = null

    ){

        if(

            !googleProfile ||

            !googleProfile.sub ||

            !googleProfile.email

        ){

            throw new AuthError(

                "Dados da conta Google inválidos.",

                401

            );

        }



        /*
        ----------------------------------
        GOOGLE EMAIL VERIFIED
        ----------------------------------
        */

        const emailVerified =

            String(

                googleProfile.email_verified

            ).toLowerCase() ===

            "true";


        if(!emailVerified){

            throw new AuthError(

                "A conta Google não possui email verificado.",

                401

            );

        }



        const email =

            normalizeEmail(

                googleProfile.email

            );


        if(

            !validator.isEmail(email)

        ){

            throw new AuthError(

                "Email Google inválido.",

                401

            );

        }



        const googleId =

            String(

                googleProfile.sub

            );



        let user =

            await User.findOne({

                $or: [

                    {

                        googleId

                    },

                    {

                        email

                    }

                ]

            });



        /*
        ----------------------------------
        CREATE GOOGLE USER
        ----------------------------------
        */

        if(!user){

            user =

                await User.create({

                    firstName:

                        normalizeName(

                            googleProfile.given_name ||

                            googleProfile.name,

                            "Utilizador"

                        ),

                    lastName:

                        normalizeName(

                            googleProfile.family_name

                        ),

                    email,

                    password:

                        null,

                    provider:

                        "google",

                    googleId,

                    avatar:

                        googleProfile.picture ||

                        null,

                    emailVerified:

                        true,

                    verificationCode:

                        null,

                    verificationExpires:

                        null,

                    plan:

                        "free",

                    isActive:

                        true,

                    lastLogin:

                        new Date()

                });

        }

        else{

            /*
            ----------------------------------
            ACCOUNT STATUS
            ----------------------------------
            */

            if(!user.isActive){

                throw new AuthError(

                    "Esta conta está desativada.",

                    403

                );

            }



            /*
            ----------------------------------
            GOOGLE ID CONFLICT
            ----------------------------------
            */

            if(

                user.googleId &&

                user.googleId !== googleId

            ){

                throw new AuthError(

                    "Esta conta Google não corresponde ao utilizador.",

                    409

                );

            }



            /*
            ----------------------------------
            LINK GOOGLE
            ----------------------------------
            */

            if(!user.googleId){

                user.googleId = googleId;

            }



            /*
            ----------------------------------
            PROVIDER
            ----------------------------------
            */

            if(!user.password){

                user.provider = "google";

            }



            /*
            ----------------------------------
            VERIFIED EMAIL
            ----------------------------------
            */

            user.emailVerified = true;



            /*
            ----------------------------------
            PROFILE
            ----------------------------------
            */

            if(

                googleProfile.picture

            ){

                user.avatar =

                    googleProfile.picture;

            }


            if(

                !user.firstName ||

                user.firstName ===

                    "Utilizador"

            ){

                user.firstName =

                    normalizeName(

                        googleProfile.given_name ||

                        googleProfile.name,

                        user.firstName ||

                        "Utilizador"

                    );

            }


            if(

                !user.lastName &&

                googleProfile.family_name

            ){

                user.lastName =

                    normalizeName(

                        googleProfile.family_name

                    );

            }


            user.lastLogin =

                new Date();


            await user.save();

        }



        /*
        ----------------------------------
        CREATE SESSION
        ----------------------------------
        */

        const token =

            createToken(user);


        const session =

            await createSession(

                user,

                token,

                request

            );



        return {

            success: true,

            token,

            expiresAt:

                session.expiresAt,

            user:

                publicUser(user)

        };

    }



    /*
    ======================================
    LOGOUT
    ======================================
    */

    async logout(token){

        if(!token){

            return {

                success: true,

                message:

                    "Sessão já encerrada."

            };

        }



        await Session.deleteOne({

            token

        });



        return {

            success: true,

            message:

                "Sessão encerrada."

        };

    }



    /*
    ======================================
    LOGOUT ALL
    ======================================
    */

    async logoutAll(userId){

        if(!userId){

            throw new AuthError(

                "Utilizador não autenticado.",

                401

            );

        }



        await Session.deleteMany({

            userId

        });



        return {

            success: true,

            message:

                "Todas as sessões foram encerradas."

        };

    }



    /*
    ======================================
    GET USER
    ======================================
    */

    async getUser(id){

        return User

            .findById(id)

            .select(

                "-password -verificationCode -verificationExpires"

            );

    }



    /*
    ======================================
    GET PROFILE
    ======================================
    */

    async getProfile(id){

        const user =

            await User

                .findById(id)

                .select(

                    "-password -verificationCode -verificationExpires"

                );


        if(!user){

            throw new AuthError(

                "Utilizador não encontrado.",

                404

            );

        }



        return {

            success: true,

            user:

                publicUser(user)

        };

    }

}



/*
==========================================
EXPORT
==========================================
*/

export default new AuthService();
