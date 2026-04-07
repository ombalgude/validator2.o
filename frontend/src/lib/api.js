import axios from "axios";
import { API_BASE_URL } from "./config";
import { getStoredToken } from "./auth-storage";

let unauthorizedHandler = null;

function injectAuthorizationHeader(config) {
	const nextConfig = { ...config };
	const token = getStoredToken();

	if (token) {
		nextConfig.headers = {
			...(nextConfig.headers || {}),
			Authorization: `Bearer ${token}`,
		};
	}

	return nextConfig;
}

function handleErrorResponse(error) {
	if (error?.response?.status === 401 && typeof unauthorizedHandler === "function") {
		unauthorizedHandler(error);
	}

	return Promise.reject(error);
}

export const api = axios.create({
	baseURL: API_BASE_URL,
});

export const publicApi = axios.create({
	baseURL: API_BASE_URL,
});

api.interceptors.request.use(injectAuthorizationHeader);
api.interceptors.response.use((response) => response, handleErrorResponse);
publicApi.interceptors.response.use((response) => response, handleErrorResponse);

export function setUnauthorizedHandler(handler) {
	unauthorizedHandler = handler;
}
