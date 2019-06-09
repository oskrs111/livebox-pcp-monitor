# livebox-pcp-monitor
>**Usefull Node.js application for Orange Livebox routers PCP configuration, monitoring and automated setup.**

Some time ago, **Orange** internet provider started to migrate all of their customer accounts to IPV6 schema. That caused many problems specially on previous NAT configurations which suddently stopped to work.

The provided solution for NAT in IPV6 schema is to use PCP server to support NAT features, but despite it seems to work,  this configuration is lost from time to time.

So here is a usefull application for **Node.js** that enables livebox PCP monitoring, that reconfigures the router in case the configuration has lost. It is suitable for use on a RaspberryPi or similar device runing 7/24.

## Requirements
The main requirement is to have **Node.js** runtime installed but I also strongly recommend  to use **pm2** process manager to run this (and other) application.

>https://nodejs.org/ \
>http://pm2.keymetrics.io/

## Installation
Just clone or download this repository into a folder.

```bash
$ git clone https://github.com/oskrs111/livebox-pcp-monitor.git
```

Then navigate into folder and install dependencies.

```bash
$ cd ./livebox-pcp-monitor
$ npm install
```

Finally run the utility.

```bash
$ livebox-pcp-monitor/node ./index.js
```

Alternatively with **pm2** manager.

```bash
$ livebox-pcp-monitor/pm2 start ./index.js --name pcp-monitor
```
## Configuration
Application use **config.json** file for configurations, you have to generate coping it from **config_template.json**. Remeber not to upload your **config.json** file to any repository.

```javascript
{
    "application":{
        "monitorInterval": 3600,
        "updateInterval": 15,
        "resetWait": 90,
        "logEnable": true
    },
    "livebox":{
        "ip":"192.168.1.1",
        "username":"admin",
        "password":"admin"
    },
    "pcp":[
    {
            "publicPort":"443",
            "internalPort":"443",
            "internalIp":"192.168.1.2",
            "protocol": "TCP",
            "proposeAllow": 1
        }, 
        {
            "publicPort":"80",
            "internalPort":"80",
            "internalIp":"192.168.1.3",
            "protocol": "TCP",
            "proposeAllow": 1			
        } 
    ]
}
```
### application
> **monitorInterval** - Time between the app will check PCP configuration in Livebox, in seconds. \
> **updateInterval** - Wait interval between PCP entries update, in seconds. \
> **resetWait** - Wait time to let Lvebox to complete the restart process, in seconds. \
> **logEnable** - Enables or disables the *updates.log* writting, true or false. \

### livebox
> **ip** - String with ipV4 Livebox ethernet address. \
> **username** - Login username for Livebox. \
> **password** - Login password for Livebox. \

### pcp
**Array of configuration objects, as found in NAT redirection Livebox form:**

> **publicPort** - String with requested public port. \
> **internalPort** - String with internal public port. \
> **internalIp** - String with internal IPV4 ethernet address. \
> **protocol** - String with requested protocol, "TCP" or "UDP". \
> **proposeAllow** - Enables o disables the PCP port proposal, 1 or 0.\