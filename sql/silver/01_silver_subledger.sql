/* ============================================================
   silver_subledger — cleaned, typed subledger transactions
   ------------------------------------------------------------
   Reads from Bronze (dbo.stg_subledger), applies type conversion,
   trimming, status normalization, and deduplication. Every row
   carries lineage back to its Bronze source.
   ============================================================ */

USE fin_model;
GO

IF OBJECT_ID('dbo.silver_subledger', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.silver_subledger (
        silver_id         INT IDENTITY(1,1) PRIMARY KEY,

        -- Cleaned, properly-typed business columns
        Transaction_ID    UNIQUEIDENTIFIER  NOT NULL,
        System_Timestamp  DATETIME2         NULL,
        Document_Date     DATETIME2         NULL,
        GL_Account_Code   INT               NULL,
        Entity_ID         VARCHAR(50)       NULL,
        Amount            DECIMAL(18,2)     NOT NULL,
        Transaction_Type  VARCHAR(100)      NULL,
        Status            VARCHAR(50)        NULL,
        Description       NVARCHAR(MAX)      NULL,

        -- Lineage & audit
        bronze_id         INT               NOT NULL,   -- source row in stg_subledger
        processed_at      DATETIME2         NOT NULL DEFAULT SYSUTCDATETIME()
    );

    -- Prevent the same Bronze row being loaded twice.
    CREATE UNIQUE INDEX UX_silver_subledger_bronze_id
        ON dbo.silver_subledger (bronze_id);
END
GO

PRINT 'silver_subledger table ready.';
GO