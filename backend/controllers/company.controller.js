const { readJSON, findById, insert, updateById, deleteById } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const getCompanies = (req, res) => {
  try {
    const companies = readJSON('companies');
    res.json({ success: true, data: { companies, total: companies.length } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

const getCompanyById = (req, res) => {
  try {
    const company = findById('companies', req.params.id);
    if (!company) return res.status(404).json({ success: false, message: 'Không tìm thấy công ty.' });
    res.json({ success: true, data: { company } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

const createCompany = (req, res) => {
  try {
    const { name, description, address, website, email, industry, size } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Tên công ty là bắt buộc.' });

    const newCompany = {
      id: uuidv4(),
      name, logo: '', description: description || '', address: address || '',
      website: website || '', email: email || '', industry: industry || '',
      size: size || '', createdAt: new Date().toISOString(),
    };
    insert('companies', newCompany);
    res.status(201).json({ success: true, message: 'Tạo công ty thành công!', data: { company: newCompany } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

const updateCompany = (req, res) => {
  try {
    const company = findById('companies', req.params.id);
    if (!company) return res.status(404).json({ success: false, message: 'Không tìm thấy công ty.' });

    const allowedFields = ['name', 'logo', 'description', 'address', 'website', 'email', 'industry', 'size'];
    const updates = {};
    allowedFields.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    updates.updatedAt = new Date().toISOString();

    const updated = updateById('companies', req.params.id, updates);
    res.json({ success: true, message: 'Cập nhật công ty thành công!', data: { company: updated } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

const deleteCompany = (req, res) => {
  try {
    const deleted = deleteById('companies', req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Không tìm thấy công ty.' });
    res.json({ success: true, message: 'Xóa công ty thành công!' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

module.exports = { getCompanies, getCompanyById, createCompany, updateCompany, deleteCompany };
