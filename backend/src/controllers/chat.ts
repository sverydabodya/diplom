import { Request, Response } from "express";
import { RequestHandler } from "express";
import { WebsocketRequestHandler } from "express-ws";
import prisma from "../db";
import WebSocket from "ws";

export const getChatById: RequestHandler = async (req, res, next) => {
	const chatId = req.params.id;
	const user = req.session.user;

	if (!user) {
		return res.status(401).json({ error: "Необхідна авторизація" });
	}

	try {
		const chat = await prisma.chatRoom.findFirst({
			where: {
				id: chatId,
				users: {
					some: {
						id: user.id,
					},
				},
			},
			include: {
				messages: {
					include: {
						sender: true,
						replyTo: {
							include: {
								sender: true,
							},
						},
					},
					orderBy: {
						createdAt: "asc",
					},
				},
				users: true,
			},
		});

		if (!chat) {
			return res.status(403).json({ error: "Немає доступу до цього чату" });
		}

		res.json(chat);
	} catch (error) {
		console.error(error);
		throw new Error(`Failed to fetch chat`);
	}
};

export const getChatsByUser: RequestHandler = async (req, res, next) => {
	const user = req.session.user;

	if (!user) {
		return res.status(401).json({ error: "Необхідна авторизація" });
	}

	try {
		const chats = await prisma.chatRoom.findMany({
			where: {
				users: {
					some: {
						id: user.id,
					},
				},
			},
			include: {
				users: {
					select: {
						id: true,
						name: true,
						email: true,
						isOnline: true,
						lastSeen: true,
					},
				},
				messages: {
					orderBy: {
						createdAt: "desc",
					},
					take: 1,
					include: {
						sender: {
							select: {
								id: true,
								name: true,
							},
						},
					},
				},
				_count: {
					select: {
						messages: {
							where: {
								senderId: { not: user.id },
								isRead: false,
							},
						},
					},
				},
			},
		});

		// Сортуємо чати за актуальністю (за датою останнього повідомлення)
		const sortedChats = chats.sort((a, b) => {
			// Спочатку сортуємо за наявністю непрочитаних повідомлень
			const aUnreadCount = a._count?.messages || 0;
			const bUnreadCount = b._count?.messages || 0;

			if (aUnreadCount > 0 && bUnreadCount === 0) return -1;
			if (aUnreadCount === 0 && bUnreadCount > 0) return 1;

			// Якщо кількість непрочитаних однакова, сортуємо за актуальністю
			const aLastMessage = a.messages[0];
			const bLastMessage = b.messages[0];

			// Якщо у чату немає повідомлень, використовуємо дату створення чату
			const aDate = aLastMessage
				? new Date(aLastMessage.createdAt)
				: new Date(a.createdAt);
			const bDate = bLastMessage
				? new Date(bLastMessage.createdAt)
				: new Date(b.createdAt);

			// Сортуємо за спаданням (найновіші спочатку)
			return bDate.getTime() - aDate.getTime();
		});

		res.json(sortedChats);
	} catch (error) {
		console.error("Помилка при отриманні чатів:", error);
		res.status(500).json({ error: "Помилка при отриманні даних" });
	}
};

// Глобальні змінні для WebSocket клієнтів
const chatClients: { [chatId: string]: WebSocket[] } = {};
const unreadClients: WebSocket[] = [];
const onlineClients: { [userId: string]: WebSocket } = {};

// Функція для оновлення онлайн статусу користувача
const updateUserOnlineStatus = async (userId: string, isOnline: boolean) => {
	try {
		await prisma.user.update({
			where: { id: userId },
			data: {
				isOnline,
				lastSeen: new Date(),
			},
		});

		// Повідомляємо всіх клієнтів про зміну статусу
		const statusUpdateData = JSON.stringify({
			type: "user_status_update",
			userId,
			isOnline,
			lastSeen: new Date(),
		});

		// Відправляємо всім підключеним клієнтам
		Object.values(chatClients)
			.flat()
			.forEach((client: WebSocket) => {
				if (client.readyState === client.OPEN) {
					client.send(statusUpdateData);
				}
			});

		unreadClients.forEach((client: WebSocket) => {
			if (client.readyState === client.OPEN) {
				client.send(statusUpdateData);
			}
		});
	} catch (error) {
		console.error("Помилка при оновленні онлайн статусу:", error);
	}
};

