// See https://github.com/dialogflow/dialogflow-fulfillment-nodejs
// for Dialogflow fulfillment library docs, samples, and to report issues
"use strict";

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { WebhookClient } = require("dialogflow-fulfillment");
const { Card, Suggestion } = require("dialogflow-fulfillment");

process.env.DEBUG = "dialogflow:debug"; // enables lib debugging statements
admin.initializeApp(functions.config().firebase);
const db = admin.firestore();

const responses = {
  Name: { Responses: ["My name is Josh Gao"] },
  HowAreYou: {
    Responses: [
      "I'm doing good! Thanks for asking. I'm here to answer any questions about any career inquires about me.",
    ],
  },
  NameFull: { Responses: ["I'm Joshua Gao"] },
  NameLast: { Responses: ["My last name is Gao"] },
  Bot: { Responses: ["I'm a bot"] },
  BotHowDoYouWork: { Responses: ["I work through magic"] },
  MeaningOfLife: { Responses: ["42"] },
  Marry: { Responses: ["I would love to marry you"] },
  Hobbies: { Responses: ["I like to sing karaoke and workout"] },
  CustomFallback: { Responses: ["I don't understand. Could you reword that?"] },
  Joke: { Responses: ["Why did the bike fall over? ... It was two tired"] },
  InterviewTellMeAboutYourself: {
    Responses: [
      "I'm Josh Gao, I am a Machine Learning Engineer based in Texas. I love analyzing and visualizing large amounts of data and providing unique and helpful insights. Some of my other interests include playing volleyball and writing music.",
    ],
  },
  Education: {
    Responses: [
      "I went to the University of Texas at Dallas majoring in Cognitive Science specializing in Machine Learning and Artificial Intelligence. I also minored in Entrepreneurship",
    ],
  },
  InterviewCareerChoice: {
    Responses: [
      "I'm most excited about machine learning, artificial intelligence and big data. This field has so much potential to change people's lives for the better. ",
    ],
  },
  InterviewStrengths: {
    Responses: [
      "I learn very quickly! This allows me to pick up any skill in order to adapt to many different roles",
    ],
  },
  InterviewWeaknesses: {
    Responses: [
      "My greatest weakness is engineering hubris. Sometimes I will over engineer something for the sake of ",
    ],
  },
  InterviewBestAccomplishment: {
    Responses: [
      "During my undergrad, my proudest accomplishment was to be able to help people through music by founding my own charity acapella club. We ran our own concerts and was able to make charitable contributions to UNICEF, Yemen Relief Fund, Save the Children, and various homeless shelters. ",
    ],
  },
  InterviewFutureGoals: {
    Responses: [
      "My goal is to start a machine learning or data science company that democratizes access to complex machine learning algorithms. The largest problem in this sector is not data collection, but rather the large capital requirements in hiring a highly skilled team to build out these artificial intelligence systems. With cheap access to these algorithms, small businesses could gleam critical insights in their customer behaviors or identify key production bottlenecks and much more.",
    ],
  },
  InterviewDealingWithFailure: {
    Responses: [
      "I look at failure not as a fatal obstacle but rather as a learning opportunity. With this perspective, I'm able to keep growing as a person and to apply my mistakes to future problems as well.",
    ],
  },
  InterviewLeadershipAndInitiative: {
    Responses: [
      "During my undergrad, I took leadership by founding my own charity acappella club. We ran our own concerts and was able to make charitable contributions to UNICEF, Yemen Relief Fund, Save the Children, and various homeless shelters. ",
    ],
  },
  TechnicallSkills: {
    Responses: [
      "I can code in Python, JavaScript, Java, C++, HTML, CSS and SQL. If you would like the extended list, please check out my resume!",
    ],
  },
  InterviewFavoriteProject: {
    Responses: [
      "My favorite technical project is creating an algorithm that produces an estimate of house value based on features like square footage, lot size, school ratings and more.",
    ],
  },
  InterviewPrioritize: {
    Responses: [
      "I use a todo list and list out out all the task I want to get done and order them by priority",
    ],
  },
  InterviewUnderPressure: {
    Responses: [
      "I do well under pressure as long as there are people I can reach out to for help. Good prioritization and time management is key, in my opinion, to thriving in fast paced environments.",
    ],
  },
  InterviewCommuncation: {
    Responses: [
      "I do best in environments that fosters open and honest communication",
    ],
  },
  InterviewConflictManagement: {
    Responses: [
      "Empathetic communication is key to dealing with conflict. In my experience, conflict arises the most when there are mismatched expectations and lack of communication to realign those expectations. Understanding the other party's point of view is critical as well. Without empathy, no compromise can be achieved.",
    ],
  },
  InterviewDeadlineManagement: {
    Responses: [
      "Good time management is critical to keeping up with deadlines. Staying focused on the task at hand and prioritizing assignments help tremendously.",
    ],
  },
  InterviewDreamJob: {
    Responses: [
      "My dream job run a successful company that I built from the ground up.",
    ],
  },
  Contact: { Responses: ["Please reach out to me at: joshuakgao@gmail.com"] },
  Github: { Responses: ["Check out my github at: www.github.com/tugonbob"] },
  Linkedin: {
    Responses: [
      "Connect with me on LinkedIn at: www.linkedin.com/in/joshua-gao/",
    ],
  },
  Help: {
    Responses: [
      "Hello! I'm here to answer any questions about any career inquires about me. To start ask me: ",
    ],
  },
};

