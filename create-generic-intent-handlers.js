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
      } else if (rows[i][j].includes("\r\n")) {
        row.push(rows[i][j].split("\r\n"));
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

  let intentMapStr = "";

  for (let i = 1; i < arr.length; i++) {
    intentMapStr += `intentMap.set("${arr[i][0][0]}", genericIntentHandler);\n`;
  }

  fs.writeFileSync("./_output.txt", intentMapStr);
  console.log('Done. Please see "_output.txt" for result');
}

main();
