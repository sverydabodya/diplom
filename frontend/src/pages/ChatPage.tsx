import { useEffect, useRef, useState } from "react";
import { useAuth } from "../components/AuthProvider";
import { useSearchParams } from "react-router-dom";
import {
	getChatById,
	getChatsByUser,
	updateOnlineStatus,
	deleteChat,
	getUnreadCount,
} from "../network/chat_api";
import ChatSidebar from "../components/chat/ChatSidebar";
import ChatHeader from "../components/chat/ChatHeader";
import ChatMessages from "../components/chat/ChatMessages";
import ChatInput from "../components/chat/ChatInput";
import ChatSearch from "../components/chat/ChatSearch";
import EmptyChat from "../components/chat/EmptyChat";
import { Message, Chat } from "../types/chat";

export default function ChatPage() {
	const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
	const [chats, setChats] = useState<Chat[]>([]);
	const [message, setMessage] = useState<string>("");
	const [isTyping, setIsTyping] = useState(false);
	const [typingUser, setTypingUser] = useState<string>("");
	const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
	const [isSearchOpen, setIsSearchOpen] = useState(false);
	const [searchResults, setSearchResults] = useState<Message[]>([]);
	const [searchQuery, setSearchQuery] = useState("");
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
	const { user } = useAuth();
	const [searchParams] = useSearchParams();
	const wsRef = useRef<WebSocket | null>(null);
	const unreadWsRef = useRef<WebSocket | null>(null);
	const [unreadCounts, setUnreadCounts] = useState<
		{ chatId: string; unreadCount: number }[]
	>([]);

	const updateChats = async () => {
		try {
			const updatedChats = await getChatsByUser();
			const unreadData = await getUnreadCount();
			setUnreadCounts(unreadData);

			const sortedChats = updatedChats.sort((a: Chat, b: Chat) => {
				const aUnreadCount =
					unreadData.find(
						(c: { chatId: string; unreadCount: number }) => c.chatId === a.id
					)?.unreadCount || 0;
				const bUnreadCount =
					unreadData.find(
						(c: { chatId: string; unreadCount: number }) => c.chatId === b.id
					)?.unreadCount || 0;

				if (aUnreadCount > 0 && bUnreadCount === 0) return -1;
				if (aUnreadCount === 0 && bUnreadCount > 0) return 1;

				const aLastMessage = a.messages?.[0];
				const bLastMessage = b.messages?.[0];

				const aDate = aLastMessage
					? new Date(aLastMessage.createdAt)
					: new Date(a.createdAt);
				const bDate = bLastMessage
					? new Date(bLastMessage.createdAt)
					: new Date(b.createdAt);

				return bDate.getTime() - aDate.getTime();
			});

			setChats(sortedChats);
		} catch (err) {
			console.error("Помилка при оновленні списку чатів:", err);
		}
	};

	useEffect(() => {
		updateChats();
	}, [user]);

	useEffect(() => {
		const chatId = searchParams.get("chat");
		if (chatId && chats.length > 0) {
			openChat(chatId);
		}
	}, [searchParams, chats]);

	useEffect(() => {
		const handleResize = () => {
			if (window.innerWidth >= 768 && isMobileMenuOpen) {
				setIsMobileMenuOpen(false);
			}
		};

		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, [isMobileMenuOpen]);

	useEffect(() => {
		if (!user) return;

		if (unreadWsRef.current) {
			unreadWsRef.current.close();
		}

		const ws = new WebSocket(`${import.meta.env.VITE_WSHOST}/api/chat/unread`);
		unreadWsRef.current = ws;

		ws.onopen = () => {};

		ws.onmessage = (event) => {
			const data = JSON.parse(event.data);

			if (data.type === "unread_update") {
				updateChats();
			}
		};

		ws.onclose = () => {};

		return () => {
			ws.close();
		};
	}, [user]);

	useEffect(() => {
		if (!selectedChat) return;

		if (wsRef.current) {
			wsRef.current.close();
		}

		const ws = new WebSocket(
			`${import.meta.env.VITE_WSHOST}/api/chat/${selectedChat.id}`
		);
		wsRef.current = ws;

		ws.onopen = () => {};

		ws.onmessage = (event) => {
			const data = JSON.parse(event.data);

			if (data.type === "new_message") {
				const newMsg: Message = data.message;
				setSelectedChat((prev) => {
					if (!prev) return prev;
					return {
						...prev,
						messages: [...(prev.messages || []), newMsg],
					};
				});
				updateChats();
			} else if (data.type === "delete_message") {
				setSelectedChat((prev) => {
					if (!prev) return prev;
					return {
						...prev,
						messages: (prev.messages || []).filter(
							(msg) => msg.id !== data.messageId
						),
					};
				});
				updateChats();
			} else if (data.type === "message_read") {
				setSelectedChat((prev) => {
					if (!prev) return prev;
					return {
						...prev,
						messages: (prev.messages || []).map((msg) =>
							msg.id === data.messageId
								? {
										...msg,
										isRead: true,
										readAt: data.message?.readAt || new Date(),
								  }
								: msg
						),
					};
				});
				updateChats();
			} else if (data.type === "all_messages_read") {
				setSelectedChat((prev) => {
					if (!prev) return prev;
					return {
						...prev,
						messages: (prev.messages || []).map((msg) => {
							const updatedMessage = data.updatedMessages?.find(
								(updated: any) => updated.id === msg.id
							);

							if (updatedMessage) {
								return {
									...msg,
									isRead: true,
									readAt: updatedMessage.readAt,
								};
							}

							return msg;
						}),
					};
				});
				updateChats();
			} else if (data.type === "chat_deleted") {
				if (selectedChat?.id === data.chatId) {
					setSelectedChat(null);
				}
				updateChats();
			} else if (data.type === "typing_start") {
				if (data.userId !== user?.id) {
					setIsTyping(true);
					setTypingUser(data.userName);
				}
			} else if (data.type === "typing_stop") {
				if (data.userId !== user?.id) {
					setIsTyping(false);
					setTypingUser("");
				}
			} else if (data.type === "user_status_update") {
				updateChats();
			} else if (data.type === "chat_name_updated") {
				if (selectedChat?.id === data.chatId) {
					setSelectedChat((prev) => {
						if (!prev) return prev;
						return {
							...prev,
							name: data.newName,
						};
					});
				}
				updateChats();
			} else if (data.type === "user_added_to_chat") {
				if (selectedChat?.id === data.chatId) {
					handleChatUpdate();
				}
			} else if (data.type === "user_removed_from_chat") {
				if (selectedChat?.id === data.chatId) {
					handleChatUpdate();
				}
			}
		};

		ws.onclose = () => {
			setIsTyping(false);
			setTypingUser("");
		};

		return () => {
			ws.close();
		};
	}, [selectedChat]);

	const handleSendMessage = (message: string, replyToId?: string) => {
		if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

		wsRef.current.send(
			JSON.stringify({
				type: "message",
				content: message,
				replyToId: replyToId,
			})
		);

		setIsTyping(false);
		setTypingUser("");
		setReplyToMessage(null);
	};

	const handleReplyToMessage = (message: Message) => {
		setReplyToMessage(message);
	};

	const handleCancelReply = () => {
		setReplyToMessage(null);
	};

	const handleTypingStart = () => {
		if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

		wsRef.current.send(
			JSON.stringify({
				type: "typing_start",
			})
		);
	};

	const handleTypingStop = () => {
		if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

		wsRef.current.send(
			JSON.stringify({
				type: "typing_stop",
			})
		);
	};

	const openChat = async (id: string) => {
		if (id === "home") {
			setSelectedChat(null);
			setIsMobileMenuOpen(false);
			return;
		}
		try {
			const chat = await getChatById(id);
			setSelectedChat(chat);
			setIsTyping(false);
			setTypingUser("");
			setIsMobileMenuOpen(false);
		} catch (err) {
			console.error("Не вдалося завантажити чат", err);
		}
	};

	const handleMessageDelete = (messageId: string) => {
		setSelectedChat((prev) => {
			if (!prev) return prev;
			return {
				...prev,
				messages: (prev.messages || []).filter((msg) => msg.id !== messageId),
			};
		});
	};

	const handleUnreadCountUpdate = () => {
		updateChats();
	};

	const handleDeleteChat = async (chatId: string) => {
		try {
			await deleteChat(chatId);
			if (selectedChat?.id === chatId) {
				setSelectedChat(null);
			}
			updateChats();
		} catch (error) {
			console.error("Помилка при видаленні чату:", error);
		}
	};

	const handleChatUpdate = async () => {
		if (selectedChat) {
			try {
				const updatedChat = await getChatById(selectedChat.id);
				setSelectedChat(updatedChat);
			} catch (error) {
				console.error("Помилка при оновленні чату:", error);
				if (error instanceof Error && error.message.includes("403")) {
					setSelectedChat(null);
				}
			}
		}
		updateChats();
	};

	useEffect(() => {
		if (user) {
			updateOnlineStatus(true);

			const handleBeforeUnload = () => {
				updateOnlineStatus(false);
			};

			window.addEventListener("beforeunload", handleBeforeUnload);

			return () => {
				window.removeEventListener("beforeunload", handleBeforeUnload);
				updateOnlineStatus(false);
			};
		}
	}, [user]);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.ctrlKey || e.metaKey) && e.key === "f") {
				e.preventDefault();
				if (selectedChat) {
					handleSearchClick();
				}
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [selectedChat]);

	const handleSearchClick = () => {
		setIsSearchOpen(true);
	};

	const handleSearchClose = () => {
		setIsSearchOpen(false);
		setSearchResults([]);
		setSearchQuery("");
	};

	const handleSearch = (query: string) => {
		setSearchQuery(query);

		if (!selectedChat || !query.trim()) {
			setSearchResults([]);
			return;
		}

		const messages = selectedChat.messages || [];
		const filteredMessages = messages.filter((msg) => {
			const contentMatch = msg.content
				.toLowerCase()
				.includes(query.toLowerCase());
			const senderMatch = msg.sender.name
				.toLowerCase()
				.includes(query.toLowerCase());
			return contentMatch || senderMatch;
		});

		setSearchResults(filteredMessages);
	};

	const handleSearchResultClick = (messageId: string) => {
		const messageElement = document.querySelector(
			`[data-message-id="${messageId}"]`
		);
		if (messageElement) {
			messageElement.scrollIntoView({
				behavior: "smooth",
				block: "center",
			});

			messageElement.classList.add("search-highlight");
			setTimeout(() => {
				messageElement.classList.remove("search-highlight");
			}, 2000);
		}
	};

	return (
		<div className="flex h-screen w-screen bg-[#17212B]">
			<div className="md:hidden fixed top-4 left-4 z-50">
				<button
					onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
					className="w-10 h-10 rounded-full bg-[#2AABEE] hover:bg-[#1E8BC3] flex items-center justify-center transition-all duration-200 text-white"
				>
					{isMobileMenuOpen ? "✕" : "☰"}
				</button>
			</div>

			<div className="md:hidden">
				<div
					className={`${
						isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
					} transition-transform duration-300 ease-in-out fixed inset-y-0 left-0 z-40`}
				>
					<ChatSidebar
						chats={chats}
						selectedChat={selectedChat}
						onChatSelect={openChat}
						onUnreadCountUpdate={handleUnreadCountUpdate}
					/>
				</div>

				{isMobileMenuOpen && (
					<div
						className="fixed inset-0 bg-black bg-opacity-50 z-30"
						onClick={() => setIsMobileMenuOpen(false)}
					/>
				)}
			</div>

			<div className="hidden md:block">
				<ChatSidebar
					chats={chats}
					selectedChat={selectedChat}
					onChatSelect={openChat}
					onUnreadCountUpdate={handleUnreadCountUpdate}
				/>
			</div>

			<div className="flex-1 h-screen flex flex-col overflow-hidden bg-[#0E1621]">
				{selectedChat ? (
					<>
						<ChatHeader
							chat={selectedChat}
							onDeleteChat={handleDeleteChat}
							onChatUpdate={handleChatUpdate}
							onSearchClick={handleSearchClick}
							onMobileMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
						/>
						<ChatMessages
							messages={selectedChat.messages || []}
							currentUserId={user?.id || ""}
							chatId={selectedChat.id}
							onMessageDelete={handleMessageDelete}
							onReplyToMessage={handleReplyToMessage}
							isTyping={isTyping}
							typingUser={typingUser}
							searchQuery={searchQuery}
						/>
						<ChatInput
							onSendMessage={handleSendMessage}
							onTypingStart={handleTypingStart}
							onTypingStop={handleTypingStop}
							replyToMessage={replyToMessage}
							onCancelReply={handleCancelReply}
						/>
					</>
				) : (
					<EmptyChat />
				)}
			</div>

			<ChatSearch
				isOpen={isSearchOpen}
				onClose={handleSearchClose}
				onSearch={handleSearch}
				searchResults={searchResults}
				onResultClick={handleSearchResultClick}
			/>
		</div>
	);
}
