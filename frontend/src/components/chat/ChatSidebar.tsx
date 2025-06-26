import { useAuth } from "../AuthProvider";
import { useNavigate } from "react-router-dom";
import { signOut } from "../../network/auth_api";
import { useState, useRef, useEffect } from "react";
import {
	deleteChat,
	getUnreadCount,
	createChat,
	searchUsers,
} from "../../network/chat_api";
import UserSearch from "./UserSearch";
import ProfileModal from "../ProfileModal";

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
	onCreateChat: (userIds: string[], name?: string) => Promise<any>;
	onDeleteChat: (chatId: string) => Promise<void>;
}

function LoadingSpinner() {
	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
			<div className="w-16 h-16 border-4 border-[#0984e3] border-t-transparent rounded-full animate-spin" />
		</div>
	);
}

function CreateChatModal({
	isOpen,
	onClose,
	onCreateChat,
	chats,
}: {
	isOpen: boolean;
	onClose: () => void;
	onCreateChat: (userIds: string[], name?: string) => Promise<any>;
	chats: Chat[];
}) {
	const [chatType, setChatType] = useState<"private" | "group">("private");
	const [groupName, setGroupName] = useState("");
	const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
	const [isCreating, setIsCreating] = useState(false);
	const [error, setError] = useState("");

	// Перевірка наявності особистого чату
	const privateChatExists =
		chatType === "private" &&
		selectedUsers.length === 1 &&
		chats.some(
			(chat) =>
				!chat.name && chat.users.some((u: any) => u.id === selectedUsers[0].id)
		);

	const handleUserSelect = (user: any) => {
		if (!selectedUsers.some((u) => u.id === user.id)) {
			setSelectedUsers((prev) => [...prev, user]);
		}
	};
	const handleUserRemove = (userId: string) => {
		setSelectedUsers((prev) => prev.filter((u) => u.id !== userId));
	};

	const handleCreate = async () => {
		setIsCreating(true);
		setError("");
		try {
			if (chatType === "private") {
				if (selectedUsers.length !== 1) {
					setError("Оберіть одного користувача для особистого чату");
					setIsCreating(false);
					return;
				}
				if (privateChatExists) {
					setError("Особистий чат з цим користувачем вже існує");
					setIsCreating(false);
					return;
				}
				await onCreateChat([selectedUsers[0].id]);
			} else {
				if (selectedUsers.length < 2) {
					setError("Оберіть хоча б двох користувачів для групового чату");
					setIsCreating(false);
					return;
				}
				if (!groupName.trim()) {
					setError("Введіть назву групи");
					setIsCreating(false);
					return;
				}
				await onCreateChat(
					selectedUsers.map((u) => u.id),
					groupName.trim()
				);
			}
			setSelectedUsers([]);
			setGroupName("");
			onClose();
		} catch (e: any) {
			setError(e.message || "Помилка створення чату");
		} finally {
			setIsCreating(false);
		}
	};

	if (!isOpen) return null;
	return (
		<div className="fixed inset-0 z-50">
			<div
				className="fixed inset-0 bg-black bg-opacity-50"
				onClick={onClose}
				style={{ zIndex: 49 }}
			/>
			<div className="modal-center" style={{ zIndex: 50, padding: "1rem" }}>
				<div
					className="bg-[#242F3D] rounded-2xl shadow-2xl border border-[#2F3B4A] w-auto max-w-xs sm:max-w-md p-10 sm:p-14 overflow-y-auto max-h-[90vh] mb-6"
					style={{ padding: "1rem" }}
				>
					<div className="flex items-center justify-between p-3 sm:p-4 border-b border-[#2F3B4A]">
						<h2 className="text-base sm:text-lg font-semibold text-white">
							Створення нового чату
						</h2>
						<button
							onClick={onClose}
							className="text-[#7D8E98] hover:text-white transition-colors duration-200"
							style={{ marginLeft: ".5rem" }}
						>
							✕
						</button>
					</div>
					<div className="mb-4 flex space-x-4 justify-center">
						<button
							className={`px-4 py-2 rounded-lg ${
								chatType === "private"
									? "bg-[#2AABEE] text-white"
									: "bg-[#242F3D] text-[#B8C5D1] border border-[#2F3B4A]"
							}`}
							onClick={() => {
								setChatType("private");
								setGroupName("");
							}}
						>
							Особистий
						</button>
						<button
							className={`px-4 py-2 rounded-lg ${
								chatType === "group"
									? "bg-[#2AABEE] text-white"
									: "bg-[#242F3D] text-[#B8C5D1] border border-[#2F3B4A]"
							}`}
							onClick={() => setChatType("group")}
							style={{ marginLeft: ".5rem" }}
						>
							Груповий
						</button>
					</div>
					{chatType === "group" && (
						<input
							type="text"
							value={groupName}
							onChange={(e) => setGroupName(e.target.value)}
							placeholder="Назва групи"
							className="w-full px-4 py-2 mb-4 rounded-lg bg-[#17212B] border border-[#2F3B4A] text-white placeholder-[#7D8E98] focus:outline-none focus:border-[#2AABEE]"
						/>
					)}
					<UserSearchForModal
						selectedUsers={selectedUsers}
						onUserSelect={handleUserSelect}
						onUserRemove={handleUserRemove}
						disabled={isCreating}
						chatType={chatType}
					/>
					{privateChatExists &&
						chatType === "private" &&
						selectedUsers.length === 1 && (
							<div className="text-red-400 text-sm text-center mb-2">
								Особистий чат з цим користувачем вже існує
							</div>
						)}
					{error && (
						<div className="mt-2 p-2 rounded bg-red-900 text-red-200 text-sm text-center">
							{error}
						</div>
					)}
					<button
						onClick={handleCreate}
						disabled={isCreating || privateChatExists}
						className={`mt-4 w-full py-2 rounded-lg bg-[#2AABEE] text-white font-semibold hover:bg-[#229ED9] transition-all duration-200 ${
							isCreating || privateChatExists
								? "opacity-50 cursor-not-allowed"
								: ""
						}`}
						style={{ marginTop: ".5rem" }}
					>
						{isCreating ? "Створення..." : "Створити"}
					</button>
				</div>
			</div>
		</div>
	);
}

