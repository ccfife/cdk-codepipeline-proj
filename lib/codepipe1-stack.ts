import cdk = require('@aws-cdk/cdk');
import codepipeline = require('@aws-cdk/aws-codepipeline'); 
import pipelineAction = require('@aws-cdk/aws-codepipeline-actions');
import codebuild = require('@aws-cdk/aws-codebuild');

export class Codepipe1Stack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    //read the GitHub access key from SecretValue using the 'GitHub' name/value pair
    const token = cdk.SecretValue.secretsManager('ccfife_github', {
      jsonField: 'GitHub'
    });

    //create the CodePipeline service instance
    const pipeline = new codepipeline.Pipeline(this, 'CDKpipeline',{
      pipelineName: 'CDKPipeline'
    });

    //create new codepipeline artifact outputs for the code source and build stages
    const sourceOutput = new codepipeline.Artifact();
    const buildOutput = new codepipeline.Artifact();

    //create new codepipeline GitHub SOURCE stage
    const sourceStage = {
      name: 'Source',
      actions: [
        new pipelineAction.GitHubSourceAction({
        actionName: 'GitHub_Source',
        owner: 'ccfife',
        repo: 'learning-cdk',
        oauthToken: token,
        output: sourceOutput
        }),
      ]
    };
  
    //add the SOURCE stage to the pipeline
    pipeline.addStage(sourceStage);

    //create the codebuild project for the BUILD action stage
    const project = new codebuild.PipelineProject(this, 'CdkCodebuildProject',{
      environment: {buildImage: codebuild.LinuxBuildImage.UBUNTU_14_04_NODEJS_10_1_0}, //nodejs build image
      buildSpec: { //inline buildspec for CDK apps
        version: '0.2',
        phases: {
          install: {
            commands: [
              'npm install', //install npm dependencies in package.json
            ],
          },
          build: {
            commands: [
              'npm run build',  //compile TypeScript to JavaScript
              'npm run cdk synth -- -o dist', //synthesize CDK app and put results in 'dist'
              //'npm run cdk deploy' //deploys CDK app
            ],
          },
        },
        artifacts: {
          'files': [ '**/*' ],
          'base-directory': 'dist'
        }
      }
    });
    
    //create a new codepipeline BUILD stage
    const buildStage = {
      name: 'Build',
      actions: [
      new pipelineAction.CodeBuildAction({
        actionName: 'CodeBuild',
        project,
        input: sourceOutput,
        output: buildOutput
        }),
      ]
    };
    
    //add the BUILD stage to the pipleline
    pipeline.addStage(buildStage); 

    //create the codepipline DEPLOY stage with CloudFormation actions to create and execute changesets
    const deployStage = {
      name: 'Deploy',
      actions: [ 
        new pipelineAction.CloudFormationCreateUpdateStackAction({
          actionName: 'CreateStack',
          adminPermissions: true,
          templatePath: buildOutput.atPath('LearningGitStack.template.yaml'),
          stackName: 'LearningGitStack'
        }),
      ],
    };

    //add the DEPLOY stage to the pipeline
    pipeline.addStage(deployStage);

  }
};
