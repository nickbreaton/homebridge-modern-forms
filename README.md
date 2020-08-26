# Modern Forms Homebridge Plugin

Add support for [Modern Forms](https://modernforms.com) fans to Homekit using Homebridge.

## Prerequisites

- Have [Homebridge](https://homebridge.io) setup

## Setup

1. Add any fans you'd like to control to your home network.
    1. Download the Modern Forms [iOS](https://apps.apple.com/us/app/modern-forms/id1425046298) or [Android](https://play.google.com/store/apps/details?id=com.WAC.PlayStore.ModernForms&hl=en_US) app.
    1. Follow the instructions to pair your fan.
    1. Verify your fans show up in the app and can be controlled.
    1. Optionally, delete the app.

1. Add the following to your Homebridge `config.json` under platforms.

    ```json
    {
        "platform": "ModernForms"
    }
    ```

1. Verify your `config.json` looks similar to the following.

    ```json
    {
        "bridge": {
            "name": "Name",
            "username": "XX:XX:XX:XX:XX:XX",
            "port": 00000,
            "pin": "000-00-000"
        },
        "platforms": [
            {
                "platform": "ModernForms"
            }
        ]
    }
    ```

1. You’re all set! Any fans you saw in the Modern Forms app should appear in the Home app automatically.

## Configuration

### Specifying Fan IP Addresses

If any of your fans are not automatically found, try specifiying their IP addresses in the following format.

```json
{
    "platform": "ModernForms",
    "fans": [
        {
            "ip": "192.168.0.10"
        },
        {
            "ip": "192.168.0.11"
        }
    ]
}
```

### Disabling Auto Discovery

If you would like to disable the automatic discovery of fans on your network, specify the following option. You will need to specify the IP address of your fans manually [as shown above](#specifying-fan-ip-addresses).

```json
{
    "platform": "ModernForms",
    "autoDiscover": false
}
```