function UserSearchForModal({
	selectedUsers,
	onUserSelect,
	onUserRemove,
	disabled,
	chatType,
}: {
	selectedUsers: any[];
	onUserSelect: (user: any) => void;
	onUserRemove: (userId: string) => void;
	disabled: boolean;
	chatType: "private" | "group";
}) {
	const [query, setQuery] = useState("");
	const [users, setUsers] = useState<any[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState("");
	useEffect(() => {
		if (query.trim().length < 2) {
			setUsers([]);
			return;
		}
		setIsLoading(true);
		setError("");
		searchUsers(query)
			.then((results) => {
				const filtered = results.filter(
					(u: any) => !selectedUsers.some((sel) => sel.id === u.id)
				);
				setUsers(filtered);
			})
			.catch(() => setError("Помилка пошуку користувачів"))
			.finally(() => setIsLoading(false));
	}, [query, selectedUsers]);
	return (
		<div className="mb-2">
			<input
				type="text"
				value={query}
				onChange={(e) => setQuery(e.target.value)}
				placeholder="Пошук користувачів..."
				className="w-full px-4 py-2 rounded-lg bg-[#17212B] border border-[#2F3B4A] text-white placeholder-[#7D8E98] focus:outline-none focus:border-[#2AABEE] mb-2"
				disabled={disabled}
			/>
			{isLoading && <div className="text-[#2AABEE] text-sm">Пошук...</div>}
			{error && <div className="text-red-400 text-sm">{error}</div>}
			{users.length > 0 && (
				<div className="max-h-32 overflow-y-auto mb-2">
					{users.map((user) => (
						<div
							key={user.id}
							className="flex items-center justify-between p-2 hover:bg-[#2F3B4A] rounded cursor-pointer"
							onClick={() => onUserSelect(user)}
						>
							<span className="text-white">{user.name}</span>
							<span className="text-[#2AABEE] text-xs">Додати</span>
						</div>
					))}
				</div>
			)}
			{selectedUsers.length > 0 && (
				<div className="flex flex-wrap gap-2 mt-2">
					{selectedUsers.map((user) => (
						<div
							key={user.id}
							className="flex items-center bg-[#2AABEE] px-3 py-1 rounded text-white"
						>
							<span className="mr-2">{user.name}</span>
							<button
								onClick={() => onUserRemove(user.id)}
								className="hover:text-red-200"
							>
								✕
							</button>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

export default function ChatSidebar({
	chats,
	selectedChat,
	onChatSelect,
	onCreateChat,
	onDeleteChat,
}: ChatSidebarProps) {
	const { user, setUser } = useAuth();
	const navigate = useNavigate();
	const [isLoggingOut, setIsLoggingOut] = useState(false);
	const [isDeletingChat, setIsDeletingChat] = useState<string | null>(null);
	const [sidebarWidth, setSidebarWidth] = useState(320);
	const [unreadCounts, setUnreadCounts] = useState<UnreadCount[]>([]);
	const [isCreateChatModalOpen, setIsCreateChatModalOpen] = useState(false);
	const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
	const isResizing = useRef(false);
	const sidebarRef = useRef<HTMLDivElement>(null);
	const startX = useRef(0);
	const startWidth = useRef(0);

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

	useEffect(() => {
		if (!user) return;

		const ws = new WebSocket(
			`${import.meta.env.VITE_HOST.replace("http", "ws")}/api/chat/unread/ws`
		);

		ws.onopen = () => {};

		ws.onmessage = (event) => {
			const data = JSON.parse(event.data);

			if (data.type === "unread_update") {
				const fetchUnreadCounts = async () => {
					try {
						const counts = await getUnreadCount();
						setUnreadCounts(counts);
					} catch (error) {
						console.error(
							"Помилка при оновленні кількості непрочитаних:",
							error
						);
					}
				};
				fetchUnreadCounts();
			}
		};

		ws.onclose = () => {};

		return () => {
			ws.close();
		};
	}, [user]);

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

		const lastMessage = chat.messages[0];
		return lastMessage.content || "Немає повідомлень";
	};

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
			await onDeleteChat(chatId);
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

	const isCreator = (chat: Chat) => {
		if (!chat.name) return false;

		return chat.createdBy === user?.id;
	};

	return (
		<>
			{isLoggingOut && <LoadingSpinner />}

			{isCreateChatModalOpen && (
				<CreateChatModal
					isOpen={isCreateChatModalOpen}
					onClose={() => setIsCreateChatModalOpen(false)}
					onCreateChat={onCreateChat}
					chats={chats}
				/>
			)}

			{isProfileModalOpen && (
				<ProfileModal
					isOpen={isProfileModalOpen}
					onClose={() => setIsProfileModalOpen(false)}
				/>
			)}

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
					<div className="flex items-center space-x-3 p-10"></div>
					<div className="flex">
						<button
							onClick={() => setIsCreateChatModalOpen(true)}
							className="big-header-btn w-10 h-10 bg-[#2AABEE] hover:bg-[#1E8BC3] flex items-center justify-center transition-all duration-200"
							title="Створити чат"
							style={{ marginRight: "0.2rem" }}
						>
							➕
						</button>
						<button
							onClick={() => onChatSelect("home")}
							className="w-10 h-10 rounded-full bg-[#242F3D] hover:bg-[#2F3B4A] flex items-center justify-center transition-all duration-200 big-header-btn"
							title="Повернутися на головну"
							style={{ marginRight: "0.2rem" }}
						>
							🏠
						</button>
						<button
							onClick={() => setIsProfileModalOpen(true)}
							className="w-10 h-10 rounded-full bg-[#242F3D] hover:bg-[#2F3B4A] flex items-center justify-center transition-all duration-200 big-header-btn"
							title="Мій профіль"
							style={{ marginRight: "0.2rem" }}
						>
							👤
						</button>
						<button
							onClick={handleLogout}
							disabled={isLoggingOut}
							className={`w-10 h-10 rounded-full bg-[#242F3D] hover:bg-[#2F3B4A] flex items-center justify-center transition-all duration-200 big-header-btn ${
								isLoggingOut ? "opacity-50 cursor-not-allowed" : ""
							}`}
							title="Вийти з акаунту"
						>
							{isLoggingOut ? (
								<div className="w-5 h-5 border-2 border-[#2AABEE] border-t-transparent rounded-full animate-spin big-header-btn" />
							) : (
								"🚪"
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
									className={`p-3 rounded-lg cursor-pointer transition-all duration-200 border-b ${
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
											{unreadCount > 0 && (
												<div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
													{unreadCount > 99 ? "99+" : unreadCount}
												</div>
											)}
										</div>
										<div className="flex-1 min-w-0">
											<div className="flex items-center justify-between ">
												<p
													className={`truncate ${
														selectedChat?.id === chat.id
															? "text-white"
															: hasUnread
															? "text-white font-bold"
															: "text-white"
													}`}
													style={{ marginLeft: ".3rem" }}
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
												></span>
											</div>
											<p
												className={`text-sm truncate  ${
													selectedChat?.id === chat.id
														? "text-blue-100"
														: hasUnread
														? "text-[#2AABEE] font-semibold"
														: "text-[#7D8E98]"
												}`}
												style={{ padding: ".3rem" }}
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
		</>
	);
}