export const sendMessage: WebsocketRequestHandler = async (ws, req) => {
	const chatId = req.params.id!;
	const user = req.session.user;

	if (!user) {
		ws.close();
		return;
	}

	if (!chatClients[chatId]) {
		chatClients[chatId] = [];
	}
	chatClients[chatId].push(ws);

	// Оновлюємо статус користувача як онлайн
	await updateUserOnlineStatus(user.id, true);

	console.log(
		`🔌 Клієнт підключився до чату ${chatId}. Загальна кількість: ${chatClients[chatId].length}`
	);

	ws.on("message", async (msg) => {
		try {
			const data = JSON.parse(msg.toString());

			// Обробка різних типів повідомлень
			if (data.type === "message") {
				// Звичайне повідомлення або відповідь
				const messageData: any = {
					content: data.content,
					senderId: user.id,
					chatRoomId: chatId,
				};

				// Якщо це відповідь на повідомлення
				if (data.replyToId) {
					// Перевіряємо, чи існує повідомлення, на яке відповідаємо
					const replyToMessage = await prisma.message.findFirst({
						where: {
							id: data.replyToId,
							chatRoomId: chatId,
						},
					});

					if (replyToMessage) {
						messageData.replyToId = data.replyToId;
					}
				}

				const message = await prisma.message.create({
					data: messageData,
					include: {
						sender: true,
						replyTo: {
							include: {
								sender: true,
							},
						},
					},
				});

				const messageDataToSend = JSON.stringify({
					type: "new_message",
					message,
				});

				chatClients[chatId].forEach((client: WebSocket) => {
					if (client.readyState === client.OPEN) {
						client.send(messageDataToSend);
					}
				});

				// Повідомляємо всіх клієнтів про оновлення кількості непрочитаних повідомлень
				const unreadUpdateData = JSON.stringify({
					type: "unread_update",
				});

				console.log(
					`📊 Відправляю unread_update. Клієнтів підключено: ${unreadClients.length}`
				);

				unreadClients.forEach((client: WebSocket) => {
					if (client.readyState === client.OPEN) {
						client.send(unreadUpdateData);
					}
				});
			} else if (data.type === "typing_start") {
				// Користувач почав друкувати
				const typingData = JSON.stringify({
					type: "typing_start",
					userId: user.id,
					userName: user.name,
				});

				chatClients[chatId].forEach((client: WebSocket) => {
					if (client.readyState === client.OPEN) {
						client.send(typingData);
					}
				});
			} else if (data.type === "typing_stop") {
				// Користувач зупинив друкування
				const typingData = JSON.stringify({
					type: "typing_stop",
					userId: user.id,
				});

				chatClients[chatId].forEach((client: WebSocket) => {
					if (client.readyState === client.OPEN) {
						client.send(typingData);
					}
				});
			}
		} catch (error) {
			console.error("Помилка при обробці WebSocket повідомлення:", error);
		}
	});

	ws.on("close", () => {
		chatClients[chatId] = chatClients[chatId].filter(
			(client: WebSocket) => client !== ws
		);

		// Оновлюємо статус користувача як офлайн
		updateUserOnlineStatus(user.id, false);

		console.log(
			`🔌 Клієнт відключився від чату ${chatId}. Залишилося: ${chatClients[chatId].length}`
		);
	});
};

export const unreadWebSocket: WebsocketRequestHandler = async (ws, req) => {
	const user = req.session.user;

	if (!user) {
		ws.close();
		return;
	}

	unreadClients.push(ws);

	// Оновлюємо статус користувача як онлайн
	await updateUserOnlineStatus(user.id, true);

	console.log(
		`🔌 Клієнт підключився до unread WebSocket. Загальна кількість: ${unreadClients.length}`
	);

	ws.on("close", () => {
		unreadClients.splice(unreadClients.indexOf(ws), 1);

		// Оновлюємо статус користувача як офлайн
		updateUserOnlineStatus(user.id, false);

		console.log(
			`🔌 Клієнт відключився від unread WebSocket. Залишилося: ${unreadClients.length}`
		);
	});
};

