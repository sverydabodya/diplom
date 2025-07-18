import { useState, useEffect } from "react";
import { useAuth } from "../AuthProvider";
import { useNavigate } from "react-router-dom";
import {
	searchUsers,
	updateChatName,
	addUserToChat,
	removeUserFromChat,
} from "../../network/chat_api";
import UserProfileModal from "../UserProfileModal";

interface User {
	id: string;
	name: string;
	email: string;
}

interface GroupChatMenuProps {
	isOpen: boolean;
	onClose: () => void;
	chat: {
		id: string;
		name?: string;
		users: User[];
		createdBy?: string;
	};
	onChatUpdate: () => void;
	onOpenProfile: (userId: string) => void;
}

export default function GroupChatMenu({
	isOpen,
	onClose,
	chat,
	onChatUpdate,
	onOpenProfile,
}: GroupChatMenuProps) {
	const { user } = useAuth();
	const navigate = useNavigate();
	const [chatName, setChatName] = useState(chat.name);
	const [isEditingName, setIsEditingName] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [searchResults, setSearchResults] = useState<User[]>([]);
	const [isSearching, setIsSearching] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	const isCreator = chat.createdBy === user?.id;

	useEffect(() => {
		if (isOpen) {
			setChatName(chat.name);
			setIsEditingName(false);
			setSearchQuery("");
			setSearchResults([]);
		}
	}, [isOpen, chat.name]);

	useEffect(() => {
		const searchUsersDebounced = setTimeout(async () => {
			if (searchQuery.trim().length >= 2) {
				setIsSearching(true);
				try {
					const results = await searchUsers(searchQuery);
					const filteredResults = results.filter(
						(result: User) => !chat.users.some((user) => user.id === result.id)
					);
					setSearchResults(filteredResults);
				} catch (error) {
				} finally {
					setIsSearching(false);
				}
			} else {
				setSearchResults([]);
			}
		}, 300);

		return () => clearTimeout(searchUsersDebounced);
	}, [searchQuery, chat.users]);

	const handleUpdateChatName = async () => {
		if (!isCreator || !chatName!.trim()) return;

		setIsLoading(true);
		try {
			await updateChatName(chat.id, chatName!.trim());
			setIsEditingName(false);
			onChatUpdate();
			onClose();
		} catch (error) {
			alert("Помилка при оновленні назви чату");
		} finally {
			setIsLoading(false);
		}
	};

	const handleAddUser = async (userId: string) => {
		setIsLoading(true);
		try {
			await addUserToChat(chat.id, userId);
			setSearchQuery("");
			setSearchResults([]);
			onChatUpdate();
			onClose();
		} catch (error) {
			alert("Помилка при додаванні користувача");
		} finally {
			setIsLoading(false);
		}
	};

	const handleRemoveUser = async (userId: string) => {
		if (!isCreator) return;

		if (
			!window.confirm(
				"Ви впевнені, що хочете видалити цього користувача з чату?"
			)
		) {
			return;
		}

		setIsLoading(true);
		try {
			await removeUserFromChat(chat.id, userId);
			onChatUpdate();
			onClose();
		} catch (error) {
			alert("Помилка при видаленні користувача");
		} finally {
			setIsLoading(false);
		}
	};

	const handleOpenProfile = (userId: string) => {
		onClose();
		setTimeout(() => onOpenProfile(userId), 200);
	};

	if (!isOpen) return null;

	return (
		<div className="modal-center" style={{ zIndex: "99999", padding: "1rem" }}>
			<div
				className="bg-[#17212B] rounded-lg p-6 w-full max-w-md max-h-[80vh] overflow-hidden"
				style={{ padding: "1rem" }}
			>
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-xl font-semibold text-white">
						Управління груповим чатом
					</h2>
					<button
						onClick={onClose}
						className="text-[#7D8E98] hover:text-white transition-colors px-2 py-1 rounded"
					>
						✕
					</button>
				</div>

				<div className="mb-6">
					<h3 className="text-sm font-medium text-[#B8C5D1] mb-2">
						Назва чату:
					</h3>
					{isEditingName ? (
						<div className="flex space-x-2">
							<input
								type="text"
								value={chatName}
								onChange={(e) => setChatName(e.target.value)}
								className="flex-1 bg-[#242F3D] border border-[#2F3B4A] rounded-lg px-4 py-2 text-white placeholder-[#7D8E98] focus:outline-none focus:border-[#2AABEE]"
								placeholder="Назва чату"
							/>
							<button
								onClick={handleUpdateChatName}
								disabled={isLoading}
								className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white rounded-lg transition-colors"
							>
								{isLoading ? "..." : "зберегти"}
							</button>
							<button
								onClick={() => {
									setIsEditingName(false);
									setChatName(chat.name);
								}}
								className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
							>
								скасувати
							</button>
						</div>
					) : (
						<div className="flex items-center justify-between bg-[#242F3D] p-3 rounded-lg">
							<span className="text-white">{chat.name}</span>
							{isCreator && (
								<button
									onClick={() => setIsEditingName(true)}
									className="text-[#7D8E98] hover:text-white transition-colors"
								>
									змінити
								</button>
							)}
						</div>
					)}
				</div>

				<div className="mb-6">
					<h3 className="text-sm font-medium text-[#B8C5D1] mb-2">
						Учасники ({chat.users.length}):
					</h3>
					<div className="space-y-2 max-h-40 overflow-y-auto">
						{chat.users.map((user) => (
							<div
								key={user.id}
								className="flex items-center justify-between bg-[#242F3D] p-3 rounded-lg"
								style={{ marginTop: "0.5rem" }}
							>
								<div className="flex items-center space-x-3">
									<div>
										<p className="text-white text-sm font-medium">
											{user.name}
										</p>
									</div>
								</div>
								<div className="flex items-center space-x-2">
									<button
										onClick={() => handleOpenProfile(user.id)}
										className="text-[#2AABEE] hover:text-[#1E8BC3] transition-colors px-2 py-1 rounded text-sm"
										title="Переглянути профіль"
									>
										профіль
									</button>
									{isCreator && user.id !== chat.createdBy && (
										<button
											onClick={() => handleRemoveUser(user.id)}
											className="text-red-400 hover:text-red-300 transition-colors px-2 py-1 rounded text-sm"
											title="Видалити з чату"
										>
											видалити
										</button>
									)}
									{user.id === chat.createdBy && (
										<span className="text-[#2AABEE] text-xs">Власник</span>
									)}
								</div>
							</div>
						))}
					</div>
				</div>

				{isCreator && (
					<div className="mb-4">
						<h3 className="text-sm font-medium text-[#B8C5D1] mb-2">
							Додати користувача:
						</h3>
						<input
							type="text"
							placeholder="Пошук користувачів..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="w-full bg-[#242F3D] border border-[#2F3B4A] rounded-lg px-4 py-2 text-white placeholder-[#7D8E98] focus:outline-none focus:border-[#2AABEE] mb-2"
						/>
						{searchResults.length > 0 && (
							<div className="space-y-2 max-h-32 overflow-y-auto">
								{searchResults.map((user) => (
									<div
										key={user.id}
										className="flex items-center justify-between bg-[#242F3D] p-2 rounded-lg"
									>
										<div className="flex items-center space-x-2">
											<span className="text-white text-sm">{user.name}</span>
										</div>
										<div className="flex items-center space-x-2">
											<button
												onClick={() => handleOpenProfile(user.id)}
												className="text-[#2AABEE] hover:text-[#1E8BC3] transition-colors px-2 py-1 rounded text-xs"
												title="Переглянути профіль"
											>
												профіль
											</button>
											<button
												onClick={() => handleAddUser(user.id)}
												className="text-green-400 hover:text-green-300 transition-colors px-2 py-1 rounded text-xs"
												title="Додати до чату"
											>
												додати
											</button>
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
