import express from "express";
import authRouter from "./auth";
import chatRouter from "./chat";
import userRouter from "./user";

const router = express.Router();

router.use("/auth", authRouter);
router.use("/chat", chatRouter);
router.use("/users", userRouter);

export default router;
