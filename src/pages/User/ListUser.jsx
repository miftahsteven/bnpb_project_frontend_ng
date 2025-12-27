import React, { useState, useMemo, useEffect } from 'react';
import useUser from '../../hooks/useUser'; // Adjust path accordingly
import { 
  Form, Input as AntInput, Select,
  Space, Popconfirm, Card, Typography, 
  Descriptions, Button
} from 'antd';
import { 
  PlusOutlined, EditOutlined, 
  DeleteOutlined, EyeOutlined, ExclamationCircleOutlined 
} from '@ant-design/icons';
import { Modal, ModalHeader, ModalBody, ModalFooter, Label, Input, Row, Col } from 'reactstrap';
import TableUser from '../../components/Common/TableUser';
import Breadcrumbs from '../../components/Common/Breadcrumb';

const { Title } = Typography;

const ListUser = () => {
  const { users, loading, createUser, updateUser, deleteUser, fetchUsers, error, fetchSatuanKerja, satuanKerja } = useUser();
  
  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [form] = Form.useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const role = {
    1: 'Admin',
    2: 'User',
    3: 'Manager',
    4: 'Guest',
  };

  useEffect(() => {
    fetchUsers();        
    fetchSatuanKerja();    
  }, [fetchUsers, fetchSatuanKerja]);

  const handleOpenEdit = (user) => {
    setSelectedUser(user);
    form.setFieldsValue(user);
    setIsEditModalOpen(true);
  };

  const handleOpenDetail = (user) => {
    setSelectedUser(user);
    setIsDetailModalOpen(true);
  };

  const handleAdd = async (values) => {
    await addUser(values);
    setIsAddModalOpen(false);
    form.resetFields();
  };

  const handleUpdate = async (values) => {
    await updateUser(selectedUser.id, values);
    setIsEditModalOpen(false);
    setSelectedUser(null);
    form.resetFields();
  };

  const handleDelete = async (id) => {
    await deleteUser(id);
  };
  
  const handleAddSubmit = async () => {
    setIsSubmitting(true);
    try {
        //ubah role menjadi number
        const values = form.getFieldsValue();
        values.role = Number(values.role);        
      await createUser(values);  
    } catch (error) {
      console.error('Error creating user:', error);
      setIsSubmitting(false);
      return;
    }    
    setIsAddModalOpen(false);
    form.resetFields();
    setIsSubmitting(false);
  };

  const columns = useMemo(
    () => [
      {
        header: 'Nama',
        accessorKey: 'name',
        enableColumnFilter: false,
      },
      {
        header: 'Username',
        accessorKey: 'username',
        enableColumnFilter: false,
      },
      {
        header: 'Satuan Kerja',
        accessorKey: 'satuanKerja.name',
        enableColumnFilter: false,
      },
      {
        header: 'Role',
        accessorKey: 'role',
        cell: (cellProps) => {
          const record = cellProps.row.original;
          return role[record.role];
        },
        enableColumnFilter: false,
      },
      {
        header: 'Aksi',
        accessorKey: 'action',
        enableColumnFilter: false,
        enableSorting: false,
        cell: (cellProps) => {
           const record = cellProps.row.original;
           return (
            <Space size="middle">
              <Button icon={<EyeOutlined />} onClick={() => handleOpenDetail(record)} />
              <Button icon={<EditOutlined />} onClick={() => handleOpenEdit(record)} />
              <Popconfirm
                title="Hapus User"
                description="Data akan hilang permanen. Apakah anda yakin?"
                onConfirm={() => handleDelete(record.id)}
                okText="Ya, Hapus"
                cancelText="Batal"
                icon={<ExclamationCircleOutlined style={{ color: 'red' }} />}
              >
                <Button danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </Space>
          );
        }
      },
    ],
    []
  );

  return (
    <div className="page-content">
    <div className='container-fluid'>
       <Breadcrumbs title="User" breadcrumbItem="Daftar User" />
      <Card>
        <TableUser
          columns={columns}
          data={users || []}
          isGlobalFilter={true}
          globalFilterValue={searchTerm}
          onGlobalFilterChangeProp={setSearchTerm}
          isPagination={true}
          SearchPlaceholder="Cari user..."
          isCustomPageSize={true}
          tableClass="table align-middle table-nowrap table-hover"
          divStyle={{ maxHeight: '400px', overflowY: 'auto' }}
          theadClass="table-light"
          paginationWrapper="dataTables_paginate paging_simple_numbers"
          customToolbar={ 
            <Button icon={<PlusOutlined />} onClick={() => setIsAddModalOpen(true)} />
          }
        />
      </Card>

      {/* Add Modal */}
      <Modal
        isOpen={isAddModalOpen}
        toggle={() => setIsAddModalOpen(!isAddModalOpen)}
        size='md'
      >
        <ModalHeader toggle={() => setIsAddModalOpen(!isAddModalOpen)}>Tambah User Baru</ModalHeader>
        <ModalBody>
          <Form form={form} layout="vertical" onFinish={handleAddSubmit}>
             <Row>
                <Col md={6}>
                   <Form.Item name="name" label="Nama" rules={[{ required: true }]}>
                     <AntInput placeholder="Nama" />
                   </Form.Item>
                </Col>
                <Col md={6}>
                   <Form.Item name="username" label="Username" rules={[{ required: true }]}>
                     <AntInput placeholder="Username" />
                   </Form.Item>
                </Col>               
                <Col md={6}>
                   <Form.Item name="password" label="Password" rules={[{ required: true }]}>
                     <AntInput.Password placeholder="Password" />
                   </Form.Item>
                </Col>
                <Col md={6}>
                  <Form.Item name="satker_id" label="Satuan Kerja" rules={[{ required: true }]}>
                    <Select placeholder="Pilih Satuan Kerja">
                      {satuanKerja && satuanKerja.map((item) => (
                        <Select.Option key={item.id} value={item.id}>
                          {item.name}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col md={6}>
                  <Form.Item name="role" label="Role" rules={[{ required: true }]}>
                    <Select placeholder="Pilih Role">
                      {Object.entries(role).map(([key, value]) => (
                        <Select.Option key={key} value={key}>
                          {value}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
             </Row>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button onClick={() => setIsAddModalOpen(false)}>Batal</Button>
          <Button color="primary" onClick={handleAddSubmit} disabled={isSubmitting}>
                {isSubmitting ? <><i className="fas fa-spinner fa-spin me-1"></i> Menyimpan...</> : 'Simpan'}
            </Button>
        </ModalFooter>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        toggle={() => setIsEditModalOpen(!isEditModalOpen)}
      >
        <ModalHeader toggle={() => setIsEditModalOpen(!isEditModalOpen)}>Edit User</ModalHeader>
        <ModalBody>
          <Form form={form} layout="vertical" onFinish={handleUpdate}>
            <Form.Item name="name" label="Nama" rules={[{ required: true }]}>
              <AntInput />
            </Form.Item>
            <Form.Item name="username" label="Username" rules={[{ required: true }]}>
              <AntInput />
            </Form.Item>
            <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
              <AntInput />
            </Form.Item>
            {/* Note: Edit Modal usually needs role/satker too? Assuming user only requested Add Modal update for now or Edit Modal uses existing fields */}
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button onClick={() => setIsEditModalOpen(false)}>Batal</Button>
          <Button type="primary" onClick={() => form.submit()}>Simpan</Button>
        </ModalFooter>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        toggle={() => setIsDetailModalOpen(!isDetailModalOpen)}
      >
        <ModalHeader toggle={() => setIsDetailModalOpen(!isDetailModalOpen)}>Detail User</ModalHeader>
        <ModalBody>
          {selectedUser && (
            <Descriptions bordered column={1}>
              <Descriptions.Item label="Nama">{selectedUser.name}</Descriptions.Item>
              <Descriptions.Item label="Username">{selectedUser.username}</Descriptions.Item>
              <Descriptions.Item label="Email">{selectedUser.email}</Descriptions.Item>
              <Descriptions.Item label="Role">{role[selectedUser.role]}</Descriptions.Item>
              <Descriptions.Item label="Dibuat Pada">{selectedUser.createdAt}</Descriptions.Item>
            </Descriptions>
          )}
        </ModalBody>
        <ModalFooter>
          <Button onClick={() => setIsDetailModalOpen(false)}>Tutup</Button>
        </ModalFooter>
      </Modal>
    </div>
    </div>
  );
};

export default ListUser;
