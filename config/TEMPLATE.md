```
{
  address: 'my.local.address',  <!-- default = 0.0.0.0 -->
  port: 65535, <!-- default = 65535 -->
  nat: {
    address: 'my.public.address' <!-- default = automatic retrieval of public IP address -->
    port: 'my.pubic.port'
  }
  seeds: [ <!-- default = empty list -->
    {
      address: 'some.remote.host',
      port: 65535
    }
  ],
  storage: 'path/to/db' <!-- default = ./db -->
}
```
