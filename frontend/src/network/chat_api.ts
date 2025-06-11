async function fetchData(input: RequestInfo, init?: RequestInit) {
	const response = await fetch(input, { credentials: "include", ...init });
	if (response.ok) {
		return response;
	} else {
		const errorBody = await response.json();
		const errorMessage = errorBody.error;

		throw Error(
			"Request failed with status: " +
				response.status +
				" message: " +
				errorMessage
		);
	}
}

export const getChatsByUser = async () => {
	const response = await fetchData(
		`${import.meta.env.VITE_HOST}/api/chat/user`,
		{ method: "GET" }
	);

	return response.json();
};

export const getChatById = async (id: string) => {
	const response = await fetchData(
		`${import.meta.env.VITE_HOST}/api/chat/${id}`,
		{ method: "GET" }
	);

	return response.json();
};

export const deleteMessage = async (chatId: string, messageId: string) => {
	const response = await fetchData(
		`${import.meta.env.VITE_HOST}/api/chat/${chatId}/message/${messageId}`,
		{ method: "DELETE" }
	);

	return response.json();
};

export const deleteChat = async (chatId: string) => {
	const response = await fetchData(
		`${import.meta.env.VITE_HOST}/api/chat/${chatId}`,
		{ method: "DELETE" }
	);

	return response.json();
};

export async function searchUsers(query: string) {
	const response = await fetchData(
		`${import.meta.env.VITE_HOST}/api/users/search?q=${encodeURIComponent(
			query
		)}`,
		{
			method: "GET",
		}
	);

	return response.json();
}

export async function createChat(userIds: string[], name?: string) {
	const body: any = {};

	body.userIds = userIds;

	body.userIds = userIds;
	body.name = name;

	console.log(body);

	const response = await fetchData(
		`${import.meta.env.VITE_HOST}/api/chat/create`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(body),
		}
	);

	return response.json();
}

export const markMessageAsRead = async (messageId: string) => {
	const response = await fetchData(
		`${import.meta.env.VITE_HOST}/api/chat/message/${messageId}/read`,
		{ method: "PUT" }
	);

	return response.json();
};

export const markAllMessagesAsRead = async (chatId: string) => {
	const response = await fetchData(
		`${import.meta.env.VITE_HOST}/api/chat/${chatId}/read-all`,
		{ method: "PUT" }
	);

	return response.json();
};

export const getUnreadCount = async () => {
	const response = await fetchData(
		`${import.meta.env.VITE_HOST}/api/chat/unread/count`,
		{ method: "GET" }
	);

	return response.json();
};

export const updateOnlineStatus = async (isOnline: boolean) => {
	const response = await fetchData(
		`${import.meta.env.VITE_HOST}/api/users/online-status`,
		{
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ isOnline }),
		}
	);

	return response.json();
};

export const getOnlineUsers = async () => {
	const response = await fetchData(
		`${import.meta.env.VITE_HOST}/api/users/online`,
		{ method: "GET" }
	);

	return response.json();
};

export async function leaveGroupChat(chatId: string) {
	const response = await fetchData(
		`${import.meta.env.VITE_HOST}/api/chat/${chatId}/leave`,
		{
			method: "POST",
		}
	);

	return response.json();
}

export async function updateChatName(chatId: string, name: string) {
	const response = await fetchData(
		`${import.meta.env.VITE_HOST}/api/chat/${chatId}/name`,
		{
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ name }),
		}
	);

	return response.json();
}

export async function addUserToChat(chatId: string, userId: string) {
	const response = await fetchData(
		`${import.meta.env.VITE_HOST}/api/chat/${chatId}/users`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ userId }),
		}
	);

	return response.json();
}

export async function removeUserFromChat(chatId: string, userId: string) {
	const response = await fetchData(
		`${import.meta.env.VITE_HOST}/api/chat/${chatId}/users/${userId}`,
		{
			method: "DELETE",
		}
	);

	return response.json();
}
