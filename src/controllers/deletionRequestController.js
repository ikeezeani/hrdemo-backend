const { DeletionRequest, Designation, User } = require('../models');

// Maps a resource_type to how to look it up, label it, and destroy it.
// Add an entry here (and to the model's ENUM) to extend this flow to
// another resource type later — nothing else needs to change.
const RESOURCE_HANDLERS = {
  designation: {
    model: Designation,
    label: (record) => record.title,
    destroy: (record) => record.destroy()
  }
};

const reviewerAttrs = ['id', 'first_name', 'last_name', 'email'];

// HR: submit a request to delete something. Does NOT delete anything —
// just logs the request as 'pending' for an Admin to act on.
exports.create = async (req, res, next) => {
  try {
    const { resource_type, resource_id, reason } = req.body;
    const handler = RESOURCE_HANDLERS[resource_type];
    if (!handler) return res.status(400).json({ message: 'Unsupported resource type' });
    if (!resource_id) return res.status(400).json({ message: 'resource_id is required' });

    const record = await handler.model.findByPk(resource_id);
    if (!record) return res.status(404).json({ message: 'Record not found' });

    const existing = await DeletionRequest.findOne({
      where: { resource_type, resource_id, status: 'pending' }
    });
    if (existing) {
      return res.status(409).json({ message: 'A deletion request for this item is already pending approval' });
    }

    const request = await DeletionRequest.create({
      resource_type,
      resource_id,
      resource_label: handler.label(record),
      reason: reason || null,
      requested_by: req.user.id
    });
    res.status(201).json({ message: 'Deletion request sent to an Admin for approval', request });
  } catch (err) { next(err); }
};

// Admin: view requests, optionally filtered by ?status=pending
exports.list = async (req, res, next) => {
  try {
    const where = {};
    if (req.query.status) where.status = req.query.status;
    const requests = await DeletionRequest.findAll({
      where,
      order: [['createdAt', 'DESC']],
      include: [
        { model: User, as: 'RequestedBy', attributes: reviewerAttrs },
        { model: User, as: 'ReviewedBy', attributes: reviewerAttrs }
      ]
    });
    res.json(requests);
  } catch (err) { next(err); }
};

// Admin: approve — this is the only place the actual delete happens.
exports.approve = async (req, res, next) => {
  try {
    const request = await DeletionRequest.findByPk(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'This request has already been reviewed' });
    }

    const handler = RESOURCE_HANDLERS[request.resource_type];
    const record = await handler.model.findByPk(request.resource_id);
    if (record) await handler.destroy(record);

    request.status = 'approved';
    request.reviewed_by = req.user.id;
    request.reviewed_at = new Date();
    request.review_note = req.body.note || null;
    await request.save();

    res.json({
      message: record ? 'Approved — item deleted' : 'Approved (item was already removed some other way)',
      request
    });
  } catch (err) { next(err); }
};

// Admin: reject — nothing is deleted, request is just closed out.
exports.reject = async (req, res, next) => {
  try {
    const request = await DeletionRequest.findByPk(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'This request has already been reviewed' });
    }

    request.status = 'rejected';
    request.reviewed_by = req.user.id;
    request.reviewed_at = new Date();
    request.review_note = req.body.note || null;
    await request.save();

    res.json({ message: 'Request rejected', request });
  } catch (err) { next(err); }
};