# management/commands/cleanup_orphaned_files.py
import click
from database.models.papers import Paper
from workers.services.file_s3_service import FileService


@click.command()
@click.option(
    "--dry-run", is_flag=True, help="Show what would be deleted without deleting"
)
def cleanup_orphaned_files(dry_run):
    """Clean up S3 files that don't have corresponding database records."""
    file_service = FileService()

    # List all objects in S3
    s3_objects = file_service.s3_client.list_objects_v2(
        Bucket=file_service.bucket_name, Prefix="papers/"
    )

    if "Contents" not in s3_objects:
        click.echo("No files found in S3")
        return

    orphaned_count = 0

    for obj in s3_objects["Contents"]:
        s3_key = obj["Key"]

        # Check if paper exists with this S3 key
        paper = Paper.find_one(Paper.s3_key == s3_key).run()

        if not paper:
            orphaned_count += 1
            click.echo(f"Orphaned file found: {s3_key}")

            if not dry_run:
                try:
                    file_service.s3_client.delete_object(
                        Bucket=file_service.bucket_name, Key=s3_key
                    )
                    click.echo(f"  -> Deleted")
                except Exception as e:
                    click.echo(f"  -> Error deleting: {e}")

    click.echo(f"\nTotal orphaned files: {orphaned_count}")
    if dry_run:
        click.echo("Run without --dry-run to actually delete files")
