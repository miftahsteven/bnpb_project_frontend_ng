import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import { layoutWidthTypes } from "../../constants/layout";
import { CHANGE_LAYOUT_WIDTH } from "../../store/layout/actionTypes";
import { Col, Container, Form, Row, Input, Label, FormFeedback } from "reactstrap";

// Formik validation
import * as Yup from "yup";
import { useFormik } from "formik";
import { login } from "../../api/auth";

// import images
import logoDark from "../../assets/images/logo-dark.png";
import logoLight from "../../assets/images/logo-light.png";
import CarouselPage from "./CarouselPage";

const Login2 = () => {
  const [passwordShow, setPasswordShow] = useState(false);
  const [error, setError] = useState("");

  //meta title
  document.title = "Login | Manajemen Rambu Bencana BNPB";

  const dispatch = useDispatch();
  useEffect(() => {
    dispatch({ type: CHANGE_LAYOUT_WIDTH, payload: layoutWidthTypes.FLUID });
  }, [dispatch]);

  // Form validation 
  const validation = useFormik({
    // enableReinitialize : use this flag when initial values needs to be changed
    enableReinitialize: true,

    initialValues: {
      username: '',
      password: '',
    },
    validationSchema: Yup.object({
      username: Yup.string().required("Username harus di isi"),
      password: Yup.string().required("Kata Sandi harus di isi"),
    }),
    onSubmit: async (values) => {
      //alert(JSON.stringify(values, null, 2));
      setError("");
      try {
        const res = await login(values);
        // simpan token & user ke localStorage
        localStorage.setItem('auth', JSON.stringify({
          token: res.token,
          user: res.user,
          satker_id: res.user?.satker_id ?? null,
          role: res.user?.role ?? null,
        }));
        // redirect ke halaman utama (ubah jika perlu)
        window.location.href = '/dashboard';
      } catch (e) {
        setError("Login gagal. Periksa username/kata sandi.");
      }
    }
  });
  return (
    <React.Fragment>
      <div>
        <Container fluid className="p-0">
          <Row className="g-0">
            <CarouselPage />

            <Col xl={3}>
              <div className="auth-full-page-content p-md-5 p-4">
                <div className="w-100">
                  <div className="d-flex flex-column h-100">
                    <div className="mb-4 mb-md-5">
                      <Link to="/" className="d-block auth-logo">
                        <img
                          src={logoDark}
                          alt=""
                          height="18"
                          className="auth-logo-dark"
                        />
                        {/* <img
                          src={logoLight}
                          alt=""
                          height="18"
                          className="auth-logo-light"
                        /> */}
                        {/* berikan label "Badan nasional penanggulangan bencana, berwarna #00499e" */}
                        <div style={{ color: 'white', fontWeight: 'bold', fontSize: '18px' }}>
                          Badan Nasional Penanggulangan Bencana
                        </div>
                      </Link>
                    </div>
                    <div className="my-auto">
                      <div>
                        <h5 className="text-primary">Selamat Datang !</h5>
                        <p className="text-muted">
                          Silahkan Login Terlebih Dahulu
                        </p>
                      </div>

                      <div className="mt-4">
                        <Form className="form-horizontal"
                          onSubmit={(e) => {
                            e.preventDefault();
                            validation.handleSubmit();
                            return false;
                          }}
                        >
                          {error && <div className="alert alert-danger">{error}</div>}
                          <div className="mb-3">
                            <Label className="form-label">Username</Label>
                            <Input
                              name="username"
                              className="form-control"
                              placeholder="Masukan username"
                              type="text"
                              onChange={validation.handleChange}
                              onBlur={validation.handleBlur}
                              value={validation.values.username || ""}
                              invalid={
                                validation.touched.username && validation.errors.username ? true : false
                              }
                            />
                            {validation.touched.username && validation.errors.username ? (
                              <FormFeedback type="invalid">{validation.errors.username}</FormFeedback>
                            ) : null}
                          </div>

                          <div className="mb-3">
                            <div className="float-end">
                              <Link to="/auth-recoverpw-2" className="text-muted">Forgot password?</Link>
                            </div>
                            <Label className="form-label">Kata Sandi</Label>
                            <div className="input-group auth-pass-inputgroup">
                              <Input
                                name="password"
                                value={validation.values.password || ""}
                                type={passwordShow ? "text" : "password"}
                                placeholder="Masukan kata sandi"
                                onChange={validation.handleChange}
                                onBlur={validation.handleBlur}
                                invalid={
                                  validation.touched.password && validation.errors.password ? true : false
                                }
                              />
                              <button onClick={() => setPasswordShow(!passwordShow)} className="btn btn-light " type="button" id="password-addon">
                                <i className="mdi mdi-eye-outline"></i></button>
                            </div>
                            {validation.touched.password && validation.errors.password ? (
                              <FormFeedback type="invalid">{validation.errors.password}</FormFeedback>
                            ) : null}
                          </div>

                          <div className="form-check">
                            <Input
                              type="checkbox"
                              className="form-check-input"
                              id="auth-remember-check"
                            />
                            <label
                              className="form-check-label"
                              htmlFor="auth-remember-check"
                            >
                              Ingat saya
                            </label>
                          </div>

                          <div className="mt-3 d-grid">
                            <button
                              className="btn btn-primary btn-block "
                              type="submit"
                            >
                              Masuk
                            </button>
                          </div>

                        </Form>

                        {/* <Form action="dashboard">
                          <div className="mt-4 text-center">
                            <h5 className="font-size-14 mb-3">
                              Sign in with
                            </h5>

                            <ul className="list-inline">
                              <li className="list-inline-item">
                                <Link
                                  to="#"
                                  className="social-list-item bg-primary text-white border-primary me-1"
                                >
                                  <i className="mdi mdi-facebook"></i>
                                </Link>
                              </li>
                              <li className="list-inline-item">
                                <Link
                                  to="#"
                                  className="social-list-item bg-info text-white border-info me-1"
                                >
                                  <i className="mdi mdi-twitter"></i>
                                </Link>
                              </li>
                              <li className="list-inline-item">
                                <Link
                                  to="#"
                                  className="social-list-item bg-danger text-white border-danger"
                                >
                                  <i className="mdi mdi-google"></i>
                                </Link>
                              </li>
                            </ul>
                          </div>
                        </Form> */}
                        {/* <div className="mt-5 text-center">
                          <p>
                            Don&apos;t have an account ? <Link
                              to="pages-register-2"
                              className="fw-medium text-primary"
                            >
                              Signup now
                            </Link>
                          </p>
                        </div> */}
                      </div>
                    </div>

                    <div className="mt-4 mt-md-5 text-center">
                      <p className="mb-0">
                        © {new Date().getFullYear()} MRB BNPB developed with{" "}
                        <i className="mdi mdi-heart text-danger"></i> <br />by
                        MSCODX
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </div>
    </React.Fragment>
  );
};
export default Login2
