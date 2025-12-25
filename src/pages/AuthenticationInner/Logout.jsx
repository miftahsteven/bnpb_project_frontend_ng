import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { resetLayout } from "../../store/layout/actions";

export default function Logout() {
    const dispatch = useDispatch();

    useEffect(() => {
        // bersihkan session
        localStorage.removeItem("auth");
        localStorage.removeItem("authUser"); // jika masih digunakan versi template
        // reset layout ke INIT_STATE (fluid)
        dispatch(resetLayout());
        // redirect ke login
        window.location.replace("/login");
    }, [dispatch]);

    return null;
}