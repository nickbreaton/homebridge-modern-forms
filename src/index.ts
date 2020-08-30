import { API } from 'homebridge';

import { PLATFORM_NAME } from './settings';
import { ModernFormsPlatform } from './platform';

/**
 * This method registers the platform with Homebridge
 */
export = (api: API) => {
  api.registerPlatform("homebridge-modern-forms", PLATFORM_NAME, ModernFormsPlatform);
}
