// Additional diagnostic-only JS socket prohibition; not an isolation claim for
// Python. Its only normal children are the existing credential-free readers.
import net from 'node:net';
import tls from 'node:tls';
import http from 'node:http';
import https from 'node:https';
import dgram from 'node:dgram';
import { syncBuiltinESMExports } from 'node:module';
const stop = () => { throw Object.assign(new Error('SAVED_CURRENT_WINDOW_NETWORK_DISABLED'), { code: 'SAVED_CURRENT_WINDOW_NETWORK_DISABLED' }); };
net.connect = stop; net.createConnection = stop; net.Socket.prototype.connect = stop;
tls.connect = stop; http.request = stop; http.get = stop; https.request = stop; https.get = stop;
dgram.createSocket = stop; globalThis.fetch = stop;
if ('WebSocket' in globalThis) globalThis.WebSocket = class { constructor() { stop(); } };
syncBuiltinESMExports();
