import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../components/AuthProvider";
import { login } from "../network/auth_api";

export default function LoginPage() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const navigate = useNavigate();
	const location = useLocation();
	const { setUser, user, loading } = useAuth();

	// Перенаправляємо залогінованих користувачів
	useEffect(() => {
		if (!loading && user) {
			const from = (location.state as any)?.from?.pathname || "/";
			navigate(from, { replace: true });
		}
	}, [user, loading, navigate, location]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setIsLoading(true);

		try {
			const user = await login(email, password);
			setUser(user);
			const from = (location.state as any)?.from?.pathname || "/";
			navigate(from, { replace: true });
		} catch (err: any) {
			setError(err.message || "Помилка входу");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-[#17212B] p-4">
			<div className="w-full max-w-md p-8 rounded-2xl bg-[#242F3D] border border-[#2F3B4A] shadow-2xl fade-in">
				{error && (
					<div className="mb-6 p-4 rounded-xl bg-red-900 bg-opacity-50 text-red-200 border border-red-700">
						{error}
					</div>
				)}

				<form onSubmit={handleSubmit} className="space-y-6">
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
							"Увійти"
						)}
					</button>
				</form>

				<p className="mt-6 text-center text-[#7D8E98]">
					Немає акаунту?{" "}
					<Link
						to="/register"
						className="text-[#2AABEE] hover:text-[#229ED9] font-medium transition-colors duration-200"
					>
						Зареєструватися
					</Link>
				</p>
			</div>
		</div>
	);
}
