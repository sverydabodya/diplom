import express from "express";
import expressWs from "express-ws";
import expressSession from "express-session";
import cors from "cors";
import { PrismaSessionStore } from "@quixo3/prisma-session-store";
import prisma from "./db";
import MainRouter from "./routes/index";
import { wsRouter } from "./routes/chat";

const app = expressWs(express()).app;
const port = process.env.PORT || 5000;
const sessionStore = new PrismaSessionStore(prisma, {
	checkPeriod: 2 * 60 * 1000,
	dbRecordIdIsSessionId: true,
	dbRecordIdFunction: undefined,
});
const sesssionConfig: expressSession.SessionOptions = {
	secret: process.env.SESSION_SECRET!,
	resave: false,
	saveUninitialized: false,
	cookie: {
		// maxAge: 60 * 60 * 1000,
		httpOnly: true,
		path: "/",
		// secure: true,
	},
	// rolling: true,
	store: sessionStore,
};

app.use(
	cors({
		origin: function (origin, callback) {
			const allowedOrigins = [
				"http://localhost:5173",
				"chrome-extension://fgponpodhbmadfljofbimhhlengambbn/index.html",
			];
			if (
				!origin ||
				origin.startsWith("chrome-extension://") ||
				allowedOrigins.includes(origin)
			) {
				callback(null, true);
			} else {
				callback(new Error("Not allowed by CORS"));
			}
		},
		credentials: true,
	})
);
app.use(express.json());
app.use(expressSession(sesssionConfig));

app.use("/api", MainRouter);
wsRouter(app);

app.listen(port, () => {
	console.log("Server started on http://localhost:" + port);
});