export const deleteMessage: RequestHandler = async (req, res, next) => {
	const messageId = req.params.id;
	const chatId = req.params.chatId;
	const user = req.session.user;

	try {
		// Перевіряємо, чи повідомлення належить користувачу
		const message = await prisma.message.findUnique({
			where: { id: messageId },
			select: { senderId: true },
		});

		if (!message) {
			return res.status(404).json({ error: "Повідомлення не знайдено" });
		}

		if (message.senderId !== user.id) {
			return res
				.status(403)
				.json({ error: "Немає прав для видалення цього повідомлення" });
		}

		// Видаляємо повідомлення
		await prisma.message.delete({
			where: { id: messageId },
		});

		// Повідомляємо всіх клієнтів про видалення
		if (chatClients[chatId]) {
			const deleteData = JSON.stringify({
				type: "delete_message",
				messageId,
			});

			chatClients[chatId].forEach((client: WebSocket) => {
				if (client.readyState === client.OPEN) {
					client.send(deleteData);
				}
			});
		}

		// Повідомляємо всіх клієнтів про оновлення кількості непрочитаних повідомлень
		const unreadUpdateData = JSON.stringify({
			type: "unread_update",
		});

		unreadClients.forEach((client: WebSocket) => {
			if (client.readyState === client.OPEN) {
				client.send(unreadUpdateData);
			}
		});

		res.status(200).json({ message: "Повідомлення видалено" });
	} catch (error) {
		console.error("Помилка при видаленні повідомлення:", error);
		res.status(500).json({ error: "Помилка при видаленні повідомлення" });
	}
};

export const createChat: RequestHandler = async (req, res) => {
	if (!req.session.user) {
		return res.status(401).json({ error: "Необхідна авторизація" });
	}

	try {
		const { userIds, name } = req.body;
		console.log(userIds);

		// Для звичайного чату
		if (userIds.length === 1) {
			if (!userIds) {
				return res
					.status(400)
					.json({ error: "Необхідно вказати ID користувача" });
			}

			const userId = userIds[0];
			const user = await prisma.user.findUnique({
				where: { id: userId },
			});

			if (!user) {
				return res.status(404).json({ error: "Користувача не знайдено" });
			}

			const existingChat = await prisma.chatRoom.findFirst({
				where: {
					AND: [
						{ users: { some: { id: req.session.user.id } } },
						{ users: { some: { id: userId } } },
					],
				},
				include: {
					_count: {
						select: { users: true },
					},
				},
			});

			if (existingChat._count.users <= 2) {
				return res.json(existingChat);
			}

			const chat = await prisma.chatRoom.create({
				data: {
					users: {
						connect: [{ id: req.session.user.id }, { id: userId }],
					},
				},
				include: {
					users: {
						select: {
							id: true,
							name: true,
							email: true,
						},
					},
				},
			});

			// Повідомляємо всіх учасників чату про створення нового чату
			chat.users.forEach((user) => {
				console.log(`Новий чат створено для користувача: ${user.id}`);
			});

			// Повідомляємо всіх клієнтів про оновлення кількості непрочитаних повідомлень
			const unreadUpdateData = JSON.stringify({
				type: "unread_update",
			});

			unreadClients.forEach((client: WebSocket) => {
				if (client.readyState === client.OPEN) {
					client.send(unreadUpdateData);
				}
			});

			res.json(chat);
		}
		// Для групового чату
		else if (userIds.length > 1) {
			console.log("group");

			if (!userIds || !Array.isArray(userIds) || userIds.length < 2) {
				return res
					.status(400)
					.json({ error: "Необхідно вказати мінімум 2 користувачів" });
			}

			// Перевіряємо, чи всі користувачі існують
			const users = await prisma.user.findMany({
				where: {
					id: { in: userIds },
				},
			});

			if (users.length !== userIds.length) {
				return res
					.status(404)
					.json({ error: "Деяких користувачів не знайдено" });
			}

			// Додаємо поточного користувача до списку учасників
			const allUserIds = [...userIds, req.session.user.id];

			// // Перевіряємо, чи вже існує чат з цими користувачами
			// const existingChat = await prisma.chatRoom.findFirst({
			// 	where: {
			// 		users: {
			// 			every: {
			// 				id: { in: allUserIds },
			// 			},
			// 		},
			// 		AND: [
			// 			{
			// 				users: {
			// 					some: { id: req.session.user.id },
			// 				},
			// 			},
			// 		],
			// 	},
			// });

			// if (existingChat) {
			// 	return res.json(existingChat);
			// }

			// Створюємо груповий чат
			const chat = await prisma.chatRoom.create({
				data: {
					name: name || `Груповий чат (${users.length + 1} учасників)`,
					createdBy: req.session.user.id, // Зберігаємо ID створювача тільки для групових чатів
					users: {
						connect: allUserIds.map((id) => ({ id })),
					},
				},
				include: {
					users: {
						select: {
							id: true,
							name: true,
							email: true,
						},
					},
				},
			});

			// Повідомляємо всіх учасників чату про створення нового чату
			chat.users.forEach((user) => {
				console.log(`Новий груповий чат створено для користувача: ${user.id}`);
			});

			// Повідомляємо всіх клієнтів про оновлення кількості непрочитаних повідомлень
			const unreadUpdateData = JSON.stringify({
				type: "unread_update",
			});

			unreadClients.forEach((client: WebSocket) => {
				if (client.readyState === client.OPEN) {
					client.send(unreadUpdateData);
				}
			});

			res.json(chat);
		} else {
			return res.status(400).json({ error: "Невідомий тип чату" });
		}
	} catch (error) {
		console.error("Помилка створення чату:", error);
		res.status(500).json({ error: "Помилка створення чату" });
	}
};

