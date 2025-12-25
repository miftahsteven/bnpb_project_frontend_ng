import React from "react";
import { Navigate } from "react-router-dom";
import Logout from "../pages/AuthenticationInner/Logout";
import Login2 from "../pages/AuthenticationInner/Login2";
import Dashboard from "../pages/Dashboard/index";
import ForgetPwd from "../pages/Authentication/ForgetPassword";
//import DatatableTables from "../pages/Tables/DatatableTables"; 
import ListRambu from "../pages/Tables/ListRambu";

//FULL MAP
import FullMap from "../pages/Full-Map/index";


// // Profile
import UserProfile from "../pages/Authentication/user-profile";

// Pages Calendar
import Calendar from "../pages/Calendar/index";

const authProtectedRoutes = [
  { path: "/dashboard", component: <Dashboard /> },
  { path: "/list-rambu", component: <ListRambu /> },
  { path: "/profile", component: <UserProfile /> },
  { path: "/dashboard-fullmap", component: <FullMap /> },
];

const publicRoutes = [
  { path: "/logout", component: <Logout /> },
  { path: "/login", component: <Login2 /> },
  { path: "/forgot-password", component: <ForgetPwd /> },
  { path: "/", component: <Navigate to="/login" /> },
]

// export { authProtectedRoutes, publicRoutes };
export { authProtectedRoutes, publicRoutes }
