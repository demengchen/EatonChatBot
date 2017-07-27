/*-----------------------------------------------------------------------------
This template demonstrates how to use an IntentDialog with a LuisRecognizer to add 
natural language support to a bot. 
For a complete walkthrough of creating this type of bot see the article at
https://aka.ms/abs-node-luis
-----------------------------------------------------------------------------*/
"use strict";
var builder = require("botbuilder");
var botbuilder_azure = require("botbuilder-azure");
var path = require('path');
const prettyjson = require('prettyjson');
var request = require("request");

const prettyjson_options = {
  noColor: true
};

var useEmulator = (process.env.NODE_ENV == 'development');

var connector = useEmulator ? new builder.ChatConnector() : new botbuilder_azure.BotServiceConnector({
    appId: process.env['MicrosoftAppId'],
    appPassword: process.env['MicrosoftAppPassword'],
    stateEndpoint: process.env['BotStateEndpoint'],
    openIdMetadata: process.env['BotOpenIdMetadata']
});

var bot = new builder.UniversalBot(connector);
bot.localePath(path.join(__dirname, './locale'));

// Make sure you add code to validate these fields
var luisAppId = process.env.LuisAppId;
var luisAPIKey = process.env.LuisAPIKey;
var luisAPIHostName = process.env.LuisAPIHostName || 'westus.api.cognitive.microsoft.com';

const LuisModelUrl = 'https://' + luisAPIHostName + '/luis/v1/application?id=' + luisAppId + '&subscription-key=' + luisAPIKey;

// Main dialog with LUIS
var recognizer = new builder.LuisRecognizer(LuisModelUrl);
var intents = new builder.IntentDialog({ recognizers: [recognizer] })
/*
.matches('<yourIntent>')... See details at http://docs.botframework.com/builder/node/guides/understanding-natural-language/
*/
.matches('light-op', (session, args) => {
    //session.send(session.message.text);
    //session.send(JSON.stringify(args));
    
    // If intent is 'light-op', then ...
    if (args.intent === 'light-op' && Number(args.score) > 0.8) {
        //session.send(prettyjson.render(args, prettyjson_options));
        //session.send(JSON.stringify(args.intents));

        // get entity of luminary type
        if (args.entities && args.entities.length > 0) {
            //session.send(JSON.stringify(args.entities));
            var luminary = '';
            var action = '';
            for (var i = 0; i < args.entities.length; i++) {
                var en = args.entities[i];
                //session.send(JSON.stringify(en));
                if (en.type === 'luminary')
                    luminary = en.entity;
                else if (en.type === 'action')
                    action = en.entity;
            }
            session.send("luminary: %s", luminary);
            session.send("action: %s", action);

            session.send("Call  function to send device command to turn light " + luminary + " " + action + "...");

            
            var options = { 
                method: 'POST',
                url: 'https://lightingws.azurewebsites.net/api/HttpTriggerJS2',
                headers: 
                 { 
                   'accept': 'text/plain',
                   'Content-Type': 'application/json' 
                 },  
                body:  { 'method': 'invoke', 'deviceId': 'BeagleBone1', 'data': { 'route': 'dim', 'params': [ '2', '100', '1' ] } }
                , 
                json: true
            };

            request(options, function (error, response, body) {
                if (error) 
                  session.send(error);

                session.send(body);
            });
            
        }
    }
})
.onDefault((session) => {
    session.send('Sorry, I did not understand \'%s\'.', session.message.text);
});

bot.dialog('/', intents);    

if (useEmulator) {
    var restify = require('restify');
    var server = restify.createServer();
    server.listen(3978, function() {
        console.log('test bot endpont at http://localhost:3978/api/messages');
    });
    server.post('/api/messages', connector.listen());    
} else {
    module.exports = { default: connector.listen() }
}

