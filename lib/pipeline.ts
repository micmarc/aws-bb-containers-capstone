import * as cdk from "aws-cdk-lib";
import * as eks from "aws-cdk-lib/aws-eks"
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
        const teamSlytherin = new team.TeamSlytherin(account);

        const fargateProfiles: Map<string, eks.FargateProfileOptions> = new Map([
            [teamGryffindor.name, {selectors: [{namespace: teamGryffindor.name}]}],
            [teamSlytherin.name, {selectors: [{namespace: teamSlytherin.name}]}],
        ]);
        const clusterProvider = new blueprints.FargateClusterProvider({
            fargateProfiles,
            version: eks.KubernetesVersion.V1_20
        });

        const blueprint = blueprints.EksBlueprint.builder()
            .account(account)
            .region(region)
            .clusterProvider(clusterProvider)
            .teams(platformTeam, teamGryffindor, teamSlytherin)
            .addOns(
                new blueprints.AwsLoadBalancerControllerAddOn,
                new blueprints.NginxAddOn,
                new blueprints.AppMeshAddOn({
                    enableTracing: true
                }),
                new blueprints.SSMAgentAddOn,
                new blueprints.CalicoOperatorAddOn,
                new blueprints.MetricsServerAddOn,
                new blueprints.ClusterAutoScalerAddOn,
                new blueprints.ContainerInsightsAddOn,
                new blueprints.XrayAddOn,
                new blueprints.SecretsStoreAddOn
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
            bootstrapValues: {
                service: {
                    type: "LoadBalancer"
                },
                spec: {
                    ingress: {
                        host: "dev.blueprint.com",
                    },
                },
            },
            values: {
                server: {
                    additionalProjects: argoAdditionalProject,
                }
            }
        }
    )
}