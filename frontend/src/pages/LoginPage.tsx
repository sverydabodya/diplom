import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../components/AuthProvider";
import { login } from "../network/auth_api";
import PasswordInput from "../components/PasswordInput";

export default function LoginPage() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const navigate = useNavigate();
	const location = useLocation();
	const { setUser, user, loading } = useAuth();

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
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#17212B] via-[#1E2A36] to-[#17212B] p-6 relative overflow-hidden">
			<div className="absolute inset-0 overflow-hidden">
				<div className="absolute -top-40 -right-40 w-80 h-80 bg-[#2AABEE] rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
				<div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#229ED9] rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000"></div>
			</div>

			<div className=" mx-auto max-w-sm ">
				<div
					className="w-full p-8 rounded-2xl bg-[#242F3D]/90 backdrop-blur-sm border border-[#2F3B4A]/50 shadow-2xl fade-in relative z-10  "
					style={{ padding: "1.5rem", borderRadius: "1rem" }}
				>
					<div className="text-center mb-8">
						<div className="w-20 h-20 bg-gradient-to-br from-[#2AABEE] to-[#229ED9] rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform duration-300 animate-float">
							Вхід
						</div>
						<h1 className="text-xl font-bold text-white mb-2">
							Ласкаво просимо
						</h1>
						<p className="text-[#7D8E98]">Увійдіть до вашого акаунту</p>
					</div>

					{error && (
						<div className="mb-6 p-4 rounded-xl bg-red-900/50 backdrop-blur-sm text-red-200 border border-red-700/50 shadow-lg animate-shake">
							<div className="flex items-center">{error}</div>
						</div>
					)}

					<form onSubmit={handleSubmit} className="space-y-6 ">
						<div className="group">
							<label
								htmlFor="email"
								className="block text-sm font-medium text-[#B8C5D1] mb-2 group-hover:text-[#2AABEE] transition-colors duration-200"
							>
								Email
							</label>
							<div className="relative">
								<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"></div>
								<input
									id="email"
									type="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									required
									className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#17212B]/80 backdrop-blur-sm border border-[#2F3B4A] !text-white placeholder-[#7D8E98] focus:outline-none focus:border-[#2AABEE] focus:ring-2 focus:ring-[#2AABEE] focus:ring-opacity-20 transition-all duration-200 hover:border-[#3F4B5A]"
									style={{padding: '0.3rem', borderRadius: ".3rem"}}
									placeholder="Введіть ваш email"
								/>
							</div>
						</div>

						<div className="group">
							<label
								htmlFor="password"
								className="block text-sm font-medium text-[#B8C5D1] mb-2 group-hover:text-[#2AABEE] transition-colors duration-200"
							>
								Пароль
							</label>
							<PasswordInput
								id="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								placeholder="Введіть ваш пароль"
								
								required
							/>
						</div>

						<button
							type="submit"
							disabled={isLoading}
							className={`w-full py-3 rounded-xl bg-gradient-to-r from-[#2AABEE] to-[#229ED9] text-white font-medium hover:from-[#229ED9] hover:to-[#1E8BC3] transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl btn-ripple ${
								isLoading ? "opacity-50 cursor-not-allowed" : ""
							}`}
							style={{marginTop: "1rem", borderRadius: ".4rem"}}
						>
							{isLoading ? (
								<div className="flex items-center justify-center">
									<div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
									<span className="ml-2">Вхід...</span>
								</div>
							) : (
								"Увійти"
							)}
						</button>
					</form>

					<div className="mt-8 pt-6 border-t border-[#2F3B4A]/50">
						<p className="text-center text-[#7D8E98]">
							Немає акаунту?{" "}
							<Link
								to="/register"
								className="text-[#2AABEE] hover:text-[#229ED9] font-medium transition-colors duration-200 hover:underline"
							>
								Зареєструватися
							</Link>
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
