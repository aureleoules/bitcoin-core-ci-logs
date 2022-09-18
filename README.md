# Bitcoin Core CI log failures

This repository contains the log files of the Bitcoin Core CI build failures.
Refreshed every day.

File format is `YYYY/MM/DD/pulls/PR_NUMBER/BUILD_ID/TASK_ID/LOG_FILE` or `YYYY/MM/DD/BRANCH_NAME/BUILD_ID/TASK_ID/LOG_FILE`.

## Search logs
### GitHub search
Use the GitHub search to search the logs. For example, to search for the string `not(400 == 200)`: [results](https://github.com/aureleoules/bitcoin-core-ci-logs/search?q=%22not%28400+%3D%3D+200%29%22).
The GitHub search doesn't always work well, so it may be preferable to use the next method.

### Local search
To search the logs locally, you can use the `grep` command. For example, to search for the string `not(400 == 200)`:
```bash
git clone git@github.com:aureleoules/bitcoin-core-ci-logs.git
cd bitcoin-core-ci-logs
grep -ra "not(400 == 200)" logs
```

The repository is approximately 4.7GB.

## Fetch logs locally
```
API_URL=https://api.cirrus-ci.com node index.js
```
