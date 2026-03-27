#!/usr/bin/env python3
"""
Pixora — AWS CDK Infrastructure
================================
Manages all AWS resources for Pixora's media storage and delivery pipeline.

Stacks:
  PixoraStorage     — S3 bucket (Transfer Acceleration, CORS, lifecycle rules)
                      + IAM credentials for the backend to presign uploads
  PixoraCdn         — CloudFront distribution in front of S3 for fast global delivery
  PixoraThumbnails  — Lambda that auto-generates thumbnails on every media upload

Deploy:
  cd infra
  python3 -m venv .venv && source .venv/bin/activate
  pip install -r requirements.txt
  cdk bootstrap        # first time only
  cdk deploy --all     # deploy all three stacks

Region defaults to ap-south-1 (Mumbai) — best latency from India.
Override: cdk deploy --all --context region=us-east-1
"""

import aws_cdk as cdk
from pixora.storage_stack import StorageStack
from pixora.cdn_stack import CdnStack
from pixora.thumbnails_stack import ThumbnailsStack

app = cdk.App()

region = app.node.try_get_context("region") or "ap-south-1"  # Mumbai for India latency

env = cdk.Environment(
    account=app.node.try_get_context("account") or None,
    region=region,
)

storage = StorageStack(app, "PixoraStorage", env=env)
cdn = CdnStack(app, "PixoraCdn", storage=storage, env=env)
thumbnails = ThumbnailsStack(app, "PixoraThumbnails", storage=storage, env=env)

app.synth()
