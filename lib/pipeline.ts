import * as cdk from "aws-cdk-lib";
import {Construct} from "constructs";
import * as blueprints from "@aws-quickstart/eks-blueprints";

import * as team from "../teams";

export default class PipelineConstruct extends Construct {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id);

        const account = props?.env?.account!;
        const region = props?.env?.region!;

        const blueprint = blueprints.EksBlueprint.builder()
            .account(account)
            .region(region)
            .addOns(
                new blueprints.AwsLoadBalancerControllerAddOn,
                new blueprints.NginxAddOn,
                // new blueprints.ArgoCDAddOn,
                new blueprints.AppMeshAddOn( {
                    enableTracing: true
                }),
                // SSMAgentAddOn handles PVRE as it is adding correct role to the node group, otherwise stack destroy won't work
                new blueprints.SSMAgentAddOn,
                new blueprints.CalicoOperatorAddOn,
                new blueprints.MetricsServerAddOn,
                new blueprints.ClusterAutoScalerAddOn,
                new blueprints.ContainerInsightsAddOn,
                new blueprints.XrayAddOn,
                new blueprints.SecretsStoreAddOn
            )
            .teams(
                new team.TeamPlatform(account),
                new team.TeamApplication('gryffindor', account),
                new team.TeamApplication('slytherin', account),
            );

        // const bootstrapRepo: blueprints.ApplicationRepository = {
        //     repoUrl: 'https://github.com/aws-samples/eks-blueprints-workloads.git',
        //     targetRevision: 'workshop',
        // }
        //
        // const devBootstrapArgo = new blueprints.ArgoCDAddOn({
        //     bootstrapRepo: {
        //         ...bootstrapRepo,
        //         path: 'envs/dev'
        //     },
        // });
        // const testBootstrapArgo = new blueprints.ArgoCDAddOn({
        //     bootstrapRepo: {
        //         ...bootstrapRepo,
        //         path: 'envs/test'
        //     },
        // });
        // const prodBootstrapArgo = new blueprints.ArgoCDAddOn({
        //     bootstrapRepo: {
        //         ...bootstrapRepo,
        //         path: 'envs/prod'
        //     },
        // });

        blueprints.CodePipelineStack.builder()
            .name("aws-bb-containers-capstone-pipeline")
            .owner("micmarc")
            .repository({
                repoUrl: "aws-bb-containers-capstone",
                credentialsSecretName: "github-token",
                targetRevision: "main",
            })
            .wave({
                id: "envs",
                stages: [
                    {id: "dev", stackBuilder: blueprint.clone('us-west-2')}, //.addOns(devBootstrapArgo)},
                    {id: "test", stackBuilder: blueprint.clone('us-east-2')}, //.addOns(testBootstrapArgo)},
                    {id: "prod", stackBuilder: blueprint.clone('us-east-1')}, //.addOns(prodBootstrapArgo)},
                ],
            })
            .build(scope, id + "-stack", props);
    }
}