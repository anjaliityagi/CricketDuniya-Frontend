import { BrowserRouter, Routes, Route } from "react-router-dom";

import MainLayout from "../layouts/MainLayout";

import Home from "../pages/Home";
import Landing from "../pages/Landing";
import Login from "../pages/Login";
import Matches from "../pages/Matches";
import CreateMatch from "../pages/CreateMatch";
import MatchDetail from "../pages/MatchDetail";
import MatchPlayerSetup from "../pages/MatchPlayerSetup";
import MatchToss from "../pages/MatchToss";
import Teams from "../pages/Teams";
import CreateTeam from "../pages/CreateTeam";
import TeamDetail from "../pages/TeamDetail";
import Signup from "../pages/Signup";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />

        <Route
          path="/home"
          element={
            <MainLayout>
              <Home />
            </MainLayout>
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
            <MainLayout>
              <CreateMatch />
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
            <MainLayout>
              <Teams />
            </MainLayout>
          }
        />
        <Route
          path="/teams/create"
          element={
            <MainLayout>
              <CreateTeam />
            </MainLayout>
          }
        />
        <Route
          path="/teams/:id"
          element={
            <MainLayout>
              <TeamDetail />
            </MainLayout>
          }
        />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
      </Routes>
    </BrowserRouter>
  );
}
