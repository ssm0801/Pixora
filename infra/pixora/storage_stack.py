from aws_cdk import (
    Stack,
    aws_s3 as s3,
    aws_iam as iam,
    CfnOutput,
    Duration,
    RemovalPolicy,
)
from constructs import Construct


class StorageStack(Stack):
    """
    S3 bucket for all Pixora media (photos + videos).

    Cost notes
    ──────────
    • Transfer Acceleration is OFF by default.
      If the bucket is in ap-south-1 (Mumbai) and your users are in India,
      the direct S3 endpoint is already local — acceleration adds $0.04/GB
      with no meaningful speed benefit.
      Enable only if you deploy to a non-India region:
        cdk deploy --context transfer_acceleration=true

    • Lifecycle moves objects to Standard-IA at 30 days (60 % cheaper)
      and Glacier Instant Retrieval at 180 days (80 % cheaper).
      Old wedding albums are accessed rarely — this saves significantly.

    • CORS exposes ETag (required for multipart upload completion).
    """

    def __init__(self, scope: Construct, construct_id: str, **kwargs):
        super().__init__(scope, construct_id, **kwargs)

        enable_acceleration = (
            self.node.try_get_context("transfer_acceleration") == "true"
        )

        # ── S3 Bucket ────────────────────────────────────────────────────────
        self.bucket = s3.Bucket(
            self,
            "PixoraMedia",
            versioned=False,
            removal_policy=RemovalPolicy.RETAIN,
            transfer_acceleration=enable_acceleration,
            cors=[
                s3.CorsRule(
                    allowed_methods=[
                        s3.HttpMethods.GET,
                        s3.HttpMethods.PUT,
                        s3.HttpMethods.HEAD,
                    ],
                    allowed_origins=["*"],   # tighten to your domain in prod
                    allowed_headers=["*"],
                    exposed_headers=["ETag"],  # required for multipart
                    max_age=3000,
                )
            ],
            lifecycle_rules=[
                s3.LifecycleRule(
                    id="cost-tiering",
                    enabled=True,
                    transitions=[
                        # Standard-IA: 60 % cheaper, same retrieval speed
                        s3.Transition(
                            storage_class=s3.StorageClass.INFREQUENT_ACCESS,
                            transition_after=Duration.days(30),
                        ),
                        # Glacier Instant Retrieval: 80 % cheaper, ms retrieval
                        s3.Transition(
                            storage_class=s3.StorageClass.GLACIER_INSTANT_RETRIEVAL,
                            transition_after=Duration.days(180),
                        ),
                    ],
                )
            ],
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
        )

        # ── IAM user for backend presigning ──────────────────────────────────
        # In production replace with an IAM role on your compute platform
        # (EC2 / ECS / App Runner) — no access key needed.
        backend_user = iam.User(self, "PixoraBackend", user_name="pixora-backend")

        backend_user.add_to_principal_policy(
            iam.PolicyStatement(
                sid="MediaReadWrite",
                actions=["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
                resources=[f"{self.bucket.bucket_arn}/*/media/*"],
            )
        )
        backend_user.add_to_principal_policy(
            iam.PolicyStatement(
                sid="ThumbnailRead",
                actions=["s3:GetObject", "s3:DeleteObject"],
                resources=[f"{self.bucket.bucket_arn}/*/thumbnail/*"],
            )
        )
        backend_user.add_to_principal_policy(
            iam.PolicyStatement(
                sid="MultipartUpload",
                actions=[
                    "s3:CreateMultipartUpload",
                    "s3:UploadPart",
                    "s3:CompleteMultipartUpload",
                    "s3:AbortMultipartUpload",
                    "s3:ListMultipartUploadParts",
                ],
                resources=[f"{self.bucket.bucket_arn}/*/media/*"],
            )
        )

        access_key = iam.CfnAccessKey(
            self, "PixoraBackendKey", user_name=backend_user.user_name
        )

        # ── Outputs ───────────────────────────────────────────────────────────
        CfnOutput(self, "BucketName",   value=self.bucket.bucket_name,
                  description="S3_BUCKET_NAME → backend .env")
        CfnOutput(self, "BucketRegion", value=self.region,
                  description="AWS_REGION → backend .env")
        CfnOutput(self, "BackendAccessKeyId",  value=access_key.ref,
                  description="AWS_ACCESS_KEY_ID → backend .env")
        CfnOutput(self, "BackendSecretKey", value=access_key.attr_secret_access_key,
                  description="AWS_SECRET_ACCESS_KEY → backend .env")
        if enable_acceleration:
            CfnOutput(
                self, "AcceleratedUrl",
                value=f"https://{self.bucket.bucket_name}.s3-accelerate.amazonaws.com",
                description="Optional — only when transfer_acceleration=true",
            )
