import asyncHandler from '../utils/asyncHandler.js';
import * as adminService from '../services/admin.service.js';

export const getOverview = asyncHandler(async (req, res) => {
  const stats = await adminService.getOverviewStats();
  res.status(200).json({ status: 'success', data: stats });
});

export const getKitchens = asyncHandler(async (req, res) => {
  const { page, limit, status } = req.query;
  const data = await adminService.getKitchens({
    page: page ? parseInt(page) : 1,
    limit: limit ? parseInt(limit) : 10,
    status,
  });
  res.status(200).json({ status: 'success', data });
});

export const moderateKitchen = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isApproved, reason } = req.body;
  const result = await adminService.moderateKitchen(id, { isApproved, reason });
  
  res.status(200).json({
    status: 'success',
    message: isApproved ? 'Kitchen approved successfully' : 'Kitchen rejected and deleted',
    data: { kitchen: result },
  });
});

export const getUsers = asyncHandler(async (req, res) => {
  const { page, limit, role } = req.query;
  const data = await adminService.getUsers({
    page: page ? parseInt(page) : 1,
    limit: limit ? parseInt(limit) : 20,
    role,
  });
  res.status(200).json({ status: 'success', data });
});

export const getGlobalOrders = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const data = await adminService.getGlobalOrders({
    page: page ? parseInt(page) : 1,
    limit: limit ? parseInt(limit) : 20,
  });
  res.status(200).json({ status: 'success', data });
});
