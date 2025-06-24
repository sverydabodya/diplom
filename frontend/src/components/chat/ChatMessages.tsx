import { useRef, useEffect, useState } from "react";
import { useAuth } from "../AuthProvider";
import { Message } from "../../types/chat";
import {
	deleteMessage,
	markMessageAsRead,
	markAllMessagesAsRead,
} from "../../network/chat_api";
import MessageContextMenu from "./MessageContextMenu";

interface ChatMessagesProps {
	messages: Message[];
	currentUserId: string;
	chatId: string;
	onMessageDelete: (messageId: string) => void;
	onReplyToMessage: (message: Message) => void;
	isTyping?: boolean;
	typingUser?: string;
	searchQuery?: string;
}

interface ContextMenuState {
	messageId: string;
	messageContent: string;
	x: number;
	y: number;
}

export default function ChatMessages({
	messages,
	currentUserId,
	chatId,
	onMessageDelete,
	onReplyToMessage,
	isTyping = false,
	typingUser = "",
	searchQuery = "",
}: ChatMessagesProps) {
	const { user } = useAuth();
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
	const [isDeleting, setIsDeleting] = useState<string | null>(null);
	const [readMessages, setReadMessages] = useState<Set<string>>(new Set());
	const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages, isTyping]);

	useEffect(() => {
		setReadMessages(new Set());
	}, [chatId]);

	useEffect(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						const messageId = entry.target.getAttribute("data-message-id");
						if (messageId && !readMessages.has(messageId)) {
							handleMessageRead(messageId);
							setReadMessages((prev) => new Set(prev).add(messageId));
						}
					}
				});
			},
			{
				root: null,
				rootMargin: "0px",
				threshold: 0.5,
			}
		);

		messageRefs.current.forEach((element, messageId) => {
			const senderId = element.getAttribute("data-sender-id");
			const isRead = element.getAttribute("data-is-read") === "true";

			if (
				senderId !== currentUserId &&
				!isRead &&
				!readMessages.has(messageId)
			) {
				observer.observe(element);
			}
		});

		return () => {
			observer.disconnect();
		};
	}, [messages, currentUserId]);

	const handleMessageRead = async (messageId: string) => {
		try {
			await markMessageAsRead(messageId);
		} catch (error) {
			console.error(
				"Помилка при позначенні повідомлення як прочитаного:",
				error
			);
		}
	};

	const setMessageRef = (element: HTMLDivElement | null, messageId: string) => {
		if (element) {
			messageRefs.current.set(messageId, element);
		} else {
			messageRefs.current.delete(messageId);
		}
	};

	useEffect(() => {
		const markMessagesAsRead = async () => {
			try {
				const unreadMessages = messages.filter(
					(msg) => msg.sender.id !== currentUserId && !msg.isRead
				);

				if (unreadMessages.length > 0) {
					setTimeout(async () => {
						try {
							await markAllMessagesAsRead(chatId);
						} catch (error) {
							console.error(
								"Помилка при позначенні повідомлень як переглянутих:",
								error
							);
						}
					}, 2000);
				}
			} catch (error) {
				console.error(
					"Помилка при позначенні повідомлень як переглянутих:",
					error
				);
			}
		};

		if (messages.length > 0) {
			markMessagesAsRead();
		}
	}, [chatId, messages.length, currentUserId]);

	useEffect(() => {
		const handleContextMenu = (e: MouseEvent) => {
			e.preventDefault();
		};

		document.addEventListener("contextmenu", handleContextMenu);
		return () => {
			document.removeEventListener("contextmenu", handleContextMenu);
		};
	}, []);

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

	const getReadStatusText = (message: Message) => {
		if (message.sender.id === currentUserId) {
			if (message.isRead) {
				const readTime = message.readAt ? formatTime(message.readAt) : "";
				return `Повідомлення прочитано${readTime ? ` о ${readTime}` : ""}`;
			} else {
				return "Повідомлення доставлено";
			}
		} else {
			if (message.isRead) {
				const readTime = message.readAt ? formatTime(message.readAt) : "";
				return `Ви прочитали це повідомлення${
					readTime ? ` о ${readTime}` : ""
				}`;
			} else {
				return "Нове повідомлення";
			}
		}
	};

	const handleContextMenu = (
		e: React.MouseEvent,
		messageId: string,
		content: string
	) => {
		e.preventDefault();
		setContextMenu({
			messageId,
			messageContent: content,
			x: e.clientX,
			y: e.clientY,
		});
	};

	const handleReplyToMessage = (message: Message) => {
		onReplyToMessage(message);
		setContextMenu(null);
	};

	const handleDeleteMessage = async (messageId: string) => {
		try {
			setIsDeleting(messageId);
			await deleteMessage(chatId, messageId);
			setContextMenu(null);
		} catch (error) {
			console.error("Помилка при видаленні повідомлення:", error);
		} finally {
			setIsDeleting(null);
		}
	};

	const filterMessages = (messages: Message[], query: string) => {
		if (!query.trim()) return messages;

		return messages.filter(
			(message) =>
				message.content.toLowerCase().includes(query.toLowerCase()) ||
				message.sender.name.toLowerCase().includes(query.toLowerCase())
		);
	};

	const groupMessagesByDate = (messages: Message[]) => {
		const groups: { [key: string]: Message[] } = {};

		messages.forEach((message) => {
			const date = formatDate(message.createdAt);
			if (!groups[date]) {
				groups[date] = [];
			}
			groups[date].push(message);
		});

		return groups;
	};

	const filteredMessages = filterMessages(messages, searchQuery);
	const messageGroups = groupMessagesByDate(filteredMessages);

	const highlightText = (text: string, query: string) => {
		if (!query.trim()) return text;

		const regex = new RegExp(`(${query})`, "gi");
		const parts = text.split(regex);

		return parts.map((part, index) =>
			regex.test(part) ? (
				<span
					key={index}
					className="bg-yellow-500 bg-opacity-50 text-black px-1 rounded"
				>
					{part}
				</span>
			) : (
				part
			)
		);
	};

	return (
		<div className="flex-1 overflow-y-auto px-2 sm:px-4 py-4 sm:py-6 bg-[#0E1621]">
			{searchQuery && (
				<div className="mb-4 p-3 bg-[#242F3D] rounded-lg border border-[#2F3B4A]">
					<p className="text-sm text-[#B8C5D1]">
						Знайдено {filteredMessages.length} повідомлень для "{searchQuery}"
					</p>
				</div>
			)}

			<div className="space-y-4 max-w-4xl mx-auto">
				{Object.entries(messageGroups).map(([date, dateMessages]) => (
					<div key={date}>
						<div className="flex justify-center mb-4 mt-5" style={{ marginTop: "0.5rem" }}>
							<div
								className="bg-[#242F3D] px-3 py-1 rounded-full text-xs text-[#7D8E98]"
								style={{ padding: "0.2rem" }}
							>
								{date}
							</div>
						</div>
						{dateMessages.map((msg, index) => {
							const isLastOutgoing =
								msg.sender.id === currentUserId &&
								index === dateMessages.length - 1;
							return (
								<div
									key={msg.id}
									ref={(element) => setMessageRef(element, msg.id)}
									className={`flex ${
										msg.sender.id === currentUserId
											? "justify-end"
											: "justify-start"
									} ${isLastOutgoing ? "slide-in-right" : ""}`}
									data-message-id={msg.id}
									data-sender-id={msg.sender.id}
									data-is-read={msg.isRead}
									onContextMenu={(e) => {
										handleContextMenu(e, msg.id, msg.content);
									}}
								>
									<div
										className={`max-w-[85%] sm:max-w-[70%] !p-5 ${
											msg.sender.id === currentUserId
												? "message-bubble-out"
												: "message-bubble-in"
										} relative group transition-all duration-200 hover:opacity-90 `}
									>
										{msg.replyTo && (
											<div className="mb-2 p-2 bg-[#1A2332] rounded-lg border-l-2 border-[#2AABEE] ">
												<div className="flex items-center space-x-2 mb-1">
													<span className="text-[#2AABEE] text-xs">↩️</span>
													<span className="text-[#7D8E98] text-xs">
														{msg.replyTo.sender.name}
													</span>
												</div>
												<p className="text-xs text-[#B8C5D1] truncate">
													{msg.replyTo.content}
												</p>
											</div>
										)}

										{msg.sender.id !== currentUserId && (
											<p className="text-xs text-[#7D8E98] mb-2 font-medium">
												{msg.sender.name}
											</p>
										)}
										<p className="text-sm leading-relaxed whitespace-pre-wrap break-words text-left">
											{highlightText(msg.content, searchQuery)}
										</p>
										<div className="flex items-center justify-end mt-2">
											<p
												className="text-xs opacity-70"
												style={{ marginRight: "0.4rem" }}
											>
												{formatTime(msg.createdAt)}
											</p>
											{msg.sender.id === currentUserId && (
												<div
													className="flex items-center"
													title={getReadStatusText(msg)}
												>
													<span
														className={`text-xs ${
															msg.isRead ? "text-green-400" : "text-blue-300"
														}`}
														style={{ marginRight: "0.2rem" }}
													>
														✓
													</span>
													<span
														className={`text-xs ${
															msg.isRead ? "text-green-400" : "text-blue-300"
														}`}
													>
														{msg.isRead ? "Прочитано" : "Доставлено"}
													</span>
												</div>
											)}
										</div>
									</div>
								</div>
							);
						})}
					</div>
				))}

				{isTyping && (
					<div className="flex justify-start">
						<div className="message-bubble-in p-3">
							<div className="typing-indicator">
								<span className="text-xs text-[#7D8E98]">
									{typingUser} друкує
								</span>
								<div className="typing-dots">
									<div className="typing-dot"></div>
									<div className="typing-dot"></div>
									<div className="typing-dot"></div>
								</div>
							</div>
						</div>
					</div>
				)}

				<div ref={messagesEndRef} />
			</div>

			{contextMenu && (
				<MessageContextMenu
					x={contextMenu.x}
					y={contextMenu.y}
					onClose={() => setContextMenu(null)}
					onDelete={() => handleDeleteMessage(contextMenu.messageId)}
					onReply={() => {
						const message = messages.find(
							(m) => m.id === contextMenu.messageId
						);
						if (message) {
							handleReplyToMessage(message);
						}
					}}
					messageContent={contextMenu.messageContent}
				/>
			)}
		</div>
	);
}
