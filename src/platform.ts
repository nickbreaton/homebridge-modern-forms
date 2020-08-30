import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';
import network from 'network';
import { bindNodeCallback, of, partition, from, concat, EMPTY } from 'rxjs';
import { tap, flatMap, filter, mapTo, share, map, distinct } from 'rxjs/operators';
import ping from 'ping';
import calculateNetwork from 'network-calculator';
import getIpRange from 'get-ip-range';
import arp from 'node-arp';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { ModernFormsPlatformAccessory } from './platformAccessory';
import { ModernFormsHttpClient } from './utils/client';

interface Config extends PlatformConfig {
  autoDiscover?: boolean
  fans?: Array<{ ip: string }>
}

export class ModernFormsPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;
  public readonly accessories: PlatformAccessory[] = [];

  constructor(
    public readonly log: Logger,
    public readonly config: Config,
    public readonly api: API,
  ) {
    this.log.debug('Finished initializing platform:', this.config.name);

    this.api.on('didFinishLaunching', () => {
      this.log.debug('Executed didFinishLaunching callback');
      this.discoverDevices();
    });
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);
    this.accessories.push(accessory);
  }

  async discoverDevices() {
    this.log.info('Looking for Modern Forms devices on network');

    const getActiveInterface = bindNodeCallback(network.get_active_interface);
    const getMAC = bindNodeCallback(arp.getMAC.bind(arp));

    const cachedIpAddresses$ = from(this.accessories ?? []).pipe(
      map(accessory => accessory.context.device.ip),
      tap(ip => this.log.debug('Found potential IP address from cached devices:', ip)),
    );

    const configIpAddresses$ = from(this.config.fans ?? []).pipe(
      map(fan => fan.ip),
      tap(ip => this.log.debug('Found potential IP address from config:', ip)),
    );

    const networkIpAddresses$ = of(this.config.autoDiscover).pipe(
      flatMap(autoDiscover => autoDiscover === false ? EMPTY : getActiveInterface()),
      tap(() => this.log.debug('Searching network for Modern Forms fans')),
      map(int => calculateNetwork(int.ip_address ?? '192.168.0.1', int.netmask ?? '255.255.255.0')),
      map(network => network.network + '/' + network.bitmask),
      flatMap(subnet => getIpRange(subnet)),
      flatMap(ip => ping.promise.probe(ip).then(() => ip)),
      flatMap(ip => getMAC(ip).pipe(
        map(mac => mac?.toUpperCase() ?? ''),
        filter(mac => mac.startsWith('C8:93:46')),
        mapTo(ip),
      )),
      tap(ip => this.log.debug('Found potential IP address from network and filtering by MAC vendor:', ip)),
    );

    const devices$ = concat(cachedIpAddresses$, configIpAddresses$, networkIpAddresses$).pipe(
      distinct(),
      flatMap(ip => of(new ModernFormsHttpClient(ip)).pipe(
        flatMap(client => client.get().then(res => res.clientId).catch(() => null)),
        filter((clientId): clientId is string => clientId !== null),
        tap(clientId => this.log.info(`Found device at ${ip} with client ID of ${clientId}`)),
        map(clientId => {
          const uuid = this.api.hap.uuid.generate(clientId);
          const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);
          return { ip, clientId, uuid, existingAccessory };
        }),
      )),
      share(),
    );

    const [newDevices$, existingDevices$] = partition(
      devices$,
      device => !device.existingAccessory,
    );

    newDevices$.subscribe(({ uuid, ip, clientId }) => {
      this.log.info('Adding new accessory:', clientId);
      const accessory = new this.api.platformAccessory(clientId, uuid);
      accessory.context.device = { uuid, ip, clientId };
      new ModernFormsPlatformAccessory(this, accessory);
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
    });

    existingDevices$.subscribe(({ clientId, existingAccessory }) => {
      this.log.info('Restoring existing accessory from cache:', clientId);
      new ModernFormsPlatformAccessory(this, existingAccessory!);
    });
  }
}
