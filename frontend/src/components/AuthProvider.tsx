import {
	createContext,
	PropsWithChildren,
	useContext,
	useEffect,
	useState,
} from "react";
import { User } from "../types/User";
import { getLoggedInUser } from "../network/auth_api";

const AuthContext = createContext<{
	user: User | null;
	setUser: (user: User | null) => void;
	loading: boolean;
} | null>(null);

export default function AuthProvider({ children }: PropsWithChildren) {
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);

	const fetchUser = async () => {
		try {
			const loggedInUser = await getLoggedInUser();
			setUser(loggedInUser);
		} catch (error) {
			console.log("Користувач не авторизований:", error);
			setUser(null);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchUser();
	}, []);

	return (
		<AuthContext.Provider value={{ user, setUser, loading }}>
			{children}
		</AuthContext.Provider>
	);
}

export const useAuth = () => {
	const context = useContext(AuthContext);

	if (!context) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return context;
};
