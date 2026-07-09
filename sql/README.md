# SQL — Data Warehouse Transformation Layer

Version-controlled SQL for the Bronze → Silver → Gold pipeline.

- `infrastructure/` — ETL support tables (quarantine, watermark)
- `silver/` — Silver table definitions and transformation stored procedures

Stored procedures are applied to the `fin_model` database. These files are
the source of truth — do not edit procedures only in SSMS.