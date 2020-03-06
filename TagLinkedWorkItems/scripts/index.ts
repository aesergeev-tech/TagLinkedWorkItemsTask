import * as tl from 'azure-pipelines-task-lib/task';
import * as request from 'request-promise-native';

const collectionUrl = process.env['SYSTEM_TEAMFOUNDATIONCOLLECTIONURI'];
const teamProject = process.env['SYSTEM_TEAMPROJECT'];
const accessToken = tl.getEndpointAuthorization('SystemVssConnection', true).parameters.AccessToken;

async function run() {
    try {
        const pipelineType = tl.getInput('pipelineType');

        const workItemsData = pipelineType === 'Build' ? await getWorkItemsFromBuild() : await getWorkItemsFromRelease();
        workItemsData.forEach(async (workItem: any) => {
            await addTagToWorkItem(workItem);
        });
    } catch (err) {
        tl.setResult(tl.TaskResult.Failed, err.message);
    }
}

async function getWorkItemsFromBuild() {
    const buildId = process.env['BUILD_BUILDID'];
    const uri = `${collectionUrl}/${teamProject}/_apis/build/builds/${buildId}/workitems`;
    const options = createGetRequestOptions(uri);
    const result = await request.get(options);
    return result.value;
}

async function getWorkItemsFromRelease() {
    const releaseId = process.env['RELEASE_RELEASEID'];
    const uri = `${collectionUrl}/${teamProject}/_apis/release/releases/${releaseId}/workitems`;
    const options = createGetRequestOptions(uri);
    const result = await request.get(options);
    return result.value;
}

async function addTagToWorkItem(workItem: any) {
    const uri = workItem.url + '?api-version=5.1';
    const getOptions = createGetRequestOptions(uri);
    const result = await request.get(getOptions);
    const workItemArea = tl.getInput('workItemArea');
    if (workItemArea !== null) {
        const currentWorkItemArea = result.fields['System.AreaPath'];
        if (currentWorkItemArea === workItemArea) {
            await updateWorkItemTags(result);
        }
    } else {
        await updateWorkItemTags(result);
    }
}

async function updateWorkItemTags(workItem: any) {
    const tagFromInput = tl.getInput('tagToAdd');
    const uri = workItem.url + '?api-version=5.1';
    const currentTags = workItem.fields['System.Tags'];

    let newTags = '';
    if (currentTags !== undefined) {
        newTags = currentTags + ';' + tagFromInput;
    } else {
        newTags = tagFromInput;
    }
    const patchOptions = getPatchRequestOptions(uri, newTags);
    await request.patch(patchOptions);
}

function createGetRequestOptions(uri: string): any {
    let options = {
        uri: uri,
        headers: {
            authorization: `Bearer ${accessToken}`,
            'content-type': 'application/json'
        },
        json: true
    };
    return options;
}

function getPatchRequestOptions(uri: string, newTags: string): any {
    const options = {
        uri: uri,
        headers: {
            authorization: `Bearer ${accessToken}`,
            'content-type': 'application/json-patch+json'
        },
        body: [
            {
                op: 'add',
                path: '/fields/System.Tags',
                value: newTags
            }
        ],
        json: true
    };
    return options;
}

run();
