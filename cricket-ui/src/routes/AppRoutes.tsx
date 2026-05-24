import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";

import MainLayout from "../layouts/MainLayout";
import ProtectedRoute from "../components/ProtectedRoute";

import Home from "../pages/Home";
import Landing from "../pages/Landing";
import Login from "../pages/Login";
import Matches from "../pages/Matches";
import CreateMatch from "../pages/CreateMatch";
import MatchDetail from "../pages/MatchDetail";
import MatchPlayerSetup from "../pages/MatchPlayerSetup";
import MatchPickToss from "../pages/MatchPickToss";
import MatchPlayerDraft from "../pages/MatchPlayerDraft";
import MatchCaptainSelection from "../pages/MatchCaptainSelection";
import MatchToss from "../pages/MatchToss";
import Teams from "../pages/Teams";
import TeamDetail from "../pages/TeamDetail";
import Signup from "../pages/Signup";
import Profile from "../pages/Profile";
import PlayerProfile from "../pages/PlayerProfile";
import Players from "../pages/Players";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />

        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Home />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/matches"
          element={
            <MainLayout>
              <Matches />
            </MainLayout>
          }
        />
        <Route
          path="/matches/create"
          element={
            <ProtectedRoute
              redirectTo="/signup"
              message="You need to be a registered user to create a match."
            >
              <MainLayout>
                <CreateMatch />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/matches/:id/pick-toss"
          element={
            <MainLayout>
              <MatchPickToss />
            </MainLayout>
          }
        />
        <Route
          path="/matches/:id/players"
          element={
            <MainLayout>
              <MatchPlayerDraft />
            </MainLayout>
          }
        />
        <Route
          path="/matches/:id/setup"
          element={
            <MainLayout>
              <MatchPlayerSetup />
            </MainLayout>
          }
        />
        <Route
          path="/matches/:id/captains"
          element={
            <MainLayout>
              <MatchCaptainSelection />
            </MainLayout>
          }
        />
        <Route
          path="/matches/:id/toss"
          element={
            <MainLayout>
              <MatchToss />
            </MainLayout>
          }
        />
        <Route
          path="/matches/:id"
          element={
            <MainLayout>
              <MatchDetail />
            </MainLayout>
          }
        />
        <Route
          path="/teams"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Teams />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/teams/create"
          element={<Navigate to="/matches/create" replace />}
        />
        <Route
          path="/teams/:id"
          element={
            <ProtectedRoute>
              <MainLayout>
                <TeamDetail />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/players"
          element={
            <MainLayout>
              <Players />
            </MainLayout>
          }
        />
        <Route
          path="/players/:id"
          element={
            <MainLayout>
              <PlayerProfile />
            </MainLayout>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Profile />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
      </Routes>
    </BrowserRouter>
  );
}
