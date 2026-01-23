import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedLayout } from './components/ProtectedLayout';
import RoleSpecificDashboard from './pages/Dashboard';
import ProjectsOverview from './pages/ProjectsOverview';
import TeamMembers from './pages/TeamMembers';
import Leaderboard from './pages/Leaderboard';
import CompletedProjects from './pages/CompletedProjects';
import Activity from './pages/Activity';
import { Login } from './pages/Login';

export const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route element={<ProtectedLayout />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<RoleSpecificDashboard />} />
                <Route path="/projects" element={<ProjectsOverview />} />
                <Route path="/team" element={<TeamMembers />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
                <Route path="/archive" element={<CompletedProjects />} />
                <Route path="/activity" element={<Activity />} />
                {/* Fallback */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
        </Routes>
    );
};
