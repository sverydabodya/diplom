import { useState, useEffect } from "react";
import { searchUsers, createChat } from "../../network/chat_api";
import { User } from "../../types/User";

interface CreateChatModalProps {
	isOpen: boolean;
	onClose: () => void;
	onChatCreated: () => void;
}

interface SearchUser extends User {
	isSelected?: boolean;
}

export default function CreateChatModal({
	isOpen,
	onClose,
	onChatCreated,
}: CreateChatModalProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [users, setUsers] = useState<SearchUser[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [isGroupMode, setIsGroupMode] = useState(false);
	const [selectedUsers, setSelectedUsers] = useState<SearchUser[]>([]);
	const [groupChatName, setGroupChatName] = useState("");

	useEffect(() => {
		if (isOpen) {
			setSearchQuery("");
			setUsers([]);
			setSelectedUsers([]);
			setIsGroupMode(false);
			setGroupChatName("");
		}
	}, [isOpen]);

	useEffect(() => {
		const searchUsersDebounced = setTimeout(async () => {
			if (searchQuery.trim().length >= 2) {
				setIsLoading(true);
				try {
					const searchResults = await searchUsers(searchQuery);
					const filteredUsers = searchResults.filter(
						(user: SearchUser) =>
							!selectedUsers.some((selected) => selected.id === user.id)
					);
					setUsers(filteredUsers);
				} catch (error) {
					console.error("Помилка при пошуку користувачів:", error);
				} finally {
					setIsLoading(false);
				}
			} else {
				setUsers([]);
			}
		}, 300);

		return () => clearTimeout(searchUsersDebounced);
	}, [searchQuery, selectedUsers]);

	const handleUserSelect = (user: SearchUser) => {
		if (isGroupMode) {
			setSelectedUsers((prev) => [...prev, user]);
			setUsers((prev) => prev.filter((u) => u.id !== user.id));
		} else {
			handleCreateChat([user]);
		}
	};

	const handleRemoveSelectedUser = (userId: string) => {
		const userToRemove = selectedUsers.find((user) => user.id === userId);
		if (userToRemove) {
			setSelectedUsers((prev) => prev.filter((user) => user.id !== userId));
			setUsers((prev) => [...prev, userToRemove]);
		}
	};

	const handleCreateGroupChat = async () => {
		if (selectedUsers.length < 2) {
			alert(
				"Для створення групового чату потрібно вибрати мінімум 2 користувачів"
			);
			return;
		}
		await handleCreateChat(selectedUsers);
	};

	const handleCreateChat = async (usersToAdd: SearchUser[]) => {
		try {
			setIsLoading(true);

			if (usersToAdd.length === 1) {
				await createChat([usersToAdd[0].id]);
			} else {
				const userIds = usersToAdd.map((user) => user.id);
				const name =
					groupChatName.trim() ||
					`Груповий чат з ${usersToAdd.map((user) => user.name).join(", ")}`;
				await createChat(userIds, name);
			}

			onChatCreated();
			onClose();
		} catch (error) {
			console.error("Помилка при створенні чату:", error);
			alert("Помилка при створенні чату");
		} finally {
			setIsLoading(false);
		}
	};

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]"
			style={{ zIndex: 9999 }}
		>
			<div className="bg-[#17212B] rounded-lg p-6 w-full max-w-md max-h-[80vh] overflow-hidden">
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-xl font-semibold text-white">
						{isGroupMode ? "Створити груповий чат" : "Створити чат"}
					</h2>
					<button
						onClick={() => {
							onClose();
						}}
						className="text-[#7D8E98] hover:text-white transition-colors px-2 py-1 rounded"
					>
						закрити
					</button>
				</div>

				{!isGroupMode && (
					<div className="mb-4">
						<button
							onClick={() => setIsGroupMode(true)}
							className="w-full bg-[#2AABEE] hover:bg-[#1E8BC3] text-white py-2 px-4 rounded-lg transition-colors"
						>
							Створити груповий чат
						</button>
					</div>
				)}

				{isGroupMode && selectedUsers.length > 0 && (
					<div className="mb-4">
						<h3 className="text-sm font-medium text-[#B8C5D1] mb-2">
							Вибрані користувачі ({selectedUsers.length}):
						</h3>
						<div className="space-y-2 max-h-32 overflow-y-auto">
							{selectedUsers.map((user) => (
								<div
									key={user.id}
									className="flex items-center justify-between bg-[#242F3D] p-2 rounded-lg"
								>
									<div className="flex items-center space-x-2">
										<div className="w-8 h-8 bg-[#2AABEE] rounded-full flex items-center justify-center">
											<span className="text-white text-sm font-medium">
												{user.name.charAt(0).toUpperCase()}
											</span>
										</div>
										<span className="text-white text-sm">{user.name}</span>
									</div>
									<button
										onClick={() => handleRemoveSelectedUser(user.id)}
										className="text-[#7D8E98] hover:text-red-400 transition-colors px-2 py-1 rounded"
									>
										видалити
									</button>
								</div>
							))}
						</div>

						{selectedUsers.length >= 2 && (
							<div className="mt-4">
								<input
									type="text"
									placeholder="Назва групового чату (необов'язково)"
									value={groupChatName}
									onChange={(e) => setGroupChatName(e.target.value)}
									className="w-full bg-[#242F3D] border border-[#2F3B4A] rounded-lg px-4 py-2 text-white placeholder-[#7D8E98] focus:outline-none focus:border-[#2AABEE] mb-2"
								/>
								<button
									onClick={handleCreateGroupChat}
									disabled={isLoading}
									className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white py-2 px-4 rounded-lg transition-colors"
								>
									{isLoading
										? "Створення..."
										: `Створити чат з ${selectedUsers.length} користувачами`}
								</button>
							</div>
						)}
					</div>
				)}

				<div className="mb-4">
					<input
						type="text"
						placeholder="Пошук користувачів..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="w-full bg-[#242F3D] border border-[#2F3B4A] rounded-lg px-4 py-2 text-white placeholder-[#7D8E98] focus:outline-none focus:border-[#2AABEE]"
					/>
				</div>

				<div className="max-h-64 overflow-y-auto">
					{isLoading ? (
						<div className="flex items-center justify-center py-4">
							<div className="w-6 h-6 border-2 border-[#2AABEE] border-t-transparent rounded-full animate-spin" />
						</div>
					) : users.length > 0 ? (
						<div className="space-y-2">
							{users.map((user) => (
								<div
									key={user.id}
									onClick={() => handleUserSelect(user)}
									className="flex items-center space-x-3 p-3 bg-[#242F3D] rounded-lg cursor-pointer hover:bg-[#2F3B4A] transition-colors"
								>
									<div className="w-10 h-10 bg-[#2AABEE] rounded-full flex items-center justify-center">
										<span className="text-white font-medium">
											{user.name.charAt(0).toUpperCase()}
										</span>
									</div>
									<div>
										<p className="text-white font-medium">{user.name}</p>
										<p className="text-[#7D8E98] text-sm">{user.email}</p>
									</div>
								</div>
							))}
						</div>
					) : searchQuery.length >= 2 ? (
						<div className="text-center py-4 text-[#7D8E98]">
							Користувачів не знайдено
						</div>
					) : (
						<div className="text-center py-4 text-[#7D8E98]">
							Введіть ім'я або email для пошуку
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
