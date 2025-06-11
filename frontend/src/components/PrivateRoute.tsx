import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import LoadingSpinner from "./LoadingSpinner";

interface PrivateRouteProps {
	children: React.ReactNode;
}

export default function PrivateRoute({ children }: PrivateRouteProps) {
	const { user, loading } = useAuth();

	if (loading) {
		return <LoadingSpinner />;
	}

	if (!user) {
		return <Navigate to="/login" />;
	}

	return <>{children}</>;
}