export const deleteChat: RequestHandler = async (req, res) => {
	if (!req.session.user) {
		return res.status(401).json({ error: "Необхідна авторизація" });
	}

	const chatId = req.params.id;

	try {
		const chat = await prisma.chatRoom.findFirst({
			where: {
				id: chatId,
				users: {
					some: {
						id: req.session.user.id,
					},
				},
			},
		});

		if (!chat) {
			return res.status(404).json({ error: "Чат не знайдено" });
		}

		await prisma.chatRoom.delete({
			where: { id: chat.id },
		});

		// Повідомляємо всіх клієнтів про видалення чату
		if (chatClients[chatId]) {
			const deleteData = JSON.stringify({
				type: "chat_deleted",
				chatId,
			});

			chatClients[chatId].forEach((client: WebSocket) => {
				if (client.readyState === client.OPEN) {
					client.send(deleteData);
				}
			});
		}

		// Повідомляємо всіх клієнтів про оновлення кількості непрочитаних повідомлень
		const unreadUpdateData = JSON.stringify({
			type: "unread_update",
		});

		unreadClients.forEach((client: WebSocket) => {
			if (client.readyState === client.OPEN) {
				client.send(unreadUpdateData);
			}
		});

		res.json({ message: "Чат видалено" });
	} catch (error) {
		console.error("Помилка при видаленні чату:", error);
		res.status(500).json({ error: "Помилка при видаленні чату" });
	}
};

