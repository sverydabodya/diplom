import { RequestHandler } from "express";
import prisma from "../db";

export const searchUsers: RequestHandler = async (req, res, next) => {
	const query = req.query.q as string;
	const user = req.session.user;

	if (!user) {
		return res.status(401).json({ error: "Необхідна авторизація" });
	}

	if (!query || query.trim().length < 2) {
		return res
			.status(400)
			.json({ error: "Пошуковий запит повинен містити мінімум 2 символи" });
	}

	try {
		const users = await prisma.user.findMany({
			where: {
				OR: [
					{ name: { contains: query, mode: "insensitive" } },
					{ email: { contains: query, mode: "insensitive" } },
				],
				NOT: { id: user.id }, // Виключаємо поточного користувача
			},
			select: {
				id: true,
				name: true,
				email: true,
				isOnline: true,
				lastSeen: true,
			},
			take: 10,
		});

		res.json(users);
	} catch (error) {
		console.error("Помилка при пошуку користувачів:", error);
		res.status(500).json({ error: "Помилка при пошуку" });
	}
};

export const updateOnlineStatus: RequestHandler = async (req, res, next) => {
	const user = req.session.user;
	const { isOnline } = req.body;

	if (!user) {
		return res.status(401).json({ error: "Необхідна авторизація" });
	}

	try {
		const updatedUser = await prisma.user.update({
			where: { id: user.id },
			data: {
				isOnline,
				lastSeen: new Date(),
			},
			select: {
				id: true,
				name: true,
				email: true,
				isOnline: true,
				lastSeen: true,
			},
		});

		res.json(updatedUser);
	} catch (error) {
		console.error("Помилка при оновленні статусу:", error);
		res.status(500).json({ error: "Помилка при оновленні статусу" });
	}
};

export const getOnlineUsers: RequestHandler = async (req, res, next) => {
	const user = req.session.user;

	if (!user) {
		return res.status(401).json({ error: "Необхідна авторизація" });
	}

	try {
		const onlineUsers = await prisma.user.findMany({
			where: {
				isOnline: true,
				NOT: { id: user.id },
			},
			select: {
				id: true,
				name: true,
				email: true,
				isOnline: true,
				lastSeen: true,
			},
		});

		res.json(onlineUsers);
	} catch (error) {
		console.error("Помилка при отриманні онлайн користувачів:", error);
		res.status(500).json({ error: "Помилка при отриманні даних" });
	}
};

export const getUserById: RequestHandler = async (req, res, next) => {
	const user = req.session.user;
	const { userId } = req.params;

	if (!user) {
		return res.status(401).json({ error: "Необхідна авторизація" });
	}

	if (!userId) {
		return res.status(400).json({ error: "ID користувача не вказано" });
	}

	try {
		const targetUser = await prisma.user.findUnique({
			where: { id: userId },
			select: {
				id: true,
				name: true,
				email: true,
				isOnline: true,
				lastSeen: true,
			},
		});

		if (!targetUser) {
			return res.status(404).json({ error: "Користувача не знайдено" });
		}

		res.json(targetUser);
	} catch (error) {
		console.error("Помилка при отриманні профілю користувача:", error);
		res.status(500).json({ error: "Помилка при отриманні профілю" });
	}
};
