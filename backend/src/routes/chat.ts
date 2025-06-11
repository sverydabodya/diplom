import express, { Application } from "express";
import * as ChatController from "../controllers/chat";
import expressWs from "express-ws";
import { Router } from "express";
import {
	getChatById,
	getChatsByUser,
	sendMessage,
	deleteMessage,
	createChat,
	deleteChat,
	markMessageAsRead,
	markAllMessagesAsRead,
	getUnreadCount,
	unreadWebSocket,
	leaveGroupChat,
	updateChatName,
	addUserToChat,
	removeUserFromChat,
} from "../controllers/chat";

const router = Router();

router.get("/user", getChatsByUser);
router.get("/:id", getChatById);
router.post("/create", createChat);
router.delete("/:id", deleteChat);
router.post("/:id/leave", leaveGroupChat);
router.put("/:id/name", updateChatName);
router.post("/:id/users", addUserToChat);
router.delete("/:id/users/:userId", removeUserFromChat);
router.delete("/:chatId/message/:id", deleteMessage);
router.put("/message/:id/read", markMessageAsRead);
router.put("/:chatId/read-all", markAllMessagesAsRead);
router.get("/unread/count", getUnreadCount);

export const wsRouter = async (app: Application) => {
	const wsApp = expressWs(app).app;
	wsApp.ws("/api/chat/:id", ChatController.sendMessage);
	wsApp.ws("/api/chat/unread", ChatController.unreadWebSocket);
};

export default router;
