#!/usr/bin/env node
import 'source-map-support/register';
import cdk = require('@aws-cdk/cdk');
import { Codepipe1Stack } from '../lib/codepipe1-stack';

const app = new cdk.App();
new Codepipe1Stack(app, 'Codepipe1Stack');
