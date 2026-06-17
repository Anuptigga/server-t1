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
  const { isApproved } = req.body;
  const kitchen = await adminService.moderateKitchen(id, { isApproved });
  
  res.status(200).json({
    status: 'success',
    message: isApproved ? 'Kitchen approved successfully' : 'Kitchen rejected',
    data: { kitchen },
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