export const markMessageAsRead: RequestHandler = async (req, res, next) => {
	const messageId = req.params.id;
	const user = req.session.user;

	if (!user) {
		return res.status(401).json({ error: "Необхідна авторизація" });
	}

	try {
		// Перевіряємо, чи повідомлення існує та чи користувач має доступ до чату
		const message = await prisma.message.findFirst({
			where: {
				id: messageId,
				chatRoom: {
					users: {
						some: {
							id: user.id,
						},
					},
				},
			},
			include: {
				chatRoom: true,
				sender: true,
			},
		});

		if (!message) {
			return res.status(404).json({ error: "Повідомлення не знайдено" });
		}

		// Автор не може позначити своє повідомлення як прочитане
		if (message.senderId === user.id) {
			return res.json(message);
		}

		// Позначаємо повідомлення як переглянуте
		const updatedMessage = await prisma.message.update({
			where: { id: messageId },
			data: {
				isRead: true,
				readAt: new Date(),
			},
			include: {
				sender: true,
			},
		});

		// Повідомляємо всіх клієнтів про оновлення
		const chatId = message.chatRoomId;
		if (chatClients[chatId]) {
			const updateData = JSON.stringify({
				type: "message_read",
				messageId,
				message: updatedMessage,
			});

			console.log(`📤 Відправляю message_read для чату ${chatId}:`, updateData);
			console.log(
				`👥 Клієнтів підключено до чату ${chatId}: ${chatClients[chatId].length}`
			);

			chatClients[chatId].forEach((client: WebSocket) => {
				if (client.readyState === client.OPEN) {
					client.send(updateData);
				}
			});
		} else {
			console.log(`⚠️ Немає підключених клієнтів до чату ${chatId}`);
		}

		// Повідомляємо всіх клієнтів про оновлення кількості непрочитаних повідомлень
		const unreadUpdateData = JSON.stringify({
			type: "unread_update",
		});

		unreadClients.forEach((client: WebSocket) => {
			if (client.readyState === client.OPEN) {
				client.send(unreadUpdateData);
			}
		});

		res.json(updatedMessage);
	} catch (error) {
		console.error(
			"Помилка при позначенні повідомлення як переглянутого:",
			error
		);
		res.status(500).json({ error: "Помилка при оновленні повідомлення" });
	}
};

export const markAllMessagesAsRead: RequestHandler = async (req, res, next) => {
	const chatId = req.params.chatId;
	const user = req.session.user;

	if (!user) {
		return res.status(401).json({ error: "Необхідна авторизація" });
	}

	try {
		// Перевіряємо доступ до чату
		const chat = await prisma.chatRoom.findFirst({
			where: {
				id: chatId,
				users: {
					some: {
						id: user.id,
					},
				},
			},
		});

		if (!chat) {
			return res.status(403).json({ error: "Немає доступу до цього чату" });
		}

		// Позначаємо всі повідомлення в чаті як переглянуті (тільки чужі)
		const result = await prisma.message.updateMany({
			where: {
				chatRoomId: chatId,
				senderId: { not: user.id }, // Тільки повідомлення від інших користувачів
				isRead: false,
			},
			data: {
				isRead: true,
				readAt: new Date(),
			},
		});

		// Отримуємо оновлені повідомлення для передачі в WebSocket
		const updatedMessages = await prisma.message.findMany({
			where: {
				chatRoomId: chatId,
				senderId: { not: user.id },
				isRead: true,
			},
			include: {
				sender: true,
			},
			orderBy: {
				readAt: "desc",
			},
			take: result.count,
		});

		// Повідомляємо всіх клієнтів про оновлення
		if (chatClients[chatId]) {
			const updateData = JSON.stringify({
				type: "all_messages_read",
				chatId,
				userId: user.id,
				updatedMessages: updatedMessages,
			});

			console.log(
				`📤 Відправляю all_messages_read для чату ${chatId}:`,
				updateData
			);
			console.log(
				`👥 Клієнтів підключено до чату ${chatId}: ${chatClients[chatId].length}`
			);

			chatClients[chatId].forEach((client: WebSocket) => {
				if (client.readyState === client.OPEN) {
					client.send(updateData);
				}
			});
		} else {
			console.log(`⚠️ Немає підключених клієнтів до чату ${chatId}`);
		}

		// Повідомляємо всіх клієнтів про оновлення кількості непрочитаних повідомлень
		const unreadUpdateData = JSON.stringify({
			type: "unread_update",
		});

		unreadClients.forEach((client: WebSocket) => {
			if (client.readyState === client.OPEN) {
				client.send(unreadUpdateData);
			}
		});

		res.json({ message: "Всі повідомлення позначені як переглянуті" });
	} catch (error) {
		console.error(
			"Помилка при позначенні всіх повідомлень як переглянутих:",
			error
		);
		res.status(500).json({ error: "Помилка при оновленні повідомлень" });
	}
};

