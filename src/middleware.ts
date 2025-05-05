import jwt from "jsonwebtoken"
import dotenv from 'dotenv'

dotenv.config()
const SECRET = process.env.SECRET



export default async function (req:any,res:any,next:any ){
    const authorization = req.headers['authorization']
    
    if(!authorization){
        res.status(401).json({
            msg:"Authorization token mission"
        })
    }

    const token = authorization.split(' ')[1] as string


    try{

        
        
        const decode = (jwt.verify(token,SECRET as string)) as {id:string}

        if(decode){

            const check = typeof(decode)
            console.log(check)
            const {id} = decode
            req.id=id
            next()
        }
    }catch(e){
        res.json({
            msg:(e as Error).toString()
        })
    }
}