import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import LoadingSpinner from "./LoadingSpinner";

interface ProtectedRouteProps {
	children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
	const { user, loading } = useAuth();
	const location = useLocation();

	if (loading) {
		return <LoadingSpinner />;
	}

	if (!user) {
		return <Navigate to="/login" replace state={{ from: location }} />;
	}

	return <>{children}</>;
}
