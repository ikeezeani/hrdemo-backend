const { Department, Designation } = require('../models');

exports.listDepartments = async (req, res, next) => {
  try {
    const departments = await Department.findAll({ include: [Designation], order: [['name', 'ASC']] });
    res.json({ data: departments });
  } catch (err) { next(err); }
};

exports.createDepartment = async (req, res, next) => {
  try {
    const dept = await Department.create(req.body);
    res.status(201).json({ data: dept });
  } catch (err) { next(err); }
};

exports.updateDepartment = async (req, res, next) => {
  try {
    const dept = await Department.findByPk(req.params.id);
    if (!dept) return res.status(404).json({ message: 'Department not found' });
    await dept.update(req.body);
    res.json({ data: dept });
  } catch (err) { next(err); }
};

exports.removeDepartment = async (req, res, next) => {
  try {
    const dept = await Department.findByPk(req.params.id);
    if (!dept) return res.status(404).json({ message: 'Department not found' });
    await dept.destroy();
    res.json({ message: 'Department deleted' });
  } catch (err) { next(err); }
};

exports.listDesignations = async (req, res, next) => {
  try {
    const designations = await Designation.findAll({ order: [['title', 'ASC']] });
    res.json({ data: designations });
  } catch (err) { next(err); }
};

exports.createDesignation = async (req, res, next) => {
  try {
    const designation = await Designation.create(req.body);
    res.status(201).json({ data: designation });
  } catch (err) { next(err); }
};

exports.updateDesignation = async (req, res, next) => {
  try {
    const designation = await Designation.findByPk(req.params.id);
    if (!designation) return res.status(404).json({ message: 'Designation not found' });
    await designation.update(req.body);
    res.json({ data: designation });
  } catch (err) { next(err); }
};

exports.removeDesignation = async (req, res, next) => {
  try {
    const designation = await Designation.findByPk(req.params.id);
    if (!designation) return res.status(404).json({ message: 'Designation not found' });
    await designation.destroy();
    res.json({ message: 'Designation deleted' });
  } catch (err) { next(err); }
};
