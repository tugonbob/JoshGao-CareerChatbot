// Creates response object to you can use in your dialogflow fulfillment
// Takes a CSV with headers ["IntentName", "state1", "state2", "state5", etc...]

/*
Script Result:

{
  Age: {
    state1: ["33", "I'm, 33", "I am 33, years old"],
    state2: ["33", "I'm, 33.", "I am 33 years, old."],
    state5: ["33", "I'm 33", "I am 33 years old"],
  }
  etc:{
    state1: [etc, etc, etc],
    state2: [etc],
    state5: [etc, etc]
  }
}

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

function main() {
  const fs = require("fs");
  const stringFile = fs.readFileSync("./_input.txt").toString();
  let arr = CSVToArray(stringFile); // 3d array
  let responsesObject = {};
  let intentNameIndex = arr[0].indexOf("IntentName");
  let responsesIndex = arr[0].indexOf("Responses");

  let stateResponses = {};
  arr.forEach((row, i) => {
    if (i === 0) return;

    let stateResponses = {};
    let intentName = row[intentNameIndex][0];
    let responses = row[responsesIndex];

    stateResponses.Responses =
      responses[0].length === 0
        ? [
            "<speak><voice gender='female'>Responses for this intent haven't been defined yet</voice></speak>",
          ]
        : responses;
    responsesObject[intentName] = stateResponses;
  });

  fs.writeFileSync("./_output.txt", JSON.stringify(responsesObject));
  console.log('Done. Please see "_output.txt" for result');
}

main();
