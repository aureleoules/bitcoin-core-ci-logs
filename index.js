import fs from 'fs/promises';
import { existsSync } from 'fs';


const fetchBuilds = async (lastBuildId) => {
    console.log(`Fetching builds after ${lastBuildId}`);
    const query = `
    	query {
    		repository(id:"6264162542157824") {
    			id,
    	   		builds${lastBuildId ? `(after: "${lastBuildId}")` : ''} {
                    edges {
                        node {
                            id
                            buildCreatedTimestamp
                            branch
                            pullRequest
                            status
                            tasks {
                                id
                                status
                                name
                                commands {
                                    name
                                    type
                                    status
                                }
                            }
                        }
                    }
    	   		}
    		}
    	}
    `;
    const headers = {
        'Content-Type': 'application/json',
    };

    const options = {
        method: 'POST',
        headers,
        body: JSON.stringify({ query }),
    };

    const response = await fetch(process.env.API_URL + '/graphql', options);
    const json = await response.json();
    return json.data.repository.builds.edges.map(({ node }) => node);
}


async function fetchLogFile(taskId, commandId) {
    const url = `${process.env.API_URL}/v1/task/${taskId}/logs/${commandId}.log`;
    const response = await fetch(url);
    return await response.text()
}

async function handleBatch(builds, logs_dir) {
    for (const build of builds) {
        if (build.status !== 'FAILED') {
            console.log(`Skipping build ${build.id} because it is ${build.status}`);
            continue;
        }
        
        // Parallelize the fetching of logs for each task
        await Promise.all(build.tasks.map(async (task) => {
            const date = new Date(build.buildCreatedTimestamp);  
            console.log(`Fetching logs for build ${build.id} task ${task.id} at ${date.toISOString()}`);
            const year = date.getUTCFullYear();
            const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
            const day = date.getUTCDate().toString().padStart(2, '0');
            const isPullRequest = build.pullRequest !== null;
            const folderPath = `${logs_dir}/${year}/${month}/${day}/${isPullRequest ? ('pulls/' + build.pullRequest) : build.branch}/${build.id}/${task.id}`;
            await fs.mkdir(folderPath, { recursive: true });

            // Risk of timeout if this loop is parallelized too
            for (const command of task.commands) {
                const filePath = `${folderPath}/${command.name}.log`;

                if(existsSync(filePath)) {
                    console.log(`Skipping ${filePath} because it already exists`);
                    return;
                }

                const logs = await fetchLogFile(task.id, command.name);
                // Make sure file is less than 383kB, split in parts otherwise, cut by a new line
                if (logs.length > 383 * 1024) {
                    const parts = [];
                    let part = '';
                    for (const line of logs.split('\n')) {
                        if (part.length + line.length > 383 * 1024) {
                            parts.push(part);
                            part = '';
                        }
                        part += line + '\n';
                    }
                    parts.push(part);
                    for (let i = 0; i < parts.length; i++) {
                        await fs.writeFile(`${filePath}.${i}`, parts[i]);
                    }

                } else {
                    await fs.writeFile(filePath, logs);
                }
            }
        }));

        // Write last build id to file
        await fs.writeFile('.last_build_timestamp', build.buildCreatedTimestamp.toString());
    }
}

async function main() {
    const logs_dir = 'logs';
    if (!existsSync(logs_dir)) {
        await fs.mkdir(logs_dir);
    }

    let lastBuildTimestamp = 1655567045000; // approximate date of first available build logs
    if (existsSync('.last_build_timestamp')) {
        lastBuildTimestamp = await fs.readFile('.last_build_timestamp', 'utf8');
    }

    let builds = await fetchBuilds(lastBuildTimestamp);
    while (builds.length > 0) {
        await handleBatch(builds, logs_dir);
        lastBuildTimestamp = builds[builds.length - 1].buildCreatedTimestamp;
        builds = await fetchBuilds(lastBuildTimestamp);
    }

    console.log('No more builds to fetch.');
}

main();