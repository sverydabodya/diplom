import { useState, useEffect, useRef } from "react";
import { Message } from "../../types/chat";

interface ChatInputProps {
	onSendMessage: (message: string, replyToId?: string) => void;
	onTypingStart?: () => void;
	onTypingStop?: () => void;
	replyToMessage?: Message | null;
	onCancelReply?: () => void;
}

export default function ChatInput({
	onSendMessage,
	onTypingStart,
	onTypingStop,
	replyToMessage,
	onCancelReply,
}: ChatInputProps) {
	const [message, setMessage] = useState("");
	const [isTyping, setIsTyping] = useState(false);
	const typingTimeoutRef = useRef<number | null>(null);

	useEffect(() => {
		return () => {
			if (typingTimeoutRef.current) {
				clearTimeout(typingTimeoutRef.current);
			}
		};
	}, []);

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		setMessage(value);

		// Відправляємо статус "друкує"
		if (value.trim() && !isTyping) {
			setIsTyping(true);
			onTypingStart?.();
		} else if (!value.trim() && isTyping) {
			setIsTyping(false);
			onTypingStop?.();
		}

		// Скидаємо таймер
		if (typingTimeoutRef.current) {
			clearTimeout(typingTimeoutRef.current);
		}

		// Встановлюємо новий таймер
		typingTimeoutRef.current = setTimeout(() => {
			setIsTyping(false);
			onTypingStop?.();
		}, 1000);
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (message.trim()) {
			onSendMessage(message, replyToMessage?.id);
			setMessage("");

			// Скидаємо статус "друкує"
			setIsTyping(false);
			onTypingStop?.();

			if (typingTimeoutRef.current) {
				clearTimeout(typingTimeoutRef.current);
			}
		}
	};

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSubmit(e);
		}
	};

	const handleCancelReply = () => {
		onCancelReply?.();
	};

	return (
		<div className="bg-[#17212B] border-t border-[#2F3B4A] flex-shrink-0">
			{/* Показуємо повідомлення, на яке відповідаємо */}
			{replyToMessage && (
				<div className="px-3 sm:px-6 py-2 bg-[#242F3D] border-b border-[#2F3B4A]">
					<div className="flex items-center justify-between">
						<div className="flex items-center space-x-2">
							<span className="text-[#2AABEE] text-sm">
								↩️ Відповідаєте на повідомлення
							</span>
							<span className="text-[#7D8E98] text-sm hidden sm:inline">•</span>
							<span className="text-[#B8C5D1] text-sm font-medium">
								{replyToMessage.sender.name}
							</span>
						</div>
						<button
							onClick={handleCancelReply}
							className="text-[#7D8E98] hover:text-[#B8C5D1] transition-colors duration-200"
							title="Скасувати відповідь"
						>
							✕
						</button>
					</div>
					<div className="mt-1 text-[#7D8E98] text-sm truncate max-w-md">
						{replyToMessage.content}
					</div>
				</div>
			)}

			<div className="h-16 sm:h-20 flex items-center px-3 sm:px-6">
				<form
					onSubmit={handleSubmit}
					className="flex items-center space-x-2 sm:space-x-4 w-full max-w-4xl mx-auto"
				>
					<div className="flex-1 relative">
						<input
							type="text"
							value={message}
							onChange={handleInputChange}
							onKeyPress={handleKeyPress}
							placeholder={
								replyToMessage
									? "Введіть відповідь..."
									: "Введіть повідомлення..."
							}
							className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-[#242F3D] border border-[#2F3B4A] rounded-2xl text-white placeholder-[#7D8E98] focus:outline-none focus:border-[#2AABEE] focus:ring-2 focus:ring-[#2AABEE] focus:ring-opacity-20 transition-all duration-200 text-sm sm:text-base"
						/>
					</div>
					<button
						type="submit"
						disabled={!message.trim()}
						className={`p-2 sm:p-3 rounded-full transition-all duration-200 text-sm sm:text-base ${
							message.trim()
								? "bg-[#2AABEE] hover:bg-[#229ED9] text-white shadow-lg hover:shadow-xl transform hover:scale-105"
								: "bg-[#242F3D] text-[#7D8E98] cursor-not-allowed"
						}`}
					>
						відправити
					</button>
				</form>
			</div>
		</div>
	);
}
