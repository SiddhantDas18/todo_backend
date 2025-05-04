import express from "express";
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken";
import dotenv from "dotenv"
import cors from "cors"
import { Client } from "pg";
import middleware from "./middleware";

dotenv.config()

const data = process.env.DATABASE_URI
const pgClient = new Client(data)
pgClient.connect()

const SECRET = process.env.SECRET

const app = express()

app.use(express.json())

app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));

app.post("/api/signup", async function(req,res){
    const username= req.body.username
    const password = req.body.password
    const hashedPassword = await bcrypt.hash(password,10)

    try{
        await pgClient.query(`BEGIN`)
        await pgClient.query(`INSERT INTO "User"(username,password) VALUES($1,$2)`,[username,hashedPassword])
        await pgClient.query(`COMMIT`)
        res.json({
            msg:"User created Succesfully"
        })
    }catch(e){
        await pgClient.query(`ROLLBACK`)
        res.json({
            msg:(e as Error).toString()
        })
    }
})

app.post("/api/signin",async function (req,res){
    const username = req.body.username
    const password = req.body.password
    const hashedPassword = await bcrypt.hash(password,10)

    try{
        const checkUser= await pgClient.query(`SELECT id, username, password FROM "User" WHERE username = $1`,[username])

        if(checkUser.rows.length === 0){
            res.json({
                msg:"User Not found"
            })
        }
        const passwordCheck = await bcrypt.compare(password,checkUser.rows[0].password)

        if(!passwordCheck){
            res.json({
                msg:"Wrong Password"
            })
        }

        const id = checkUser.rows[0].id

        const token = jwt.sign({
            id
        },SECRET as string)
        res.json({
            token:token,
            id:id
        })
    }catch(e){
        res.json({
            msg:(e as Error).toString()
        })
    }
})

app.get("/api/gettodo", middleware, async function(req, res) {
    const userId = (req as any).id

    try {
        const result = await pgClient.query(
            `SELECT id, todo_title, todo_status FROM "Todo" WHERE "userId" = $1`,
            [userId]
        )
        res.json({
            success: true,
            todo: result.rows
        })
    } catch (e) {
        res.json({
            success: false,
            error: (e as Error).toString()
        })
    }
})

app.post("/api/addtodo", middleware, async function(req, res) {
    const value = req.body.value
    const userId = (req as any).id

    try {
        await pgClient.query(`BEGIN`)
        const result = await pgClient.query(
            `INSERT INTO "Todo"("userId", todo_title, todo_status) VALUES($1, $2, $3) RETURNING id, todo_title, todo_status`,
            [userId, value, false]
        )
        await pgClient.query(`COMMIT`)
        res.json({
            success: true,
            todo: result.rows[0]
        })
    } catch (e) {
        await pgClient.query(`ROLLBACK`)
        res.json({
            success: false,
            error: (e as Error).toString()
        })
    }
})
//@ts-ignore
app.patch("/api/updatetodo/:id", middleware, async function(req, res) {
    const todoId = parseInt(req.params.id)
    const status = req.body.status
    const userId = (req as any).id

    try {
        await pgClient.query(`BEGIN`)
        const result = await pgClient.query(
            `UPDATE "Todo" SET todo_status = $1 WHERE id = $2 AND "userId" = $3 RETURNING id, todo_title, todo_status`,
            [status, todoId, userId]
        )
        await pgClient.query(`COMMIT`)

        if (result.rows.length === 0) {
            return res.json({
                success: false,
                error: "Todo not found"
            })
        }

        res.json({
            success: true,
            todo: result.rows[0]
        })
    } catch (e) {
        await pgClient.query(`ROLLBACK`)
        res.json({
            success: false,
            error: (e as Error).toString()
        })
    }
})

//@ts-ignore
app.delete("/api/deletetodo/:id", middleware, async function(req, res) {
    const todoId = parseInt(req.params.id)
    const userId = (req as any).id

    try {
        await pgClient.query(`BEGIN`)
        const result = await pgClient.query(
            `DELETE FROM "Todo" WHERE id = $1 AND "userId" = $2 RETURNING id, todo_title, todo_status`,
            [todoId, userId]
        )
        await pgClient.query(`COMMIT`)

        if (result.rows.length === 0) {
            return res.json({
                success: false,
                error: "Todo not found"
            })
        }

        res.json({
            success: true,
            message: "Todo deleted successfully"
        })
    } catch (e) {
        await pgClient.query(`ROLLBACK`)
        res.json({
            success: false,
            error: (e as Error).toString()
        })
    }
})

app.listen(8080)
console.log("Listening on port 8080")