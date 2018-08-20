require('dotenv').config()
const dgram = require('dgram');

const mqtt = require('mqtt');
// const mqttCreds = {
//   IOT_DEVICE_ID: process.env.IOT_DEVICE_ID,
//   IOT_AUTH_TOKEN: process.env.IOT_AUTH_TOKEN,
//   IOT_API_KEY: process.env.IOT_API_KEY,
//   IOT_ORG_ID: process.env.IOT_ORG_ID,
//   IOT_DEVICE_TYPE: process.env.IOT_DEVICE_TYPE,
//   IOT_EVENT_TYPE: process.env.IOT_EVENT_TYPE
// }

const mqtt_broker = 'mqtt://' + process.env.IOT_ORG_ID + '.messaging.internetofthings.ibmcloud.com'
const mqtt_options = {
  username: process.env.IOT_API_KEY,
  password: process.env.IOT_AUTH_TOKEN,
  clientId: 'a:' + process.env.IOT_ORG_ID + ':lorabridge'
}
const mqtt_client = mqtt.connect(mqtt_broker, mqtt_options);
const watson_channel = 'iot-2/type/' + process.env.IOT_DEVICE_TYPE + '/id/' + process.env.IOT_DEVICE_ID + '/evt/' + process.env.IOT_EVENT_TYPE +'/fmt/json' // invalid channel for watson iot platfor

// var options = {
//   timeout: 40,
//   cleanSession: cleanSession,
//   useSSL: false,
//   userName: mqttCreds.IOT_API_KEY,
//   password: mqttCreds.IOT_AUTH_TOKEN,
//   onSuccess: function () {
//     console.log("mqtt client connected")
//     mqttClient.subscribe( watson_channel, subscribeOptions )
//   },
//   onFailure: function (err) {
//     console.log("mqtt client failed to connect")
//     console.log(options)
//     console.log(err)
//   }
// }

const server = dgram.createSocket('udp4');
const pattern = "{\".*";

server.on('error', (err) => {
  console.log(`server error:\n${err.stack}`);
  server.close();
});

// listen for LoRa udp packets
server.on('message', (msg, rinfo) => {
  //console.log(`server got: ${msg} from ${rinfo.address}:${rinfo.port}`);
  // console.log(msg.toString())
  var payload = msg.toString('utf8')
  var result = payload.match(pattern)
  if (result && result[0].rxpk && result[0].rxpk[0].data ) {
     console.log("lora data payload received")
     var msgPayload = result.rxpk[0].data
     var watsonMsg = { d: {
          time: result.tmst,
          data: Buffer.from(msgPayload, 'ascii' ) // array of sampled values in hex
        }
     }
     console.log(watsonMsg)
     console.log("----------------------------")
     mqtt_client.publish(watson_channel, watsonMsg)
     // mqtt.publish()
  } else {
    console.log("keepalive message received")
    console.log("payload")
    console.log(payload)
    console.log("result")
    console.log(result)
    console.log("----------------------------")
  }
});

server.on('listening', () => {
  const address = server.address();
  console.log(`server listening ${address.address}:${address.port}`);
});

server.bind(1700);
