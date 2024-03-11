const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws' });

let isTraining = false;
const sendLock = new Promise(resolve => resolve());

function compareValuesVC(vcData) {
  const randomInteger = Math.floor(Math.random() * 10) + 1;
  const randomFloat = Math.round(Math.random() * 4 + 1) / 10;
  return [[vcData, randomInteger], randomFloat];
}

function compareValuesSMC(smcData) {
  const randomInteger = Math.floor(Math.random() * 10) + 1;
  const randomFloat = Math.round(Math.random() * 4 + 1) / 10;
  return [[smcData, randomInteger], randomFloat];
}

async function sendData(ws) {
  let count = 0;
  while (isTraining) {
    await new Promise(resolve => setTimeout(resolve, 1000)); // Data sending interval
    count++;
    const vcData = '1_green'; // Assuming a sample value for demonstration
    const smcData = '1_red'; // Assuming a sample value for demonstration

    const [vcResult, mindGreenData] = compareValuesVC(vcData);
    const [smcResult, mindGrisData] = compareValuesSMC(smcData);

    const fullVCData = `VC: ${JSON.stringify([vcResult, mindGreenData])}`;
    const fullSMCData = `SMC: ${JSON.stringify([smcResult, mindGrisData])}`;

    await sendLock;
    ws.send(fullVCData);
    ws.send(fullSMCData);
  }
}

async function sendCommands(ws) {
  // Event: ExperimentStart
  ws.send('ExperimentStart');

  for (let i = 0; i < 10; i++) { // Loop 10 times
    await new Promise(resolve => setTimeout(resolve, 2000)); // 2-second delay before each loop

    // Event: Start_Of_Trial
    await sendLock;
    ws.send('START_OF_TRIAL');

    isTraining = true; // Start sending data immediately after loading the timer
    // Start sending data task
    const sendDataTask = sendData(ws);

    // Wait for 10 seconds between "Start_Of_Trial" and "End_Of_Trial" during which data is sent
    await new Promise(resolve => setTimeout(resolve, 10000)); // Adjust this duration as needed for your experiment

    isTraining = false; // Stop sending data
    await sendDataTask; // Ensure the send_data task completes its current iteration before cancellation

    // Event: End_Of_Trial
    await sendLock;
    ws.send('END_OF_TRIAL');
  }

  await new Promise(resolve => setTimeout(resolve, 2000)); // Delay before stopping the experiment
  // Event: ExperimentStop
  ws.send('ExperimentStop');
}

wss.on('connection', (ws) => {
  sendCommands(ws);

  ws.on('message', (data) => {
    console.log(`Received data: ${data}`);
  });
});

app.get('/', (req, res) => {
  res.send('WebSocket server is running');
});

const port = process.env.PORT || 8000;
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});