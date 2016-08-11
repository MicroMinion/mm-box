# mm-box

Standalone Node.JS runtime for the [MicroMinion platform](https://github.com/MicroMinion/mm-platform)

## Installation

```bash

npm install mm-box

```

## Usage

```bash
node bin/mm-box
```

## Environmental variables

* **PORT**: IP port to use for TCP and UDP transports
* **DEBUG_LEVEL**: Boolean to determine if debug statements should be logged
* **LOG_CONTEXT**: Add context info to logs so that logs from multiple devices can be easily aggregated (adds nodeId as metadata to each log line which is base64 encoded version of public key used for encryption)
* **LOGSTASH**: Boolean to determine whether or not to log in logstash format
* **IDENTITY**: Base64 encoded private CurveCP key
* **PERSISTENCE**: Base URI for all persistence (e.g., root dir)
* **SERVICES**: space separated list of services to initialize
* **PLATFORM_STORE**: URI used for persisting state of core platform
* **KADEMLIA_STORE**: URI used for persisting state of Kademlia DHT service
* **SECRET**: Secret string from QR code or other physical identification (used to create new tenants)
