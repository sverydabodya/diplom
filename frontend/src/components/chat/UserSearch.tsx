import { useState, useEffect, useRef } from "react";
import { searchUsers } from "../../network/chat_api";
import { User } from "../../types/User";
import { createChat } from "../../network/chat_api";

interface UserSearchProps {
	onChatCreated: () => void;
}

export default function UserSearch({ onChatCreated }: UserSearchProps) {
	const [query, setQuery] = useState("");
	const [users, setUsers] = useState<User[]>([]);
	const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState("");
	const [isCreatingChat, setIsCreatingChat] = useState(false);
	const searchTimeout = useRef<number | null>(null);
	const searchRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				searchRef.current &&
				!searchRef.current.contains(event.target as Node)
			) {
				setUsers([]);
				setQuery("");
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	useEffect(() => {
		if (searchTimeout.current) {
			clearTimeout(searchTimeout.current);
		}

		if (query.trim().length < 2) {
			setUsers([]);
			return;
		}

		setIsLoading(true);
		setError("");

		searchTimeout.current = setTimeout(async () => {
			try {
				const results = await searchUsers(query);
				const filteredResults = results.filter(
					(user: User) =>
						!selectedUsers.some((selected) => selected.id === user.id)
				);
				setUsers(filteredResults);
			} catch (err: any) {
				setError(err.message || "Помилка пошуку користувачів");
				setUsers([]);
			} finally {
				setIsLoading(false);
			}
		}, 300);
	}, [query, selectedUsers]);

	const handleSelectUser = (user: User) => {
		setSelectedUsers((prev) => [...prev, user]);
		setUsers([]);
		setQuery("");
	};

	const handleRemoveUser = (userId: string) => {
		setSelectedUsers((prev) => prev.filter((user) => user.id !== userId));
	};

	const handleCreateChat = async () => {
		if (selectedUsers.length === 0) {
			setError("Виберіть хоча б одного користувача");
			return;
		}

		setIsCreatingChat(true);
		setError("");

		try {
			const chat = await createChat([selectedUsers[0].id]);

			for (let i = 1; i < selectedUsers.length; i++) {
				await createChat([selectedUsers[i].id]);
			}

			setSelectedUsers([]);
			setQuery("");
			onChatCreated();
		} catch (err: any) {
			setError(err.message || "Помилка створення чату");
		} finally {
			setIsCreatingChat(false);
		}
	};

	return (
		<div ref={searchRef} className="relative p-4 border-b border-[#2F3B4A]">
			<div className="relative">
				<input
					type="text"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					placeholder="Пошук користувачів..."
					className="w-full px-4 py-3 rounded-xl bg-[#242F3D] border border-[#2F3B4A] text-white placeholder-[#7D8E98] focus:outline-none focus:border-[#2AABEE] focus:ring-2 focus:ring-[#2AABEE] focus:ring-opacity-20 transition-all duration-200"
				/>
				{isLoading && (
					<div className="absolute right-4 top-1/2 transform -translate-y-1/2">
						
					</div>
				)}
			</div>

			{error && (
				<div className="mt-2 p-3 rounded-xl bg-red-900 bg-opacity-50 text-red-200 text-sm border border-red-700">
					{error}
				</div>
			)}

			{selectedUsers.length > 0 && (
				<div className="mt-3 flex flex-wrap gap-2">
					{selectedUsers.map((user) => (
						<div
							key={user.id}
							className="flex items-center space-x-2 bg-[#2AABEE] px-3 py-2 rounded-lg text-white"
						>
							<div className="w-6 h-6 rounded-full bg-white bg-opacity-20 flex items-center justify-center">
								<svg
									className="w-4 h-4"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
									/>
								</svg>
							</div>
							<span className="text-sm font-medium">{user.name}</span>
							<button
								onClick={() => handleRemoveUser(user.id)}
								className="text-white hover:text-red-200 transition-colors duration-200"
							>
								<svg
									className="w-4 h-4"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M6 18L18 6M6 6l12 12"
									/>
								</svg>
							</button>
						</div>
					))}
					<button
						onClick={handleCreateChat}
						disabled={isCreatingChat}
						className={`px-4 py-2 rounded-lg bg-[#2AABEE] text-white hover:bg-[#229ED9] transition-all duration-200 flex items-center space-x-2 ${
							isCreatingChat ? "opacity-50 cursor-not-allowed" : ""
						}`}
					>
						{isCreatingChat ? (
							<>
								
								<span>Створення...</span>
							</>
						) : (
							<>
								<svg
									className="w-4 h-4"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M12 6v6m0 0v6m0-6h6m-6 0H6"
									/>
								</svg>
								<span>Створити чат</span>
							</>
						)}
					</button>
				</div>
			)}

			{users.length > 0 && (
				<div className="absolute z-10 w-full mt-2 bg-[#242F3D] rounded-xl border border-[#2F3B4A] shadow-xl overflow-hidden">
					{users.map((user) => (
						<div
							key={user.id}
							className="p-3 hover:bg-[#2F3B4A] transition-colors duration-200 cursor-pointer flex items-center justify-between"
							onClick={() => handleSelectUser(user)}
						>
							<div className="flex items-center space-x-3">
								<div className="w-10 h-10 rounded-full bg-[#2AABEE] flex items-center justify-center">
									<svg
										className="w-5 h-5 text-white"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
										/>
									</svg>
								</div>
								<span className="text-white font-medium">{user.name}</span>
							</div>
							<button className="px-3 py-1 rounded-lg bg-[#2AABEE] text-white hover:bg-[#229ED9] transition-colors duration-200 text-sm">
								Додати
							</button>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
