/* ============================================================
   usp_build_cash_position
   ------------------------------------------------------------
   Full-refresh. Finds the most recent bank line (by Booking_Date)
   to establish current cash, and aggregates inflows/outflows
   for context. Produces a single snapshot row.
   ============================================================ */

USE fin_model;
GO

CREATE OR ALTER PROCEDURE dbo.usp_build_cash_position
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        TRUNCATE TABLE dbo.gold_cash_position;

        -- Latest running balance: the bank line with the most recent
        -- Booking_Date (tie-break on highest silver_id).
        DECLARE @current_balance DECIMAL(18,2);
        DECLARE @as_of_date DATETIME2;

        SELECT TOP 1
            @current_balance = Running_Balance,
            @as_of_date = Booking_Date
        FROM dbo.silver_bank_feed
        WHERE Running_Balance IS NOT NULL
        ORDER BY Booking_Date DESC, silver_id DESC;

        INSERT INTO dbo.gold_cash_position
            (current_balance, as_of_date, total_inflow, total_outflow,
             net_movement, bank_line_count)
        SELECT
            @current_balance,
            @as_of_date,
            -- Inflows = positive amounts, outflows = negative (abs).
            SUM(CASE WHEN Amount > 0 THEN Amount ELSE 0 END),
            SUM(CASE WHEN Amount < 0 THEN ABS(Amount) ELSE 0 END),
            SUM(Amount),
            COUNT(*)
        FROM dbo.silver_bank_feed;

        COMMIT TRANSACTION;

        SELECT 'gold_cash_position' AS metric_table, 1 AS rows_built;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO
PRINT 'usp_build_cash_position ready.';
GO