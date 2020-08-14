import { Service, PlatformAccessory, CharacteristicValue, CharacteristicSetCallback, CharacteristicGetCallback } from 'homebridge';
import axios from 'axios';
import memoize from 'memoizee';

import { ModernFormsPlatform } from './platform';

const NUMBER_OF_FAN_SPEEDS = 6;

type RequestPayload = {
  fanOn: boolean,
  fanSpeed: number,
  fanDirection: 'forward' | 'reverse',
  lightOn: boolean,
  lightBrightness: number
}

export class ModernFormsPlatformAccessory {
  private fanService: Service;
  private lightService: Service;

  constructor(
    private readonly platform: ModernFormsPlatform,
    private readonly accessory: PlatformAccessory,
  ) {
      this.accessory.getService(this.platform.Service.AccessoryInformation)!
        .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Modern Forms');

      // FAN SERVICE

      this.fanService =
        this.accessory.getService(this.platform.Service.Fan) ??
        this.accessory.addService(this.platform.Service.Fan);

      this.fanService.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.ip);

      this.fanService.getCharacteristic(this.platform.Characteristic.On)
        .on('set', this.setFanOn.bind(this))
        .on('get', this.getFanOn.bind(this));

      this.fanService.getCharacteristic(this.platform.Characteristic.RotationSpeed)
        .on('set', this.setRotationSpeed.bind(this))
        .on('get', this.getRotationSpeed.bind(this))
        .setProps({ minStep: this.getStepWithoutGoingOver(6) });

      this.fanService.getCharacteristic(this.platform.Characteristic.RotationDirection)
        .on('set', this.setRotationDirection.bind(this))
        .on('get', this.getRotationDirection.bind(this));

      // LIGHT SERVICE

      this.lightService =
        this.accessory.getService(this.platform.Service.Lightbulb) ??
        this.accessory.addService(this.platform.Service.Lightbulb);

      this.lightService.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.ip);

      this.lightService.getCharacteristic(this.platform.Characteristic.On)
        .on('set', this.setLightOn.bind(this))
        .on('get', this.getLightOn.bind(this));

      this.lightService.getCharacteristic(this.platform.Characteristic.Brightness)
        .on('get', this.getBrightness.bind(this))
        .on('set', this.setBrightness.bind(this));
  }

  // HELPERS

  read = memoize(async () => {
    this.platform.log.debug('Read');

    const res = await axios.post<RequestPayload>(`http://${this.accessory.context.device.ip}/mf`, {
      queryDynamicShadowData: 1,
    });

    return res.data;
  }, { maxAge: 10 })

  write = async (options: Partial<RequestPayload>) => {
    this.platform.log.debug('Write ->', options);

    const res = await axios.post<RequestPayload>(`http://${this.accessory.context.device.ip}/mf`, options);

    return res.data;
  }

  getStepWithoutGoingOver = (steps: number) => {
    return Math.floor(100 / steps * 1000) / 1000;
  }

  // FAN GETTERS / SETTERS

  getFanOn(callback: CharacteristicGetCallback) {
    this.platform.log.debug('Get Fan Characteristic On');

    this.read()
      .then(data => callback(null, data.fanOn))
      .catch(callback);
  }

  setFanOn(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.platform.log.debug('Set Fan Characteristic On ->', value);

    this.write({ fanOn: Boolean(value) })
      .then(() => callback(null))
      .catch(callback);
  }

  getRotationSpeed(callback: CharacteristicGetCallback) {
    this.platform.log.debug('Get Fan Characteristic On');

    this.read()
      .then(data => callback(null, data.fanSpeed * 100 / NUMBER_OF_FAN_SPEEDS))
      .catch(callback);
  }

  setRotationDirection(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.platform.log.debug('Set Fan Characteristic On ->', value);

    this.write({
      fanDirection: value === 0 ? 'forward' : 'reverse',
    })
      .then(() => callback(null))
      .catch(callback);
  }

  getRotationDirection(callback: CharacteristicGetCallback) {
    this.platform.log.debug('Get Fan Characteristic On');

    this.read()
      .then(data => callback(null, data.fanDirection === 'forward' ? 0 : 1))
      .catch(callback);
  }

  setRotationSpeed(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.platform.log.debug('Set Fan Characteristic On ->', value);

    const fanSpeed = Math.round(value as number / 100 * NUMBER_OF_FAN_SPEEDS);

    this.write({
      fanOn: fanSpeed > 0,
      fanSpeed,
    })
      .then(() => callback(null))
      .catch(callback);
  }

  // LIGHT GETTERS / SETTERS

  getLightOn(callback: CharacteristicGetCallback) {
    this.platform.log.debug('Get Light Characteristic On');

    this.read()
      .then(data => callback(null, data.lightOn))
      .catch(callback);
  }

  setLightOn(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.platform.log.debug('Set Light Characteristic On ->', value);

    this.write({ lightOn: Boolean(value) })
      .then(() => callback(null))
      .catch(callback);
  }

  getBrightness(callback: CharacteristicSetCallback) {
    this.platform.log.debug('Get Characteristic Brightness');

    this.read()
      .then(data => callback(null, data.lightBrightness))
      .catch(callback);
  }

  setBrightness(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.platform.log.debug('Set Characteristic Brightness -> ', value);

    // TODO: when sliding up on dimmer from off state, the setLightOn gets called as well.
    // Sometimes that call makes itt to the device first, causing a split second of 100% brightness
    this.write({
      lightOn: value > 0,
      lightBrightness: value as number,
    })
      .then(() => callback(null))
      .catch(callback);
  }
}
