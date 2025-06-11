import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../components/AuthProvider";
import { register } from "../network/auth_api";

export default function RegisterPage() {
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [error, setError] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const navigate = useNavigate();
	const { setUser, user, loading } = useAuth();

	// Перенаправляємо залогінованих користувачів
	useEffect(() => {
		if (!loading && user) {
			navigate("/", { replace: true });
		}
	}, [user, loading, navigate]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");

		if (password !== confirmPassword) {
			setError("Паролі не співпадають");
			return;
		}

		setIsLoading(true);

		try {
			const user = await register(name, email, password);
			setUser(user);
			navigate("/");
		} catch (err: any) {
			setError(err.message || "Помилка реєстрації");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-[#17212B] p-4">
			<div className="w-full max-w-md p-8 rounded-2xl bg-[#242F3D] border border-[#2F3B4A] shadow-2xl fade-in">
				<div className="text-center mb-8">
					<div className="w-20 h-20 bg-[#2AABEE] rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg">
						<svg
							className="w-6 h-6 text-white"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
							/>
						</svg>
					</div>
					<h1 className="text-3xl font-bold text-white mb-2">
						Створіть акаунт
					</h1>
					<p className="text-[#7D8E98]">Приєднуйтесь до Telegram</p>
				</div>

				{error && (
					<div className="mb-6 p-4 rounded-xl bg-red-900 bg-opacity-50 text-red-200 border border-red-700">
						{error}
					</div>
				)}

				<form onSubmit={handleSubmit} className="space-y-6">
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
							placeholder="Введіть ваше ім'я"
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
							placeholder="Введіть ваш email"
						/>
					</div>
					<div>
						<label
							htmlFor="password"
							className="block text-sm font-medium text-[#B8C5D1] mb-2"
						>
							Пароль
						</label>
						<input
							id="password"
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
							className="w-full px-4 py-3 rounded-xl bg-[#17212B] border border-[#2F3B4A] text-white placeholder-[#7D8E98] focus:outline-none focus:border-[#2AABEE] focus:ring-2 focus:ring-[#2AABEE] focus:ring-opacity-20 transition-all duration-200"
							placeholder="Введіть ваш пароль"
						/>
					</div>
					<div>
						<label
							htmlFor="confirmPassword"
							className="block text-sm font-medium text-[#B8C5D1] mb-2"
						>
							Підтвердження паролю
						</label>
						<input
							id="confirmPassword"
							type="password"
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
							required
							className="w-full px-4 py-3 rounded-xl bg-[#17212B] border border-[#2F3B4A] text-white placeholder-[#7D8E98] focus:outline-none focus:border-[#2AABEE] focus:ring-2 focus:ring-[#2AABEE] focus:ring-opacity-20 transition-all duration-200"
							placeholder="Підтвердіть ваш пароль"
						/>
					</div>
					<button
						type="submit"
						disabled={isLoading}
						className={`w-full py-3 rounded-xl bg-[#2AABEE] text-white font-medium hover:bg-[#229ED9] transition-all duration-200 transform hover:scale-105 shadow-lg ${
							isLoading ? "opacity-50 cursor-not-allowed" : ""
						}`}
					>
						{isLoading ? (
							<div className="flex items-center justify-center">
								<div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
							</div>
						) : (
							"Зареєструватися"
						)}
					</button>
				</form>

				<p className="mt-6 text-center text-[#7D8E98]">
					Вже маєте акаунт?{" "}
					<Link
						to="/login"
						className="text-[#2AABEE] hover:text-[#229ED9] font-medium transition-colors duration-200"
					>
						Увійти
					</Link>
				</p>
			</div>
		</div>
	);
}
