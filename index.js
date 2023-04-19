const core = require('@actions/core');
const { main } = require('./src/app.js');

main(process.argv[2])
  .then((response) => {
    if (response.succeeded) {
      const responseJson = JSON.stringify(response);
      core.setOutput('response', responseJson);
    } else {
      core.setFailed(response.message);
    }
  })
  .catch((error) => {
    core.setFailed(error);
  });