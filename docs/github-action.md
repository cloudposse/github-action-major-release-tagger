<!-- markdownlint-disable -->

## Inputs

| Name | Description | Default | Required |
|------|-------------|---------|----------|
| dry-run | Run action without pushing changes to upstream | false | false |
| git-user-email | Git user email that will be used for git config | actions-bot@users.noreply.github.com | false |
| git-user-name | Git user name that will be used for git config | actions-bot | false |
| log-level | Log level for this action. Available options: ['off', 'error', 'warn', 'info', 'debug']. Default 'info' | info | false |


## Outputs

| Name | Description |
|------|-------------|
| response | Response in json format for example: {"succeeded":true,"reason":"MAPPED\_TAGS","message":"Successfully created/update v-tags.","data":{"v1": {"state":"updated", "oldSHA": "d9b3a3034766ac20294fd1c36cacc017ae4a3898", "newSHA":"e5c6309b473934cfe3e556013781b8757c1e0422"}, "v2": {"state":"created", "oldSHA": "bbf9f924752c61dcef084757bcf4440e23f2e16b", "newSHA":"5ae37ee514b73cf8146fe389ad839469e7f3a6d2"}}} |
<!-- markdownlint-restore -->
