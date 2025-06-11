import { User } from "../types/User";

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

export async function getLoggedInUser(): Promise<User> {
	try {
		const response = await fetchData(`${import.meta.env.VITE_HOST}/api/auth`, {
			method: "GET",
		});
		return response.json();
	} catch (error) {
		// Якщо отримуємо 401, це означає, що користувач не авторизований
		if (error instanceof Error && error.message.includes("401")) {
			throw new Error("Unauthorized");
		}
		throw error;
	}
}

export async function signOut(): Promise<void> {
	try {
		await fetchData(`${import.meta.env.VITE_HOST}/api/auth/signout`, {
			method: "POST",
		});
	} catch (error) {
		console.warn("Сервер недоступний, виконуємо локальне очищення:", error);
	}

	// Видаляємо кукі на клієнтській стороні
	const cookiesToDelete = [
		"connect.sid=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;",
		"connect.sid=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=localhost;",
		"connect.sid=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.localhost;",
	];

	cookiesToDelete.forEach((cookie) => {
		document.cookie = cookie;
	});

	// Очищаємо локальне сховище
	localStorage.clear();
	sessionStorage.clear();
}

export async function login(email: string, password: string) {
	const res = await fetch(`${import.meta.env.VITE_HOST}/api/auth/signin`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include",
		body: JSON.stringify({
			email,
			pass: password,
		}),
	});

	if (!res.ok) {
		const text = await res.text();
		throw new Error(text || "Помилка авторизації");
	}

	return res.json();
}

export async function register(name: string, email: string, password: string) {
	const res = await fetch(`${import.meta.env.VITE_HOST}/api/auth/signup`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include",
		body: JSON.stringify({
			name,
			email,
			pass: password,
		}),
	});

	if (!res.ok) {
		const text = await res.text();
		throw new Error(text || "Помилка реєстрації");
	}

	return res.json();
}

export async function updateProfile(name: string, email: string) {
	const res = await fetch(`${import.meta.env.VITE_HOST}/api/auth/profile`, {
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include",
		body: JSON.stringify({
			name,
			email,
		}),
	});

	if (!res.ok) {
		const text = await res.text();
		throw new Error(text || "Помилка оновлення профілю");
	}

	return res.json();
}

export async function updatePassword(
	currentPassword: string,
	newPassword: string
) {
	const res = await fetch(`${import.meta.env.VITE_HOST}/api/auth/password`, {
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include",
		body: JSON.stringify({
			currentPassword,
			newPassword,
		}),
	});

	if (!res.ok) {
		const text = await res.text();
		throw new Error(text || "Помилка зміни паролю");
	}

	return res.json();
}
