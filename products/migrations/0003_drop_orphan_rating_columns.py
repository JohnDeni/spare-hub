from django.db import migrations


class Migration(migrations.Migration):
    """
    Drops `average_rating` / `review_count` columns that exist in some local
    dev databases but were never part of the `Product` model or any tracked
    migration (leftover from an abandoned ratings feature). Without this,
    Postgres rejects every product insert with a NOT NULL violation on
    columns Django doesn't know about.
    """

    dependencies = [
        ("products", "0002_productimage"),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
            ALTER TABLE products_product DROP COLUMN IF EXISTS average_rating;
            ALTER TABLE products_product DROP COLUMN IF EXISTS review_count;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
