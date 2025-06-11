import express from "express";
import * as UserController from "../controllers/user";

const router = express.Router();

router.get("/search", UserController.searchUsers);
router.put("/online-status", UserController.updateOnlineStatus);
router.get("/online", UserController.getOnlineUsers);
router.get("/:userId", UserController.getUserById);

export default router;
