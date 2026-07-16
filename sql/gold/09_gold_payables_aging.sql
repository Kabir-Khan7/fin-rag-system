/* ============================================================
   gold_payables_aging — accounts payable aging by vendor
   ------------------------------------------------------------
   Buckets invoices by age (days since invoice date) into
   standard aging categories, grouped by vendor. Full-refresh.
   Note: absent a payment-status flag, all invoices are treated
   as outstanding payables (extend when payment status exists).
   ============================================================ */

USE fin_model;
GO

IF OBJECT_ID('dbo.gold_payables_aging', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.gold_payables_aging (
        gold_id          INT IDENTITY(1,1) PRIMARY KEY,
        Vendor_ID        VARCHAR(50)     NULL,
        Vendor_Name      VARCHAR(255)    NULL,
        current_0_30     DECIMAL(18,2)   NOT NULL,   -- 0-30 days old
        days_31_60       DECIMAL(18,2)   NOT NULL,
        days_61_90       DECIMAL(18,2)   NOT NULL,
        days_over_90     DECIMAL(18,2)   NOT NULL,
        total_payable    DECIMAL(18,2)   NOT NULL,
        invoice_count    INT             NOT NULL,
        computed_at      DATETIME2       NOT NULL DEFAULT SYSUTCDATETIME()
    );
END
GO
PRINT 'gold_payables_aging table ready.';
GO