export const getUnreadCount: RequestHandler = async (req, res, next) => {
	const user = req.session.user;

	if (!user) {
		return res.status(401).json({ error: "Необхідна авторизація" });
	}

	try {
		const unreadCounts = await prisma.chatRoom.findMany({
			where: {
				users: {
					some: {
						id: user.id,
					},
				},
			},
			include: {
				_count: {
					select: {
						messages: {
							where: {
								senderId: { not: user.id },
								isRead: false,
							},
						},
					},
				},
			},
		});

		const result = unreadCounts.map((chat) => ({
			chatId: chat.id,
			unreadCount: chat._count.messages,
		}));

		res.json(result);
	} catch (error) {
		console.error(
			"Помилка при отриманні кількості непереглянутих повідомлень:",
			error
		);
		res.status(500).json({ error: "Помилка при отриманні даних" });
	}
};

export const leaveGroupChat: RequestHandler = async (req, res) => {
	if (!req.session.user) {
		return res.status(401).json({ error: "Необхідна авторизація" });
	}

	const chatId = req.params.id;

	try {
		const chat = await prisma.chatRoom.findFirst({
			where: {
				id: chatId,
				users: {
					some: {
						id: req.session.user.id,
					},
				},
			},
			include: {
				users: true,
			},
		});

		if (!chat) {
			return res.status(404).json({ error: "Чат не знайдено" });
		}

		// Перевіряємо, чи це груповий чат
		if (!chat.name) {
			return res
				.status(400)
				.json({ error: "Можна вийти тільки з групового чату" });
		}

		// Перевіряємо, чи користувач не є створювачем чату
		if (chat.createdBy === req.session.user.id) {
			return res.status(400).json({
				error:
					"Власник чату не може з нього вийти. Використайте видалення чату.",
			});
		}

		// Видаляємо користувача з чату
		await prisma.chatRoom.update({
			where: { id: chatId },
			data: {
				users: {
					disconnect: { id: req.session.user.id },
				},
			},
		});

		// Повідомляємо всіх клієнтів про оновлення кількості непрочитаних повідомлень
		const unreadUpdateData = JSON.stringify({
			type: "unread_update",
		});

		unreadClients.forEach((client: WebSocket) => {
			if (client.readyState === client.OPEN) {
				client.send(unreadUpdateData);
			}
		});

		res.json({ message: "Ви успішно вийшли з групового чату" });
	} catch (error) {
		console.error("Помилка при виході з групового чату:", error);
		res.status(500).json({ error: "Помилка при виході з групового чату" });
	}
};

export const updateChatName: RequestHandler = async (req, res) => {
	if (!req.session.user) {
		console.log("❌ Немає сесії користувача в updateChatName");
		return res.status(401).json({ error: "Необхідна авторизація" });
	}

	console.log("✅ Користувач авторизований:", req.session.user.id);

	const chatId = req.params.id;
	const { name } = req.body;

	if (!name || name.trim().length === 0) {
		return res.status(400).json({ error: "Назва чату не може бути порожньою" });
	}

	try {
		const chat = await prisma.chatRoom.findFirst({
			where: {
				id: chatId,
				users: {
					some: {
						id: req.session.user.id,
					},
				},
			},
		});

		if (!chat) {
			console.log("❌ Чат не знайдено або користувач не має доступу");
			return res.status(404).json({ error: "Чат не знайдено" });
		}

		console.log("✅ Чат знайдено:", chat.id, "createdBy:", chat.createdBy);

		// Перевіряємо, чи це груповий чат
		if (!chat.name) {
			return res
				.status(400)
				.json({ error: "Можна змінювати назву тільки групового чату" });
		}

		// Перевіряємо, чи користувач є створювачем чату
		if (chat.createdBy !== req.session.user.id) {
			console.log("❌ Користувач не є створювачем чату");
			return res
				.status(403)
				.json({ error: "Тільки створювач чату може змінювати його назву" });
		}

		console.log("✅ Користувач є створювачем чату, оновлюю назву");

		// Оновлюємо назву чату
		const updatedChat = await prisma.chatRoom.update({
			where: { id: chatId },
			data: { name: name.trim() },
		});

		// Повідомляємо всіх клієнтів про оновлення
		if (chatClients[chatId]) {
			const updateData = JSON.stringify({
				type: "chat_name_updated",
				chatId,
				newName: name.trim(),
			});

			chatClients[chatId].forEach((client: WebSocket) => {
				if (client.readyState === client.OPEN) {
					client.send(updateData);
				}
			});
		}

		res.json(updatedChat);
	} catch (error) {
		console.error("Помилка при оновленні назви чату:", error);
		res.status(500).json({ error: "Помилка при оновленні назви чату" });
	}
};

