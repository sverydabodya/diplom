import express from "express";
import * as AuthController from "../controllers/auth";

const router = express.Router();

router.get("/", AuthController.getAuthUser);

router.post("/signup", AuthController.signUp);
router.post("/signin", AuthController.signIn);
router.post("/signout", AuthController.signOut);

export default router;
