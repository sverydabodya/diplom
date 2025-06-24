import { useState, useEffect } from "react";

interface ChatSearchProps {
	onSearch: (query: string) => void;
	onClose: () => void;
	isOpen: boolean;
	searchResults: SearchResult[];
	onResultClick: (messageId: string) => void;
}

interface SearchResult {
	id: string;
	content: string;
	sender: {
		id: string;
		name: string;
	};
	createdAt: Date;
}

export default function ChatSearch({
	onSearch,
	onClose,
	isOpen,
	searchResults,
	onResultClick,
}: ChatSearchProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [isSearching, setIsSearching] = useState(false);

	useEffect(() => {
		if (!isOpen) {
			setSearchQuery("");
		}
	}, [isOpen]);

	const handleSearch = (query: string) => {
		setSearchQuery(query);
		setIsSearching(true);
		onSearch(query);
		setTimeout(() => setIsSearching(false), 500);
	};

	const handleResultClick = (messageId: string) => {
		onResultClick(messageId);
		onClose();
	};

	const formatTime = (date: Date) => {
		return new Date(date).toLocaleTimeString("uk-UA", {
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const formatDate = (date: Date) => {
		const today = new Date();
		const messageDate = new Date(date);
		const diffTime = Math.abs(today.getTime() - messageDate.getTime());
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

		if (diffDays === 1) {
			return "Сьогодні";
		} else if (diffDays === 2) {
			return "Вчора";
		} else {
			return messageDate.toLocaleDateString("uk-UA", {
				day: "numeric",
				month: "long",
			});
		}
	};

	const highlightText = (text: string, query: string) => {
		if (!query.trim()) return text;

		const regex = new RegExp(`(${query})`, "gi");
		const parts = text.split(regex);

		return parts.map((part, index) =>
			regex.test(part) ? (
				<span
					key={index}
					className="bg-yellow-500 bg-opacity-50 text-black px-1 rounded font-medium"
				>
					{part}
				</span>
			) : (
				part
			)
		);
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2 sm:p-4">
			<div className="bg-[#242F3D] rounded-xl shadow-2xl border border-[#2F3B4A] w-full max-w-sm sm:max-w-2xl max-h-[90vh] sm:max-h-[80vh] flex flex-col">
				<div className="flex items-center justify-between p-3 sm:p-4 border-b border-[#2F3B4A]">
					<h2 className="text-base sm:text-lg font-semibold text-white">
						Пошук повідомлень
					</h2>
					<button
						onClick={onClose}
						className="text-[#7D8E98] hover:text-white transition-colors duration-200"
					>
						✕
					</button>
				</div>

				<div className="p-3 sm:p-4 border-b border-[#2F3B4A]">
					<div className="relative">
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => handleSearch(e.target.value)}
							placeholder="Введіть текст для пошуку..."
							className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-[#17212B] border border-[#2F3B4A] rounded-lg text-white placeholder-[#7D8E98] focus:outline-none focus:border-[#2AABEE] focus:ring-2 focus:ring-[#2AABEE] focus:ring-opacity-20 transition-all duration-200 text-sm sm:text-base"
							autoFocus
						/>
						{isSearching && (
							<div className="absolute right-3 top-1/2 transform -translate-y-1/2">
								<div className="w-5 h-5 border-2 border-[#2AABEE] border-t-transparent rounded-full animate-spin" />
							</div>
						)}
					</div>
				</div>

				<div className="flex-1 overflow-y-auto p-3 sm:p-4">
					{searchQuery.trim() === "" ? (
						<div className="text-center text-[#7D8E98] py-6 sm:py-8">
							<div className="text-3xl sm:text-4xl mb-3 sm:mb-4">🔍</div>
							<p className="text-sm sm:text-base">
								Введіть текст для пошуку повідомлень
							</p>
						</div>
					) : isSearching ? (
						<div className="text-center text-[#7D8E98] py-6 sm:py-8">
							<div className="w-6 h-6 sm:w-8 sm:h-8 border-2 border-[#2AABEE] border-t-transparent rounded-full animate-spin mx-auto mb-3 sm:mb-4" />
							<p className="text-sm sm:text-base">Пошук...</p>
						</div>
					) : searchResults.length === 0 ? (
						<div className="text-center text-[#7D8E98] py-6 sm:py-8">
							<div className="text-3xl sm:text-4xl mb-3 sm:mb-4">😕</div>
							<p className="text-sm sm:text-base">Повідомлень не знайдено</p>
							<p className="text-xs sm:text-sm mt-2">
								Спробуйте змінити пошуковий запит
							</p>
						</div>
					) : (
						<div className="space-y-2 sm:space-y-3">
							<div className="text-xs sm:text-sm text-[#7D8E98] mb-3 sm:mb-4">
								Знайдено {searchResults.length} повідомлень
							</div>
							{searchResults.map((result) => (
								<div
									key={result.id}
									onClick={() => handleResultClick(result.id)}
									className="p-2 sm:p-3 bg-[#17212B] rounded-lg border border-[#2F3B4A] hover:bg-[#1A2332] cursor-pointer transition-colors duration-200"
								>
									<div className="flex items-center justify-between mb-1 sm:mb-2">
										<span className="text-xs sm:text-sm font-medium text-[#B8C5D1]">
											{result.sender.name}
										</span>
										<div className="flex items-center space-x-1 sm:space-x-2 text-xs text-[#7D8E98]">
											<span>{formatDate(result.createdAt)}</span>
											<span className="hidden sm:inline">•</span>
											<span>{formatTime(result.createdAt)}</span>
										</div>
									</div>
									<p className="text-xs sm:text-sm text-white leading-relaxed">
										{highlightText(result.content, searchQuery)}
									</p>
								</div>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
