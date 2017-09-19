const VERIFY_TOKEN = ;
const PAGE_ACCESS_TOKEN =;
const WATSON_USER = ;
const WATSON_PASSWORD = ;
const WATSON_WORKSPACE_ID = ;
'use strict';
//require('dotenv').config({path: process.cwd()})
// require('dotenv').config();
// var env = require('.env');
const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const path = require('path');
var messengerButton = "<html><head><title>Facebook Messenger Bot</title></head><body><h1>Facebook Messenger Bot</h1>This is a bot based on Messenger Platform QuickStart. For more details, see their <a href=\"https://developers.facebook.com/docs/messenger-platform/guides/quick-start\">docs</a>.<script src=\"https://button.glitch.me/button.js\" data-style=\"glitch\"></script><div class=\"glitchButton\" style=\"position:fixed;top:20px;right:20px;\"></div></body></html>";

// The rest of the code implements the routes for our Express server.
// let app = express();

const ConversationV1 = require('watson-developer-cloud/conversation/v1');
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

var contexts = [];

app.get('/webhook', function(req, res) {
  if (req.query['hub.mode'] === 'subscribe' &&
      req.query['hub.verify_token'] === VERIFY_TOKEN) {//
    console.log("Validating webhook");
    res.status(200).send(req.query['hub.challenge']);
  } else {
    console.error("Failed validation. Make sure the validation tokens match!");
    res.sendStatus(403);
  }
});

app.post('/webhook', (req, res) => {
  console.log(req.body);
  if (req.body.object === 'page') {
    req.body.entry.forEach((entry) => {
      entry.messaging.forEach((event) => {
        if (event.message && event.message.text) {
          getWatson(event);
        }
      });
    });
    res.status(200).end();
  }
});

function getWatson(event) {
  var number = event.sender.id;
  var message = event.message.text;

  var context = null;
  var index = 0;
  var contextIndex = 0;
  contexts.forEach(function(value) {
    console.log(value.from);
    if (value.from == number) {
      context = value.context;
      contextIndex = index;
    }
    index = index + 1;
  });

  console.log('Recieved message from ' + number + ' saying \'' + message  + '\'');

  var conversation = new ConversationV1({
    username: WATSON_USER,
    password: WATSON_PASSWORD,
    version_date: ConversationV1.VERSION_DATE_2016_09_20
  });

  console.log(JSON.stringify(context));
  console.log(contexts.length);

  conversation.message({
    input: { text: message },
    workspace_id: WATSON_WORKSPACE_ID,
    context: context
   }, function(err, response) {
       if (err) {
         console.error(err);
       } else {
         console.log(response.output.text[0]);
         if (context == null) {
           contexts.push({'from': number, 'context': response.context});
         } else {
           contexts[contextIndex].context = response.context;
         }

         var intent = response.intents[0].intent;
         console.log(intent);
         if (intent == "done") {
           //contexts.splice(contexts.indexOf({'from': number, 'context': response.context}),1);
           contexts.splice(contextIndex,1);
           // Call REST API here (order pizza, etc.)
         }

         request({
             url: 'https://graph.facebook.com/v2.6/me/messages',
             qs: {access_token: PAGE_ACCESS_TOKEN},
             method: 'POST',
             json: {
               recipient: {id: number},
               message: {text: response.output.text[0]}
             }
           }, function (error, response) {
             if (error) {
                 console.log('Error sending message: ', error);
             } else if (response.body.error) {
                 console.log('Error: ', response.body.error);
             }
           });
       }
  });
}

const server = app.listen(process.env.PORT || 3000, () => {
  console.log('Express server listening on port %d in %s mode', server.address().port, app.settings.env);
});
