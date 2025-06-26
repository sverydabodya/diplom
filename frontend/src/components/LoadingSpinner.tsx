import React from "react";

const LoadingSpinner: React.FC = () => {
	return (
		<div className="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50">
			<div className="flex flex-col items-center space-y-4">
				<div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full"></div>
				<p className="text-white text-lg font-medium">Завантаження...</p>
			</div>
		</div>
	);
};

export default LoadingSpinner;
