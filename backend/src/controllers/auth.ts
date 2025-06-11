import { RequestHandler } from "express";
import prisma from "../db";
import { SessionUser } from "../types/SessionUser";

export const getAuthUser: RequestHandler = async (req, res, next) => {
	if (req.session.user) {
		res.json(req.session.user);
	} else {
		res.status(401);
	}
};

export const signUp: RequestHandler = async (req, res, next) => {
	const email = req.body.email;
	const name = req.body.name;
	const pass = req.body.pass;

	try {
		const user = await prisma.user.create({
			data: {
				email,
				password: pass,
				name,
			},
		});

		if (user) {
			const sessionUser: SessionUser = {
				id: user.id,
				name: user.name,
				chats: [],
			};

			req.session.user = sessionUser;

			req.session.save(() => {
				res.status(200).json(sessionUser);
			});
		}
	} catch (error) {
		console.error(error);
		throw new Error(`Failed to create user`);
	}
};

export const signIn: RequestHandler = async (req, res, next) => {
	const email = req.body.email;
	const pass = req.body.pass;

	try {
		const user = await prisma.user.findFirst({
			where: {
				email,
				password: pass,
			},
			include: {
				chatRooms: {
					select: {
						id: true,
					},
				},
			},
		});

		if (user) {
			const sessionUser: SessionUser = {
				id: user.id,
				name: user.name,
				chats: user.chatRooms.map((chat) => {
					return chat.id;
				}),
			};

			req.session.user = sessionUser;

			req.session.save(() => {
				res.status(200).json(sessionUser);
			});
		} else {
			res.status(404);
		}
	} catch (error) {
		console.error(error);
		throw new Error(`Failed to fetch user`);
	}
};

export const signOut: RequestHandler = async (req, res, next) => {
	res.clearCookie("connect.sid", {
		httpOnly: true,
		path: "/",
	});

	req.session.destroy((error) => {
		if (error) {
			next(error);
		} else {
			res.status(200).send("Logged out");
		}
	});
};
