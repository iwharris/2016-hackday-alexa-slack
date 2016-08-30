var https = require('https');
var options = {
  host: 'hooks.slack.com',
  port: 443,
  path: '/services/T029SVCL9/B24HHF6HJ/LwNZblbe6sRzK22qHJISycm4',
  method: 'POST'
};

/**
 * This sample shows how to create a simple Lambda function for handling speechlet requests.
 */

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = function (event, context) {
    try {
        console.log("event.session.application=" + event.session.application.applicationId);

        /**
         * Uncomment this if statement and replace application.id with yours
         * to prevent other voice applications from using this function.
         */
        /*
        if (event.session.application.id !== "amzn1.echo-sdk-ams.app.[your own app id goes here]") {
            context.fail("Invalid Application ID");
        }
        */

        if (event.session.new) {
            onSessionStarted({requestId: event.request.requestId}, event.session);
        }

        if (event.request.type === "LaunchRequest") {
            onLaunch(event.request,
                     event.session,
                     function callback(sessionAttributes, speechletResponse) {
                        context.succeed(buildResponse(sessionAttributes, speechletResponse));
                     });
        }  else if (event.request.type === "IntentRequest") {
            onIntent(event.request,
                     event.session,
                     function callback(sessionAttributes, speechletResponse) {
                         context.succeed(buildResponse(sessionAttributes, speechletResponse));
                     });
        } else if (event.request.type === "SessionEndedRequest") {
            onSessionEnded(event.request, event.session);

            context.succeed();
        }
    } catch (e) {
        context.fail("Exception: " + e);
    }
};

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
    console.log("onSessionStarted requestId=" + sessionStartedRequest.requestId
                + ", sessionId=" + session.sessionId);
}

/**
 * Called when the user launches the app without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
    console.log("onLaunch requestId=" + launchRequest.requestId
                + ", sessionId=" + session.sessionId);

    getWelcomeResponse(callback);
}

/** 
 * Called when the user specifies an intent for this application.
 */
function onIntent(intentRequest, session, callback) {
    console.log("onIntent requestId=" + intentRequest.requestId
                + ", sessionId=" + session.sessionId);

    var intent = intentRequest.intent;
    var intentName = intentRequest.intent.name;

    if ("AttendGuestIntent" === intentName) {
        console.log("AttendGuestIntent");
        setMessageInSession(intent, session, callback);
    } else if ("WhatsMyMessageIntent" === intentName) {
        console.log("WhatsMyMessageIntent");
        getMessageFromSession(intent, session, callback);
    } else {
        console.log("Unknown intent");
        throw "Invalid intent";
    }
}

/**
 * Called when the user ends the session.
 * Is not called when the app returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
    console.log("onSessionEnded requestId=" + sessionEndedRequest.requestId
                + ", sessionId=" + session.sessionId);
}

/**
 * Helpers that build all of the responses.
 */
function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        card: {
            type: "Simple",
            title: "SessionSpeechlet - " + title,
            content: "SessionSpeechlet - " + output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    }
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: "1.0",
        sessionAttributes: sessionAttributes,
        response: speechletResponse
    }
}
/** 
 * Sets the first letter in a sentence to uppercase
 */
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

/** 
 * Functions that control the app's behavior.
 */
function getWelcomeResponse(callback) {
    // If we wanted to initialize the session to have some attributes we could add those here.
    var sessionAttributes = {};
    var cardTitle = "Welcome";
    var speechOutput = "Welcome to App Direct, "
                + "How can I help you?";
             //   + "You can let some one know you you are here by saying, I am here to see Beau";
    // If the user either does not reply to the welcome message or says something that is not
    // understood, they will be prompted again with this text.
    //var repromptText = "You can give me your message by saying, "
    var repromptText = "You can say something like, "
                + "I am here to see Joey";
    var shouldEndSession = false;

    callback(sessionAttributes,
             buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

/**
 * Sets the message in the session and prepares the speech to reply to the user.
 */
function setMessageInSession(intent, session, callback) {
    var cardTitle = intent.name;
    var callerSlot = intent.slots.nameOfCaller;
    var memberSlot = intent.slots.memberName;
    var repromptText = "";
    var sessionAttributes = {};
    var shouldEndSession = true;
    var speechOutput = "";
    var timeStamp = Date.now() / 1000 | 0;
    if (memberSlot) {
        message = capitalizeFirstLetter(memberSlot.value);
        console.log("Message slot contains: " + message + ".");
        sessionAttributes = createMessageAttributes(message);
        //speechOutput = "Your message has been sent. " + message + " will be here shortly.";
        speechOutput = "Your message has been sent. Someone will be with you in a moment.";
        repromptText = "You can ask say you are here to see Mark";
        var req = https.request(options, function(res) {
            res.setEncoding('utf8');
            res.on('data', function (chunk) {
                callback(sessionAttributes, 
                buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
            });
        });
        req.on('error', function(e) {
            console.log('problem with request: ' + e.message);
            context.fail(e);
        });
        //req.write('{"text": "@channel someone is here to see ' + message + '", "link_names":1}');
        req.write('{ "attachments": [ { "fallback":"' + message + '.", "color": "#f58220", "pretext": "@channel There is a message coming from the AppDirect lobby.", "title": "The message is:", "text": "' + message + '.", "footer": "AppDevices", "footer_icon": "https://dl.dropboxusercontent.com/u/687075/AD/appdevices.png", "ts":' + timeStamp + ' } ], "link_names":1 }');
        req.end();
    } else {
        speechOutput = "I didn't hear your message clearly, please try again";
        repromptText = "I didn't hear your message clearly, you can "
                + "say I am here to see Darpan";
    callback(sessionAttributes, 
            buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
    }
}

function createMessageAttributes(message) {
    return {
        message: message
    };
}

function getMessageFromSession(intent, session, callback) {
    var cardTitle = intent.name;
    var message;
    var repromptText = null;
    var sessionAttributes = {};
    var shouldEndSession = false;
    var speechOutput = "";

    if(session.attributes) {
        message = session.attributes.message;
    }

    if(message) {
        speechOutput = "Your message is " + message + ", goodbye";
        shouldEndSession = true;
    }
    else {
        speechOutput = "I didn't hear your message clearly. As an example, you can say, My message is 'hello, team!'";
    }

    // Setting repromptText to null signifies that we do not want to reprompt the user. 
    // If the user does not respond or says something that is not understood, the app session 
    // closes.
    callback(sessionAttributes,
             buildSpeechletResponse(intent.name, speechOutput, repromptText, shouldEndSession));
}