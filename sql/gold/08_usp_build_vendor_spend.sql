/* ============================================================
   usp_build_vendor_spend
   ------------------------------------------------------------
   Full-refresh. Aggregates invoices by vendor: total spend,
   invoice count, total tax, and average invoice value.
   ============================================================ */

USE fin_model;
GO

CREATE OR ALTER PROCEDURE dbo.usp_build_vendor_spend
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @rows INT = 0;

    BEGIN TRY
        BEGIN TRANSACTION;

        TRUNCATE TABLE dbo.gold_vendor_spend;

        INSERT INTO dbo.gold_vendor_spend
            (Vendor_ID, Vendor_Name, invoice_count, total_spend, total_tax, avg_invoice)
        SELECT
            Vendor_ID,
            MAX(Vendor_Name)                      AS Vendor_Name,
            COUNT(*)                              AS invoice_count,
            SUM(ISNULL(Grand_Total, 0))           AS total_spend,
            SUM(ISNULL(Total_Tax, 0))             AS total_tax,
            AVG(ISNULL(Grand_Total, 0))           AS avg_invoice
        FROM dbo.silver_invoices
        WHERE Vendor_ID IS NOT NULL
        GROUP BY Vendor_ID;

        SET @rows = @@ROWCOUNT;

        COMMIT TRANSACTION;

        SELECT 'gold_vendor_spend' AS metric_table, @rows AS rows_built;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO
PRINT 'usp_build_vendor_spend ready.';
GO