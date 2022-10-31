// Bulk uploads intents to dialogflow agent
/* IMPORTANT: FOLLOW THESE STEPS FOR INITAL SETUP

  1. https://cloud.google.com/dialogflow/es/docs/quick/setup
    - Do all steps including the installation and initalization of gcloud (you need python installed to install gcloud)
  2. Copy TSV with headers with ["IntentName", "TrainingPhrases", "InputContexts", "OutputContexts", "Parameters", "ParentFollowupIntentName", "EndInteraction"] format into "_input.txt" file
  4. $ npm install @google-cloud/dialogflow
  5. $ node bulkUploadIntents.js [project-id]
        - replace [project-id] with your Agent's project id (found in dialogflow settings)

  TO SET GCP TO ENVIRONMENT
  export GOOGLE_APPLICATION_CREDENTIALS='/path/to/your/client_secret.json'

*/

function CSVToArray(CSV_string, delimiter) {
  delimiter = delimiter || "\t"; // user-supplied delimeter or default comma

  var pattern = new RegExp( // regular expression to parse the CSV values. // Delimiters:
    "(\\" +
      delimiter +
      "|\\r?\\n|\\r|^)" +
      // Quoted fields.
      '(?:"([^"]*(?:""[^"]*)*)"|' +
      // Standard fields.
      '([^"\\' +
      delimiter +
      "\\r\\n]*))",
    "gi"
  );

  var rows = [[]]; // array to hold our data. First row is column headers.
  // array to hold our individual pattern matching groups:
  var matches = false; // false if we don't find any matches
  // Loop until we no longer find a regular expression match
  while ((matches = pattern.exec(CSV_string))) {
    var matched_delimiter = matches[1]; // Get the matched delimiter
    // Check if the delimiter has a length (and is not the start of string)
    // and if it matches field delimiter. If not, it is a row delimiter.
    if (matched_delimiter.length && matched_delimiter !== delimiter) {
      // Since this is a new row of data, add an empty row to the array.
      rows.push([]);
    }
    var matched_value;
    // Once we have eliminated the delimiter, check to see
    // what kind of value was captured (quoted or unquoted):
    if (matches[2]) {
      // found quoted value. unescape any double quotes.
      matched_value = matches[2].replace(new RegExp('""', "g"), '"');
    } else {
      // found a non-quoted value
      matched_value = matches[3];
    }
    // Now that we have our value string, let's add
    // it to the data array.
    rows[rows.length - 1].push(matched_value);
  }

  let finishedArr = [];
  for (let i = 0; i < rows.length; i++) {
    let row = [];
    for (let j = 0; j < rows[i].length; j++) {
      if (i === 0) {
        row.push(rows[i][j]);
      } else if (rows[i][j].includes("\n")) {
        row.push(rows[i][j].split("\n"));
      } else {
        row.push([rows[i][j]]);
      }
    }
    finishedArr.push(row);
  }
  return finishedArr; // Return the parsed data Array
}

