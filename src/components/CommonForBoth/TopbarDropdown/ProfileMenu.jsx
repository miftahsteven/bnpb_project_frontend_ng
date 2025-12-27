import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import {
  Dropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
} from "reactstrap";

//i18n
import { withTranslation } from "react-i18next";

// Redux
import { connect } from "react-redux";
import { Link } from "react-router-dom";
import withRouter from "../../Common/withRouter";

// users
import user1 from "../../../assets/images/icon-user.png";

const ProfileMenu = (props) => {
  // Declare a new state variable, which we'll call "menu"
  const [menu, setMenu] = useState(false);

  const [username, setusername] = useState("Admin");
  const [role, setrole] = useState(false);
  const [satuanKerja, setsatuanKerja] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("auth")) {
      if (import.meta.env.VITE_APP_DEFAULTAUTH === "firebase") {
        const obj = JSON.parse(localStorage.getItem("authUser"));      
        const auth = JSON.parse(localStorage.getItem("auth"));
        const username = auth.name;
        const role = auth.role;
        const satuanKerja = auth.satker_name;
        setrole(role);
        setusername(username);
        setsatuanKerja(satuanKerja);
      } else if (
        import.meta.env.VITE_APP_DEFAULTAUTH === "fake" ||
        import.meta.env.VITE_APP_DEFAULTAUTH === "jwt"
      ) {
        const auth = JSON.parse(localStorage.getItem("auth"));
        const username = auth.name;
        const role = auth.role;
        const satuanKerja = auth.satker_name;
        setrole(role);
        setusername(username);
        setsatuanKerja(satuanKerja);
      }
    }
  }, [props.success]);

  return (
    <React.Fragment>
      <Dropdown
        isOpen={menu}
        toggle={() => setMenu(!menu)}
        className="d-inline-block"
      >
        <DropdownToggle
          className="btn header-item "
          id="page-header-user-dropdown"
          tag="button"
        >
          <img
            className="rounded-circle header-profile-user"
            src={user1}
            alt="Header Avatar"
          />          
          
          <div className="d-none d-xl-inline-block ms-2 me-1 text-start" style={{ verticalAlign: 'middle', lineHeight: '1.2' }}>
            <span className="d-block fw-semibold">{username}</span>
            <span className="d-block small text-muted text-uppercase" style={{ fontSize: '12px', color: '#e1a415ff' }}>{satuanKerja}</span>
          </div>
          <i className="mdi mdi-chevron-down d-none d-xl-inline-block" />
          
        </DropdownToggle>
        <DropdownMenu className="dropdown-menu-end">
          <DropdownItem tag="a" href="/profile">
            {" "}
            <i className="bx bx-user font-size-16 align-middle me-1" />
            {props.t("Profile")}{" "}
          </DropdownItem>

          <div className="dropdown-divider" />
          <Link to="/logout" className="dropdown-item">
            <i className="bx bx-power-off font-size-16 align-middle me-1 text-danger" />
            <span>{props.t("Logout")}</span>
          </Link>
        </DropdownMenu>
      </Dropdown>
    </React.Fragment>
  );
};

ProfileMenu.propTypes = {
  success: PropTypes.any,
  t: PropTypes.any,
};

const mapStatetoProps = (state) => {
  const { error, success } = state.Profile;
  return { error, success };
};

export default withRouter(
  connect(mapStatetoProps, {})(withTranslation()(ProfileMenu))
);
