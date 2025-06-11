import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../components/AuthProvider";
import { signOut, updateProfile, updatePassword } from "../network/auth_api";

export default function ProfilePage() {
	const { user, setUser } = useAuth();
	const navigate = useNavigate();
	const [isEditing, setIsEditing] = useState(false);
	const [isChangingPassword, setIsChangingPassword] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	// Форма редагування профілю
	const [name, setName] = useState(user?.name || "");
	const [email, setEmail] = useState(user?.email || "");

	// Форма зміни паролю
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");

	const handleProfileUpdate = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setSuccess("");
		setIsLoading(true);

		try {
			const updatedUser = await updateProfile(name, email);
			setUser(updatedUser);
			setSuccess("Профіль успішно оновлено");
			setIsEditing(false);
		} catch (err: any) {
			setError(err.message || "Помилка оновлення профілю");
		} finally {
			setIsLoading(false);
		}
	};

	const handlePasswordUpdate = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setSuccess("");

		if (newPassword !== confirmPassword) {
			setError("Нові паролі не співпадають");
			return;
		}

		setIsLoading(true);

		try {
			await updatePassword(currentPassword, newPassword);
			setSuccess("Пароль успішно змінено");
			setIsChangingPassword(false);
			setCurrentPassword("");
			setNewPassword("");
			setConfirmPassword("");
		} catch (err: any) {
			setError(err.message || "Помилка зміни паролю");
		} finally {
			setIsLoading(false);
		}
	};

	const handleLogout = async () => {
		try {
			await signOut();
			setUser(null); // Очищаємо стан користувача
			navigate("/login", { replace: true });
		} catch (error) {
			console.error("Помилка при виході:", error);
			// Fallback перенаправлення
			setUser(null);
			navigate("/login", { replace: true });
		}
	};

	if (!user) {
		return null;
	}

	return (
		<div className="min-h-screen bg-[#17212B] p-8">
			<div className="max-w-2xl mx-auto">
				<div className="bg-[#242F3D] rounded-2xl border border-[#2F3B4A] shadow-2xl p-8 fade-in">
					<div className="flex items-center space-x-4 mb-8">
						<div className="w-16 h-16 bg-[#2AABEE] rounded-full flex items-center justify-center shadow-lg">
							<svg
								className="w-8 h-8 text-white"
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
						<div>
							<h1 className="text-3xl font-bold text-white">Профіль</h1>
							<p className="text-[#7D8E98]">Керуйте своїм акаунтом</p>
						</div>
						<button
							onClick={() => navigate(-1)}
							className="px-4 py-2 rounded-xl bg-[#17212B] text-[#B8C5D1] border border-[#2F3B4A] hover:bg-[#2F3B4A] transition-all duration-200"
						>
							Назад
						</button>
					</div>

					{error && (
						<div className="mb-6 p-4 rounded-xl bg-red-900 bg-opacity-50 text-red-200 border border-red-700">
							{error}
						</div>
					)}

					{success && (
						<div className="mb-6 p-4 rounded-xl bg-green-900 bg-opacity-50 text-green-200 border border-green-700">
							{success}
						</div>
					)}

					{!isEditing && !isChangingPassword && (
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
							<div className="flex flex-wrap gap-4">
								<button
									onClick={() => setIsEditing(true)}
									className="px-6 py-3 rounded-xl bg-[#2AABEE] text-white hover:bg-[#229ED9] transition-all duration-200 transform hover:scale-105 shadow-lg"
								>
									Редагувати профіль
								</button>
								<button
									onClick={() => setIsChangingPassword(true)}
									className="px-6 py-3 rounded-xl bg-[#242F3D] text-[#B8C5D1] border border-[#2F3B4A] hover:bg-[#2F3B4A] transition-all duration-200"
								>
									Змінити пароль
								</button>
								<button
									onClick={handleLogout}
									className="px-6 py-3 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-all duration-200"
								>
									Вийти
								</button>
							</div>
						</div>
					)}

					{isEditing && (
						<form onSubmit={handleProfileUpdate} className="space-y-6">
							<div>
								<label
									htmlFor="name"
									className="block text-sm font-medium text-[#B8C5D1] mb-2"
								>
									Ім'я
								</label>
								<input
									id="name"
									type="text"
									value={name}
									onChange={(e) => setName(e.target.value)}
									required
									className="w-full px-4 py-3 rounded-xl bg-[#17212B] border border-[#2F3B4A] text-white placeholder-[#7D8E98] focus:outline-none focus:border-[#2AABEE] focus:ring-2 focus:ring-[#2AABEE] focus:ring-opacity-20 transition-all duration-200"
								/>
							</div>
							<div>
								<label
									htmlFor="email"
									className="block text-sm font-medium text-[#B8C5D1] mb-2"
								>
									Email
								</label>
								<input
									id="email"
									type="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									required
									className="w-full px-4 py-3 rounded-xl bg-[#17212B] border border-[#2F3B4A] text-white placeholder-[#7D8E98] focus:outline-none focus:border-[#2AABEE] focus:ring-2 focus:ring-[#2AABEE] focus:ring-opacity-20 transition-all duration-200"
								/>
							</div>
							<div className="flex space-x-4">
								<button
									type="submit"
									disabled={isLoading}
									className={`px-6 py-3 rounded-xl bg-[#2AABEE] text-white hover:bg-[#229ED9] transition-all duration-200 ${
										isLoading ? "opacity-50 cursor-not-allowed" : ""
									}`}
								>
									{isLoading ? "Збереження..." : "Зберегти"}
								</button>
								<button
									type="button"
									onClick={() => {
										setIsEditing(false);
										setName(user.name || "");
										setEmail(user.email || "");
									}}
									className="px-6 py-3 rounded-xl bg-[#242F3D] text-[#B8C5D1] border border-[#2F3B4A] hover:bg-[#2F3B4A] transition-all duration-200"
								>
									Скасувати
								</button>
							</div>
						</form>
					)}

					{isChangingPassword && (
						<form onSubmit={handlePasswordUpdate} className="space-y-6">
							<div>
								<label
									htmlFor="currentPassword"
									className="block text-sm font-medium text-[#B8C5D1] mb-2"
								>
									Поточний пароль
								</label>
								<input
									id="currentPassword"
									type="password"
									value={currentPassword}
									onChange={(e) => setCurrentPassword(e.target.value)}
									required
									className="w-full px-4 py-3 rounded-xl bg-[#17212B] border border-[#2F3B4A] text-white placeholder-[#7D8E98] focus:outline-none focus:border-[#2AABEE] focus:ring-2 focus:ring-[#2AABEE] focus:ring-opacity-20 transition-all duration-200"
								/>
							</div>
							<div>
								<label
									htmlFor="newPassword"
									className="block text-sm font-medium text-[#B8C5D1] mb-2"
								>
									Новий пароль
								</label>
								<input
									id="newPassword"
									type="password"
									value={newPassword}
									onChange={(e) => setNewPassword(e.target.value)}
									required
									className="w-full px-4 py-3 rounded-xl bg-[#17212B] border border-[#2F3B4A] text-white placeholder-[#7D8E98] focus:outline-none focus:border-[#2AABEE] focus:ring-2 focus:ring-[#2AABEE] focus:ring-opacity-20 transition-all duration-200"
								/>
							</div>
							<div>
								<label
									htmlFor="confirmPassword"
									className="block text-sm font-medium text-[#B8C5D1] mb-2"
								>
									Підтвердження нового паролю
								</label>
								<input
									id="confirmPassword"
									type="password"
									value={confirmPassword}
									onChange={(e) => setConfirmPassword(e.target.value)}
									required
									className="w-full px-4 py-3 rounded-xl bg-[#17212B] border border-[#2F3B4A] text-white placeholder-[#7D8E98] focus:outline-none focus:border-[#2AABEE] focus:ring-2 focus:ring-[#2AABEE] focus:ring-opacity-20 transition-all duration-200"
								/>
							</div>
							<div className="flex space-x-4">
								<button
									type="submit"
									disabled={isLoading}
									className={`px-6 py-3 rounded-xl bg-[#2AABEE] text-white hover:bg-[#229ED9] transition-all duration-200 ${
										isLoading ? "opacity-50 cursor-not-allowed" : ""
									}`}
								>
									{isLoading ? "Зміна..." : "Змінити пароль"}
								</button>
								<button
									type="button"
									onClick={() => {
										setIsChangingPassword(false);
										setCurrentPassword("");
										setNewPassword("");
										setConfirmPassword("");
									}}
									className="px-6 py-3 rounded-xl bg-[#242F3D] text-[#B8C5D1] border border-[#2F3B4A] hover:bg-[#2F3B4A] transition-all duration-200"
								>
									Скасувати
								</button>
							</div>
						</form>
					)}
				</div>
			</div>
		</div>
	);
}
