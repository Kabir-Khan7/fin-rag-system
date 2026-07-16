/* ============================================================
   gold_vendor_spend — total spend per vendor
   ------------------------------------------------------------
   Aggregates invoices by vendor to reveal spend concentration.
   Full-refresh.
   ============================================================ */

USE fin_model;
GO

IF OBJECT_ID('dbo.gold_vendor_spend', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.gold_vendor_spend (
        gold_id          INT IDENTITY(1,1) PRIMARY KEY,
        Vendor_ID        VARCHAR(50)     NULL,
        Vendor_Name      VARCHAR(255)    NULL,
        invoice_count    INT             NOT NULL,
        total_spend      DECIMAL(18,2)   NOT NULL,
        total_tax        DECIMAL(18,2)   NULL,
        avg_invoice      DECIMAL(18,2)   NULL,
        computed_at      DATETIME2       NOT NULL DEFAULT SYSUTCDATETIME()
    );
END
GO
PRINT 'gold_vendor_spend table ready.';
GO