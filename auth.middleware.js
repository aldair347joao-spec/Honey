/*
==========================================
HONEY IA OS
AUTH MIDDLEWARE
JWT SESSION VALIDATION
V1.0
==========================================
*/


import jwt from "jsonwebtoken";
import { User } from "./models.js";



const JWT_SECRET =

process.env.JWT_SECRET || "honey-secret-key";







export async function authMiddleware(
    req,
    res,
    next
){



    try{



        const header =

        req.headers.authorization;





        if(!header){


            return res.status(401)

            .json({

                success:false,

                error:

                "Sessão não encontrada."

            });


        }








        const token =

        header.replace(

            "Bearer ",

            ""

        );








        const decoded =

        jwt.verify(

            token,

            JWT_SECRET

        );








        const user =

        await User.findById(

            decoded.id

        );








        if(!user){


            return res.status(401)

            .json({

                success:false,

                error:

                "Utilizador inválido."

            });


        }








        req.user = user;





        next();



    }

    catch(error){



        return res.status(401)

        .json({

            success:false,

            error:

            "Sessão expirada."

        });



    }



}
