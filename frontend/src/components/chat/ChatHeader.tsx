import { useAuth } from "../AuthProvider";
import { leaveGroupChat } from "../../network/chat_api";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import GroupChatMenu from "./GroupChatMenu";
import UserProfileModal from "../UserProfileModal";

interface ChatHeaderProps {
	chat: {
		id: string;
		name?: string;
		users: any[];
		createdAt: Date;
		createdBy?: string;
	};
	onDeleteChat: (chatId: string) => Promise<void>;
	onChatUpdate?: () => void;
	onSearchClick?: () => void;
	onMobileMenuToggle?: () => void;
}

export default function ChatHeader({
	chat,
	onDeleteChat,
	onChatUpdate,
	onSearchClick,
	onMobileMenuToggle,
}: ChatHeaderProps) {
	const { user } = useAuth();
	const [isGroupMenuOpen, setIsGroupMenuOpen] = useState(false);
	const navigate = useNavigate();
	const [profileUserId, setProfileUserId] = useState<string | null>(null);

	// Знаходимо іншого користувача в чаті
	const otherUser = chat.users.find((u: any) => u.id !== user?.id);

	// Функція для визначення, чи є поточний користувач створювачем групового чату
	const isCreator = () => {
		if (!chat.name) return false; // Не груповий чат

		// Використовуємо поле createdBy для групових чатів
		return chat.createdBy === user?.id;
	};

	// Функція для форматування часу "останній раз бачили"
	const getLastSeenText = (lastSeen: Date) => {
		const lastSeenDate = new Date(lastSeen);
		const now = new Date();
		const diffInMinutes = Math.floor(
			(now.getTime() - lastSeenDate.getTime()) / (1000 * 60)
		);

		if (diffInMinutes < 1) {
			return "щойно";
		} else if (diffInMinutes < 60) {
			return `${diffInMinutes}хв тому`;
		} else if (diffInMinutes < 1440) {
			const hours = Math.floor(diffInMinutes / 60);
			return `${hours}г тому`;
		} else {
			const days = Math.floor(diffInMinutes / 1440);
			return `${days}д тому`;
		}
	};

	const handleDeleteChat = async () => {
		if (
			window.confirm(
				"Ви впевнені, що хочете видалити цей чат? Ця дія незворотна."
			)
		) {
			try {
				await onDeleteChat(chat.id);
			} catch (error) {
				console.error("Помилка при видаленні чату:", error);
			}
		}
	};

	const handleLeaveGroupChat = async () => {
		if (
			window.confirm("Ви впевнені, що хочете вийти з цього групового чату?")
		) {
			try {
				await leaveGroupChat(chat.id);
				// Викликаємо callback для оновлення даних замість перезавантаження
				if (onChatUpdate) {
					onChatUpdate();
				}
			} catch (error) {
				console.error("Помилка при виході з групового чату:", error);
				alert("Помилка при виході з групового чату");
			}
		}
	};

	const handleChatUpdate = () => {
		// Викликаємо callback для оновлення даних замість перезавантаження
		if (onChatUpdate) {
			onChatUpdate();
		}
	};

	const handleOpenProfile = () => {
		if (otherUser) {
			setProfileUserId(otherUser.id);
		}
	};

	// Додаю функцію для відмінювання
	function getUchastnykWord(count: number) {
		if (count % 10 === 1 && count % 100 !== 11) return "учасник";
		if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100))
			return "учасники";
		return "учасників";
	}

	const openProfileFromGroupMenu = (userId: string) => {
		setIsGroupMenuOpen(false);
		setTimeout(() => setProfileUserId(userId), 200); // невелика затримка для плавності
	};

	return (
		<>
			<div className="h-16 bg-[#17212B] border-b border-[#2F3B4A] flex-shrink-0 flex items-center px-6">
				<div className="flex items-center space-x-4 w-full max-w-4xl mx-auto">
					<div className="relative">
						{!chat.name && otherUser?.isOnline && (
							<div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[#17212B]"></div>
						)}
					</div>
					<div className="flex-1">
						<h2
							className={`text-lg font-semibold text-white ${
								chat.name
									? "cursor-pointer hover:text-[#2AABEE] transition-colors"
									: ""
							}`}
							onClick={() => {
								if (chat.name) {
									setIsGroupMenuOpen(true);
								}
							}}
							title={chat.name ? "Натисніть для управління чатом" : ""}
						>
							{chat.name ? chat.name : otherUser?.name}
						</h2>
						<div className="flex justify-center space-x-2">
							{chat.name ? (
								<>
									<div className="w-2 h-2 bg-blue-500 rounded-full"></div>
									<p className="text-sm text-[#7D8E98]">
										{chat.users.length} {getUchastnykWord(chat.users.length)}
									</p>
								</>
							) : otherUser?.isOnline ? (
								<>
									<div className="w-2 h-2 bg-green-500 rounded-full"></div>
									<p className="text-sm text-green-400">Онлайн</p>
								</>
							) : otherUser?.lastSeen ? (
								<>
									<div className="w-2 h-2 bg-gray-500 rounded-full"></div>
									<p className="text-sm text-[#7D8E98]">
										Останній раз {getLastSeenText(otherUser.lastSeen)}
									</p>
								</>
							) : (
								<>
									<div className="w-2 h-2 bg-gray-500 rounded-full"></div>
									<p className="text-sm text-[#7D8E98]">Офлайн</p>
								</>
							)}
						</div>
					</div>
					<div className="flex space-x-2">
						<button
							onClick={onSearchClick}
							className="big-header-btn hover:bg-[#2F3B4A] transition-colors duration-200"
							title="Пошук повідомлень"
						>
							🔍
						</button>

						{chat.name ? (
							isCreator() ? (
								<button
									onClick={handleDeleteChat}
									className="big-header-btn hover:bg-red-600 transition-colors duration-200"
									title="Видалити груповий чат"
								>
									🗑️
								</button>
							) : (
								<button
									onClick={handleLeaveGroupChat}
									className="big-header-btn hover:bg-orange-600 transition-colors duration-200"
									title="Вийти з групового чату"
								>
									Вийти
								</button>
							)
						) : (
							<>
								<button
									onClick={handleOpenProfile}
									className="big-header-btn hover:bg-[#2F3B4A] transition-colors duration-200"
									title="Переглянути профіль"
								>
									👤
								</button>
								<button
									onClick={handleDeleteChat}
									className="big-header-btn hover:bg-red-600 transition-colors duration-200"
									title="Видалити чат"
								>
									🗑️
								</button>
							</>
						)}
					</div>
				</div>
			</div>

			{/* Меню управління груповим чатом */}
			{chat.name && (
				<GroupChatMenu
					isOpen={isGroupMenuOpen}
					onClose={() => setIsGroupMenuOpen(false)}
					chat={chat}
					onChatUpdate={handleChatUpdate}
					onOpenProfile={openProfileFromGroupMenu}
				/>
			)}

			{profileUserId && (
				<UserProfileModal
					userId={profileUserId}
					isOpen={!!profileUserId}
					onClose={() => setProfileUserId(null)}
				/>
			)}
		</>
	);
}
