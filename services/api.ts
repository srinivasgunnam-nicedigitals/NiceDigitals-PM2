import axios from 'axios';
import { Project, User, ScoreEntry, Comment } from '../types';

// Create axios instance with base URL from environment variable
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor to attach the JWT token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add a response interceptor to handle 401 (Unauthorized)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            // Token is invalid or expired
            // Token is invalid or expired. Clearing session.
            localStorage.removeItem('token');
            localStorage.removeItem('nice_digital_current_user_v4'); // Clear user cache

            // Prevent infinite redirect loop if already on login
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export const backendApi = {
    // Auth
    login: async (email: string, password: string) => {
        const response = await api.post<{ user: User, token: string }>('/auth/login', { email, password });
        return response.data;
    },

    requestPasswordReset: async (email: string) => {
        const response = await api.post<{ message: string, token?: string }>('/auth/request-reset', { email });
        return response.data;
    },

    resetPassword: async (email: string, token: string, newPassword: string) => {
        const response = await api.post<{ message: string }>('/auth/reset-password', { email, token, newPassword });
        return response.data;
    },

    changePassword: async (currentPassword: string, newPassword: string) => {
        const response = await api.post<{ message: string }>('/auth/change-password', { currentPassword, newPassword });
        return response.data;
    },

    // Bootstrap data (simulates initial load)
    getBootstrapData: async () => {
        const response = await api.get<{ users: User[], projects: Project[], scores: ScoreEntry[] }>('/bootstrap');
        return response.data;
    },

    // Projects
    getProjects: async () => {
        const response = await api.get<{ data: Project[], meta: any }>('/projects');
        return response.data.data; // Extract the data array from paginated response
    },

    createProject: async (project: Partial<Project>) => {
        const response = await api.post<Project>('/projects', project);
        return response.data;
    },

    updateProject: async (id: string, updates: Partial<Project> & { newHistoryItem?: any }) => {
        const response = await api.patch<Project>(`/projects/${id}`, updates);
        return response.data;
    },

    deleteProject: async (id: string) => {
        const response = await api.delete(`/projects/${id}`);
        return response.data;
    },

    // Comments
    addComment: async (projectId: string, comment: { text: string; userId: string; id: string; timestamp: string }) => {
        const response = await api.post<Comment>(`/projects/${projectId}/comments`, comment);
        return response.data;
    },

    // Users
    getUsers: async () => {
        const response = await api.get<User[]>('/users');
        return response.data;
    },

    addUser: async (user: User) => {
        const response = await api.post<User>('/users', user);
        return response.data;
    },

    updateUser: async (userId: string, updates: Partial<User>) => {
        const response = await api.patch<User>(`/users/${userId}`, updates);
        return response.data;
    },

    deleteUser: async (id: string) => {
        await api.delete(`/users/${id}`);
    },

    // Scores
    getScores: async () => {
        const response = await api.get<ScoreEntry[]>('/scores');
        return response.data;
    },

    addScore: async (score: ScoreEntry) => {
        const response = await api.post<ScoreEntry>('/scores', score);
        return response.data;
    },

    // Rankings
    getRankings: async () => {
        const response = await api.get<any[]>('/rankings');
        return response.data;
    },

    // Notifications
    getNotifications: async () => {
        const response = await api.get<any[]>('/notifications');
        return response.data;
    },

    markNotificationAsRead: async (id: string) => {
        await api.patch(`/notifications/${id}/read`);
    },

    markAllNotificationsAsRead: async () => {
        await api.patch('/notifications/read-all');
    },

    clearNotifications: async () => {
        await api.delete('/notifications');
    }
};
