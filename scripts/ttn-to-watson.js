// Set MQTT credentials / topic for Watson IoT endpoint
var mqtt = require('mqtt')
var _ = require('underscore')

// Watson IoT platform credentials
var orgId = '<redacted>'
var deviceId = '<redacted>'
var eventName = '<redacted>'
var authenticationToken = '<redacted>'
var watsonCreds = {
	clientId : 'd:' + orgId + ':MQTTDevice:' + deviceId,
	username : 'use-token-auth',
	password : authenticationToken
}
var watsonEndpoint = 'mqtt://' + orgId + '.messaging.internetofthings.ibmcloud.com'
var watsonClient = mqtt.connect(watsonEndpoint, watsonCreds)
watsonClient.on('connect', function (topic, message) {
})

var watsonTopic = 'iot-2/evt/' + eventName + '/fmt/json'

// TTN MQTT credentials
var ttnRouter = 'us-west.thethings.network'
var ttnEndpoint = 'mqtt://' + ttnRouter
var deviceId = '<redacted>'
var applicationId = '<redacted>'
var accessKey = '<redacted>'
var ttnCreds = {
  username: applicationId,
  password: accessKey
}
var ttnClient = mqtt.connect(ttnEndpoint, ttnCreds)
var ttnTopic = applicationId + '/devices/' + deviceId + '/up'
ttnClient.subscribe(ttnTopic)
ttnClient.on('message', function (topic, message) {
  var sensorValues = Buffer.from(JSON.parse(message).payload_raw)
  var numSamples = sensorValues.length
  var samplingInterval = 60000 // milliseconds
  var startingTime = (new Date( JSON.parse(message).metadata.time).getTime()) - (samplingInterval * numSamples)
  // Publish time / sensor readings.
  for (i in _.range(0, sensorValues.length)) {
     watsonClient.publish(watsonTopic,
     // console.log(
      JSON.stringify({
       d: {
        sound: sensorValues[i],
        timestamp: new Date(startingTime + (samplingInterval * i))
       }
      })
    )
  }
})