function arrToJson(arr) {
  // get the index of each column
  let intentNameIndex = arr[0].indexOf("IntentName");
  let trainingPhrasesIndex = arr[0].indexOf("TrainingPhrases");
  let inputContextsIndex = arr[0].indexOf("InputContexts");
  let outputContextsIndex = arr[0].indexOf("OutputContexts");
  let parametersIndex = arr[0].indexOf("Parameters");
  let parentFollowupIntentNameIndex = arr[0].indexOf(
    "ParentFollowupIntentName"
  );
  let endInteractionIndex = arr[0].indexOf("EndInteraction");

  let finalArrOfJson = [];
  for (let row = 1; row < arr.length; row++) {
    rowJson = {}; // convert the data in a row into a js obj
    rowJson.displayName = arr[row][intentNameIndex][0];
    rowJson.messages = ["Something went wrong. Please ask again."];
    rowJson.parentFollowupIntentName =
      arr[row][parentFollowupIntentNameIndex][0];
    rowJson.endInteraction = arr[row][endInteractionIndex][0] === "TRUE"; // parse EndInteraction string into boolean

    // parse trainingPhrases
    // Type: { text: string; entityType: string, alias: string, userDefined: boolean }[][]
    // Example: ["change heart rate to | @sys.number 34 | beats per minute", "@sys.any something"]
    /* Output:
    [
      [
        { text: "change heart rate to" },
        { text: " " },
        {
          text: "34",
          entityType: "@sys.number",
          alias: "number",
          userDefined: true,
        },
        { text: " " },
        { text: "beats per minute" },
      ],
      [
        {
          text: "something",
          entityType: "@sys.any",
          alias: "any",
          userDefined: true,
        },
      ],
    ];
    */
    let trainingPhrases = [];
    for (let i = 0; i < arr[row][trainingPhrasesIndex].length; i++) {
      let trainingPhraseStr = arr[row][trainingPhrasesIndex][i];

      // if trainingphrase doesn't include any entities, push plain the whole trainingPhrase
      if (!trainingPhraseStr.includes("@")) {
        trainingPhrases.push([
          {
            text: trainingPhraseStr,
          },
        ]);
        continue;
      }

      let trainingPhrase = [];
      let trainingPhraseArr = trainingPhraseStr.split(" | ");

      trainingPhraseArr.forEach((part) => {
        // if training phrase part isn't an annotated with an entity, push plain text part
        if (!part.includes("@")) {
          trainingPhrase.push({
            text: "" + part,
          });
          return; // continue
        }

        let partArr = part.split(" ");
        let text = partArr.slice(1).join(" ");
        let entityType = partArr[0];
        // if is a system entity, set alias as the entity name without the "@sys." prefix
        let alias = "";
        if (entityType.includes("@sys.")) {
          alias = entityType.slice(5);
        } else {
          alias = entityType.slice(1);
        }

        // push a space for better training phrase concatination
        trainingPhrase.push({
          text: " ",
        });
        // push text with entity
        trainingPhrase.push({
          text,
          entityType,
          alias,
          userDefined: true,
        });
        // push a space for better training phrase concatination
        trainingPhrase.push({
          text: " ",
        });
      });

      if (trainingPhrase[trainingPhrase.length - 1].text === " ")
        trainingPhrase.pop(); // remove last space
      trainingPhrases.push(trainingPhrase);
    }
    rowJson.trainingPhrases = trainingPhrases;

    // parse inputContexts
    // Result Type: string
    // Example: "CaeChangeVitalsItemized-followup"
    // Result: "projects/YOUR_PROJECT_ID/agent/sessions/ANY_NUMBER_HERE/contexts/CaeChangeVitalsItemized-followup"
    // Note: replace YOUR_PROJECT_ID and ANY_NUMBER_HERE. Everything else is required
    let inputContextNames = [];
    for (let i = 0; i < arr[row][inputContextsIndex].length; i++) {
      if (arr[row][inputContextsIndex][0] === "") break; // if inputContexts are emtpy

      inputContextNames.push(
        `projects/${PROJECT_ID}/agent/sessions/1/contexts/${arr[row][inputContextsIndex][i]}`
      );
    }
    rowJson.inputContextNames = inputContextNames;

    // parse outputContexts
    // Type: { name: string; lifespanCount: number }
    // Example: "1 | CaeChangeVitalsItemized-followup"
    // Result: { lifespanCount: 1, name: "CaeChangeVitalsItemized-followup" };
    let outputContexts = [];
    for (let i = 0; i < arr[row][outputContextsIndex].length; i++) {
      if (arr[row][outputContextsIndex][0] === "") break; // if outputContexts are empty

      let outputContextStr = arr[row][outputContextsIndex][i];
      let outputContextArr = outputContextStr.split(" | ");
      let lifespanCount = outputContextArr[0];
      let name = `projects/${PROJECT_ID}/agent/sessions/1/contexts/${outputContextArr[1]}`;
      outputContexts.push({
        name,
        lifespanCount,
      });
    }
    rowJson.outputContexts = outputContexts;

    // parse parameters
    // Result Type: { name: string; displayname: string; entityTypeDisplayName: string, value: string; isList: boolean; mandatory: boolean; prompts: string[] }
    // Example: "number | @sys.number | $number | required | <speak><voice gender='female'>What state would you like to change to?</voice></speak>"
    // Result:
    /*
    {
      name: "",
      displayName: "$number",
      entityTypeDisplayName: "@sys.number",
      value: "$number",
      isList: false,
      mandatory: true,
      prompts: [
        "<speak><voice gender='female'>What state would you like to change to?</voice></speak>",
      ],
    }
    */
    let parameters = [];
    for (let i = 0; i < arr[row][parametersIndex].length; i++) {
      let parameterStr = arr[row][parametersIndex][i];
      let parameterArr = parameterStr.split(" | ");
      let displayName = parameterArr.shift();
      let entityTypeDisplayName = parameterArr.shift();
      let value = parameterArr.shift();

      // find isList and remove it
      let isListIndex = parameterArr.indexOf("isList");
      let isList;
      if (isListIndex > -1) {
        isList = true;
        parameterArr.splice(isListIndex, 1);
      } else isList = false;

      // find if paramter is required, and remove it
      let requiredIndex = parameterArr.indexOf("required");
      let required;
      if (requiredIndex > -1) {
        required = true;
        parameterArr.splice(requiredIndex, 1);
      } else required = false;

      // if parameter is required, define prompts
      let prompts = [];
      for (let i = 0; i < parameterArr.length; i++) {
        prompts.push(parameterArr[i]);
      }

      parameters.push({
        name: "",
        displayName,
        entityTypeDisplayName,
        value,
        isList,
        mandatory: required,
        prompts: prompts.length === 0 ? undefined : prompts,
      });
    }
    rowJson.parameters = parameters;

    finalArrOfJson.push(rowJson);
  }
  return finalArrOfJson;
}

