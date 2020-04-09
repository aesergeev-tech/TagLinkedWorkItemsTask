import * as tl from 'azure-pipelines-task-lib/task';
import * as request from 'request-promise-native';

const collectionUrl = process.env['SYSTEM_TEAMFOUNDATIONSERVERURI'];
const teamProject = process.env['SYSTEM_TEAMPROJECT'];
console.log(`Team foundation server uri: ${collectionUrl}`);
console.log(`Working on ${teamProject} project`);
const accessToken = tl.getEndpointAuthorization('SystemVssConnection', true).parameters.AccessToken;
const apiVersion = '5.1';

async function run() {
    try {
        const pipelineType = tl.getInput('pipelineType');
        const workItemsData = pipelineType === 'Build' ? await getWorkItemsFromBuild() : await getWorkItemsFromRelease();
        workItemsData.forEach(async (workItem: any) => {
            await tagWorkItem(workItem);
        });
    } catch (err) {
        tl.setResult(tl.TaskResult.Failed, err.message);
    }
}

async function getWorkItemsFromBuild() {
    const buildId = process.env['BUILD_BUILDID'];
    const uri = `${collectionUrl}/${teamProject}/_apis/build/builds/${buildId}/workitems`;
    console.log(`Collection work items associated with build from ${uri}`);
    const options = createGetRequestOptions(uri);
    const result = await request.get(options);
    console.log(`Collected ${result.count} work items for tagging from build`);
    return result.value;
}

async function getWorkItemsFromRelease() {
    const releaseId = process.env['RELEASE_RELEASEID'];
    const uri = `${collectionUrl}/${teamProject}/_apis/release/releases/${releaseId}/workitems`;
    console.log(`Collection work items associated with release from ${uri}`);
    const options = createGetRequestOptions(uri);
    const result = await request.get(options);
    console.log(`Collected ${result.count} work items for tagging from release`);
    return result.value;
}

async function tagWorkItem(workItem: any) {
    const uri = workItem.url + `?api-version=${apiVersion}`;
    const getOptions = createGetRequestOptions(uri);
    const result = await request.get(getOptions);
    const isAreaFilteringEnabled = tl.getInput('enableAreaFiltering') === 'true';

    if (isAreaFilteringEnabled) {
        const chieldWorkItemArea = tl.getInput('childArea');
        if (chieldWorkItemArea === null) {
            await updateWorkItemFromRootArea(result);
        } else {
            await updateWorkItemFromChildArea(result, chieldWorkItemArea);
        }
    } else {
        await updateWorkItem(result);
    }
}

async function updateWorkItemFromRootArea(workItem: any) {
    const currentWorkItemArea = workItem.fields['System.AreaPath'];
    const rootArea = tl.getInput('rootArea');
    if (currentWorkItemArea === rootArea) {
        console.log(`Updating tags on #${workItem.id} with ${rootArea} area`);
        await updateWorkItem(workItem);
    }
}

async function updateWorkItemFromChildArea(workItem: any, chieldWorkItemArea: string) {
    const rootArea = tl.getInput('rootArea');
    const areaForFiltering = `${rootArea}\\${chieldWorkItemArea}`;
    const currentWorkItemArea = workItem.fields['System.AreaPath'];
    if (currentWorkItemArea === areaForFiltering) {
        console.log(`Updating tags on #${workItem.id} with ${areaForFiltering} area`);
        await updateWorkItem(workItem);
    }
}

async function updateWorkItem(workItem: any) {
    const tagFromInput = tl.getInput('tagToAdd');
    const uri = workItem.url + `?api-version=${apiVersion}`;
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
            'content-type': 'application/json',
        },
        json: true,
    };
    return options;
}

function getPatchRequestOptions(uri: string, newTags: string): any {
    const options = {
        uri: uri,
        headers: {
            authorization: `Bearer ${accessToken}`,
            'content-type': 'application/json-patch+json',
        },
        body: [
            {
                op: 'add',
                path: '/fields/System.Tags',
                value: newTags,
            },
        ],
        json: true,
    };
    return options;
}

run();
