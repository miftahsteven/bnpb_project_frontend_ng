import React from "react";
import { Navigate } from "react-router-dom";
import Logout from "../pages/AuthenticationInner/Logout";
import Login2 from "../pages/AuthenticationInner/Login2";
//import Dashboard from "../pages/Dashboard/index";
import Report from "../pages/Report/index";
import ForgetPwd from "../pages/Authentication/ForgetPassword";
//import DatatableTables from "../pages/Tables/DatatableTables"; 
import ListRambu from "../pages/Rambu/ListRambu";
import ListArchived from "../pages/Rambu/ListArchived";
import ListUser from "../pages/User/ListUser";

//FULL MAP
import FullMap from "../pages/Full-Map/index";
import FullMap3 from "../pages/Full-Map/fullmap3";
import Simulation from "../pages/Full-Map/simulation";


// // Profile
import UserProfile from "../pages/Authentication/user-profile";

// Pages Calendar
import Calendar from "../pages/Calendar/index";

const authProtectedRoutes = [
  { path: "/dashboard", component: <Report /> },
  { path: "/list-rambu", component: <ListRambu /> },
  { path: "/list-archived", component: <ListArchived /> },
  { path: "/list-user", component: <ListUser /> },
  { path: "/profile", component: <UserProfile /> },
  { path: "/dashboard-fullmap", component: <FullMap /> },
  { path: "/simulasi", component: <Simulation /> },
];

const publicRoutes = [
  { path: "/logout", component: <Logout /> },
  { path: "/login", component: <Login2 /> },
  { path: "/forgot-password", component: <ForgetPwd /> },
  { path: "/", component: <Navigate to="/login" /> },
]

const standaloneRoutes = [
  { path: "/map-perprovince", component: <FullMap3 /> },
];

export { authProtectedRoutes, publicRoutes, standaloneRoutes }
