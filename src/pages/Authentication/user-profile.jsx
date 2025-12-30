import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Alert,
  CardBody,
  Button,
  Label,
  Input,
  FormFeedback,
  Form,
} from "reactstrap";
import { toast } from "react-toastify";

// Formik Validation
import * as Yup from "yup";
import { useFormik } from "formik";
import useUser from "../../hooks/useUser";

//redux
import { useSelector, useDispatch } from "react-redux";
import { createSelector } from "reselect";

import withRouter from "../../components/Common/withRouter";

//Import Breadcrumb
import Breadcrumb from "../../components/Common/Breadcrumb";

import avatar from "../../assets/images/users/avatar-1.jpg";
import logoBNPB from "../../assets/images/Logo_BNPB.png";
// actions
import { editProfile, resetProfileFlag } from "/src/store/actions";

const UserProfile = (props) => {

  //meta title
  document.title = "Profile | BNPN User Profile";

  const dispatch = useDispatch();
  const { getUser, updateUser, fetchSatuanKerja, satuanKerja } = useUser();
  const [username, setusername] = useState("");
  const [satker, setsatker] = useState("");
  const [name, setname] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("");
  const [id, setid] = useState("");
  const roles = [
    { value: 1, label: "Superadmin" },
    { value: 2, label: "Admin" },
    { value: 3, label: "Manager" },
    { value: 4, label: "User" },
  ];

    const ProfileProperties = createSelector(
      (state) => state.Profile,
        (profile) => ({
          error: profile.error,
          success: profile.success,
        })
    );

    const {
      error,
      success
  } = useSelector(ProfileProperties);

  useEffect(() => {    
    const auth = localStorage.getItem("auth");    
    const id = auth ? JSON.parse(auth).user_id : null;
    const getUserData = async () => {
      const user = await getUser(id);      
      setusername(user.username);
      setsatker(user.satker_id);
      setname(user.name);
      //setPassword(user.password);
      //setConfirmPassword(user.password);
      setRole(user.role);
      setid(user.id);
    };
    getUserData();

    // Fetch satuan kerja
    fetchSatuanKerja();
  }, []); 

  const validation = useFormik({
    // enableReinitialize : use this flag when initial values needs to be changed
    enableReinitialize: true,

    initialValues: {
      username: username || '',
      name: name || '',
      satker: satker || '',
      role: role || '',
      id: id || '',
      password: password || '',
      confirmPassword: confirmPassword || '',
    },
    validationSchema: Yup.object({
      username: Yup.string().required("Masukan UserName"),
    }),
    onSubmit: (values) => {
      if (values.password !== values.confirmPassword) {
        toast.error("Password Tidak Sama");
        return;
      }
      //password harus minimal 6 karakter, gabungan huruf dan angka, serta huruf besar
      if (values.password.length < 6) {
        toast.error("Password minimal 6 karakter");
        return;
      }
      if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{6,}$/.test(values.password)) {
        toast.error("Password harus mengandung huruf besar, huruf kecil, dan angka");
        return;
      }
      
      updateUser(id, values);
      dispatch(resetProfileFlag());
      toast.info("Profile berhasil diperbarui");
    }
  });

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          {/* Render Breadcrumb */}
          <Breadcrumb title="User" breadcrumbItem="Profile" />

          {/* <Row>
            <Col lg="12">
              {error && error ? <Alert color="danger">{error}</Alert> : null}
              {success ? <Alert color="success">{success}</Alert> : null}

              <Card>
                <CardBody>
                  <div className="d-flex">
                    <div className="ms-2">
                      <img
                        src={logoBNPB}
                        alt=""
                        className="avatar-lg"
                        style={{ objectFit: 'contain' }}
                      />
                    </div>
                    
                  </div>
                </CardBody>
              </Card>
            </Col>
          </Row> */}

          {/* <h4 className="card-title mb-4">Data Profil</h4> */}

          <Card>
            <CardBody>
              <Form
                onSubmit={validation.handleSubmit}
                className="form form-horizontal needs-validation"
                noValidate
              >
                <div className="mb-3">
                    <Label className="form-label">Nama Lengkap</Label>
                    <Input
                      name="name"
                      className="form-control"
                      placeholder="Masukan Nama Lengkap"
                      type="text"
                      onChange={validation.handleChange}
                      onBlur={validation.handleBlur}
                      value={validation.values.name || ""}
                      invalid={
                        validation.touched.name && validation.errors.name ? true : false
                      }
                    />
                    {validation.touched.name && validation.errors.name ? (
                      <FormFeedback type="invalid">{validation.errors.name}</FormFeedback>
                    ) : null}
                </div>

                <div className="mb-3">
                  <Label className="form-label">Username (NIP / Email)</Label>
                  <Input
                    name="username"
                    className="form-control bg-light"
                    placeholder="Masukan User Name"
                    type="text"
                    onChange={validation.handleChange}
                    onBlur={validation.handleBlur}
                    value={validation.values.username || ""}
                    readOnly
                    invalid={
                      validation.touched.username && validation.errors.username ? true : false
                    }
                  />
                  {validation.touched.username && validation.errors.username ? (
                    <FormFeedback type="invalid">{validation.errors.username}</FormFeedback>
                  ) : null}
                  <Input name="id" value={id} type="hidden" />
                </div>

                <div className="mb-3">
                  <Label className="form-label">Satuan Kerja</Label>
                  <Input 
                    type="select" 
                    name="satker" 
                    className="form-control form-select"
                    onChange={validation.handleChange} 
                    onBlur={validation.handleBlur} 
                    value={validation.values.satker || ""}
                  >
                    <option value="">-- Pilih Satuan Kerja --</option>
                    {satuanKerja.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </Input>
                </div> 
                <div className="mb-3">
                  <Label className="form-label">Role</Label>
                  <Input 
                    type="select" 
                    name="role" 
                    disabled
                    className="form-control form-select"
                    onChange={validation.handleChange} 
                    onBlur={validation.handleBlur} 
                    value={validation.values.role || ""}
                  >
                    <option value="">-- Pilih Role --</option>
                    {roles.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </Input>
                </div>
                <div className="p-3 bg-light rounded border mt-4 mb-3">
                  <h6 className="card-title mb-3 text-dark"><i className="bx bx-lock-alt me-1"></i> Ubah Password</h6>
                  <p className="card-title-desc text-muted small mb-3">
                     <i className="mdi mdi-information-outline me-1"></i> Biarkan kosong jika tidak ingin mengubah password.
                  </p>
                  
                  <Row>
                    <Col md={6}>
                      <div className="mb-3">
                        <Label className="form-label">Password Baru</Label>
                        <Input
                          type="password"
                          name="password"
                          className="form-control"
                          placeholder="Password Baru (Opsional)"
                          onChange={validation.handleChange}
                          onBlur={validation.handleBlur}
                          value={validation.values.password || ""}
                          invalid={
                            validation.touched.password && validation.errors.password ? true : false
                          }
                        />
                        {validation.touched.password && validation.errors.password ? (
                          <FormFeedback type="invalid">{validation.errors.password}</FormFeedback>
                        ) : null}
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="mb-3">
                        <Label className="form-label">Konfirmasi Password</Label>
                        <Input
                          type="password"
                          name="confirmPassword"
                          className="form-control"
                          placeholder="Ulangi Password Baru"
                          onChange={validation.handleChange}
                          onBlur={validation.handleBlur}
                          value={validation.values.confirmPassword || ""}
                          invalid={
                            validation.touched.confirmPassword && validation.errors.confirmPassword ? true : false
                          }
                        />
                        {validation.touched.confirmPassword && validation.errors.confirmPassword ? (
                          <FormFeedback type="invalid">{validation.errors.confirmPassword}</FormFeedback>
                        ) : null}
                      </div>
                    </Col>
                  </Row>
                </div>

                <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
                   <Button type="button" color="light" className="w-md">Batal</Button>
                   <Button type="submit" color="primary" className="w-md">
                    <i className="bx bx-save font-size-16 align-middle me-2"></i> Simpan Perubahan
                  </Button>
                </div>
              </Form> 
            </CardBody>
          </Card>
        </Container>
      </div>
    </React.Fragment>
  );
};

export default withRouter(UserProfile);
