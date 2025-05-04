"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const pg_1 = require("pg");
const middleware_1 = __importDefault(require("./middleware"));
dotenv_1.default.config();
const data = process.env.DATABASE_URI;
const pgClient = new pg_1.Client(data);
pgClient.connect();
const SECRET = process.env.SECRET;
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use((0, cors_1.default)({
    origin: 'http://localhost:3000',
    credentials: true
}));
app.post("/api/signup", function (req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const username = req.body.username;
        const password = req.body.password;
        const hashedPassword = yield bcrypt_1.default.hash(password, 10);
        try {
            yield pgClient.query(`BEGIN`);
            yield pgClient.query(`INSERT INTO "User"(username,password) VALUES($1,$2)`, [username, hashedPassword]);
            yield pgClient.query(`COMMIT`);
            res.json({
                msg: "User created Succesfully"
            });
        }
        catch (e) {
            yield pgClient.query(`ROLLBACK`);
            res.json({
                msg: e.toString()
            });
        }
    });
});
app.post("/api/signin", function (req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const username = req.body.username;
        const password = req.body.password;
        const hashedPassword = yield bcrypt_1.default.hash(password, 10);
        try {
            const checkUser = yield pgClient.query(`SELECT id, username, password FROM "User" WHERE username = $1`, [username]);
            if (checkUser.rows.length === 0) {
                res.json({
                    msg: "User Not found"
                });
            }
            const passwordCheck = yield bcrypt_1.default.compare(password, checkUser.rows[0].password);
            if (!passwordCheck) {
                res.json({
                    msg: "Wrong Password"
                });
            }
            const id = checkUser.rows[0].id;
            const token = jsonwebtoken_1.default.sign({
                id
            }, SECRET);
            res.json({
                token: token,
                id: id
            });
        }
        catch (e) {
            res.json({
                msg: e.toString()
            });
        }
    });
});
app.get("/api/gettodo", middleware_1.default, function (req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const userId = req.id;
        try {
            const result = yield pgClient.query(`SELECT id, todo_title, todo_status FROM "Todo" WHERE "userId" = $1`, [userId]);
            res.json({
                success: true,
                todo: result.rows
            });
        }
        catch (e) {
            res.json({
                success: false,
                error: e.toString()
            });
        }
    });
});
app.post("/api/addtodo", middleware_1.default, function (req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const value = req.body.value;
        const userId = req.id;
        try {
            yield pgClient.query(`BEGIN`);
            const result = yield pgClient.query(`INSERT INTO "Todo"("userId", todo_title, todo_status) VALUES($1, $2, $3) RETURNING id, todo_title, todo_status`, [userId, value, false]);
            yield pgClient.query(`COMMIT`);
            res.json({
                success: true,
                todo: result.rows[0]
            });
        }
        catch (e) {
            yield pgClient.query(`ROLLBACK`);
            res.json({
                success: false,
                error: e.toString()
            });
        }
    });
});
//@ts-ignore
app.patch("/api/updatetodo/:id", middleware_1.default, function (req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const todoId = parseInt(req.params.id);
        const status = req.body.status;
        const userId = req.id;
        try {
            yield pgClient.query(`BEGIN`);
            const result = yield pgClient.query(`UPDATE "Todo" SET todo_status = $1 WHERE id = $2 AND "userId" = $3 RETURNING id, todo_title, todo_status`, [status, todoId, userId]);
            yield pgClient.query(`COMMIT`);
            if (result.rows.length === 0) {
                return res.json({
                    success: false,
                    error: "Todo not found"
                });
            }
            res.json({
                success: true,
                todo: result.rows[0]
            });
        }
        catch (e) {
            yield pgClient.query(`ROLLBACK`);
            res.json({
                success: false,
                error: e.toString()
            });
        }
    });
});
//@ts-ignore
app.delete("/api/deletetodo/:id", middleware_1.default, function (req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const todoId = parseInt(req.params.id);
        const userId = req.id;
        try {
            yield pgClient.query(`BEGIN`);
            const result = yield pgClient.query(`DELETE FROM "Todo" WHERE id = $1 AND "userId" = $2 RETURNING id, todo_title, todo_status`, [todoId, userId]);
            yield pgClient.query(`COMMIT`);
            if (result.rows.length === 0) {
                return res.json({
                    success: false,
                    error: "Todo not found"
                });
            }
            res.json({
                success: true,
                message: "Todo deleted successfully"
            });
        }
        catch (e) {
            yield pgClient.query(`ROLLBACK`);
            res.json({
                success: false,
                error: e.toString()
            });
        }
    });
});
app.listen(8080);
console.log("Listening on port 8080");
