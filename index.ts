import tl = require('azure-pipelines-task-lib/task');
import * as request from "request-promise-native";

async function run() {
    try {
        
        // const collectionUrl = <string>process.env["SYSTEM_TEAMFOUNDATIONCOLLECTIONURI"];
        // const teamProject = <string>process.env["SYSTEM_TEAMPROJECT"];
        // const buildId = <string>process.env["BUILD_BUILDID"];
        const collectionUrl = "https://tfs.eastbanctech.ru/tfs/Tfs_ETR_2010"
        const teamProject = "ETR_S7_Workflows";
        const buildId = "44421";

        const workItemsData = await getWorkItemsFromBuild(collectionUrl, teamProject, buildId);
        workItemsData.forEach(async workItem => {
            await addTagToWorkItem(workItem);
        });
    }
    catch (err) {
        tl.setResult(tl.TaskResult.Failed, err.message);
    }
}

async function getWorkItemsFromBuild(collectionUrl: string, teamProject: string, buildId: string) {
    const maxItems = 500;
    const accessToken = tl.getEndpointAuthorization('SystemVssConnection', true).parameters.AccessToken;
    let uri = `${collectionUrl}/${teamProject}/_apis/build/builds/${buildId}/workitems?api-version=2.0&top=${maxItems}`;
    const options = {
        uri: uri,
        headers: {
            "authorization": `Bearer ${accessToken}`,
            "content-type": "application/json"
        },
        json: true
    };

    const result = await request.get(options);
    return result.value;

}

async function addTagToWorkItem(workItem: any){
    const tagToAdd = <string>process.env['tagToAdd'];
    const accessToken = tl.getEndpointAuthorization('SystemVssConnection', true).parameters.AccessToken;
    const uri = workItem.url + "?fields=System.Tags&api-version=2.0";
    let options = {
        uri: uri,
        headers: {
            "authorization": `Bearer ${accessToken}`,
            "content-type": "application/json"
        },
        json: true
    };
    const result = await request.get(options);
    const currentTags = result.fields['System.Tags'];
    let newTags = '';
    if(currentTags !== ''){
        newTags = currentTags + ";" + tagToAdd;
    }else{
        newTags = tagToAdd;
    }
    console.log(newTags);
    let opt = {
        uri: uri,
        headers: {
            "authorization": `Bearer ${accessToken}`,
            "content-type": "application/json-patch+json"
        },
        body: [{
            "op": "add",
            "path": "/fields/System.Tags",
            "value": newTags
        }],
        json: true
    };
    await request.patch(opt)

}

run();