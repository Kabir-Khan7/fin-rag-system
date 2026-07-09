/* ============================================================
   ETL Infrastructure Tables
   ------------------------------------------------------------
   etl_quarantine : rows that failed Silver transformation,
                    stored with the reason. Nothing is silently
                    dropped — critical for financial data.
   etl_watermark  : tracks the last Bronze id processed per
                    table, enabling incremental (new-rows-only)
                    processing instead of full reloads.
   ============================================================ */

USE fin_model;
GO

/* ---------- Quarantine ---------- */
IF OBJECT_ID('dbo.etl_quarantine', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.etl_quarantine (
        quarantine_id   INT IDENTITY(1,1) PRIMARY KEY,
        source_table    VARCHAR(100)   NOT NULL,  -- e.g. 'stg_subledger'
        bronze_id       INT            NOT NULL,  -- the offending Bronze row's id
        reason_code     VARCHAR(50)    NOT NULL,  -- e.g. 'INVALID_AMOUNT'
        reason_detail   NVARCHAR(500)  NULL,      -- human-readable explanation
        row_snapshot    NVARCHAR(MAX)  NULL,      -- the raw row as JSON, for review
        quarantined_at  DATETIME2      NOT NULL DEFAULT SYSUTCDATETIME()
    );
END
GO

/* ---------- Watermark ---------- */
IF OBJECT_ID('dbo.etl_watermark', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.etl_watermark (
        source_table        VARCHAR(100) PRIMARY KEY,  -- one row per Bronze table
        last_processed_id   INT          NOT NULL DEFAULT 0,
        last_run_at         DATETIME2    NULL,
        last_run_inserted   INT          NULL,
        last_run_quarantined INT         NULL
    );
END
GO

/* Seed a watermark row (starting at 0) for each staging table. */
MERGE dbo.etl_watermark AS target
USING (VALUES
    ('stg_subledger'),
    ('stg_bank_feed'),
    ('stg_chart_of_accounts'),
    ('stg_master_directory'),
    ('stg_raw_invoices')
) AS source (source_table)
ON target.source_table = source.source_table
WHEN NOT MATCHED THEN
    INSERT (source_table, last_processed_id) VALUES (source.source_table, 0);
GO

PRINT 'ETL infrastructure tables ready.';
GO