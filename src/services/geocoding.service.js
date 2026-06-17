import env from '../config/env.js';
import logger from '../utils/logger.js';

/**
 * Geocoding service with Google Maps API.
 * Converts an address string to [longitude, latitude] coordinates.
 */

/**
 * Geocode an address to [longitude, latitude] coordinates.
 * @param {Object} address - { street, city, state, pincode }
 * @returns {Promise<[number, number]>} [longitude, latitude]
 */
export const geocodeAddress = async (address) => {
  const addressString = `${address.street}, ${address.city}, ${address.state}, ${address.pincode}, India`;

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addressString)}&key=${env.GOOGLE_MAPS_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' || !data.results?.length) {
      logger.warn(`Geocoding failed for: ${addressString} — Status: ${data.status}`);
      throw new Error(`Geocoding failed: ${data.status}`);
    }

    const { lng, lat } = data.results[0].geometry.location;
    logger.info(`📍 [GEOCODE] ${addressString} → [${lng}, ${lat}]`);

    return [lng, lat];
  } catch (error) {
    logger.error(`Geocoding error: ${error.message}`);
    throw error;
  }
};

/**
 * Reverse geocode: [longitude, latitude] to address.
 * Used to get address from buyer's GPS coordinates.
 */
export const reverseGeocode = async (longitude, latitude) => {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${env.GOOGLE_MAPS_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' || !data.results?.length) {
      throw new Error(`Reverse geocoding failed: ${data.status}`);
    }

    const result = data.results[0];
    const components = result.address_components;

    const getComponent = (type) =>
      components.find((c) => c.types.includes(type))?.long_name || '';

    return {
      street: result.formatted_address.split(',')[0] || '',
      city: getComponent('locality') || getComponent('administrative_area_level_2'),
      state: getComponent('administrative_area_level_1'),
      pincode: getComponent('postal_code'),
      formattedAddress: result.formatted_address,
    };
  } catch (error) {
    logger.error(`Reverse geocoding error: ${error.message}`);
    throw error;
  }
};