export const addUserToChat: RequestHandler = async (req, res) => {
	if (!req.session.user) {
		return res.status(401).json({ error: "Необхідна авторизація" });
	}

	const chatId = req.params.id;
	const { userId } = req.body;

	if (!userId) {
		return res.status(400).json({ error: "Необхідно вказати ID користувача" });
	}

	try {
		const chat = await prisma.chatRoom.findFirst({
			where: {
				id: chatId,
				users: {
					some: {
						id: req.session.user.id,
					},
				},
			},
		});

		if (!chat) {
			return res.status(404).json({ error: "Чат не знайдено" });
		}

		// Перевіряємо, чи це груповий чат
		if (!chat.name) {
			return res.status(400).json({
				error: "Можна додавати користувачів тільки до групового чату",
			});
		}

		// Перевіряємо, чи користувач є створювачем чату
		if (chat.createdBy !== req.session.user.id) {
			return res
				.status(403)
				.json({ error: "Тільки створювач чату може додавати користувачів" });
		}

		// Перевіряємо, чи користувач вже в чаті
		const existingUser = await prisma.chatRoom.findFirst({
			where: {
				id: chatId,
				users: {
					some: {
						id: userId,
					},
				},
			},
		});

		if (existingUser) {
			return res
				.status(400)
				.json({ error: "Користувач вже є учасником цього чату" });
		}

		// Додаємо користувача до чату
		const updatedChat = await prisma.chatRoom.update({
			where: { id: chatId },
			data: {
				users: {
					connect: { id: userId },
				},
			},
			include: {
				users: true,
			},
		});

		// Повідомляємо всіх клієнтів про оновлення
		if (chatClients[chatId]) {
			const updateData = JSON.stringify({
				type: "user_added_to_chat",
				chatId,
				userId,
			});

			chatClients[chatId].forEach((client: WebSocket) => {
				if (client.readyState === client.OPEN) {
					client.send(updateData);
				}
			});
		}

		res.json(updatedChat);
	} catch (error) {
		console.error("Помилка при додаванні користувача до чату:", error);
		res
			.status(500)
			.json({ error: "Помилка при додаванні користувача до чату" });
	}
};

export const removeUserFromChat: RequestHandler = async (req, res) => {
	if (!req.session.user) {
		return res.status(401).json({ error: "Необхідна авторизація" });
	}

	const chatId = req.params.id;
	const userId = req.params.userId;

	try {
		const chat = await prisma.chatRoom.findFirst({
			where: {
				id: chatId,
				users: {
					some: {
						id: req.session.user.id,
					},
				},
			},
		});

		if (!chat) {
			return res.status(404).json({ error: "Чат не знайдено" });
		}

		// Перевіряємо, чи це груповий чат
		if (!chat.name) {
			return res
				.status(400)
				.json({ error: "Можна видаляти користувачів тільки з групового чату" });
		}

		// Перевіряємо, чи користувач є створювачем чату
		if (chat.createdBy !== req.session.user.id) {
			return res
				.status(403)
				.json({ error: "Тільки створювач чату може видаляти користувачів" });
		}

		// Перевіряємо, чи не намагаємося видалити створювача
		if (chat.createdBy === userId) {
			return res
				.status(400)
				.json({ error: "Не можна видалити створювача чату" });
		}

		// Видаляємо користувача з чату
		const updatedChat = await prisma.chatRoom.update({
			where: { id: chatId },
			data: {
				users: {
					disconnect: { id: userId },
				},
			},
			include: {
				users: true,
			},
		});

		// Повідомляємо всіх клієнтів про оновлення
		if (chatClients[chatId]) {
			const updateData = JSON.stringify({
				type: "user_removed_from_chat",
				chatId,
				userId,
			});

			chatClients[chatId].forEach((client: WebSocket) => {
				if (client.readyState === client.OPEN) {
					client.send(updateData);
				}
			});
		}

		res.json(updatedChat);
	} catch (error) {
		console.error("Помилка при видаленні користувача з чату:", error);
		res.status(500).json({ error: "Помилка при видаленні користувача з чату" });
	}
};
