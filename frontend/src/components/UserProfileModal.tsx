import { useState, useEffect } from "react";

interface User {
	id: string;
	name: string;
	email: string;
	isOnline?: boolean;
	lastSeen?: Date;
}

export default function UserProfileModal({
	userId,
	isOpen,
	onClose,
}: {
	userId: string;
	isOpen: boolean;
	onClose: () => void;
}) {
	const [user, setUser] = useState<User | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState("");

	useEffect(() => {
		if (!isOpen) return;
		const fetchUserProfile = async () => {
			if (!userId) return;
			try {
				setIsLoading(true);
				const response = await fetch(
					`${import.meta.env.VITE_HOST}/api/users/${userId}`,
					{ credentials: "include" }
				);
				if (!response.ok) {
					throw new Error("Користувача не знайдено");
				}
				const userData = await response.json();
				setUser(userData);
			} catch (err: any) {
				setError(err.message || "Помилка завантаження профілю");
			} finally {
				setIsLoading(false);
			}
		};
		fetchUserProfile();
	}, [userId, isOpen]);

	const getLastSeenText = (lastSeen: Date) => {
		const lastSeenDate = new Date(lastSeen);
		const now = new Date();
		const diffInMinutes = Math.floor(
			(now.getTime() - lastSeenDate.getTime()) / (1000 * 60)
		);
		if (diffInMinutes < 1) return "щойно";
		if (diffInMinutes < 60) return `${diffInMinutes}хв тому`;
		if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}г тому`;
		return `${Math.floor(diffInMinutes / 1440)}д тому`;
	};

	if (!isOpen) return null;

	return (
		<div className="modal-center" style={{ zIndex: 99999 }}>
			<div
				className="relative bg-[#242F3D] rounded-2xl shadow-2xl border border-[#2F3B4A] w-full max-w-md p-8 overflow-y-auto max-h-[90vh]"
				style={{ padding: "1.5rem" }}
			>
				{isLoading ? (
					<div className="flex items-center justify-center min-h-[200px]"></div>
				) : error || !user ? (
					<div className="text-center min-h-[200px] flex flex-col items-center justify-center">
						<h1 className="text-2xl font-bold text-white mb-4">Помилка</h1>
						<p className="text-[#7D8E98] mb-6">
							{error || "Користувача не знайдено"}
						</p>
						<button
							onClick={onClose}
							className="px-6 py-3 rounded-xl bg-[#2AABEE] text-white hover:bg-[#229ED9] transition-all duration-200"
						>
							Назад
						</button>
					</div>
				) : (
					<>
						<div className="flex items-center space-x-4 mb-8">
							<div className="relative">
								{user.isOnline && (
									<div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-[#242F3D]"></div>
								)}
							</div>
							<div>
								<div className="flex items-center justify-between mb-8">
									<h1 className="text-3xl font-bold text-white">{user.name}</h1>

									<button
										onClick={onClose}
										className="text-[#7D8E98] hover:text-white text-2xl w-10 h-10 flex items-center justify-center rounded-full transition-colors duration-200 focus:outline-none"
										aria-label="Закрити модалку"
									>
										✕
									</button>
								</div>
								<div className="flex items-center space-x-2 mb-8">
									{user.isOnline ? (
										<>
											<div className="w-2 h-2 bg-green-500 rounded-full"></div>
											<p className="text-green-400">Онлайн</p>
										</>
									) : user.lastSeen ? (
										<>
											<div className="w-2 h-2 bg-gray-500 rounded-full"></div>
											<p className="text-[#7D8E98]">
												Останній раз {getLastSeenText(user.lastSeen)}
											</p>
										</>
									) : (
										<>
											<div className="w-2 h-2 bg-gray-500 rounded-full"></div>
											<p className="text-[#7D8E98]">Офлайн</p>
										</>
									)}
								</div>
							</div>
						</div>
						<div className="space-y-6">
							<div className="bg-[#17212B] p-4 rounded-xl border border-[#2F3B4A]">
								<h2 className="text-sm font-medium text-[#7D8E98] mb-2">
									Ім'я
								</h2>
								<p className="text-white text-lg">{user.name}</p>
							</div>
							<div className="bg-[#17212B] p-4 rounded-xl border border-[#2F3B4A]">
								<h2 className="text-sm font-medium text-[#7D8E98] mb-2">
									Email
								</h2>
								<p className="text-white text-lg">{user.email}</p>
							</div>
						</div>
					</>
				)}
			</div>
		</div>
	);
}
