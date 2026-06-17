import Kitchen from '../models/Kitchen.js';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import { PLATFORM_CONFIG, ROLES } from '../utils/constants.js';
import { geocodeAddress } from './geocoding.service.js';

/**
 * Register a new kitchen for the authenticated user.
 */
export const registerKitchen = async (userId, data) => {
  // Check if user already has a kitchen
  const existing = await Kitchen.findOne({ owner: userId });
  if (existing) {
    throw new AppError('You already have a registered kitchen.', 409);
  }

  // Verify user has kitchen role
  const user = await User.findById(userId);
  if (!user || user.role !== ROLES.KITCHEN) {
    throw new AppError('Only kitchen accounts can register a kitchen.', 403);
  }

  // Determine coordinates
  let coordinates;
  if (data.latitude && data.longitude) {
    coordinates = [data.longitude, data.latitude]; // GeoJSON: [lng, lat]
  } else {
    // Geocode from address
    coordinates = await geocodeAddress(data.address);
  }

  const kitchen = await Kitchen.create({
    owner: userId,
    name: data.name,
    description: data.description || '',
    phone: data.phone,
    address: data.address,
    location: {
      type: 'Point',
      coordinates,
    },
    operatingHours: data.operatingHours || { open: '09:00', close: '21:00' },
    cuisineTypes: data.cuisineTypes || [],
  });

  return kitchen;
};

/**
 * Get kitchen profile by owner ID.
 */
export const getMyKitchen = async (userId) => {
  const kitchen = await Kitchen.findOne({ owner: userId });

  if (!kitchen) {
    throw new AppError('No kitchen found. Please register your kitchen first.', 404);
  }

  return kitchen;
};

/**
 * Get kitchen by ID (public).
 */
export const getKitchenById = async (kitchenId) => {
  const kitchen = await Kitchen.findById(kitchenId)
    .populate('owner', 'name email avatar');

  if (!kitchen) {
    throw new AppError('Kitchen not found.', 404);
  }

  return kitchen;
};

/**
 * Update kitchen details.
 */
export const updateKitchen = async (userId, data) => {
  const kitchen = await Kitchen.findOne({ owner: userId });

  if (!kitchen) {
    throw new AppError('No kitchen found. Please register first.', 404);
  }

  // If address changed, re-geocode
  if (data.address) {
    let coordinates;
    if (data.latitude && data.longitude) {
      coordinates = [data.longitude, data.latitude];
    } else {
      coordinates = await geocodeAddress(data.address);
    }
    kitchen.location = { type: 'Point', coordinates };
    kitchen.address = data.address;
  }

  // Update fields
  if (data.name !== undefined) kitchen.name = data.name;
  if (data.description !== undefined) kitchen.description = data.description;
  if (data.phone !== undefined) kitchen.phone = data.phone;
  if (data.operatingHours !== undefined) kitchen.operatingHours = { ...kitchen.operatingHours, ...data.operatingHours };
  if (data.cuisineTypes !== undefined) kitchen.cuisineTypes = data.cuisineTypes;
  if (data.isOpen !== undefined) kitchen.isOpen = data.isOpen;

  await kitchen.save();

  return kitchen;
};

/**
 * Toggle kitchen open/close status.
 */
export const toggleKitchenStatus = async (userId) => {
  const kitchen = await Kitchen.findOne({ owner: userId });

  if (!kitchen) {
    throw new AppError('No kitchen found.', 404);
  }

  kitchen.isOpen = !kitchen.isOpen;
  await kitchen.save();

  return kitchen;
};

/**
 * Find nearby kitchens using MongoDB 2dsphere geospatial query.
 *
 * Only returns kitchens that are:
 * - Approved by admin
 * - Currently open
 * - Not auto-paused
 */
export const getNearbyKitchens = async ({ longitude, latitude, radius }) => {
  const searchRadiusKm = radius || PLATFORM_CONFIG.DEFAULT_SEARCH_RADIUS_KM;
  const searchRadiusMeters = searchRadiusKm * 1000;

  const kitchens = await Kitchen.find({
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude],
        },
        $maxDistance: searchRadiusMeters,
      },
    },
    isApproved: true,
    isOpen: true,
    isAutoPaused: false,
  })
    .select('-kycDocuments -__v')
    .populate('owner', 'name avatar')
    .lean();

  return kitchens;
};

/**
 * Get all kitchens (admin).
 */
export const getAllKitchens = async ({ page = 1, limit = 20, status }) => {
  const query = {};

  if (status === 'approved') query.isApproved = true;
  if (status === 'pending') query.isApproved = false;

  const total = await Kitchen.countDocuments(query);
  const kitchens = await Kitchen.find(query)
    .populate('owner', 'name email phone')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  return {
    kitchens,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Approve or reject a kitchen (admin).
 */
export const updateKitchenApproval = async (kitchenId, isApproved) => {
  const kitchen = await Kitchen.findById(kitchenId);

  if (!kitchen) {
    throw new AppError('Kitchen not found.', 404);
  }

  kitchen.isApproved = isApproved;
  await kitchen.save();

  return kitchen;
};
