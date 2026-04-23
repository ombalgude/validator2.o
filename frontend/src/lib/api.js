import { API_BASE_URL } from "./config";
import { getStoredToken } from "./auth-storage";

let unauthorizedHandler = null;

function isAbsoluteUrl(value) {
	return /^https?:\/\//i.test(value);
}

function appendSearchParams(searchParams, params) {
	Object.entries(params || {}).forEach(([key, value]) => {
		if (value === undefined || value === null) {
			return;
		}

		if (Array.isArray(value)) {
			value.forEach((entry) => {
				searchParams.append(key, String(entry));
			});
			return;
		}

		searchParams.append(key, String(value));
	});
}

function buildUrl(path, params) {
	const normalizedPath = String(path || "");
	const baseUrl = API_BASE_URL.replace(/\/+$/, "");
	const requestUrl = isAbsoluteUrl(normalizedPath)
		? normalizedPath
		: `${baseUrl}/${normalizedPath.replace(/^\/+/, "")}`;
	const url = new URL(requestUrl);

	appendSearchParams(url.searchParams, params);

	return url.toString();
}

function createHeaders(headers, includeAuthorization) {
	const nextHeaders = new Headers(headers || {});

	if (includeAuthorization && !nextHeaders.has("Authorization")) {
		const token = getStoredToken();

		if (token) {
			nextHeaders.set("Authorization", `Bearer ${token}`);
		}
	}

	return nextHeaders;
}

function prepareBody(data, headers) {
	if (data === undefined) {
		return undefined;
	}

	// Let the browser add the multipart boundary automatically.
	if (typeof FormData !== "undefined" && data instanceof FormData) {
		headers.delete("Content-Type");
		return data;
	}

	if (
		typeof data === "string" ||
		(typeof Blob !== "undefined" && data instanceof Blob) ||
		(typeof ArrayBuffer !== "undefined" && data instanceof ArrayBuffer) ||
		(typeof URLSearchParams !== "undefined" && data instanceof URLSearchParams)
	) {
		return data;
	}

	if (!headers.has("Content-Type")) {
		headers.set("Content-Type", "application/json");
	}

	const contentType = headers.get("Content-Type") || "";

	return contentType.includes("application/json") ? JSON.stringify(data) : data;
}

async function parseResponseData(response) {
	if (response.status === 204 || response.status === 205) {
		return null;
	}

	const rawBody = await response.text();

	if (!rawBody) {
		return null;
	}

	const contentType = response.headers.get("content-type") || "";

	if (contentType.includes("application/json")) {
		try {
			return JSON.parse(rawBody);
		} catch (_error) {
			return rawBody;
		}
	}

	try {
		return JSON.parse(rawBody);
	} catch (_error) {
		return rawBody;
	}
}

function createApiError(message, response) {
	const error = new Error(message);
	error.name = "ApiError";

	if (response) {
		error.response = response;
		error.status = response.status;
	}

	return error;
}

async function request(method, path, data, config = {}, includeAuthorization = false) {
	const headers = createHeaders(config.headers, includeAuthorization);
	const response = await fetch(buildUrl(path, config.params), {
		method,
		headers,
		body: method === "GET" || method === "HEAD" ? undefined : prepareBody(data, headers),
		credentials: config.credentials,
	});
	const parsedData = await parseResponseData(response);
	const normalizedResponse = {
		data: parsedData,
		status: response.status,
		headers: response.headers,
		ok: response.ok,
	};

	if (!response.ok) {
		const error = createApiError(
			parsedData?.message || `Request failed with status ${response.status}`,
			normalizedResponse
		);

		if (response.status === 401 && typeof unauthorizedHandler === "function") {
			unauthorizedHandler(error);
		}

		throw error;
	}

	return normalizedResponse;
}

function createApiClient({ includeAuthorization }) {
	return {
		get(path, config) {
			return request("GET", path, undefined, config, includeAuthorization);
		},
		post(path, data, config) {
			return request("POST", path, data, config, includeAuthorization);
		},
		put(path, data, config) {
			return request("PUT", path, data, config, includeAuthorization);
		},
		patch(path, data, config) {
			return request("PATCH", path, data, config, includeAuthorization);
		},
		delete(path, config) {
			return request(
				"DELETE",
				path,
				config?.data,
				config,
				includeAuthorization
			);
		},
	};
}

export const api = createApiClient({
	includeAuthorization: true,
});

export const publicApi = createApiClient({
	includeAuthorization: false,
});

export function setUnauthorizedHandler(handler) {
	unauthorizedHandler = handler;
}
