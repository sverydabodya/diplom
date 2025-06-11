import { useAuth } from "../AuthProvider";
import { useNavigate } from "react-router-dom";
import { signOut } from "../../network/auth_api";
import { useState, useRef, useEffect } from "react";
import { deleteChat, getUnreadCount } from "../../network/chat_api";
import CreateChatModal from "./CreateChatModal";

interface Chat {
	id: string;
	name?: string;
	messages?: any[];
	users: any[];
	createdAt: Date;
	createdBy?: string;
}

interface UnreadCount {
	chatId: string;
	unreadCount: number;
}

interface ChatSidebarProps {
	chats: Chat[];
	selectedChat: Chat | null;
	onChatSelect: (id: string) => void;
	onUnreadCountUpdate?: () => void;
}

function LoadingSpinner() {
	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
			<div className="w-16 h-16 border-4 border-[#0984e3] border-t-transparent rounded-full animate-spin" />
		</div>
	);
}

export default function ChatSidebar({
	chats,
	selectedChat,
	onChatSelect,
	onUnreadCountUpdate,
}: ChatSidebarProps) {
	const { user, setUser } = useAuth();
	const navigate = useNavigate();
	const [isLoggingOut, setIsLoggingOut] = useState(false);
	const [isDeletingChat, setIsDeletingChat] = useState<string | null>(null);
	const [sidebarWidth, setSidebarWidth] = useState(320);
	const [unreadCounts, setUnreadCounts] = useState<UnreadCount[]>([]);
	const [isCreateChatModalOpen, setIsCreateChatModalOpen] = useState(false);
	const isResizing = useRef(false);
	const sidebarRef = useRef<HTMLDivElement>(null);
	const startX = useRef(0);
	const startWidth = useRef(0);

	// Логування для перевірки даних
	console.log("ChatSidebar render:", {
		chatsCount: chats.length,
		chats: chats,
		selectedChat: selectedChat?.id,
		user: user?.id,
	});

	useEffect(() => {
		const fetchUnreadCounts = async () => {
			try {
				const counts = await getUnreadCount();
				setUnreadCounts(counts);
			} catch (error) {
				console.error(
					"Помилка при отриманні кількості непереглянутих повідомлень:",
					error
				);
			}
		};

		fetchUnreadCounts();
		const interval = setInterval(fetchUnreadCounts, 30000);
		return () => clearInterval(interval);
	}, []);

	// Оновлюємо кількість непрочитаних повідомлень при зміні чатів
	useEffect(() => {
		if (onUnreadCountUpdate) {
			onUnreadCountUpdate();
		}
	}, [chats, onUnreadCountUpdate]);

	// WebSocket підключення для отримання оновлень про непрочитані повідомлення
	useEffect(() => {
		if (!user) return;

		const ws = new WebSocket(
			`${import.meta.env.VITE_HOST.replace("http", "ws")}/api/chat/unread/ws`
		);

		ws.onopen = () => {};

		ws.onmessage = (event) => {
			const data = JSON.parse(event.data);
			console.log("📊 Отримано повідомлення про непрочитані в сайдбарі:", data);

			if (data.type === "unread_update") {
				console.log("🔄 Оновлюю кількість непрочитаних повідомлень в сайдбарі");
				const fetchUnreadCounts = async () => {
					try {
						const counts = await getUnreadCount();
						setUnreadCounts(counts);
						console.log(
							"✅ Кількість непрочитаних оновлено в сайдбарі:",
							counts
						);
					} catch (error) {
						console.error(
							"Помилка при оновленні кількості непрочитаних:",
							error
						);
					}
				};
				fetchUnreadCounts();
			} else if (data.type === "user_status_update") {
				console.log("👤 Отримано user_status_update в сайдбарі:", data);
				// Оновлюємо список чатів для відображення зміни онлайн статусу
				if (onUnreadCountUpdate) {
					onUnreadCountUpdate();
				}
			}
		};

		ws.onclose = () => {};

		return () => {
			ws.close();
		};
	}, [user, onUnreadCountUpdate]);

	useEffect(() => {
		const handleMouseMove = (e: MouseEvent) => {
			if (!isResizing.current) return;

			const deltaX = e.clientX - startX.current;
			const newWidth = startWidth.current + deltaX;

			if (newWidth >= 200 && newWidth <= 600) {
				setSidebarWidth(newWidth);
			}
		};

		const handleMouseUp = () => {
			isResizing.current = false;
			document.body.style.cursor = "default";
		};

		document.addEventListener("mousemove", handleMouseMove);
		document.addEventListener("mouseup", handleMouseUp);

		return () => {
			document.removeEventListener("mousemove", handleMouseMove);
			document.removeEventListener("mouseup", handleMouseUp);
		};
	}, []);

	const handleMouseDown = (e: React.MouseEvent) => {
		isResizing.current = true;
		startX.current = e.clientX;
		startWidth.current = sidebarWidth;
		document.body.style.cursor = "col-resize";
	};

	const getLastMessage = (chat: Chat) => {
		if (!chat.messages || chat.messages.length === 0) {
			return "Немає повідомлень";
		}

		// Беремо перше повідомлення (оскільки вони вже відсортовані за спаданням)
		const lastMessage = chat.messages[0];
		return lastMessage.content || "Немає повідомлень";
	};

	// const getLastMessageTime = (chat: Chat) => {
	// 	if (!chat.createdAt) return "";
	// 	const now = new Date();
	// 	const diff = Math.floor((now.getTime() - chat.createdAt.getTime()) / 1000);

	// 	if (diff < 60) {
	// 		return "Тільки що";
	// 	} else if (diff < 3600) {
	// 		return `${Math.floor(diff / 60)} хв. тому`;
	// 	} else if (diff < 86400) {
	// 		return `${Math.floor(diff / 3600)} год. тому`;
	// 	} else {
	// 		return chat.createdAt.toLocaleDateString();
	// 	}
	// };

	const handleLogout = async () => {
		setIsLoggingOut(true);
		try {
			await signOut();
			setUser(null);
			navigate("/login", { replace: true });
		} catch (error) {
			console.error("Помилка при виході:", error);
			setUser(null);
			navigate("/login", { replace: true });
		} finally {
			setIsLoggingOut(false);
		}
	};

	const handleDeleteChat = async (chatId: string, e: React.MouseEvent) => {
		e.stopPropagation();
		if (!window.confirm("Ви впевнені, що хочете видалити цей чат?")) {
			return;
		}

		setIsDeletingChat(chatId);
		try {
			await deleteChat(chatId);
			if (selectedChat?.id === chatId) {
				onChatSelect("home");
			}
		} catch (error) {
			console.error("Помилка при видаленні чату:", error);
			alert("Помилка при видаленні чату");
		} finally {
			setIsDeletingChat(null);
		}
	};

	const getUnreadCountForChat = (chatId: string) => {
		const count = unreadCounts.find((c) => c.chatId === chatId);
		return count ? count.unreadCount : 0;
	};

	const handleChatCreated = () => {
		// Викликаємо onUnreadCountUpdate для оновлення списку чатів
		if (onUnreadCountUpdate) {
			onUnreadCountUpdate();
		}
	};

	// Функція для визначення, чи є поточний користувач створювачем групового чату
	const isCreator = (chat: Chat) => {
		if (!chat.name) return false; // Не груповий чат

		// Використовуємо поле createdBy для групових чатів
		return chat.createdBy === user?.id;
	};

	return (
		<>
			{isLoggingOut && <LoadingSpinner />}
			<div
				ref={sidebarRef}
				style={{ width: `${sidebarWidth}px` }}
				className="h-screen bg-[#17212B] border-r border-[#2F3B4A] flex flex-col relative w-full md:w-auto md:min-w-[320px] md:max-w-[400px]"
			>
				<div
					onMouseDown={handleMouseDown}
					className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-[#2AABEE] hover:opacity-50 transition-colors hidden md:block"
				/>
				<div className="flex items-center justify-between p-4 border-b border-[#2F3B4A] flex-shrink-0">
					<div className="flex items-center space-x-3">
						<button
							onClick={() => onChatSelect("home")}
							className="w-10 h-10 rounded-full bg-[#242F3D] hover:bg-[#2F3B4A] flex items-center justify-center transition-all duration-200"
						>
							домів
						</button>
						<h2 className="text-xl font-semibold text-white">Чати</h2>
					</div>
					<div className="flex space-x-2">
						<button
							onClick={() => setIsCreateChatModalOpen(true)}
							className="w-10 h-10 rounded-full bg-[#2AABEE] hover:bg-[#1E8BC3] flex items-center justify-center transition-all duration-200"
							title="Створити чат"
						>
							+
						</button>
						<button
							onClick={() => navigate("/profile")}
							className="w-10 h-10 rounded-full bg-[#242F3D] hover:bg-[#2F3B4A] flex items-center justify-center transition-all duration-200"
						>
							проф
						</button>
						<button
							onClick={handleLogout}
							disabled={isLoggingOut}
							className={`w-10 h-10 rounded-full bg-[#242F3D] hover:bg-[#2F3B4A] flex items-center justify-center transition-all duration-200 ${
								isLoggingOut ? "opacity-50 cursor-not-allowed" : ""
							}`}
						>
							{isLoggingOut ? (
								<div className="w-5 h-5 border-2 border-[#2AABEE] border-t-transparent rounded-full animate-spin" />
							) : (
								"вихід"
							)}
						</button>
					</div>
				</div>

				<div className="flex-1 overflow-y-auto">
					<div className="p-2 space-y-1">
						{chats.map((chat) => {
							const unreadCount = getUnreadCountForChat(chat.id);
							const hasUnread = unreadCount > 0;
							return (
								<div
									key={chat.id}
									className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${
										selectedChat?.id === chat.id
											? "bg-[#2AABEE] text-white"
											: hasUnread
											? "bg-[#1A2332] hover:bg-[#2F3B4A] text-[#B8C5D1] border-l-4 border-[#2AABEE]"
											: "bg-[#242F3D] hover:bg-[#2F3B4A] text-[#B8C5D1]"
									}`}
									onClick={() => onChatSelect(chat.id)}
								>
									<div className="flex items-center space-x-3">
										<div className="relative">
											<div className="w-12 h-12 rounded-full bg-[#2AABEE] flex items-center justify-center">
												<span className="text-white text-lg font-medium">
													{chat.name
														? chat.name.charAt(0).toUpperCase()
														: chat.users
																.find((u: any) => u.id !== user?.id)
																?.name?.charAt(0)
																.toUpperCase() || "Ч"}
												</span>
											</div>
											{unreadCount > 0 && (
												<div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
													{unreadCount > 99 ? "99+" : unreadCount}
												</div>
											)}
										</div>
										<div className="flex-1 min-w-0">
											<div className="flex items-center justify-between">
												<p
													className={`truncate ${
														selectedChat?.id === chat.id
															? "text-white"
															: hasUnread
															? "text-white font-bold"
															: "text-white"
													}`}
												>
													{chat.name
														? chat.name
														: chat.users.find((u: any) => u.id !== user?.id)
																?.name}
												</p>
												<span
													className={`text-xs ${
														selectedChat?.id === chat.id
															? "text-blue-100"
															: hasUnread
															? "text-[#2AABEE] font-bold"
															: "text-[#7D8E98]"
													}`}
												>
													{/* {getLastMessageTime(chat)} */}
												</span>
											</div>
											<p
												className={`text-sm truncate ${
													selectedChat?.id === chat.id
														? "text-blue-100"
														: hasUnread
														? "text-[#2AABEE] font-semibold"
														: "text-[#7D8E98]"
												}`}
											>
												{getLastMessage(chat)}
											</p>
										</div>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			</div>

			<CreateChatModal
				isOpen={isCreateChatModalOpen}
				onClose={() => setIsCreateChatModalOpen(false)}
				onChatCreated={handleChatCreated}
			/>
		</>
	);
}
