import React, { useEffect } from "react";
import PropTypes from "prop-types";
import withRouter from "../../components/Common/withRouter";
import { logoutUser } from "/src/store/actions";
//panggil api auth logout di sini untuk proses logout
import { logout } from "../../api/auth";


//redux
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";

const Logout = () => {
  const history = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    (async () => {
      try {
        // panggil API logout (abaikan error agar tetap lanjut bersih-bersih)
        await logout().catch(() => { });
      } finally {
        // bersihkan semua jejak auth di storage
        localStorage.removeItem("auth");
        localStorage.removeItem("authUser");
        sessionStorage?.clear?.();

        // update state redux
        dispatch(logoutUser(history));

        // redirect dengan replace agar tidak bisa back ke halaman sebelumnya
        ///history("/login", { replace: true });
        // paksa reload untuk memastikan layout login kembali normal dan cache router hilang
        //window.location.replace("/login");
      }
    })();

  }, [dispatch, history]);

  return <></>;
};

Logout.propTypes = {
  history: PropTypes.object,
};

export default withRouter(Logout);
