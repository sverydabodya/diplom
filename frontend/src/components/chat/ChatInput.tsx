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
		<div className="bg-[#17212B] border-t border-[#2F3B4A] flex-shrink-0 min-h-[30px]">
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

			<form
				onSubmit={handleSubmit}
				className="flex items-center space-x-2 sm:space-x-4 w-full h-full"
			>
				<input
					type="text"
					value={message}
					onChange={handleInputChange}
					onKeyPress={handleKeyPress}
					placeholder={
						replyToMessage ? "Введіть відповідь..." : "Введіть повідомлення..."
					}
					className="w-full grow h-full px-3 sm:px-4 py-2 sm:py-3 bg-[#242F3D] border border-[#2F3B4A] rounded-2xl text-white placeholder-[#7D8E98] focus:outline-none  transition-all duration-200 text-sm sm:text-base "
				/>

				<button
					type="submit"
					disabled={!message.trim()}
					className={`h-full flex-none !w-28 sm:!w-40 sm:h-full p-4 sm:p-0 transition-all duration-200 text-lg sm:text-4xl ${
						message.trim()
							? "bg-[#2AABEE] hover:bg-[#229ED9] text-white shadow-lg hover:shadow-xl transform hover:scale-105"
							: "bg-[#242F3D] text-[#7D8E98] cursor-not-allowed"
					}`}
					style={{ width: "3rem" }}
				>
					➤
				</button>
			</form>
		</div>
	);
}
