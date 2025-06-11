import {
	BrowserRouter as Router,
	Routes,
	Route,
	Navigate,
} from "react-router-dom";
import AuthProvider from "./components/AuthProvider";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ChatPage from "./pages/ChatPage";
import ProfilePage from "./pages/ProfilePage";
import UserProfilePage from "./pages/UserProfilePage";
import ProtectedRoute from "./components/ProtectedRoute";
import "./App.css";

function App() {
	return (
		<Router>
			<AuthProvider>
				<div className="min-h-screen bg-[#17212B]">
					<Routes>
						<Route path="/login" element={<LoginPage />} />
						<Route path="/register" element={<RegisterPage />} />
						<Route
							path="/"
							element={
								<ProtectedRoute>
									<ChatPage />
								</ProtectedRoute>
							}
						/>
						<Route
							path="/profile"
							element={
								<ProtectedRoute>
									<ProfilePage />
								</ProtectedRoute>
							}
						/>
						<Route
							path="/user-profile/:userId"
							element={
								<ProtectedRoute>
									<UserProfilePage />
								</ProtectedRoute>
							}
						/>
						<Route path="*" element={<Navigate to="/login" replace />} />
					</Routes>
				</div>
			</AuthProvider>
		</Router>
	);
}

export default App;
