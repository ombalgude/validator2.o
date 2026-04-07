const TOKEN_KEY = "validator.jwt";
const USER_KEY = "validator.user";

export function getStoredToken() {
	return localStorage.getItem(TOKEN_KEY) || "";
}

export function setStoredToken(token) {
	if (!token) {
		localStorage.removeItem(TOKEN_KEY);
		return;
	}

	localStorage.setItem(TOKEN_KEY, token);
}

export function getStoredUser() {
	const value = localStorage.getItem(USER_KEY);
	if (!value) {
		return null;
	}

	try {
		return JSON.parse(value);
	} catch (_error) {
		localStorage.removeItem(USER_KEY);
		return null;
	}
}

export function setStoredUser(user) {
	if (!user) {
		localStorage.removeItem(USER_KEY);
		return;
	}

	localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredSession() {
	localStorage.removeItem(TOKEN_KEY);
	localStorage.removeItem(USER_KEY);
}
