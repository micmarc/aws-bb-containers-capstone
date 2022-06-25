import * as cdk from 'aws-cdk-lib';
import ClusterConstruct from '../lib/aws-bb-containers-capstone-stack';
import PipelineConstruct from '../lib/pipeline';


const app = new cdk.App();
const account = process.env.CDK_DEFAULT_ACCOUNT!;
const region = process.env.CDK_DEFAULT_REGION;
const env = { account, region }

new ClusterConstruct(app, 'cluster', { env });
new PipelineConstruct(app, 'pipeline', { env });