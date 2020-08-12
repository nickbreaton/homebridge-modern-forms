import { Service, PlatformAccessory, CharacteristicValue, CharacteristicSetCallback, CharacteristicGetCallback } from 'homebridge';
import axios from 'axios';

import { ExampleHomebridgePlatform } from './platform';

const NUMBER_OF_FAN_SPEEDS = 6;

type RequestPayload = {
  fanOn: boolean,
  fanSpeed: number,
  fanDirection: 'forward' | 'reverse',
  lightOn: boolean,
  lightBrightness: number
}

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class ModernFormsFan {
  private fanService: Service;
  private lightService: Service;

  constructor(
    private readonly platform: ExampleHomebridgePlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Default-Manufacturer')
      .setCharacteristic(this.platform.Characteristic.Model, 'Default-Model')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, 'Default-Serial');

    // get the LightBulb service if it exists, otherwise create a new LightBulb service
    // you can create multiple services for each accessory
    this.fanService = this.accessory.getService(this.platform.Service.Fan) || this.accessory.addService(this.platform.Service.Fan);
    this.lightService = this.accessory.getService(this.platform.Service.Lightbulb) || this.accessory.addService(this.platform.Service.Lightbulb);

    // To avoid "Cannot add a Service with the same UUID another Service without also defining a unique 'subtype' property." error,
    // when creating multiple services of the same type, you need to use the following syntax to specify a name and subtype id:
    // this.accessory.getService('NAME') ?? this.accessory.addService(this.platform.Service.Lightbulb, 'NAME', 'USER_DEFINED_SUBTYPE');

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.fanService.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.ip);
    this.lightService.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.ip);

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/Lightbulb

    this.fanService.getCharacteristic(this.platform.Characteristic.On)
      .on('set', this.setFanOn.bind(this))
      .on('get', this.getFanOn.bind(this));

    this.fanService.getCharacteristic(this.platform.Characteristic.RotationSpeed)
      .on('set', this.setRotationSpeed.bind(this))
      .on('get', this.getRotationSpeed.bind(this))
      .setProps({ minStep: 100 / NUMBER_OF_FAN_SPEEDS });

    this.fanService.getCharacteristic(this.platform.Characteristic.RotationDirection)
      .on('set', this.setRotationDirection.bind(this))
      .on('get', this.getRotationDirection.bind(this));

    // register handlers for the On/Off Characteristic
    this.lightService.getCharacteristic(this.platform.Characteristic.On)
      .on('set', this.setLightOn.bind(this))                // SET - bind to the `setOn` method below
      .on('get', this.getLightOn.bind(this));               // GET - bind to the `getOn` method below

    // register handlers for the Brightness Characteristic
    this.lightService.getCharacteristic(this.platform.Characteristic.Brightness)
      .on('get', this.getBrightness.bind(this))       // SET - bind to the 'setBrightness` method below
      .on('set', this.setBrightness.bind(this));       // SET - bind to the 'setBrightness` method below
  }

  private read() {
    return axios.post<RequestPayload>(`http://${this.accessory.context.device.ip}/mf`, {
      queryDynamicShadowData: 1,
    })
      .then(res => res.data);
  }

  private write(options: Partial<RequestPayload>) {
    return axios.post<RequestPayload>(`http://${this.accessory.context.device.ip}/mf`, options)
      .then(res => res.data);
  }

  setFanOn(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.platform.log.debug('Set Fan Characteristic On ->', value);

    this.write({ fanOn: Boolean(value) })
      .then(() => callback(null))
      .catch(callback);
  }

  getFanOn(callback: CharacteristicGetCallback) {
    this.platform.log.debug('Get Fan Characteristic On');

    this.read()
      .then(data => callback(null, data.fanOn))
      .catch(callback);
  }

  setRotationSpeed(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.platform.log.debug('Set Fan Characteristic On ->', value);

    this.write({
      fanOn: true,
      fanSpeed: Math.min(Math.round(value as number / 100 * NUMBER_OF_FAN_SPEEDS), 1),
    })
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
      fanDirection: value === 1 ? 'forward' : 'reverse',
    })
      .then(() => callback(null))
      .catch(callback);
  }

  getRotationDirection(callback: CharacteristicGetCallback) {
    this.platform.log.debug('Get Fan Characteristic On');

    this.read()
      .then(data => callback(null, data.fanDirection === 'forward' ? 1 : 0))
      .catch(callback);
  }

  setLightOn(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.platform.log.debug('Set Light Characteristic On ->', value);

    this.write({ lightOn: Boolean(value) })
      .then(() => callback(null))
      .catch(callback);
  }

  getLightOn(callback: CharacteristicGetCallback) {
    this.platform.log.debug('Get Light Characteristic On');

    this.read()
      .then(data => callback(null, data.lightOn))
      .catch(callback);
  }

  setBrightness(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.platform.log.debug('Set Characteristic Brightness -> ', value);

    this.write({
      lightOn: true,
      lightBrightness: value as number,
    })
      .then(() => callback(null))
      .catch(callback);
  }

  getBrightness(callback: CharacteristicSetCallback) {
    this.platform.log.debug('Get Characteristic Brightness');

    this.read()
      .then(data => callback(null, data.lightBrightness))
      .catch(callback);
  }
}
