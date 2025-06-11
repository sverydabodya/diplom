import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../components/AuthProvider";
import { createChat } from "../network/chat_api";

interface User {
	id: string;
	name: string;
	email: string;
	isOnline?: boolean;
	lastSeen?: Date;
}

export default function UserProfilePage() {
	const { userId } = useParams<{ userId: string }>();
	const { user: currentUser } = useAuth();
	const navigate = useNavigate();
	const [user, setUser] = useState<User | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState("");

	useEffect(() => {
		const fetchUserProfile = async () => {
			if (!userId) return;

			try {
				setIsLoading(true);
				const response = await fetch(
					`${import.meta.env.VITE_HOST}/api/users/${userId}`,
					{
						credentials: "include",
					}
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
	}, [userId]);

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

	const handleStartChat = async () => {
		if (!currentUser || !user) return;

		try {
			const chat = await createChat([currentUser.id, user.id]);
			// Перенаправляємо на головну сторінку з відкритим чатом
			navigate(`/?chat=${chat.id}`);
		} catch (error) {
			console.error("Помилка при створенні чату:", error);
			alert("Помилка при створенні чату");
		}
	};

	if (isLoading) {
		return (
			<div className="min-h-screen bg-[#17212B] flex items-center justify-center">
				<div className="w-16 h-16 border-4 border-[#2AABEE] border-t-transparent rounded-full animate-spin" />
			</div>
		);
	}

	if (error || !user) {
		return (
			<div className="min-h-screen bg-[#17212B] flex items-center justify-center">
				<div className="text-center">
					<h1 className="text-2xl font-bold text-white mb-4">Помилка</h1>
					<p className="text-[#7D8E98] mb-6">
						{error || "Користувача не знайдено"}
					</p>
					<button
						onClick={() => navigate(-1)}
						className="px-6 py-3 rounded-xl bg-[#2AABEE] text-white hover:bg-[#229ED9] transition-all duration-200"
					>
						Назад
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-[#17212B] p-8">
			<div className="max-w-2xl mx-auto">
				<div className="bg-[#242F3D] rounded-2xl border border-[#2F3B4A] shadow-2xl p-8 fade-in">
					<div className="flex items-center justify-between mb-8">
						<div className="flex items-center space-x-4">
							<div className="relative">
								<div className="w-16 h-16 bg-[#2AABEE] rounded-full flex items-center justify-center shadow-lg">
									<span className="text-white text-2xl font-medium">
										{user.name.charAt(0).toUpperCase()}
									</span>
								</div>
								{user.isOnline && (
									<div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-[#242F3D]"></div>
								)}
							</div>
							<div>
								<h1 className="text-3xl font-bold text-white">{user.name}</h1>
								<div className="flex items-center space-x-2">
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
						<button
							onClick={() => navigate(-1)}
							className="px-4 py-2 rounded-xl bg-[#17212B] text-[#B8C5D1] border border-[#2F3B4A] hover:bg-[#2F3B4A] transition-all duration-200"
						>
							Назад
						</button>
					</div>

					<div className="space-y-6">
						<div className="bg-[#17212B] p-4 rounded-xl border border-[#2F3B4A]">
							<h2 className="text-sm font-medium text-[#7D8E98] mb-2">Ім'я</h2>
							<p className="text-white text-lg">{user.name}</p>
						</div>
						<div className="bg-[#17212B] p-4 rounded-xl border border-[#2F3B4A]">
							<h2 className="text-sm font-medium text-[#7D8E98] mb-2">Email</h2>
							<p className="text-white text-lg">{user.email}</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
