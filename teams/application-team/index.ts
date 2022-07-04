import { ArnPrincipal } from 'aws-cdk-lib/aws-iam';
import { ApplicationTeam } from '@aws-quickstart/eks-blueprints';


export class TeamGryffindor extends ApplicationTeam {
    constructor(accountID: string) {
        super({
            name: 'gryffindor',
            users: [new ArnPrincipal(`arn:aws:iam::${accountID}:user/application-gryffindor`)]
        });
    }
}

export class TeamSlytherin extends ApplicationTeam {
    constructor(accountID: string) {
        super({
            name: 'slytherin',
            users: [new ArnPrincipal(`arn:aws:iam::${accountID}:user/application-slytherin`)]
        });
    }
}