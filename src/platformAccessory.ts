import { Service, PlatformAccessory, CharacteristicValue, CharacteristicSetCallback, CharacteristicGetCallback } from 'homebridge';

import { ModernFormsPlatform } from './platform';
import { ModernFormsHttpClient } from './utils/client';

const NUMBER_OF_FAN_SPEEDS = 6;

export class ModernFormsPlatformAccessory {
  private client: ModernFormsHttpClient;

  private fanService: Service;
  private lightService: Service;

  constructor(
    private readonly platform: ModernFormsPlatform,
    private readonly accessory: PlatformAccessory,
  ) {
      this.accessory.getService(this.platform.Service.AccessoryInformation)!
        .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Modern Forms')
        .setCharacteristic(this.platform.Characteristic.Model, 'Unknown')
        .setCharacteristic(this.platform.Characteristic.SerialNumber, this.accessory.context.device.clientId);

      this.client = new ModernFormsHttpClient(this.accessory.context.device.ip);

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

  getStepWithoutGoingOver = (steps: number) => {
    return Math.floor(100 / steps * 1000) / 1000;
  }

  debug = (...args: unknown[]) => {
    this.platform.log.debug(`[${this.accessory.context.device.ip}]`, ...args);
  }

  // FAN GETTERS / SETTERS

  getFanOn(callback: CharacteristicGetCallback) {
    this.debug('Get Fan Characteristic On');

    this.client.get()
      .then(data => callback(null, data.fanOn))
      .catch(callback);
  }

  setFanOn(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.debug('Set Fan Characteristic On ->', value);

    this.client.update({ fanOn: Boolean(value) })
      .then(() => callback(null))
      .catch(callback);
  }

  getRotationSpeed(callback: CharacteristicGetCallback) {
    this.debug('Get Fan Characteristic On');

    this.client.get()
      .then(data => callback(null, data.fanSpeed * 100 / NUMBER_OF_FAN_SPEEDS))
      .catch(callback);
  }

  setRotationDirection(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.debug('Set Fan Characteristic On ->', value);

    this.client.update({
      fanDirection: value === 0 ? 'forward' : 'reverse',
    })
      .then(() => callback(null))
      .catch(callback);
  }

  getRotationDirection(callback: CharacteristicGetCallback) {
    this.debug('Get Fan Characteristic On');

    this.client.get()
      .then(data => callback(null, data.fanDirection === 'forward' ? 0 : 1))
      .catch(callback);
  }

  setRotationSpeed(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.debug('Set Fan Characteristic On ->', value);

    const fanSpeed = Math.round(value as number / 100 * NUMBER_OF_FAN_SPEEDS);

    this.client.update({
      fanOn: fanSpeed > 0,
      fanSpeed,
    })
      .then(() => callback(null))
      .catch(callback);
  }

  // LIGHT GETTERS / SETTERS

  getLightOn(callback: CharacteristicGetCallback) {
    this.debug('Get Light Characteristic On');

    this.client.get()
      .then(data => callback(null, data.lightOn))
      .catch(callback);
  }

  setLightOn(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.debug('Set Light Characteristic On ->', value);

    this.client.update({ lightOn: Boolean(value) })
      .then(() => callback(null))
      .catch(callback);
  }

  getBrightness(callback: CharacteristicSetCallback) {
    this.debug('Get Characteristic Brightness');

    this.client.get()
      .then(data => callback(null, data.lightBrightness))
      .catch(callback);
  }

  setBrightness(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.debug('Set Characteristic Brightness -> ', value);

    this.client.update({
      lightOn: value > 0,
      lightBrightness: value as number,
    })
      .then(() => callback(null))
      .catch(callback);
  }
}
