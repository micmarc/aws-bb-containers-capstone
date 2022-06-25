import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();
const account = '219890958300';
const region = 'us-east-1';

const addOns: Array<blueprints.ClusterAddOn> = [
    new blueprints.addons.ArgoCDAddOn,
    new blueprints.addons.CalicoOperatorAddOn,
    new blueprints.addons.MetricsServerAddOn,
    new blueprints.addons.ClusterAutoScalerAddOn,
    new blueprints.addons.ContainerInsightsAddOn,
    new blueprints.addons.AwsLoadBalancerControllerAddOn(),
    new blueprints.addons.VpcCniAddOn(),
    new blueprints.addons.CoreDnsAddOn(),
    new blueprints.addons.KubeProxyAddOn(),
    new blueprints.addons.XrayAddOn()
];

blueprints.EksBlueprint.builder()
    .account(account)
    .region(region)
    .addOns(...addOns)
    .build(app, 'aws-bb-containers-capstone');