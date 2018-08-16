# Create a LoRaWAN based Smart City network

LoRaWAN is a wireless communication protocol designed for the Internet of Things. This protocol is desirable for IoT solutions because it has a long range (up to 10km in optimal conditions) and requires a minimal amount of battery power. This longer range allows for the deployment of larger scale projects, such as smart parking structures, agricultural monitoring, tracking weather conditions, asset tracking, etc.

Each LoRa network consists of a "gateway", and one or more "nodes". This network uses a star based topology, in which each node communicates directly with the gateway. Data can be sent and received through each gateway/node connection. As data is received by the gateway, the gateway can then convert the data to a readable format and send it up to a IoT platform for further processing.

This code pattern is the first in a series of three, focusing on LoRaWAN and "Smart Cities". To complete this pattern, several pieces of hardware will need to be acquired which are listed below in the [prerequisites](#hardware) section.
<!-- 1. Assemble hardware and configure software to create a LoRaWAN based gateway, which can wirelessly receive sensor data from one or more end nodes. This gateway can forward data to
2.
3. -->
When the reader has completed this pattern series, they will understand how to
<!-- - Choose the best protocol for their IoT solution -->
- Assemble a Raspberry Pi with additional hardware to serve as a LoRaWAN gateway
- Determine which sensors are best for their IoT / Smart City setup
- Configure a microcontroller with LoRaWAN support. In this case, the microcontroller is a piece of hardware responsible for harvesting data from connected sensors, and wirelessly transmitting the collected data to the gateway via LoRa packets. We'll be using the [Adafruit LoRa "feather"](https://www.adafruit.com/product/3178) as the microcontroller in this series, but there are alternative boards such as the [Arduino Uno](https://store.arduino.cc/usa/arduino-uno-rev3) or the [MakerFocus LoRa board](https://www.amazon.com/gp/product/B076MSLFC9/ref=as_li_ss_tl?ie=UTF8&psc=1&linkCode=sl1&tag=periodictips-20&linkId=bba60e03c7e6a882c131dc2d3d7257d3).
- Forward LoRaWan packets from the gateway to the Watson IoT Platform
- Visualize data in Watson IoT Platform and/or a React Web Application
- Persist sensor data in a database
- Feed data into analytical / predictive algorithms

# Architecture
<p align="center">
<img src="https://i.imgur.com/GhL8sgD.png"  />
</p>

# Flow
1. LoRaWAN end nodes power on, sample values from sensors, and send data to Gateway. This process is repeated at a interval set by the user

2. Gateway receives LoRa packets, parses binary data as JSON object

3. Gateway publishes JSON sensor values to Watson IoT platform

4. Watson IoT platform persists sensor values in a Cloudant Database

# Prerequisites

### Software:
Gateway (Raspberry Pi):
- [packet-forwarder](https://github.com/Lora-net/packet_forwarder) - This program runs as a daemon and listens for incoming LoRa packets
- [Raspbian](https://www.raspberrypi.org/downloads/raspbian/) - Raspberry Pi operating system

End Node (Adafruit LoRa feather):
- [Arduino LMIC library](https://github.com/matthijskooijman/arduino-lmic)

Development Machine:
- [Arduino IDE](https://www.arduino.cc/en/Main/Software)
- [Node.js MQTT](https://www.npmjs.com/package/mqtt)
<!-- - mqtt -  -->

### Hardware:
Gateway:
- [Raspberry Pi](https://www.adafruit.com/product/3055)
- [915 MHz antenna](https://www.amazon.com/gp/product/B072QB7LRJ/ref=oh_aui_search_detailpage?ie=UTF8&psc=1)
- [Gateway Shield](https://oshpark.com/shared_projects/vpfXx2kB) (Optional, but highly recommended)
- [LoRA Concentrator Module](http://www.risinghf.com/#/product-details?product_id=6&lang=en)
- [Female Header pins](https://www.adafruit.com/product/598?gclid=EAIaIQobChMIz4GZgKv02wIVgr9kCh1WIghjEAQYBCABEgLfXPD_BwE)

End Node:
- [LoRA Feather (Microcontroller)](https://www.adafruit.com/product/3078)
- [Solderless Breadboard](https://www.sparkfun.com/products/12043)
- [2500mAh Lithium Batteries](https://www.adafruit.com/product/258)
- [Sensors](https://www.sparkfun.com/products/12862) (choose depending on your use case)

# Steps:
<!-- #### Hardware -->

## Set up the Raspberry Pi Gateway and install software dependencies

**Gateway Hardware**
We'll begin setting up the Gateway by connecting the Raspberry Pi GPIO to the pins on the LoRa concentrator module. This can be done two ways:
One method is to connect standard female jumper wires as seen in the diagram below.
<p align="center">
<img src="https://i.imgur.com/i3MDRHc.png"  />
</p>

Manually wiring the GPIO pins to the concentrator can be a bit difficult, as it's likely to misplace a connection since the hardware is not labeled, and wires can easily be disconnected when moving the gateway. So I opted to use a "shield" instead, which is a PCB that can connect the Raspberry Pi to the LoRa concentrator for a cleaner build. Below we have a photograph of the gateway shield, Raspberry Pi, and LoRaWAN concentrator next to one another
<!-- TODO, clean up above sentence -->
<p align="center">
<img src="https://i.imgur.com/GkYtdPq.jpg"  />
</p>

The first step is to solder a pair of 20 pin headers to the bottom, unlabeled side of the gateway shield. As an alternative to soldering, we can use a set of solderless "Hammer" headers which can be found [here](https://www.adafruit.com/product/3413)
<p align="center">
<img src="https://i.imgur.com/uomDcnu.jpg"  />
</p>

Next, place the gateway shield on top of the concentrator module so the pins are going through the shield through-holes, and solder the pins so the connection stays in place.
<p align="center">
<img src="https://i.imgur.com/g0h3BB1.jpg" width="750" height="450" />
</p>

Now, place the headers on top of the Raspberry Pi like so
<p align="center">
<img src="https://i.imgur.com/Kb3xsGd.jpg" />
</p>
<p align="center">
*side view*
</p>

<p align="center">
<img src="https://i.imgur.com/ziBL0VP.jpg" />
</p>
<p align="center">
*top view*
</p>

At this point, confirm that all connections are secure, and then plug in a micro USB cable to provide power to your Raspberry Pi. Lights on the Raspberry Pi and the LoRa concentrator should power on.

**Gateway Software**

Connect to your Raspberry Pi via SSH or directly with a USB keyboard

Next install git, if you haven't already
```
apt-get install -y git-core
```

Next we'll fetch the "packet forwarder" project. This project allows us to compile a binary program that'll allow our Raspberry Pi to listen for incoming LoRa packets, and forward them to a Cloud application.
First, clone the project
```
git clone https://github.com/Lora-net/packet_forwarder
```
And now build the project dependencies
```
cd packet_forwarder
./compile.sh
```

<!-- Next, follow this [link](https://console.thethingsnetwork.org/) to create a free account on The Things Network (TTN), which is a open LoRa network provider.
Click the "Gateways" button, and then "Register gateway"
<p align="center">
<img src="https://i.imgur.com/KiNIt0H.jpg"  />
</p>

Enter an ID and frequency plan. The frequency plan varies by country. We'll be using the US frequency of 915MHz.
<p align="center">
<img src="https://i.imgur.com/WnsKrmg.jpg"  />
</p> -->

## Create an account on The Things Network (TTN) and register the gateway.

Create a free account on The Things Network console at [https://console.thethingsnetwork.org/
 at [https://console.thethingsnetwork.org/](https://console.thethingsnetwork.org/) and creating a free account.

Next, log in and navigate to the "Gateways" section. Next, click the "Register Gateway" link.
<p align="center">
<img src="https://i.imgur.com/uLxNGQx.png"  />
</p>

Then, fill out the required information, a unique gateway ID and a frequency plan. The frequency plan differs by country. Since we're in the US, we'll select 915MHz
<p align="center">
<img src="https://i.imgur.com/liaSPAW.png"  />
</p>

After submitting the form, we'll be able to see a set of credentials, which consist of an ID and Key. The Key can be copied to your clipboard using the icon circled below.
<p align="center">
<img src="https://i.imgur.com/JIVOBZm.png"  />
</p>

These credentials will then need to be placed in a YAML file on the Raspberry Pi at `/home/pi/.pktfwd.yml` like so
<p align="center">
<img src="https://i.imgur.com/FSLzNyc.jpg"  />
</p>

If successful, this should print the following output
<p align="center">
<img src="https://i.imgur.com/cxh0keH.jpg"  />
</p>

## Create an application and a device in The Things Network console

 The End node arduino-lmic library requires a set of credentials (Network Session Key and App Session Key) to authenticate each device. These credentials can be generated by going back to The Things Network console. After logging in click on the "Applications" menu selection. Then, click "Add Application".

 <p align="center">
 <img src="https://i.imgur.com/7VntwXU.png"  />
 </p>

 Here we'll need to provide an Application ID to the form, and then click the "Add Application" button.
 <p align="center">
 <img src="https://i.imgur.com/khMwEuf.png"  />
 </p>

 Each Application can have one or more associated end nodes, referred to here as "Devices". Navigate to your newly created application, and c,lick "Register Device"
 <p align="center">
 <img src="https://i.imgur.com/xlCRy1T.png"  />
 </p>

 Provide a name as a Device ID, click the icon circled below to randomly generate a Device EUI and then click "Register"
 <p align="center">
 <img src="https://i.imgur.com/OVxp7MI.png"  />
 </p>

 Click the generated device. This view displays the Network Session Key and App Session Key, which we'll need in the next step.
 <p align="center">
 <img src="https://i.imgur.com/QVtLd26.png"  />
 </p>

## Set up the Adafruit LoRa Feature M0 as the end point and install software dependencies

**End Node Hardware**
We can continue on by setting up a end node, which is responsible for reading sensor data and forwarding the packaged data to the gateway.

In this context, each end node consists of a microprocessor, a LoRa radio, an antenna, and one or more sensors.

We opted to use a Adafruit LoRa Feather M0, which is a microcontroller that includes a LoRa radio, Cortex M0 processor, and a USB/battery port.

First, solder the included male headers to both sides of the LoRa Feather.
<!-- <TODO, add pic> -->
Next, plug the LoRa feather into a solderless breadboard.
<!-- <TODO, add pic> -->

Now, we'll have to solder two additional points. As seen in the diagram below, solder an antenna to the joint with the yellow arrow labeled "antenna" pointing to it (we used a standard copper wire). See this [link](https://learn.adafruit.com/adafruit-feather-m0-radio-with-lora-radio-module?view=all#wire-antenna) for more info.

Next, solder a different wire to the joint labeled "dio2", and connect the other end of the wire to the pin labelled "11". Finally, connect a wire from the pin labeled "io1" to the pin labeled "6".

<p align="center">
<img src="https://i.imgur.com/yhYLRvA.png"  />
</p>

Once this is complete, connect a micro-usb cable from our laptop to the LoRa feather node to supply power.

**End Node Software**
Now we'll need to carry out a few more configuration steps to allow our node to send data to the gateway

- Install and configure the Arduino IDE

Begin by visiting the following link on the Arduino web [here](https://www.arduino.cc/en/Main/Software?), scroll down to the "Download the Arduino IDE", and click the corresponding link for your operating system. Unzip the downloaded archive file, and open the resulting "Arduino" application.

Next, open the "Preferences" menu.
<p align="center">
<img src="https://i.imgur.com/jLGxINO.png"  />
</p>

We'll need to add support to the Arduino IDE for the Adafruit LoRa feather by adding this url https://adafruit.github.io/arduino-board-index/package_adafruit_index.json to the "Additional Boards Manager URLs" section
<p align="center">
<img src="https://i.imgur.com/XJtG9jP.png" style="width:400px;height:300px;" />
</p>

<!-- TODO, clean up this sentence -->
We'll also need to add "SAMD" support which is the architecture utilized by this particular microcontroller. Navigate to the "tools" menu, hover over the "Boards" options, and then click "Boards Manager".
<p align="center">
<img src="https://i.imgur.com/gJdzlVM.png"  />
</p>

In the search bar, enter "Arduino SAMD", select the resulting package, and click "Install".
<p align="center">
<img src="https://i.imgur.com/byQ3nQH.png"  />
</p>

Next, enter "Adafruit SAMD" in the search bar, and then select the package titled "Adafruit SAMD Boards". Ensure that the Adafruit Feather M0 is listed as a supported board, and click "Install"
<p align="center">
<img src="https://i.imgur.com/vAZ3FGv.png"  />
</p>

Close and re-open the Arduino application.

- Next we'll need to download the [LMIC (LoraMAC-in-C) library](https://github.com/matthijskooijman/arduino-lmic) and edit the included configuration file.

Download the `arduino-lmic` library with the following command
```
git clone https://github.com/matthijskooijman/arduino-lmic
```

(USA only) Before loading this library to our gateway node, we'll need to adjust the configuration file at `arduino-lmic/src/lmic/config.h` to transmit signals using the standard American LoRaWAN frequency (915MHz). This can be done by simply commenting out the 8th line containing the `CFG_eu868` value, and ensuring the `CFG_us915` line is set like so. This step should be skipped if you are located within the EU.
<p align="center">
<img src="https://i.imgur.com/fzq4Aw2.png"  />
</p>

- Use the Arduino IDE to flash the LMIC library onto the node

Install the `arduino-lmic` library by navigating to the "Sketch" menu, hover over the "Include Library" selection, and then click "Add .zip library".
<p align="center">
<img src="https://i.imgur.com/l2Rcb7D.png"  />
</p>

Select the cloned `arduino-lmic` folder and then click the "Choose" button
<p align="center">
<img src="https://i.imgur.com/zrPGJsv.png"  />
</p>


- Next, we'll need to take the Device credentials (Network Session Key and App Session Key) and place them into a Arduino "sketch". A sketch is a C code snippet that runs in a loop on the node. This snippet defines node behavior, and can place the node in "deep sleep" mode at a given interval, define input/output pins to read and write to sensors, listen for updates from the gateway, etc.

In this example, we'll use the sketch included in our cloned arduino-lmic repository at `arduino-lmic/examples/ttn-abp/ttn-abp.ino`. This sketch repeatedly transmits a string "Hello World" to a nearby LoRa gateway. The Network Session key should be inserted as a value to the NWSKEY variable, and the Application Key set as the APPSKEY variable, as seen below
<p align="center">
<img src="https://i.imgur.com/ejdNJTu.png"  />
</p>

Finally, update the values in the lmic_pins struct as seen below. This struct tells the LMIC library how to access the LoRa radio module.

```
const lmic_pinmap lmic_pins = {  
  .nss = 8,
  .rxtx = LMIC_UNUSED_PIN,
  .rst = 4,
  .dio = {3,6,11} // dio0, dio1, dio2
};
```

## Parse the sensor data values and publish them to the Watson IoT Platform

Now, we can test that everything has been set up properly by sending a "Hello World" string from our LoRa node to our gateway. Upload the updated "sketch" to the node by clicking the button in the upper section of the Arduino IDE. Once successfully uploaded, this snippet will repeatedly run in a loop.

<p align="center">
<img src="https://i.imgur.com/GcLb6Jy.png"  />
</p>

Finally, open "The Things Network" console to confirm that data is successfully being sent from the node to the gateway. We should see a view with a timestamp and payload of bytes
<p align="center">
<img src="https://i.imgur.com/949UqMf.png"  />
</p>

We can view the original payload by using the standard "Buffer" library in node.js like so
<p align="center">
<img src="https://i.imgur.com/Kn483SZ.png"  />
</p>

Now that we've verified that a basic "Hello world" string can be published from our node to the gateway, let's update our node to read and publish values from a sensor. To do this, we can plug a sensor into the breadboard, connect its negative/positive pins to the breadboard power rails, and its data pin to one of the feather “Analog input” pins (6 in total labeled like A0, A1, etc). In this example, I’ll use a sound sensor.

To test the sensor, create a simple sketch in which the “loop” method constantly prints out the sound sensor value to Arduino’s serial monitor. This can be done like so.

```
String soundPin = "A0";

void setup() {
  // put your setup code here, to run once:
  pinMode(soundPin, INPUT);
}
void loop() {
  // put your main code here, to run repeatedly:
  soundValue = constrain(analogRead(soundPin), 0, 255);
  Serial.println(F(soundValue));
}
```

After verifying that the sensor was able to successfully detect sound levels, the next step is to publish the sensor values to the gateway, so they could be aggregated and analyzed. Each published packet can have a maximum size of 52 bytes (8 bits), and each byte can contain a value in the range of 0–255. ASCII strings take up a lot of bandwidth, (“Hello, World” was 26 bytes!), so it’s best to send a buffer of binary values instead of text or JSON objects.

Since this particular sound sensor has low precision unsigned values (constrained range from 0 to 255), we can fit each value in a single byte. To do this, we’ve adjusted the `do_send` method on line 136 of the [ttn-abp-sensor.ino](sketches/ttn-abp-sensor.ino#136) sketch to initialize a byte array, run through a "for" loop and append sensor values to the array during each iteration. We've set the sampling interval to measure the sensor level once every second, and append the average sound level to the byte array. Once the byte array is the maximum permitted size (52 bytes), it will be published to the gateway

After flashing the updated sketch to the board, we can see a different set of incoming values in the TTN console, which takes the form of hex values. So now we’re able to publish sensor values at periodic intervals to a internet-connected service. And to access the data without going through a web application, we can use a MQTT client to subscribe to all incoming values published to our TTN account. For example, we can use the Node.js MQTT client cli like so.

`mqtt_sub -h us-west.thethings.network -p 1883 -u "${TTN_APPLICATION}" -t "${TTN_APPLICATION}/devices/${TTN_DEVICE}/up" -P "${TTN_ACCESS_KEY}"`

<p align="center">
<img src="https://i.imgur.com/JCX1Qbk.png"  />
</p>

#### Parse the sensor data values and publish them to the Watson IoT Platform.
<!-- #### Forward sensor values from The Things Network (TTN) to Watson IoT platform. -->

Now that we can publish and receive sensor data from the TTN service, our final portion of this pattern shows how to parse the sensor values and publish them to the Watson IoT Platform

First, you’ll need to provision a Watson IoT service [here](https://console.bluemix.net/catalog/services/internet-of-things-platform/), and a Cloudant NoSQL db [here](https://console.bluemix.net/catalog/services/cloudant). Once those are up and running, go to the IoT dashboard, click the "Extensions" option in the sidebar, and enable the “Historian Data Storage” extension. This allows all incoming data received by the platform to be archived in the associated Cloudant database.

<p align="center">
<img src="https://i.imgur.com/2gAspUV.png"  />
</p>

Also, create a set of MQTT credentials that can be used to publish sensor data to the platform with the following steps

Enter the IoT Platform dashboard, select "Devices" from the left hand menu, and then click the "Add Device" button
<p align="center">
<img src="https://i.imgur.com/fec24FG.png"  data-canonical-src="https://i.imgur.com/fec24FG.png">
</p>

Next, provide a device type and ID.
<p align="center">
<img src="https://i.imgur.com/REQfYIK.png"  data-canonical-src="https://i.imgur.com/REQfYIK.png">
</p>

The next two steps (Device Information, Groups) can be skipped.

In the "Security" tab, an Authentication token can be entered as long as it meets certain criteria (between 8 and 36 characters, contains mix of lowercase/uppercase letters, numbers, and symbols). Leave this field blank if you'd like for one to be generated instead.

<p align="center">
<img src="https://i.imgur.com/rycnjlF.png"  data-canonical-src="https://i.imgur.com/rycnjlF.png">
</p>

Clicking the "Finish" button will generate a set of credentials that can be used to publish messages to the IoT Platform

<p align="center">
<img src="https://i.imgur.com/A2A6yXW.png" width="650" height="450">
</p>

Now, MQTT publish commands can be made from a device in the following format </br>
Client ID: `d:${organization_id}:${device_type}:${device_id}` </br>
Username: `use-token-auth` </br>
Password: `${authentication_token}` </br>
Endpoint: `${organization_id}.messaging.internetofthings.ibmcloud.com` </br>

Place these values in the "Watson IoT platform credentials" section in the `ttn-to-watson.js` script. Also add the Device Id, Application Id, and Access key from the TTN console. Once the credentials for both the Watson IoT platform and "The Things Network" have been placed in the script, start the script up with the following steps
```
cd scripts
npm install underscore
npm install -g mqtt
npm ttn-to-watson.js
```

Each individual sensor reading will be published to the Watson IoT Platform as a JSON object. In our case, each of our messages take the following format
```
{
  "d": {
    "sound": 83,
    "timestamp": "2018-02-07T17:52:49.398Z"
  }
}
```

As each batch of our sensor values are published, we leverage one of the Watson IoT features to create a time-series visual, called a “board”. This can be created by going to the platform dashboard and clicking “Create New Board”
<p align="center">
<img src="https://i.imgur.com/T4I0H7V.png"  />
</p>

This will present a form asking for the event name and value(s) to be plotted
<p align="center">
<img src="https://i.imgur.com/t4QYECG.png"  />
</p>

Once that form has been filled out, we can view the archived data by clicking the date, unchecking the “real-time” radio button, and selecting the date/time range. Since this data payload was published to TTN on 2/7/18, we can adjust the date range to look between the 6th to the 8th of February, and zoom in using the slider icons.

<p align="center">
<img src="https://imgur.com/2udXdyF"  />
</p>

<p align="center">
<img src="https://i.imgur.com/beZM5dq.png"  />
</p>

# Troubleshooting

Additional information and troubleshooting steps for the Adafruit feather can be found on the official site [here](https://learn.adafruit.com/adafruit-feather-m0-basic-proto/using-with-arduino-ide)

# Links

- [Use Cases](https://www.thethingsnetwork.org/forum/c/use-cases)
- [Adafruit Feather Docs](https://learn.adafruit.com/assets/46254)
- [LoRaWAN White paper](https://arxiv.org/pdf/1706.03086.pdf)

<!-- pick the relevant ones from below -->
# Learn more
* **IoT Patterns**: Enjoyed this Code Pattern? Check out our other [IoT Patterns](https://developer.ibm.com/code/technologies/iot/)

# License
[Apache 2.0](LICENSE)
