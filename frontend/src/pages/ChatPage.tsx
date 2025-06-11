import { useEffect, useRef, useState } from "react";
import { useAuth } from "../components/AuthProvider";
import { useSearchParams } from "react-router-dom";
import {
	getChatById,
	getChatsByUser,
	updateOnlineStatus,
	deleteChat,
	getUnreadCount,
} from "../network/chat_api";
import ChatSidebar from "../components/chat/ChatSidebar";
import ChatHeader from "../components/chat/ChatHeader";
import ChatMessages from "../components/chat/ChatMessages";
import ChatInput from "../components/chat/ChatInput";
import ChatSearch from "../components/chat/ChatSearch";
import EmptyChat from "../components/chat/EmptyChat";
import { Message, Chat } from "../types/chat";

export default function ChatPage() {
	const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
	const [chats, setChats] = useState<Chat[]>([]);
	const [message, setMessage] = useState<string>("");
	const [isTyping, setIsTyping] = useState(false);
	const [typingUser, setTypingUser] = useState<string>("");
	const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
	const [isSearchOpen, setIsSearchOpen] = useState(false);
	const [searchResults, setSearchResults] = useState<Message[]>([]);
	const [searchQuery, setSearchQuery] = useState("");
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
	const { user } = useAuth();
	const [searchParams] = useSearchParams();
	const wsRef = useRef<WebSocket | null>(null);
	const unreadWsRef = useRef<WebSocket | null>(null);
	const [unreadCounts, setUnreadCounts] = useState<
		{ chatId: string; unreadCount: number }[]
	>([]);

	const updateChats = async () => {
		try {
			const updatedChats = await getChatsByUser();
			// Отримуємо кількість непрочитаних повідомлень
			const unreadData = await getUnreadCount();
			setUnreadCounts(unreadData);

			// Додатково сортуємо на frontend для надійності
			const sortedChats = updatedChats.sort((a: Chat, b: Chat) => {
				// Спочатку сортуємо за наявністю непрочитаних повідомлень
				const aUnreadCount =
					unreadData.find(
						(c: { chatId: string; unreadCount: number }) => c.chatId === a.id
					)?.unreadCount || 0;
				const bUnreadCount =
					unreadData.find(
						(c: { chatId: string; unreadCount: number }) => c.chatId === b.id
					)?.unreadCount || 0;

				if (aUnreadCount > 0 && bUnreadCount === 0) return -1;
				if (aUnreadCount === 0 && bUnreadCount > 0) return 1;

				// Якщо кількість непрочитаних однакова, сортуємо за актуальністю
				const aLastMessage = a.messages?.[0];
				const bLastMessage = b.messages?.[0];

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

			console.log("ChatPage updateChats:", {
				chatsCount: sortedChats.length,
				chats: sortedChats,
				unreadData,
			});

			setChats(sortedChats);
		} catch (err) {
			console.error("Помилка при оновленні списку чатів:", err);
		}
	};

	useEffect(() => {
		updateChats();
	}, [user]);

	// Логування для діагностики
	useEffect(() => {
		console.log("ChatPage render:", {
			chatsCount: chats.length,
			selectedChat: selectedChat?.id,
			isMobileMenuOpen,
			user: user?.id,
		});
	}, [chats, selectedChat, isMobileMenuOpen, user]);

	// Автоматично відкриваємо чат з URL параметра
	useEffect(() => {
		const chatId = searchParams.get("chat");
		if (chatId && chats.length > 0) {
			openChat(chatId);
		}
	}, [searchParams, chats]);

	// Автоматично закриваємо мобільне меню при переході на великий екран
	useEffect(() => {
		const handleResize = () => {
			if (window.innerWidth >= 768 && isMobileMenuOpen) {
				setIsMobileMenuOpen(false);
			}
		};

		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, [isMobileMenuOpen]);

	// WebSocket для оновлення кількості непрочитаних повідомлень
	useEffect(() => {
		if (!user) return;

		if (unreadWsRef.current) {
			unreadWsRef.current.close();
		}

		const ws = new WebSocket(`${import.meta.env.VITE_WSHOST}/api/chat/unread`);
		unreadWsRef.current = ws;

		ws.onopen = () => {
			console.log("🔌 Підключено до WebSocket для непрочитаних повідомлень");
		};

		ws.onmessage = (event) => {
			const data = JSON.parse(event.data);

			// Оновлюємо список чатів при отриманні повідомлень про непрочитані
			if (data.type === "unread_update") {
				updateChats();
			}
		};

		ws.onclose = () => {
			console.log("❌ Зʼєднання для непрочитаних повідомлень закрите");
		};

		return () => {
			ws.close();
		};
	}, [user]);

	useEffect(() => {
		if (!selectedChat) return;

		if (wsRef.current) {
			wsRef.current.close();
		}

		const ws = new WebSocket(
			`${import.meta.env.VITE_WSHOST}/api/chat/${selectedChat.id}`
		);
		wsRef.current = ws;

		ws.onopen = () => {
			console.log("🔌 Підключено до WebSocket");
		};

		ws.onmessage = (event) => {
			const data = JSON.parse(event.data);
			console.log("🔔 Отримано WebSocket повідомлення:", data);

			if (data.type === "new_message") {
				const newMsg: Message = data.message;
				setSelectedChat((prev) => {
					if (!prev) return prev;
					return {
						...prev,
						messages: [...(prev.messages || []), newMsg],
					};
				});
				updateChats();
			} else if (data.type === "delete_message") {
				setSelectedChat((prev) => {
					if (!prev) return prev;
					return {
						...prev,
						messages: (prev.messages || []).filter(
							(msg) => msg.id !== data.messageId
						),
					};
				});
				updateChats();
			} else if (data.type === "message_read") {
				console.log("📖 Отримано message_read:", data);
				setSelectedChat((prev) => {
					if (!prev) return prev;
					return {
						...prev,
						messages: (prev.messages || []).map((msg) =>
							msg.id === data.messageId
								? {
										...msg,
										isRead: true,
										readAt: data.message?.readAt || new Date(),
								  }
								: msg
						),
					};
				});
				updateChats();
			} else if (data.type === "all_messages_read") {
				console.log("📖 Отримано all_messages_read:", data);
				setSelectedChat((prev) => {
					if (!prev) return prev;
					return {
						...prev,
						messages: (prev.messages || []).map((msg) => {
							// Шукаємо оновлене повідомлення в списку
							const updatedMessage = data.updatedMessages?.find(
								(updated: any) => updated.id === msg.id
							);

							if (updatedMessage) {
								return {
									...msg,
									isRead: true,
									readAt: updatedMessage.readAt,
								};
							}

							return msg;
						}),
					};
				});
				updateChats();
			} else if (data.type === "chat_deleted") {
				if (selectedChat?.id === data.chatId) {
					setSelectedChat(null);
				}
				updateChats();
			} else if (data.type === "typing_start") {
				console.log("📝 Отримано typing_start від:", data.userName);
				if (data.userId !== user?.id) {
					setIsTyping(true);
					setTypingUser(data.userName);
				}
			} else if (data.type === "typing_stop") {
				console.log("📝 Отримано typing_stop від:", data.userId);
				if (data.userId !== user?.id) {
					setIsTyping(false);
					setTypingUser("");
				}
			} else if (data.type === "user_status_update") {
				console.log("👤 Отримано user_status_update:", data);
				// Оновлюємо список чатів для відображення зміни онлайн статусу
				updateChats();
			} else if (data.type === "chat_name_updated") {
				console.log("📝 Отримано chat_name_updated:", data);
				// Оновлюємо поточний чат, якщо це він
				if (selectedChat?.id === data.chatId) {
					setSelectedChat((prev) => {
						if (!prev) return prev;
						return {
							...prev,
							name: data.newName,
						};
					});
				}
				// Оновлюємо список чатів
				updateChats();
			} else if (data.type === "user_added_to_chat") {
				console.log("➕ Отримано user_added_to_chat:", data);
				// Оновлюємо поточний чат, якщо це він
				if (selectedChat?.id === data.chatId) {
					handleChatUpdate();
				}
			} else if (data.type === "user_removed_from_chat") {
				console.log("➖ Отримано user_removed_from_chat:", data);
				// Оновлюємо поточний чат, якщо це він
				if (selectedChat?.id === data.chatId) {
					handleChatUpdate();
				}
			}
		};

		ws.onclose = () => {
			console.log("❌ Зʼєднання закрите");
			setIsTyping(false);
			setTypingUser("");
		};

		return () => {
			ws.close();
		};
	}, [selectedChat]);

	const handleSendMessage = (message: string, replyToId?: string) => {
		if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

		wsRef.current.send(
			JSON.stringify({
				type: "message",
				content: message,
				replyToId: replyToId,
			})
		);

		setIsTyping(false);
		setTypingUser("");
		setReplyToMessage(null); // Скидаємо відповідь після відправки
	};

	const handleReplyToMessage = (message: Message) => {
		setReplyToMessage(message);
	};

	const handleCancelReply = () => {
		setReplyToMessage(null);
	};

	const handleTypingStart = () => {
		if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

		console.log("🔄 Відправляю typing_start");
		wsRef.current.send(
			JSON.stringify({
				type: "typing_start",
			})
		);
	};

	const handleTypingStop = () => {
		if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

		console.log("🔄 Відправляю typing_stop");
		wsRef.current.send(
			JSON.stringify({
				type: "typing_stop",
			})
		);
	};

	const openChat = async (id: string) => {
		if (id === "home") {
			setSelectedChat(null);
			setIsMobileMenuOpen(false);
			return;
		}
		try {
			const chat = await getChatById(id);
			setSelectedChat(chat);
			setIsTyping(false);
			setTypingUser("");
			setIsMobileMenuOpen(false);
		} catch (err) {
			console.error("Не вдалося завантажити чат", err);
		}
	};

	const handleMessageDelete = (messageId: string) => {
		setSelectedChat((prev) => {
			if (!prev) return prev;
			return {
				...prev,
				messages: (prev.messages || []).filter((msg) => msg.id !== messageId),
			};
		});
	};

	const handleUnreadCountUpdate = () => {
		updateChats();
	};

	const handleDeleteChat = async (chatId: string) => {
		try {
			await deleteChat(chatId);
			// Якщо видаляємо поточний чат, очищаємо його
			if (selectedChat?.id === chatId) {
				setSelectedChat(null);
			}
			// Оновлюємо список чатів
			updateChats();
		} catch (error) {
			console.error("Помилка при видаленні чату:", error);
		}
	};

	const handleChatUpdate = async () => {
		// Оновлюємо поточний чат, якщо він відкритий
		if (selectedChat) {
			try {
				const updatedChat = await getChatById(selectedChat.id);
				setSelectedChat(updatedChat);
			} catch (error) {
				console.error("Помилка при оновленні чату:", error);
				// Якщо чат не знайдено (користувач вийшов), перенаправляємо на головну
				if (error instanceof Error && error.message.includes("403")) {
					setSelectedChat(null);
				}
			}
		}
		// Оновлюємо список чатів
		updateChats();
	};

	// Оновлюємо онлайн статус при завантаженні сторінки
	useEffect(() => {
		if (user) {
			// Позначаємо користувача як онлайн
			updateOnlineStatus(true);

			// Позначаємо користувача як офлайн при закритті сторінки
			const handleBeforeUnload = () => {
				updateOnlineStatus(false);
			};

			window.addEventListener("beforeunload", handleBeforeUnload);

			return () => {
				window.removeEventListener("beforeunload", handleBeforeUnload);
				updateOnlineStatus(false);
			};
		}
	}, [user]);

	// Гаряча клавіша для пошуку (Ctrl+F)
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.ctrlKey || e.metaKey) && e.key === "f") {
				e.preventDefault();
				if (selectedChat) {
					handleSearchClick();
				}
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [selectedChat]);

	const handleSearchClick = () => {
		setIsSearchOpen(true);
	};

	const handleSearchClose = () => {
		setIsSearchOpen(false);
		setSearchResults([]);
		setSearchQuery("");
	};

	const handleSearch = (query: string) => {
		setSearchQuery(query);

		if (!selectedChat || !query.trim()) {
			setSearchResults([]);
			return;
		}

		const messages = selectedChat.messages || [];
		const filteredMessages = messages.filter((msg) => {
			const contentMatch = msg.content
				.toLowerCase()
				.includes(query.toLowerCase());
			const senderMatch = msg.sender.name
				.toLowerCase()
				.includes(query.toLowerCase());
			return contentMatch || senderMatch;
		});

		setSearchResults(filteredMessages);
	};

	const handleSearchResultClick = (messageId: string) => {
		// Знаходимо повідомлення в чаті
		const messageElement = document.querySelector(
			`[data-message-id="${messageId}"]`
		);
		if (messageElement) {
			// Прокручуємо до повідомлення
			messageElement.scrollIntoView({
				behavior: "smooth",
				block: "center",
			});

			// Додаємо підсвічування
			messageElement.classList.add("search-highlight");
			setTimeout(() => {
				messageElement.classList.remove("search-highlight");
			}, 2000);
		}
	};

	return (
		<div className="flex h-screen w-screen bg-[#17212B]">
			{/* Мобільна кнопка меню - тільки на малих екранах */}
			<div className="md:hidden fixed top-4 left-4 z-50">
				<button
					onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
					className="w-10 h-10 rounded-full bg-[#2AABEE] hover:bg-[#1E8BC3] flex items-center justify-center transition-all duration-200 text-white"
				>
					{isMobileMenuOpen ? "✕" : "☰"}
				</button>
			</div>

			{/* Sidebar для мобільних - з overlay */}
			<div className="md:hidden">
				<div
					className={`${
						isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
					} transition-transform duration-300 ease-in-out fixed inset-y-0 left-0 z-40`}
				>
					<ChatSidebar
						chats={chats}
						selectedChat={selectedChat}
						onChatSelect={openChat}
						onUnreadCountUpdate={handleUnreadCountUpdate}
					/>
				</div>

				{/* Overlay для мобільного меню */}
				{isMobileMenuOpen && (
					<div
						className="fixed inset-0 bg-black bg-opacity-50 z-30"
						onClick={() => setIsMobileMenuOpen(false)}
					/>
				)}
			</div>

			{/* Sidebar для десктопу - завжди видимий */}
			<div className="hidden md:block">
				<ChatSidebar
					chats={chats}
					selectedChat={selectedChat}
					onChatSelect={openChat}
					onUnreadCountUpdate={handleUnreadCountUpdate}
				/>
			</div>

			{/* Основний контент */}
			<div className="flex-1 h-screen flex flex-col overflow-hidden bg-[#0E1621]">
				{selectedChat ? (
					<>
						<ChatHeader
							chat={selectedChat}
							onDeleteChat={handleDeleteChat}
							onChatUpdate={handleChatUpdate}
							onSearchClick={handleSearchClick}
							onMobileMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
						/>
						<ChatMessages
							messages={selectedChat.messages || []}
							currentUserId={user?.id || ""}
							chatId={selectedChat.id}
							onMessageDelete={handleMessageDelete}
							onReplyToMessage={handleReplyToMessage}
							isTyping={isTyping}
							typingUser={typingUser}
							searchQuery={searchQuery}
						/>
						<ChatInput
							onSendMessage={handleSendMessage}
							onTypingStart={handleTypingStart}
							onTypingStop={handleTypingStop}
							replyToMessage={replyToMessage}
							onCancelReply={handleCancelReply}
						/>
					</>
				) : (
					<EmptyChat />
				)}
			</div>

			{/* Модальне вікно пошуку */}
			<ChatSearch
				isOpen={isSearchOpen}
				onClose={handleSearchClose}
				onSearch={handleSearch}
				searchResults={searchResults}
				onResultClick={handleSearchResultClick}
			/>
		</div>
	);
}