async function create_intent(intentConfig) {
  // Imports the Dialogflow library
  const dialogflow = require("@google-cloud/dialogflow");

  // Instantiates the Intent Client
  const intentsClient = new dialogflow.IntentsClient();

  async function createIntent() {
    // Construct request

    // The path to identify the agent that owns the created intent.
    const agentPath = intentsClient.projectAgentPath(PROJECT_ID);

    const trainingPhrases = [];

    intentConfig.trainingPhrases.forEach((trainingPhrase) => {
      let parts = [];
      trainingPhrase.forEach((trainingPhrasePart) => {
        const part = {
          text: trainingPhrasePart.text,
          entityType: trainingPhrasePart.entityType,
          alias: trainingPhrasePart.alias,
          userDefined: trainingPhrasePart.userDefined,
        };
        parts.push(part);
      });

      // Here we create a new training phrase for each provided part.
      const trainingPhraseFinal = {
        type: "EXAMPLE",
        parts,
      };

      trainingPhrases.push(trainingPhraseFinal);
    });

    const messageText = {
      text: intentConfig.messages,
    };

    const message = {
      text: messageText,
    };

    // see for configuration: https://cloud.google.com/dialogflow/es/docs/reference/rest/v2/projects.agent.intents#resource:-intent
    // EXAMPLE:

    // const intent = {
    //   displayName: "My Intent Name",
    //   trainingPhrases: trainingPhrases,
    //   messages: [message],
    //   webhookState: "WEBHOOK_STATE_ENABLED",
    //   inputContextNames: [
    //     "projects/albert-dfsm/agent/sessions/1/contexts/myinputcontext",
    //   ],
    //   outputContexts: [
    //     {
    //       name: "projects/albert-dfsm/agent/sessions/1/contexts/myoutputcontext",
    //       lifespanCount: 3,
    //       parameters: { foo: "bar" },
    //     },
    //   ],
    //   parameters: [
    //     {
    //       name: "",
    //       displayName: "number",
    //       value: "$number",
    //       entityTypeDisplayName: "@sys.number",
    //       isList: true,
    //       mandatory: true,
    //       prompts: ["Please state your number"],
    //     },
    //   ],
    //   // parentFollowupIntentName:
    //   //   "projects/peter-dev3-vymi/agent/intents/11324f70-e178-4281-a4bd-5c73b110a288",
    // };

    const intent = {
      displayName: intentConfig.displayName,
      inputContextNames: intentConfig.inputContextNames,
      outputContexts: intentConfig.outputContexts,
      trainingPhrases,
      messages: [message],
      parameters: intentConfig.parameters,
      webhookState: "WEBHOOK_STATE_ENABLED",
      parentFollowupIntentName:
        intentIds[intentConfig.parentFollowupIntentName],
    };

    const createIntentRequest = {
      parent: agentPath,
      intent: intent,
    };

    // Create the intent
    const [response] = await intentsClient.createIntent(createIntentRequest);
    console.log(`Intent ${response.name} created`);

    // add created intent to intentIds obj, in case you need intent id to link for followup intents
    intentIds[intentConfig.displayName] = response.name;
  }

  await createIntent();

  // [END dialogflow_create_intent]
}

async function main() {
  const fs = require("fs");
  const stringFile = fs.readFileSync("./_input.txt").toString();
  fs.writeFileSync("_output.txt", "ERRORS:\n", (err) => {}); // clear file

  let arr = CSVToArray(stringFile);
  let arrayOfIntentConfigs = arrToJson(arr);
  console.log(`Uploading ${arr.length - 1} intents...`);

  // needs to be synchonous to enable followup intent linking
  for (let i = 0; i < arrayOfIntentConfigs.length; i++) {
    try {
      await create_intent(arrayOfIntentConfigs[i]);
      await new Promise((r) => setTimeout(r, 1000)); // sleep for 1 sec
    } catch (e) {
      console.log(e);
      let displayName = arrayOfIntentConfigs[i].displayName;
      console.log(
        `Something went wrong when uploading ${displayName}. See _output.txt after script termination for details`
      );
      // write errors and intentIds to _output.txt
      fs.appendFileSync(
        "_output.txt",
        JSON.stringify({ intent: displayName, error: e.details }, null, 2) +
          "\n",
        (err) => {}
      );
    }
  }

  console.log("See _output.txt for logs");
}

args = process.argv.slice(2);
const PROJECT_ID = args[0];
if (!PROJECT_ID) throw "Project-id argument missing";
let intentIds = {};
main();
