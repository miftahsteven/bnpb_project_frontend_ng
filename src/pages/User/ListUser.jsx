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
import TableContainer from '../../components/Common/TableContainer';
import Breadcrumbs from '../../components/Common/Breadcrumb';

const { Title } = Typography;

const ListUser = () => {
  const { users: rawData, loading, createUser, updateUser, deleteUser, fetchUsers, getUser, error, fetchSatuanKerja, satuanKerja, pagination, setPagination } = useUser();
  
  const data = useMemo(() => {
          return rawData || [];
      }, [rawData]);
  
  
  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [form] = Form.useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const role = {    
    1: 'Super Admin',
    2: 'Admin',
    3: 'Manager',
    4: 'User',
  };

  const status = {
    1: 'Active',
    2: 'Inactive',
  };

  const pageCount = Math.ceil(pagination.total / pagination.pageSize);

  // Pagination State for Table
  const paginationState = useMemo(() => {
    return {
      pageIndex: pagination.page - 1,
      pageSize: pagination.pageSize,
    };
  }, [pagination.page, pagination.pageSize]);

  const handlePaginationChange = (updater) => {
      setPagination(prev => {
        const newPagination = typeof updater === 'function'
          ? updater({ pageIndex: prev.page - 1, pageSize: prev.pageSize })
          : updater;

        return {
          ...prev,
          page: newPagination.pageIndex + 1,
          pageSize: newPagination.pageSize
        };
      });
    };
    

  useEffect(() => {
    fetchUsers(pagination.page, pagination.pageSize, { ...filterValues });
    // fetchSatuanKerja remains separate or handled elsewhere
  }, [pagination.page, pagination.pageSize, fetchUsers]);

  useEffect(() => {
      fetchSatuanKerja();
  }, [fetchSatuanKerja]);

  const [filterValues, setFilterValues] = useState({
    satuanKerja: '',
    role: '',
    status: '',
  });


  // Fetch on search change (Debounced by TableContainer)
  // Fetch on search change (Debounced by TableContainer)
      useEffect(() => {
          if (searchTerm) { // Only if there is a search term, otherwise the pagination effect handles main data
               fetchUsers(1, pagination.pageSize, { ...filterValues, search: searchTerm });
          } else if (searchTerm === '') {
              // If search cleared, fetch default (pagination effect might cover this if we reset page, but let's be safe)
              fetchUsers(pagination.page, pagination.pageSize, { ...filterValues });
          }
      }, [searchTerm]);

  const handleOpenEdit = async (user) => {
    try {
        const detail = await getUser(user.id);
        setSelectedUser(detail);
        form.setFieldsValue({
            ...detail,
            password: '', // Kosongkan password karena optional
            role: String(detail.role),
            satker_id: detail.satker_id,
            status: String(detail.status)
        });
        setIsEditModalOpen(true);
    } catch (e) {
        console.error("Failed to fetch user detail", e);
    }
  };

  const handleOpenDetail = async (user) => {
    try {
        const detail = await getUser(user.id);
        setSelectedUser(detail);
        setIsDetailModalOpen(true);
    } catch (e) {
        console.error("Failed to fetch user detail", e);
    }
  };

  const handleEditFromDetail = () => {
      setIsDetailModalOpen(false);
      // Pass the fully loaded selectedUser to open edit immediately or simple object with id
      // Since handleOpenEdit re-fetches, passing { id: selectedUser.id } is safe.
      handleOpenEdit({ id: selectedUser.id });
  };

  const handleAdd = async (values) => {
    await addUser(values);
    setIsAddModalOpen(false);
    form.resetFields();
  };

  const handleUpdate = async () => {
    try {
        const values = await form.validateFields();
        // Jika password kosong, hapus dari payload agar tidak terupdate
        if (!values.password) {
            delete values.password;
        } else {
            // Jika ada, biarkan (backend akan hash)
        }
        values.role = Number(values.role);
        values.status = Number(values.status);

        await updateUser(selectedUser.id, values);
        setIsEditModalOpen(false);
        setSelectedUser(null);
        form.resetFields();
    } catch (e) {
        console.error("Update failed", e);
    }
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
        header: 'No',
        accessorKey: 'no',
        cell: (cellProps) => {
          return (pagination.page - 1) * pagination.pageSize + cellProps.row.index + 1;
        },
        enableColumnFilter: false,
      },
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
        accessorKey: 'satker_name',
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
        header: 'Status',
        accessorKey: 'status',
        cell: (cellProps) => {
          const record = cellProps.row.original;
          return record.status == 1 ? 'Active' : 'Inactive';
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
    [ pagination ]
  );

  return (
    <div className="page-content">
    <div className='container-fluid'>
       <Breadcrumbs title="User" breadcrumbItem="Daftar User" />
      <Card>
        <TableContainer
          columns={columns}
          data={data || []}
          isGlobalFilter={true}
          globalFilterValue={searchTerm}
          onGlobalFilterChangeProp={setSearchTerm}
          isPagination={true}
          SearchPlaceholder="Cari user..."
          paginationWrapper='dataTables_paginate paging_simple_numbers'
          isCustomPageSize={true}
          manualPagination={true}
          pageCount={pageCount}
          totalRows={pagination.total}
          paginationState={paginationState}
          onPaginationChange={handlePaginationChange}
          tableClass="table align-middle table-nowrap table-hover"
          divStyle={{ maxHeight: '400px', overflowY: 'auto' }}
          theadClass="table-light"          
          setPagination={setPagination}
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
        size='md'
      >
        <ModalHeader toggle={() => setIsEditModalOpen(!isEditModalOpen)}>Edit User</ModalHeader>
        <ModalBody>
          <Form form={form} layout="vertical" onFinish={handleUpdate}>
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
                   <Form.Item name="password" label="Password (Isi jika ingin mengubah)">
                     <AntInput.Password placeholder="Password Baru" />
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
                <Col md={6}>
                  <Form.Item name="status" label="Status" rules={[{ required: true }]}>
                    <Select placeholder="Pilih Status">
                       <Select.Option value="1">Aktif</Select.Option>
                       <Select.Option value="0">Non-Aktif</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
             </Row>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button onClick={() => setIsEditModalOpen(false)}>Batal</Button>
          <Button type="primary" onClick={handleUpdate}>Simpan Perubahan</Button>
        </ModalFooter>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        toggle={() => setIsDetailModalOpen(!isDetailModalOpen)}
        size='lg'
      >
        <ModalHeader toggle={() => setIsDetailModalOpen(!isDetailModalOpen)}>Detail User</ModalHeader>
        <ModalBody>
          {selectedUser && (
            <Descriptions bordered column={1} layout="horizontal">
              <Descriptions.Item label="Nama">{selectedUser.name}</Descriptions.Item>
              <Descriptions.Item label="Username">{selectedUser.username}</Descriptions.Item>
              <Descriptions.Item label="Satuan Kerja">{selectedUser.satuanKerja?.name || '-'}</Descriptions.Item>
              <Descriptions.Item label="Role">{role[selectedUser.role]}</Descriptions.Item>
              <Descriptions.Item label="Status">
                  {selectedUser.status === 1 ? 'Aktif' : 'Non-Aktif'}
              </Descriptions.Item>
            </Descriptions>
          )}
        </ModalBody>
        <ModalFooter>
          <Button onClick={() => setIsDetailModalOpen(false)}>Tutup</Button>
          <Button type="primary" onClick={handleEditFromDetail} icon={<EditOutlined />}>Edit Data</Button>
        </ModalFooter>
      </Modal>
    </div>
    </div>
  );
};

export default ListUser;
