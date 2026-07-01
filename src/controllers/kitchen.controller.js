import asyncHandler from '../utils/asyncHandler.js';
import * as kitchenService from '../services/kitchen.service.js';

//Register kitchen
export const registerKitchen = asyncHandler(async (req, res) => {
  const kitchen = await kitchenService.registerKitchen(req.user._id, req.body);

  res.status(201).json({
    status: 'success',
    message: 'Kitchen registered successfully. Pending admin approval.',
    data: { kitchen },
  });
});

/**
 * GET /api/v1/kitchens/me
 * Get the authenticated user's kitchen.
 */
export const getMyKitchen = asyncHandler(async (req, res) => {
  const kitchen = await kitchenService.getMyKitchen(req.user._id);

  res.status(200).json({
    status: 'success',
    data: { kitchen },
  });
});

/**
 * PUT /api/v1/kitchens/me
 * Update the authenticated user's kitchen.
 */
export const updateMyKitchen = asyncHandler(async (req, res) => {
  const kitchen = await kitchenService.updateKitchen(req.user._id, req.body);

  res.status(200).json({
    status: 'success',
    message: 'Kitchen updated successfully.',
    data: { kitchen },
  });
});

/**
 * PATCH /api/v1/kitchens/me/toggle
 * Toggle kitchen open/close status.
 */
export const toggleStatus = asyncHandler(async (req, res) => {
  const kitchen = await kitchenService.toggleKitchenStatus(req.user._id);

  res.status(200).json({
    status: 'success',
    message: `Kitchen is now ${kitchen.isOpen ? 'open' : 'closed'}.`,
    data: { kitchen },
  });
});

/**
 * GET /api/v1/kitchens/nearby?latitude=&longitude=&radius=
 * Find nearby kitchens (public — buyer use).
 */
export const getNearbyKitchens = asyncHandler(async (req, res) => {
  const { latitude, longitude, radius } = req.query;

  const kitchens = await kitchenService.getNearbyKitchens({
    latitude: parseFloat(latitude),
    longitude: parseFloat(longitude),
    radius: radius ? parseFloat(radius) : undefined,
  });

  res.status(200).json({
    status: 'success',
    results: kitchens.length,
    data: { kitchens },
  });
});

/**
 * GET /api/v1/kitchens/:id
 * Get single kitchen by ID (public).
 */
export const getKitchenById = asyncHandler(async (req, res) => {
  const kitchen = await kitchenService.getKitchenById(req.params.id);

  res.status(200).json({
    status: 'success',
    data: { kitchen },
  });
});


