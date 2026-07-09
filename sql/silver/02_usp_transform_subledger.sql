/* ============================================================
   usp_transform_subledger  (corrected — uses #staging temp table)
   ------------------------------------------------------------
   CTEs only live for one statement, so the classification is
   materialized into a #staging temp table that persists for all
   the INSERT statements in this procedure.
   ============================================================ */

USE fin_model;
GO

CREATE OR ALTER PROCEDURE dbo.usp_transform_subledger
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @source_table   VARCHAR(100) = 'stg_subledger';
    DECLARE @watermark      INT;
    DECLARE @max_id         INT;
    DECLARE @inserted       INT = 0;
    DECLARE @quarantined    INT = 0;

    SELECT @watermark = last_processed_id
    FROM dbo.etl_watermark
    WHERE source_table = @source_table;

    SELECT @max_id = MAX(id) FROM dbo.stg_subledger;

    IF @max_id IS NULL OR @max_id <= @watermark
    BEGIN
        SELECT
            @source_table AS source_table,
            0 AS processed, 0 AS inserted, 0 AS quarantined,
            @watermark AS watermark;
        RETURN;
    END

    BEGIN TRY
        BEGIN TRANSACTION;

        /* ---- Materialize new rows + conversions + classification ---- */
        -- A temp table persists across all statements below (unlike a CTE).
        SELECT
            b.id AS bronze_id,
            b.Transaction_ID   AS raw_txn,
            b.System_Timestamp AS raw_sts,
            b.Document_Date    AS raw_doc,
            b.GL_Account_Code  AS raw_gl,
            b.Entity_ID        AS raw_entity,
            b.Amount           AS raw_amount,
            b.Transaction_Type AS raw_type,
            b.Status           AS raw_status,
            b.Description       AS raw_desc,
            TRY_CONVERT(UNIQUEIDENTIFIER, b.Transaction_ID)        AS c_txn,
            TRY_CONVERT(DATETIME2, b.System_Timestamp)             AS c_sts,
            TRY_CONVERT(DATETIME2, b.Document_Date)                AS c_doc,
            TRY_CONVERT(INT, b.GL_Account_Code)                    AS c_gl,
            TRY_CONVERT(DECIMAL(18,2), REPLACE(b.Amount, ',', '')) AS c_amount,
            CAST(NULL AS VARCHAR(50)) AS fail_reason
        INTO #staging
        FROM dbo.stg_subledger b
        WHERE b.id > @watermark AND b.id <= @max_id;

        /* ---- Assign failure reasons (first hard rule that fails) ---- */
        UPDATE #staging
        SET fail_reason =
            CASE
                WHEN raw_txn IS NULL OR c_txn IS NULL THEN 'INVALID_TRANSACTION_ID'
                WHEN raw_amount IS NULL OR c_amount IS NULL THEN 'INVALID_AMOUNT'
                WHEN raw_sts IS NOT NULL AND raw_sts <> '' AND c_sts IS NULL THEN 'INVALID_SYSTEM_TIMESTAMP'
                WHEN raw_doc IS NOT NULL AND raw_doc <> '' AND c_doc IS NULL THEN 'INVALID_DOCUMENT_DATE'
                WHEN raw_gl IS NOT NULL AND raw_gl <> '' AND c_gl IS NULL THEN 'INVALID_GL_ACCOUNT_CODE'
                ELSE NULL
            END;

        /* ---- Mark older duplicates among the passing rows ---- */
        -- Assign a row number per Transaction_ID (latest bronze_id = 1).
        ;WITH ranked AS (
            SELECT bronze_id,
                ROW_NUMBER() OVER (PARTITION BY c_txn ORDER BY bronze_id DESC) AS rn
            FROM #staging
            WHERE fail_reason IS NULL
        )
        UPDATE s
        SET fail_reason = 'DUPLICATE'
        FROM #staging s
        JOIN ranked r ON s.bronze_id = r.bronze_id
        WHERE r.rn > 1;

        /* ---- Quarantine ALL failed rows (bad data + duplicates) ---- */
        INSERT INTO dbo.etl_quarantine
            (source_table, bronze_id, reason_code, reason_detail, row_snapshot)
        SELECT
            @source_table,
            bronze_id,
            fail_reason,
            CONCAT('Row failed rule: ', fail_reason),
            (SELECT raw_txn AS Transaction_ID, raw_amount AS Amount,
                    raw_sts AS System_Timestamp, raw_doc AS Document_Date,
                    raw_gl AS GL_Account_Code, raw_status AS Status
             FOR JSON PATH, WITHOUT_ARRAY_WRAPPER)
        FROM #staging
        WHERE fail_reason IS NOT NULL;

        SET @quarantined = @@ROWCOUNT;

        /* ---- Insert the clean, passing rows into Silver ---- */
        INSERT INTO dbo.silver_subledger
            (Transaction_ID, System_Timestamp, Document_Date, GL_Account_Code,
             Entity_ID, Amount, Transaction_Type, Status, Description, bronze_id)
        SELECT
            c_txn,
            c_sts,
            c_doc,
            c_gl,
            UPPER(LTRIM(RTRIM(raw_entity))),
            c_amount,
            LTRIM(RTRIM(raw_type)),
            CASE
                WHEN LOWER(LTRIM(RTRIM(raw_status))) = 'posted'  THEN 'Posted'
                WHEN LOWER(LTRIM(RTRIM(raw_status))) = 'draft'   THEN 'Draft'
                WHEN LOWER(LTRIM(RTRIM(raw_status))) = 'pending' THEN 'Pending'
                ELSE LTRIM(RTRIM(raw_status))
            END,
            LTRIM(RTRIM(raw_desc)),
            bronze_id
        FROM #staging
        WHERE fail_reason IS NULL;

        SET @inserted = @@ROWCOUNT;

        /* ---- Advance watermark & record the run ---- */
        UPDATE dbo.etl_watermark
        SET last_processed_id   = @max_id,
            last_run_at         = SYSUTCDATETIME(),
            last_run_inserted   = @inserted,
            last_run_quarantined = @quarantined
        WHERE source_table = @source_table;

        DROP TABLE #staging;

        COMMIT TRANSACTION;

        SELECT
            @source_table AS source_table,
            (@inserted + @quarantined) AS processed,
            @inserted AS inserted,
            @quarantined AS quarantined,
            @max_id AS watermark;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

PRINT 'usp_transform_subledger ready (corrected).';
GO