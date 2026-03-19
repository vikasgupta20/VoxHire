const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8787/api";
const AUTH_USERS_KEY = "voxhire_auth_users";
const AUTH_SESSION_KEY = "voxhire_auth_session";

const readJson = (key, fallback) => {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
};

const writeJson = (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
};

const getUsers = () => readJson(AUTH_USERS_KEY, []);

const setUsers = (users) => {
    writeJson(AUTH_USERS_KEY, users);
};

export const getAuthSession = () => readJson(AUTH_SESSION_KEY, null);

const setAuthSession = (user) => {
    writeJson(AUTH_SESSION_KEY, user);
};

export const clearAuthSession = () => {
    localStorage.removeItem(AUTH_SESSION_KEY);
};

const postJson = async (path, body) => {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || `Request failed (${response.status})`);
    }

    return response.json();
};

export const signUpLocal = ({ username, password }) => {
    const cleanUsername = username.trim();

    if (!cleanUsername || !password) {
        throw new Error("Username and password are required.");
    }

    const users = getUsers();
    const exists = users.some(
        (user) => user.username.toLowerCase() === cleanUsername.toLowerCase(),
    );

    if (exists) {
        throw new Error("Username already exists. Please sign in.");
    }

    const newUser = { username: cleanUsername, password };
    users.push(newUser);
    setUsers(users);
    setAuthSession({ username: cleanUsername });
    return { user: { username: cleanUsername } };
};

export const signInLocal = ({ username, password }) => {
    const cleanUsername = username.trim();
    const users = getUsers();
    const matchedUser = users.find(
        (user) =>
            user.username.toLowerCase() === cleanUsername.toLowerCase() &&
            user.password === password,
    );

    if (!matchedUser) {
        throw new Error("Invalid username or password.");
    }

    setAuthSession({ username: matchedUser.username });
    return { user: { username: matchedUser.username } };
};

export const generateResume = async ({ spokenInput, language }) =>
    postJson("/resume", { spokenInput, language });

export const fetchInterviewQuestion = async ({
    mode,
    history,
    lastAnswer,
    askedQuestions,
    language,
}) =>
    postJson("/interview/question", {
        mode,
        history,
        lastAnswer,
        askedQuestions,
        language,
    });

export const fetchFeedback = async ({ answer, role, language }) =>
    postJson("/interview/feedback", { answer, role, language });

export const improveAnswer = async ({ answer, mode, language }) =>
    postJson("/interview/improve", { answer, mode, language });

export const synthesizeSpeech = async ({ text, voiceId }) =>
    postJson("/tts", { text, voiceId });
