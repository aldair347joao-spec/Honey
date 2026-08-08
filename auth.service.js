/*
==========================================
HONEY IA OS
AUTH SERVICE
Business Authentication Logic
V2.0
Production Authentication System
Local + Google + JWT + MongoDB Session
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

        throw new Error(

            "JWT_SECRET não configurado."

        );

    }


    return jwt.sign(

        {

            id:

                user._id.toString(),

            email:

                user.email,

            provider:

                user.provider || "local"

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
GET JWT EXPIRATION
==========================================
*/

function getSessionExpiration(){

    return new Date(

        Date.now() +

        30 *

        24 *

        60 *

        60 *

        1000

    );

}



/*
==========================================
CREATE SESSION
==========================================
*/

async function createSession(

    user,

    token,

    request = null

){

    const expiresAt =

        getSessionExpiration();


    const session =

        await Session.create({

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


    return session;

}



/*
==========================================
PUBLIC USER
==========================================
*/

function publicUser(user){

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

            user.isActive

    };

}



/*
==========================================
AUTH SERVICE
==========================================
*/

class AuthService {


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

            String(

                data?.firstName ??

                data?.nome ??

                ""

            ).trim();


        const lastName =

            String(

                data?.lastName ??

                data?.apelido ??

                ""

            ).trim();


        const email =

            normalizeEmail(

                data?.email

            );


        const password =

            String(

                data?.password ??

                ""

            );


        if(

            !firstName ||

            !lastName ||

            !email ||

            !password

        ){

            throw new Error(

                "Preencha todos os campos."

            );

        }


        if(

            firstName.length > 80 ||

            lastName.length > 80

        ){

            throw new Error(

                "Nome demasiado longo."

            );

        }


        if(

            !validator.isEmail(email)

        ){

            throw new Error(

                "Email inválido."

            );

        }


        const strongPassword =

            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;


        if(

            !strongPassword.test(

                password

            )

        ){

            throw new Error(

                "A palavra-passe deve ter mínimo 8 caracteres, maiúscula, minúscula, número e símbolo."

            );

        }


        const exists =

            await User.findOne({

                email

            });


        if(exists){

            if(

                exists.provider ===

                    "google" &&

                !exists.password

            ){

                throw new Error(

                    "Este email já está associado ao Google. Entre com a sua conta Google."

                );

            }


            throw new Error(

                "Este email já está registado."

            );

        }


        const encryptedPassword =

            await bcrypt.hash(

                password,

                12

            );


        const verificationCode =

            generateVerificationCode();


        const verificationExpires =

            new Date(

                Date.now() +

                15 *

                60 *

                1000

            );


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
        EMAIL SERVICE
        ----------------------------------
        */

        console.log(

            "🐝 Honey IA verification code:",

            verificationCode

        );


        return {

            success: true,

            message:

                "Conta criada. Verifique o seu email.",

            userId:

                user._id,

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

            ).trim();


        if(

            !normalizedEmail ||

            !verificationCode

        ){

            throw new Error(

                "Email e código são obrigatórios."

            );

        }


        const user =

            await User.findOne({

                email:

                    normalizedEmail

            });


        if(!user){

            throw new Error(

                "Utilizador não encontrado."

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

            throw new Error(

                "Código incorreto."

            );

        }


        if(

            !user.verificationExpires ||

            user.verificationExpires <=

                new Date()

        ){

            throw new Error(

                "Código expirado."

            );

        }


        user.emailVerified = true;

        user.verificationCode = null;

        user.verificationExpires = null;


        await user.save();


        return {

            success: true,

            message:

                "Email confirmado com sucesso."

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

            !normalizedEmail ||

            !password

        ){

            throw new Error(

                "Email e palavra-passe são obrigatórios."

            );

        }


        const user =

            await User.findOne({

                email:

                    normalizedEmail

            });


        if(!user){

            throw new Error(

                "Email ou palavra-passe incorretos."

            );

        }


        if(!user.isActive){

            throw new Error(

                "Esta conta está desativada."

            );

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

            throw new Error(

                "Esta conta utiliza o Google. Entre com a sua conta Google."

            );

        }


        if(!user.emailVerified){

            throw new Error(

                "Confirme o seu email primeiro."

            );

        }


        const valid =

            await bcrypt.compare(

                password,

                user.password

            );


        if(!valid){

            throw new Error(

                "Email ou palavra-passe incorretos."

            );

        }


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

            throw new Error(

                "Dados da conta Google inválidos."

            );

        }


        const email =

            normalizeEmail(

                googleProfile.email

            );


        if(

            !validator.isEmail(email)

        ){

            throw new Error(

                "Email Google inválido."

            );

        }


        if(

            googleProfile.email_verified ===

                false

        ){

            throw new Error(

                "A conta Google não possui email verificado."

            );

        }


        let user =

            await User.findOne({

                $or: [

                    {

                        googleId:

                            googleProfile.sub

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

                        googleProfile.given_name ||

                        googleProfile.name ||

                        "Utilizador",

                    lastName:

                        googleProfile.family_name ||

                        "",

                    email,

                    password:

                        null,

                    provider:

                        "google",

                    googleId:

                        googleProfile.sub,

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
            LINK EXISTING ACCOUNT
            ----------------------------------
            */

            if(

                user.googleId &&

                user.googleId !==

                    googleProfile.sub

            ){

                throw new Error(

                    "Esta conta Google não corresponde ao utilizador."

                );

            }


            user.googleId =

                googleProfile.sub;


            user.provider =

                "google";


            user.emailVerified = true;


            user.avatar =

                googleProfile.picture ||

                user.avatar;


            if(

                !user.firstName ||

                user.firstName === "Utilizador"

            ){

                user.firstName =

                    googleProfile.given_name ||

                    googleProfile.name ||

                    user.firstName;

            }


            if(

                !user.lastName

            ){

                user.lastName =

                    googleProfile.family_name ||

                    "";

            }


            user.lastLogin =

                new Date();


            await user.save();

        }


        if(!user.isActive){

            throw new Error(

                "Esta conta está desativada."

            );

        }


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

                success: true

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

            return {

                success: false

            };

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

            throw new Error(

                "Utilizador não encontrado."

            );

        }


        return {

            success: true,

            user:

                publicUser(user)

        };

    }

}



export default new AuthService();