exports.dialogflowFirebaseFulfillment = functions.https.onRequest(
  (request, response) => {
    const agent = new WebhookClient({ request, response });

    function greeting() {
      saveInput();

      let name = agent.parameters.person.name;

      if (!name)
        return agent.add(
          `Hello! I'm here to answer any questions about any career inquires about me. To start, ask me: "What are your career goals?" or "What is your proudest achievement?"`
        );

      let nameArr = name.split(" ");
      let nameStr = nameArr[nameArr.length - 1];
      return agent.add(
        `Hello ${nameStr}! I'm here to answer any questions about any career inquires about me. To start, ask me: "What are your career goals?" or "What is your proudest achievement?"`
      );
    }

    function age(agent) {
      saveInput();

      // calculate age
      var today = new Date();
      var birthDate = new Date("1999-10-19");
      var age = today.getFullYear() - birthDate.getFullYear();
      var m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      return agent.add(`I'm ${age} years old`);
    }

    function genericIntentHandler(agent) {
      saveInput();

      let intent = agent.intent;
      const possibleResponses = responses[intent].Responses;
      const randIndex = getRandomInt(0, possibleResponses.length - 1);
      let response = possibleResponses[randIndex];
      return agent.add(response);
    }

    let intentMap = new Map();
    intentMap.set("Greeting", greeting);
    intentMap.set("Age", age);

    intentMap.set("Name", genericIntentHandler);
    intentMap.set("HowAreYou", genericIntentHandler);
    intentMap.set("NameFull", genericIntentHandler);
    intentMap.set("NameLast", genericIntentHandler);
    intentMap.set("Bot", genericIntentHandler);
    intentMap.set("BotHowDoYouWork", genericIntentHandler);
    intentMap.set("MeaningOfLife", genericIntentHandler);
    intentMap.set("Marry", genericIntentHandler);
    intentMap.set("Hobbies", genericIntentHandler);
    intentMap.set("CustomFallback", genericIntentHandler);
    intentMap.set("Joke", genericIntentHandler);
    intentMap.set("InterviewTellMeAboutYourself", genericIntentHandler);
    intentMap.set("Education", genericIntentHandler);
    intentMap.set("InterviewCareerChoice", genericIntentHandler);
    intentMap.set("InterviewStrengths", genericIntentHandler);
    intentMap.set("InterviewWeaknesses", genericIntentHandler);
    intentMap.set("InterviewBestAccomplishment", genericIntentHandler);
    intentMap.set("InterviewFutureGoals", genericIntentHandler);
    intentMap.set("InterviewDealingWithFailure", genericIntentHandler);
    intentMap.set("InterviewLeadershipAndInitiative", genericIntentHandler);
    intentMap.set("TechnicallSkills", genericIntentHandler);
    intentMap.set("InterviewFavoriteProject", genericIntentHandler);
    intentMap.set("InterviewPrioritize", genericIntentHandler);
    intentMap.set("InterviewUnderPressure", genericIntentHandler);
    intentMap.set("InterviewCommuncation", genericIntentHandler);
    intentMap.set("InterviewConflictManagement", genericIntentHandler);
    intentMap.set("InterviewDeadlineManagement", genericIntentHandler);
    intentMap.set("InterviewDreamJob", genericIntentHandler);
    intentMap.set("Contact", genericIntentHandler);
    intentMap.set("Github", genericIntentHandler);
    intentMap.set("Linkedin", genericIntentHandler);
    intentMap.set("Help", genericIntentHandler);

    agent.handleRequest(intentMap);

    function getRandomInt(min, max) {
      min = Math.ceil(min);
      max = Math.floor(max);
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function saveInput() {
      // Get parameter from Dialogflow with the string to add to the database
      const query = agent.query.toLowerCase();
      const intentName = agent.intent;

      db.collection("RecentInput")
        .doc(intentName)
        .get()
        .then((doc) => {
          if (doc.exists) {
            db.collection("RecentInput")
              .doc(intentName)
              .update({ [query]: query });
          } else {
            db.collection("RecentInput")
              .doc(intentName)
              .set({
                [query]: query,
              });
          }
        });

      db.collection("InputHistory")
        .doc(intentName)
        .get()
        .then((doc) => {
          if (doc.exists) {
            db.collection("InputHistory")
              .doc(intentName)
              .update({ [query]: query });
          } else {
            db.collection("InputHistory")
              .doc(intentName)
              .set({ [query]: query });
          }
        });
    }
  }
);
