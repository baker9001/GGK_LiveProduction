/**
 * Geolocation Module
 *
 * Re-exports all geolocation functionality for convenient imports.
 *
 * Usage:
 *   import { getLocation, useGeolocation } from '@/lib/geolocation';
 */

export {
  getLocation,
  getPermissionState,
  requestLocationPermission,
  onPermissionChange,
  clearLocationCache,
  canGetHighAccuracyLocation,
  type GeoLocationResult,
  type GeolocationOptions,
  type PermissionState,
  type LocationCache
} from './geolocationService';
