import os
from aws_cdk import (
    Stack,
    aws_lambda as lambda_,
    aws_s3 as s3,
    aws_s3_notifications as s3n,
    Duration,
    CfnOutput,
)
from constructs import Construct
from .storage_stack import StorageStack


# Public FFmpeg Lambda Layer ARNs (static build, ~50 MB, x86_64)
# Source: https://github.com/serverlesspub/ffmpeg-aws-lambda-layer
# Optional — stack works without this; videos get a grey placeholder thumbnail.
# Enable with: cdk deploy --context ffmpeg_layer=true
FFMPEG_LAYER_ARNS: dict[str, str] = {
    "ap-south-1":    "arn:aws:lambda:ap-south-1:145266761615:layer:ffmpeg:1",
    "us-east-1":     "arn:aws:lambda:us-east-1:145266761615:layer:ffmpeg:1",
    "eu-west-1":     "arn:aws:lambda:eu-west-1:145266761615:layer:ffmpeg:1",
    "ap-southeast-1": "arn:aws:lambda:ap-southeast-1:145266761615:layer:ffmpeg:1",
}


class ThumbnailsStack(Stack):
    """
    Lambda function that generates thumbnails whenever a file lands in media/.

    Trigger:   S3 ObjectCreated on prefix  media/
    Output:    Writes 400×400 JPEG to      thumbnails/{same-key}.jpg

    - Images: processed with Pillow (pure Python, no native layer needed)
    - Videos: first frame extracted with FFmpeg subprocess → Pillow resize
              Falls back to a grey placeholder if FFmpeg layer is not enabled.

    Cost notes
    ──────────
    • Python 3.12 + Pillow requires NO external Lambda layer for images —
      Pillow wheels ship in the deployment package (built during cdk deploy).
    • 512 MB RAM instead of 1024 MB — sufficient for ≤ 40 MB images at 400px.
      Saves ~50 % on Lambda compute cost versus the 1024 MB baseline.
    • 30 s timeout (was 60 s) — Pillow resize of a 20 MP JPEG takes < 3 s;
      FFmpeg first-frame extraction < 10 s for most wedding videos.
    • reserved_concurrent_executions=5 caps costs during bulk upload spikes
      (e.g. 10 000-photo wedding batch). Each invocation is ~1–3 s so the
      queue drains quickly; worst-case lag is acceptable for thumbnail display.

    FFmpeg layer (optional, videos only)
    ─────────────────────────────────────
      cdk deploy --context ffmpeg_layer=true
      Without it, video thumbnails fall back to a grey placeholder JPEG.
      The layer is ~50 MB and adds ~$0 at typical wedding-app traffic.
    """

    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        storage: StorageStack,
        **kwargs,
    ):
        super().__init__(scope, construct_id, **kwargs)

        # ── Optional FFmpeg layer ────────────────────────────────────────────
        enable_ffmpeg = self.node.try_get_context("ffmpeg_layer") == "true"
        layers: list[lambda_.ILayerVersion] = []

        if enable_ffmpeg:
            ffmpeg_arn = FFMPEG_LAYER_ARNS.get(self.region)
            if ffmpeg_arn:
                layers.append(
                    lambda_.LayerVersion.from_layer_version_arn(
                        self, "FfmpegLayer", ffmpeg_arn
                    )
                )

        # ── Lambda function ──────────────────────────────────────────────────
        # CDK bundles the lambda/thumbnail directory at deploy time:
        # runs `pip install -r requirements.txt -t /asset-output` inside a
        # Python 3.12 Docker container, then copies the source files in.
        lambda_dir = os.path.join(
            os.path.dirname(__file__), "..", "lambda", "thumbnail"
        )

        thumbnail_fn = lambda_.Function(
            self,
            "ThumbnailGenerator",
            runtime=lambda_.Runtime.PYTHON_3_12,
            architecture=lambda_.Architecture.X86_64,
            handler="index.handler",
            code=lambda_.Code.from_asset(
                lambda_dir,
                bundling=lambda_.BundlingOptions(
                    image=lambda_.Runtime.PYTHON_3_12.bundling_image,
                    command=[
                        "bash",
                        "-c",
                        (
                            "pip install -r requirements.txt -t /asset-output "
                            "&& cp index.py /asset-output/"
                        ),
                    ],
                ),
            ),
            layers=layers,
            timeout=Duration.seconds(30),
            memory_size=512,
            # Cap at 5 concurrent executions to prevent runaway costs during
            # bulk upload spikes (10 000-photo weddings, etc.)
            reserved_concurrent_executions=5,
            environment={
                "BUCKET_NAME": storage.bucket.bucket_name,
                "THUMB_SIZE":  "400",
                "FFMPEG_PATH": "/opt/bin/ffmpeg",  # set by FFmpeg layer
            },
        )

        # Read originals from */media/*, write thumbnails to */thumbnail/*
        storage.bucket.grant_read(thumbnail_fn, "*/media/*")
        storage.bucket.grant_write(thumbnail_fn, "*/thumbnail/*")

        # ── S3 event trigger ─────────────────────────────────────────────────
        # No prefix filter — key structure is {eventId}/media/{file} so we
        # cannot express a middle-path prefix in S3 notifications.
        # The Lambda self-filters: keys without /media/ are skipped immediately.
        storage.bucket.add_event_notification(
            s3.EventType.OBJECT_CREATED,
            s3n.LambdaDestination(thumbnail_fn),
        )

        CfnOutput(
            self,
            "ThumbnailFunctionArn",
            value=thumbnail_fn.function_arn,
            description="Lambda ARN — invoke manually to regenerate all thumbnails",
        )
