import React, { createContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { api, publicApi, setUnauthorizedHandler } from "../lib/api";
import {
	clearStoredSession,
	getStoredToken,
	getStoredUser,
	setStoredToken,
	setStoredUser,
} from "../lib/auth-storage";
import { SOCKET_URL } from "../lib/config";
import { normalizeUser } from "../lib/normalizers";

export const AuthContext = createContext(null);

function getInstitutionId(user) {
	return user?.institution?.id || user?.institutionId || null;
}

export function AuthProvider({ children }) {
	const [token, setToken] = useState(() => getStoredToken());
	const [user, setUser] = useState(() => getStoredUser());
	const [isBootstrapping, setIsBootstrapping] = useState(true);
	const [lastStatusUpdate, setLastStatusUpdate] = useState(null);
	const socketRef = useRef(null);

	function clearSessionState() {
		clearStoredSession();
		setToken("");
		setUser(null);
	}

	async function loadCurrentUser(nextToken) {
		const response = await publicApi.get("/auth/me", {
			headers: {
				Authorization: `Bearer ${nextToken}`,
			},
		});

		const normalizedUser = normalizeUser(response.data);
		setStoredUser(normalizedUser);
		setUser(normalizedUser);
		return normalizedUser;
	}

	async function login(credentials) {
		const response = await publicApi.post("/auth/login", credentials);
		const nextToken = response.data?.token;

		if (!nextToken) {
			throw new Error("Authentication token missing from response");
		}

		setStoredToken(nextToken);
		setToken(nextToken);
		return loadCurrentUser(nextToken);
	}

	async function register(payload) {
		const response = await publicApi.post("/auth/register", payload);
		const nextToken = response.data?.token;

		if (!nextToken) {
			throw new Error("Authentication token missing from response");
		}

		setStoredToken(nextToken);
		setToken(nextToken);
		return loadCurrentUser(nextToken);
	}

	function logout() {
		clearSessionState();
	}

	async function refreshUser() {
		const nextToken = getStoredToken();
		if (!nextToken) {
			return null;
		}

		return loadCurrentUser(nextToken);
	}

	useEffect(() => {
		setUnauthorizedHandler(() => {
			clearSessionState();
		});

		return () => {
			setUnauthorizedHandler(null);
		};
	}, []);

	useEffect(() => {
		let isActive = true;
		const nextToken = getStoredToken();

		if (!nextToken) {
			setIsBootstrapping(false);
			return undefined;
		}

		loadCurrentUser(nextToken)
			.catch(() => {
				if (isActive) {
					clearSessionState();
				}
			})
			.finally(() => {
				if (isActive) {
					setIsBootstrapping(false);
				}
			});

		return () => {
			isActive = false;
		};
	}, []);

	useEffect(() => {
		if (!token || !user?.id) {
			if (socketRef.current) {
				socketRef.current.disconnect();
				socketRef.current = null;
			}
			return undefined;
		}

		const socket = io(SOCKET_URL, {
			transports: ["websocket", "polling"],
		});

		socket.on("connect", () => {
			socket.emit("authenticate", {
				userId: user.id,
				role: user.role,
				institutionId: getInstitutionId(user),
			});
		});

		socket.on("status_update", (payload) => {
			setLastStatusUpdate({
				...payload,
				receivedAt: Date.now(),
			});
		});

		socketRef.current = socket;

		return () => {
			socket.disconnect();
			if (socketRef.current === socket) {
				socketRef.current = null;
			}
		};
	}, [token, user?.id, user?.role, user?.institutionId, user?.institution?.id]);

	return (
		<AuthContext.Provider
			value={{
				token,
				user,
				isBootstrapping,
				isAuthenticated: Boolean(token && user?.id),
				lastStatusUpdate,
				login,
				register,
				refreshUser,
				logout,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
}
