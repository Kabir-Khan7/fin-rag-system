/* ============================================================
   usp_build_payables_aging
   ------------------------------------------------------------
   Full-refresh. Ages each invoice by days since Invoice_Date,
   assigns it to a bucket, and aggregates by vendor.
   ============================================================ */

USE fin_model;
GO

CREATE OR ALTER PROCEDURE dbo.usp_build_payables_aging
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @rows INT = 0;
    DECLARE @today DATETIME2 = SYSUTCDATETIME();

    BEGIN TRY
        BEGIN TRANSACTION;

        TRUNCATE TABLE dbo.gold_payables_aging;

        ;WITH aged AS (
            SELECT
                Vendor_ID,
                Vendor_Name,
                Grand_Total,
                -- Age in days: today minus the invoice date.
                DATEDIFF(DAY, Invoice_Date, @today) AS age_days
            FROM dbo.silver_invoices
            WHERE Vendor_ID IS NOT NULL
              AND Invoice_Date IS NOT NULL
              AND Grand_Total IS NOT NULL
        )
        INSERT INTO dbo.gold_payables_aging
            (Vendor_ID, Vendor_Name, current_0_30, days_31_60,
             days_61_90, days_over_90, total_payable, invoice_count)
        SELECT
            Vendor_ID,
            MAX(Vendor_Name),
            SUM(CASE WHEN age_days <= 30 THEN Grand_Total ELSE 0 END),
            SUM(CASE WHEN age_days BETWEEN 31 AND 60 THEN Grand_Total ELSE 0 END),
            SUM(CASE WHEN age_days BETWEEN 61 AND 90 THEN Grand_Total ELSE 0 END),
            SUM(CASE WHEN age_days > 90 THEN Grand_Total ELSE 0 END),
            SUM(Grand_Total),
            COUNT(*)
        FROM aged
        GROUP BY Vendor_ID;

        SET @rows = @@ROWCOUNT;

        COMMIT TRANSACTION;

        SELECT 'gold_payables_aging' AS metric_table, @rows AS rows_built;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO
PRINT 'usp_build_payables_aging ready.';
GO