import * as cdk from "aws-cdk-lib";
import {Construct} from "constructs";
import * as blueprints from "@aws-quickstart/eks-blueprints";

import * as team from "../teams";

export default class PipelineConstruct extends Construct {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id);

        const account = props?.env?.account!;
        const region = props?.env?.region!;

        const platformTeam = new team.TeamPlatform(account);
        const teamGryffindor = new team.TeamGryffindor(account);
        const teamHufflepuff = new team.TeamHufflepuff(account);
        const teamSlytherin = new team.TeamSlytherin(account);

        const blueprint = blueprints.EksBlueprint.builder()
            .account(account)
            .region(region)
            .teams(platformTeam, teamGryffindor, teamHufflepuff, teamSlytherin)
            .addOns(
                new blueprints.AwsLoadBalancerControllerAddOn,
                new blueprints.NginxAddOn,
                new blueprints.CalicoOperatorAddOn,
                new blueprints.MetricsServerAddOn,
                new blueprints.SecretsStoreAddOn,
                // The add-ons below are supported for EKS EC2 only
                new blueprints.AppMeshAddOn({
                    enableTracing: true
                }),
                new blueprints.SSMAgentAddOn,
                new blueprints.ClusterAutoScalerAddOn,
                new blueprints.ContainerInsightsAddOn,
                new blueprints.XrayAddOn,
            );

        const devBootstrapArgo = createArgoAddonConfig("dev");
        const testBootstrapArgo = createArgoAddonConfig("test");
        const prodBootstrapArgo = createArgoAddonConfig("prod");

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
                    {id: "dev", stackBuilder: blueprint.clone('us-west-2').addOns(devBootstrapArgo)},
                    {id: "test", stackBuilder: blueprint.clone('us-east-2').addOns(testBootstrapArgo)},
                    {id: "prod", stackBuilder: blueprint.clone('us-east-1').addOns(prodBootstrapArgo)},
                ],
            })
            .build(scope, id + "-stack", props);
    }
}

function createArgoAddonConfig(environment: string): blueprints.ArgoCDAddOn {
    interface argoProjectParams {
        githubOrg: string,
        githubRepository: string,
        projectNamespace: string
    }

    let argoAdditionalProject: Array<Record<string, unknown>> = [];
    const projectNameList: argoProjectParams[] =
        [
            {githubOrg: "micmarc", githubRepository: "ecsdemo-crystal", projectNamespace: "team-hufflepuff"},
            {githubOrg: "micmarc", githubRepository: "ecsdemo-frontend", projectNamespace: "team-slytherin"},
            {githubOrg: "micmarc", githubRepository: "ecsdemo-nodejs", projectNamespace: "team-gryffindor"},
        ];

    projectNameList.forEach(element => {
        argoAdditionalProject.push(
            {
                name: element.githubRepository,
                namespace: "argocd",
                destinations: [{
                    namespace: element.projectNamespace,
                    server: "https://kubernetes.default.svc"
                }],
                sourceRepos: [
                    `https://github.com/${element.githubOrg}/${element.githubRepository}.git`,
                ],
            }
        );
    });

    return new blueprints.ArgoCDAddOn(
        {
            bootstrapRepo: {
                repoUrl: "https://github.com/micmarc/aws-bb-containers-capstone-workloads.git",
                path: `envs/${environment}`,
                targetRevision: "main",
                credentialsSecretName: "github-token-json",
                credentialsType: "TOKEN"
            },
            values: {
                server: {
                    additionalProjects: argoAdditionalProject,
                    service: {
                        type: "LoadBalancer",
                    },
                }
            }
        }
    )
}