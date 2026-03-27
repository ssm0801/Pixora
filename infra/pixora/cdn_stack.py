from aws_cdk import (
    Stack,
    aws_cloudfront as cloudfront,
    aws_cloudfront_origins as origins,
    CfnOutput,
    Duration,
)
from constructs import Construct
from .storage_stack import StorageStack


class CdnStack(Stack):
    """
    CloudFront distribution in front of the S3 bucket.

    Two cache behaviours:
      /media/*       — original files, cached 30 days  (long TTL, content-addressable keys)
      /thumbnails/*  — Lambda-generated JPEGs, cached 7 days

    Cost notes
    ──────────
    • PRICE_CLASS_200 covers Asia Pacific (Mumbai, Singapore, Seoul, Tokyo,
      Sydney) + Europe + North America edge nodes — all of which serve India
      well — at a lower per-GB rate than PRICE_CLASS_ALL (which adds South
      America and Africa PoPs that are not needed for an India-focused app).

    OAC (Origin Access Control) means the bucket stays fully private;
    only this CloudFront distribution can read from it.

    Outputs:
      CLOUDFRONT_URL / NEXT_PUBLIC_CLOUDFRONT_URL — add to backend + frontend .env
    """

    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        storage: StorageStack,
        **kwargs,
    ):
        super().__init__(scope, construct_id, **kwargs)

        # S3 origin with Origin Access Control — CloudFront gets a signed request;
        # the bucket policy is automatically updated by CDK to allow only this OAC.
        s3_origin = origins.S3BucketOrigin.with_origin_access_control(storage.bucket)

        # Long cache for original media (keys include UUID — effectively immutable)
        media_cache = cloudfront.CachePolicy(
            self,
            "MediaCachePolicy",
            cache_policy_name="PixoraMedia",
            default_ttl=Duration.days(30),
            max_ttl=Duration.days(365),
            min_ttl=Duration.seconds(0),
            enable_accept_encoding_gzip=True,
            enable_accept_encoding_brotli=True,
        )

        # Shorter cache for thumbnails (regenerated on demand, ~400×400 JPEG)
        thumb_cache = cloudfront.CachePolicy(
            self,
            "ThumbnailCachePolicy",
            cache_policy_name="PixoraThumbnails",
            default_ttl=Duration.days(7),
            max_ttl=Duration.days(30),
            min_ttl=Duration.seconds(0),
            enable_accept_encoding_gzip=True,
            enable_accept_encoding_brotli=True,
        )

        self.distribution = cloudfront.Distribution(
            self,
            "PixoraCdn",
            # Default behaviour: serve original media files  ({eventId}/media/*)
            default_behavior=cloudfront.BehaviorOptions(
                origin=s3_origin,
                cache_policy=media_cache,
                viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                allowed_methods=cloudfront.AllowedMethods.ALLOW_GET_HEAD,
                cached_methods=cloudfront.CachedMethods.CACHE_GET_HEAD,
                compress=True,
            ),
            additional_behaviors={
                # Thumbnail files:  {eventId}/thumbnail/*  — shorter TTL
                "*/thumbnail/*": cloudfront.BehaviorOptions(
                    origin=s3_origin,
                    cache_policy=thumb_cache,
                    viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                    allowed_methods=cloudfront.AllowedMethods.ALLOW_GET_HEAD,
                    compress=True,
                ),
            },
            # PRICE_CLASS_200: Asia Pacific + Europe + North America — covers India
            # at a lower per-GB rate than PRICE_CLASS_ALL (no South America/Africa)
            price_class=cloudfront.PriceClass.PRICE_CLASS_200,
            comment="Pixora media CDN",
        )

        CfnOutput(
            self,
            "CdnUrl",
            value=f"https://{self.distribution.distribution_domain_name}",
            description="CLOUDFRONT_URL (backend) / NEXT_PUBLIC_CLOUDFRONT_URL (frontend)",
            export_name="PixoraCdnUrl",
        )
        CfnOutput(
            self,
            "DistributionId",
            value=self.distribution.distribution_id,
            description="CloudFront distribution ID (needed for cache invalidation)",
        )
